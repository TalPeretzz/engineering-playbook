import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Write-through guarantees the cache and database never diverge, but it pays for that guarantee on every single write — the application waits for both the database write and the cache write to complete before the operation is considered done. For write-heavy workloads, that doubled write latency adds up, and a slow or overloaded database directly slows down every write the application makes, even ones that only need to update the cache quickly.",
      },
      {
        type: "p",
        text: "**Write-behind** (also called write-back) trades durability guarantees for write speed: the write updates the cache immediately and returns, while the database write happens asynchronously, often batched with other pending writes, a short delay later.",
      },
    ],
  },
  {
    type: "text",
    id: "how-it-works",
    heading: "How does it work?",
    body: [
      {
        type: "list",
        items: [
          "A write updates the cache synchronously and is acknowledged as complete immediately — the caller doesn't wait for the database.",
          "The written key is added to a queue of pending writes.",
          "A background process flushes the queue to the database after a configured delay, often batching multiple pending writes into fewer, larger database operations instead of one write per key.",
          "Reads are served from the cache, which (unlike cache-aside or write-through) may be the only place holding the most current value for a brief window, until the background flush catches the database up.",
        ],
      },
      {
        type: "p",
        text: "The configurable delay is the core tuning knob: a longer delay means more opportunity to batch and coalesce writes to the same key (if a key is written five times in that window, only the final value needs to reach the database), trading a larger window of risk for fewer, cheaper database operations. Oracle Coherence's write-behind implementation makes this explicit with a `write-delay` setting (how long a queued write waits before it's eligible to flush) and a `write-batch-factor` (what fraction of that delay must elapse before an entry can ride along in a batch with other, not-yet-ripe entries).",
      },
      {
        type: "p",
        text: "The risk this introduces is the whole point to understand clearly: if the cache node holding an unflushed write crashes before the background flush runs, that write is lost — the database never saw it, and there's no record of it anywhere else. Write-behind is a deliberate trade of some durability for write throughput, not a free optimization.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Write (write-behind):
  App ──write(key, value)──▶ Cache         [acknowledged immediately]
  Cache ──queue(key, value)──▶ pending writes

  ... write-delay elapses, possibly more writes queued for the same key ...

  Background flush ──batched write──▶ DB   [happens later, asynchronously]

Risk window:
  If the cache crashes AFTER acknowledging the write but BEFORE the
  background flush reaches the DB, that write is lost permanently —
  the DB never received it, and the cache that held it is gone.

Compare to write-through:
  App ──write──▶ DB AND Cache (both, synchronously, before acknowledging)
  No risk window — but the app waits for the DB write on every call.`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Write (caller-visible)",
        time: "O(1)",
        note: "Only the cache write — no DB round trip in the critical path",
      },
      {
        operation: "Background flush of N queued writes",
        time: "O(N) amortized, batched",
        note: "Multiple writes to the same key before a flush can coalesce into one DB write",
      },
      {
        operation: "Read",
        time: "O(1)",
        note: "Served from cache, same as other caching strategies",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Write latency is dramatically lower — the caller never waits on the database",
      "Batching coalesces repeated writes to the same key into fewer database operations, reducing database load under write-heavy traffic",
      "Absorbs write bursts — the queue smooths a spike of writes into a steadier stream of database operations instead of forwarding the spike directly",
    ],
    cons: [
      "Real data-loss risk: an unflushed write is gone if the cache crashes before the background flush completes",
      "The database can lag behind the cache by up to the write-delay window — any system reading directly from the database (a replica, an analytics pipeline, a different service) sees stale data",
      "More operationally complex than write-through or cache-aside — there's a queue, a flush process, and failure modes for both to reason about and monitor",
      "Write ordering and conflict handling for the same key across concurrent writers needs explicit design — it isn't automatic",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Write-heavy workloads where write latency directly impacts user experience or throughput",
      "Data with frequent updates to the same keys, where batching meaningfully reduces database load (e.g. view counters, frequently-updated status fields)",
      "Systems that can tolerate a bounded, well-understood risk of losing the most recent write(s) on a crash",
    ],
    whenNotToUse: [
      "Data where losing even a single recent write is unacceptable (financial transactions, anything requiring strong durability guarantees)",
      "Systems where other components need to read current data directly from the database — write-behind's whole premise is that the database can lag",
      "Low-write-volume systems where write-through's simplicity and stronger guarantees aren't actually costing anything meaningful in practice",
    ],
  },
  {
    type: "text",
    id: "real-world",
    heading: "Real-world usage",
    body: [
      {
        type: "list",
        items: [
          "**Oracle Coherence**'s read-write-backing-map-scheme implements write-behind with explicit `write-delay` and `write-batch-factor` settings, controlling how long a write waits in the queue and how aggressively concurrent writes batch together before reaching the backing store.",
          "**Hazelcast's MapStore** supports write-behind as one of its three caching modes (alongside read-through and write-through): entries are added to the external system asynchronously, after a configured delay, rather than synchronously on every map write.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Oracle Coherence 3.1 Docs — read-write-backing-map-scheme",
            url: "https://docs.oracle.com/cd/E14008_01/coh.310/coh31ug/read_write_bm_scheme.htm",
            verified: "2026-11-04",
            note: "write-delay and write-batch-factor settings for queued, batched asynchronous writes",
          },
          {
            name: "Hazelcast Docs — Building a Cache with MapStore",
            url: "https://docs.hazelcast.com/hazelcast/5.5/mapstore/working-with-external-data",
            verified: "2026-11-04",
            note: "Write-behind as one of MapStore's supported patterns alongside read-through/write-through",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `type PendingWrite = { key: string; value: string };

class WriteBehindCache {
  private cache = new Map<string, string>();
  private pending = new Map<string, PendingWrite>(); // keyed by key — later writes replace earlier ones
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private db: { batchWrite(writes: PendingWrite[]): Promise<void> },
    private flushDelayMs = 1000
  ) {}

  write(key: string, value: string): void {
    this.cache.set(key, value);
    this.pending.set(key, { key, value }); // coalesces repeated writes to the same key
    this.scheduleFlush();
  }

  read(key: string): string | undefined {
    return this.cache.get(key);
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return; // a flush is already scheduled
    this.flushTimer = setTimeout(async () => {
      const writes = [...this.pending.values()];
      this.pending.clear();
      this.flushTimer = null;
      if (writes.length > 0) await this.db.batchWrite(writes);
    }, this.flushDelayMs);
  }
}

// Usage
const cache = new WriteBehindCache(db, 500);
cache.write("user:42", JSON.stringify({ name: "Alice" })); // returns immediately
cache.write("user:42", JSON.stringify({ name: "Alice", age: 31 })); // coalesces — only this value flushes`,

  python: `import threading
from typing import Protocol


class PendingWrite:
    def __init__(self, key: str, value: str) -> None:
        self.key = key
        self.value = value


class Database(Protocol):
    def batch_write(self, writes: list[PendingWrite]) -> None: ...


class WriteBehindCache:
    def __init__(self, db: Database, flush_delay_s: float = 1.0) -> None:
        self.db = db
        self.flush_delay_s = flush_delay_s
        self.cache: dict[str, str] = {}
        self.pending: dict[str, PendingWrite] = {}  # keyed by key — later writes replace earlier ones
        self._timer: threading.Timer | None = None
        self._lock = threading.Lock()

    def write(self, key: str, value: str) -> None:
        with self._lock:
            self.cache[key] = value
            self.pending[key] = PendingWrite(key, value)  # coalesces repeated writes
            self._schedule_flush()

    def read(self, key: str) -> str | None:
        return self.cache.get(key)

    def _schedule_flush(self) -> None:
        if self._timer is not None:
            return  # a flush is already scheduled
        self._timer = threading.Timer(self.flush_delay_s, self._flush)
        self._timer.start()

    def _flush(self) -> None:
        with self._lock:
            writes = list(self.pending.values())
            self.pending.clear()
            self._timer = None
        if writes:
            self.db.batch_write(writes)


# Usage
cache = WriteBehindCache(db, flush_delay_s=0.5)
cache.write("user:42", '{"name": "Alice"}')  # returns immediately
cache.write("user:42", '{"name": "Alice", "age": 31}')  # coalesces — only this value flushes`,

  java: `import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Timer;
import java.util.TimerTask;

public class WriteBehindCache {
    public record PendingWrite(String key, String value) {}

    public interface Database {
        void batchWrite(List<PendingWrite> writes);
    }

    private final Map<String, String> cache = new LinkedHashMap<>();
    private final Map<String, PendingWrite> pending = new LinkedHashMap<>(); // keyed by key
    private final Database db;
    private final long flushDelayMs;
    private final Timer timer = new Timer(true);
    private boolean flushScheduled = false;

    public WriteBehindCache(Database db, long flushDelayMs) {
        this.db = db;
        this.flushDelayMs = flushDelayMs;
    }

    public synchronized void write(String key, String value) {
        cache.put(key, value);
        pending.put(key, new PendingWrite(key, value)); // coalesces repeated writes to the same key
        scheduleFlush();
    }

    public synchronized String read(String key) {
        return cache.get(key);
    }

    private void scheduleFlush() {
        if (flushScheduled) return;
        flushScheduled = true;
        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                flush();
            }
        }, flushDelayMs);
    }

    private synchronized void flush() {
        List<PendingWrite> writes = new ArrayList<>(pending.values());
        pending.clear();
        flushScheduled = false;
        if (!writes.isEmpty()) db.batchWrite(writes);
    }
}

// Usage
WriteBehindCache cache = new WriteBehindCache(db, 500);
cache.write("user:42", toJson(new User("Alice"))); // returns immediately
cache.write("user:42", toJson(new User("Alice", 31))); // coalesces — only this value flushes`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "write-behind-conceptual",
    required: true,
    question:
      "A write-behind cache acknowledges a write, and the cache node crashes 200ms later, before the next scheduled flush to the database. What happened to that write?",
    options: [
      {
        id: "a",
        text: "It's safe — write-behind always persists to the database before acknowledging",
      },
      {
        id: "b",
        text: "It's lost — the database never received it, and the cache that held it is gone",
      },
      { id: "c", text: "It's automatically recovered from the write-ahead log on cache restart" },
      { id: "d", text: "The write is retried against a replica cache node automatically" },
    ],
    correctOptionId: "b",
    explanation:
      "This is write-behind's defining risk: the write is acknowledged as soon as the cache is updated, before the database write happens. If the cache crashes inside the window between acknowledgment and the background flush, that write is gone — it was never durably stored anywhere else. This is the deliberate tradeoff write-behind makes for lower write latency; write-through (option a's description) avoids this risk entirely by writing the database synchronously before acknowledging.",
  },
  {
    type: "implementation",
    id: "write-behind-implementation",
    required: true,
    title: "Implement a Write-Behind Cache with Coalesced Flushing",
    description: `Implement a write-behind cache:

- **write(key, value)** — updates the cache immediately and returns. Queues the write to be flushed to the database later. If the same key is written again before the next flush, only the latest value should be flushed (coalescing).
- **read(key)** — returns the current cached value.
- A background flush (triggered however fits your language — a timer, an interval) sends all currently queued writes to the database in one batched call, then clears the queue.`,
    starterCode: {
      typescript: `type PendingWrite = { key: string; value: string };

class WriteBehindCache {
  private cache = new Map<string, string>();
  private pending = new Map<string, PendingWrite>();

  constructor(private db: { batchWrite(writes: PendingWrite[]): Promise<void> }) {}

  write(key: string, value: string): void {
    // TODO: update cache immediately; queue the write, coalescing by key
  }

  read(key: string): string | undefined {
    return this.cache.get(key);
  }

  async flush(): Promise<void> {
    // TODO: send all queued writes to the db in one batch, then clear the queue
  }
}`,
      python: `from typing import Protocol


class PendingWrite:
    def __init__(self, key: str, value: str) -> None:
        self.key = key
        self.value = value


class Database(Protocol):
    def batch_write(self, writes: list[PendingWrite]) -> None: ...


class WriteBehindCache:
    def __init__(self, db: Database) -> None:
        self.db = db
        self.cache: dict[str, str] = {}
        self.pending: dict[str, PendingWrite] = {}

    def write(self, key: str, value: str) -> None:
        # TODO: update cache immediately; queue the write, coalescing by key
        pass

    def read(self, key: str) -> str | None:
        return self.cache.get(key)

    def flush(self) -> None:
        # TODO: send all queued writes to the db in one batch, then clear the queue
        pass`,
      java: `import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

public class WriteBehindCache {
    public record PendingWrite(String key, String value) {}

    public interface Database {
        void batchWrite(List<PendingWrite> writes);
    }

    private final Map<String, String> cache = new LinkedHashMap<>();
    private final Map<String, PendingWrite> pending = new LinkedHashMap<>();
    private final Database db;

    public WriteBehindCache(Database db) {
        this.db = db;
    }

    public void write(String key, String value) {
        // TODO: update cache immediately; queue the write, coalescing by key
    }

    public String read(String key) {
        return cache.get(key);
    }

    public void flush() {
        // TODO: send all queued writes to the db in one batch, then clear the queue
    }
}`,
    },
    hints: [
      "write() should update cache.set(key, value) and pending.set(key, {key, value}) — using the key as the Map key is what makes coalescing automatic",
      "flush() should read all current values out of pending, clear it, and (only if there's anything to send) call db.batchWrite() once with everything collected",
      "Clear pending before or right after starting the batch write, not after it completes — new writes arriving during the flush should start a fresh batch, not get mixed into the one currently being sent",
      "You don't need to implement the actual timer/scheduling for this challenge — just make write() queue correctly and flush() drain and send correctly",
    ],
    solution: {
      typescript: `type PendingWrite = { key: string; value: string };

class WriteBehindCache {
  private cache = new Map<string, string>();
  private pending = new Map<string, PendingWrite>();

  constructor(private db: { batchWrite(writes: PendingWrite[]): Promise<void> }) {}

  write(key: string, value: string): void {
    this.cache.set(key, value);
    this.pending.set(key, { key, value });
  }

  read(key: string): string | undefined {
    return this.cache.get(key);
  }

  async flush(): Promise<void> {
    const writes = [...this.pending.values()];
    this.pending.clear();
    if (writes.length > 0) await this.db.batchWrite(writes);
  }
}`,
      python: `from typing import Protocol


class PendingWrite:
    def __init__(self, key: str, value: str) -> None:
        self.key = key
        self.value = value


class Database(Protocol):
    def batch_write(self, writes: list[PendingWrite]) -> None: ...


class WriteBehindCache:
    def __init__(self, db: Database) -> None:
        self.db = db
        self.cache: dict[str, str] = {}
        self.pending: dict[str, PendingWrite] = {}

    def write(self, key: str, value: str) -> None:
        self.cache[key] = value
        self.pending[key] = PendingWrite(key, value)

    def read(self, key: str) -> str | None:
        return self.cache.get(key)

    def flush(self) -> None:
        writes = list(self.pending.values())
        self.pending.clear()
        if writes:
            self.db.batch_write(writes)`,
      java: `public class WriteBehindCache {
    public record PendingWrite(String key, String value) {}

    public interface Database {
        void batchWrite(java.util.List<PendingWrite> writes);
    }

    private final java.util.Map<String, String> cache = new java.util.LinkedHashMap<>();
    private final java.util.Map<String, PendingWrite> pending = new java.util.LinkedHashMap<>();
    private final Database db;

    public WriteBehindCache(Database db) {
        this.db = db;
    }

    public void write(String key, String value) {
        cache.put(key, value);
        pending.put(key, new PendingWrite(key, value));
    }

    public String read(String key) {
        return cache.get(key);
    }

    public void flush() {
        java.util.List<PendingWrite> writes = new java.util.ArrayList<>(pending.values());
        pending.clear();
        if (!writes.isEmpty()) db.batchWrite(writes);
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "write-behind-system-design",
    required: false,
    title: "Deciding Whether to Use Write-Behind for a View Counter",
    scenario: `A video platform tracks view counts per video. Every video play increments a counter. At peak, popular videos receive thousands of increments per second.

Currently every increment writes directly to the primary database, and the database is visibly struggling under this write load — it's become the platform's main scaling bottleneck, even though view counts don't need to be exactly accurate in real time (being off by a few hundred views for a few seconds is completely fine for this product).

Evaluate whether write-behind is a good fit here, and design the flush strategy — including what happens if a cache node crashes with unflushed increments.`,
    hints: [
      "View counts are a classic 'eventually consistent, approximately correct' use case — does that match write-behind's tradeoff well?",
      "Does write-behind's coalescing-by-key model (as described in this lesson) work well for an incrementing counter, or does it need something different?",
      "What's the actual cost of losing a few unflushed increments for this specific product, compared to the cost described in the lesson's risk section?",
      "If increments batch and coalesce, how do you avoid losing count accuracy from the batching itself (not just from a crash)?",
      "Are there limits to how long you'd want to delay a flush, even if the business tolerates eventual consistency?",
    ],
    discussionPoints: [
      "**Good fit, with a caveat:** Write-behind's core tradeoff (lower durability for lower write latency and database load) matches this use case well — the product explicitly tolerates a few seconds of inaccuracy, and the write volume is exactly what's overloading the database today.",
      '**Coalescing needs adjusting for counters:** The lesson\'s coalescing model ("last write wins, replace the pending value") is wrong for increments — if a key is incremented 50 times before a flush, the pending write needs to be *the sum of all increments*, not just the most recent one. The flush should accumulate deltas per key, then issue one `UPDATE count = count + delta` per key instead of one write per increment.',
      "**Crash impact is bounded and acceptable here:** A crash losing a few seconds of unflushed increments for one video means that video's count is undercounted by however many views happened in that window — annoying but not a correctness-critical failure for this product, unlike (say) a financial balance.",
      "**Flush delay tuning:** A short delay (e.g. 1-5 seconds) limits both the blast radius of a crash and how stale a video's count can appear to the product team's own dashboards, while still batching enough increments per flush to meaningfully reduce database write volume for popular videos.",
      "**What write-behind doesn't solve by itself:** If the counter needs to survive a cache node crash without any loss at all, write-behind alone isn't sufficient — that would need either a durable/replicated queue in front of the batched writes, or accepting write-behind isn't the right pattern and the real fix is a dedicated counting system (e.g. an approximate counter service, or pre-aggregating counts in a stream processor) instead.",
    ],
  },
];
