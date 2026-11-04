import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Cache-aside has a staleness window: the cache is only as current as the last read-triggered reload, so the moment right after a write (and before the next read repopulates the cache) can serve outdated data. For most applications, a brief window of staleness is fine. For some — a price that must reflect a just-applied discount, an inventory count that must never show stock that was just sold out — it isn't.",
      },
      {
        type: "p",
        text: "**Write-through** closes that window by making the cache update part of the write itself, synchronously, instead of waiting for the next read to discover the change.",
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
          "On a write, the application (or the cache layer itself, if it supports write-through natively) writes to the database **and** the cache as a single logical operation.",
          "The write is only considered successful once **both** writes succeed. If either fails, the operation fails — the cache and the database never diverge because of a partial write.",
          "On a subsequent read, the cache already has the current value — there's no miss to trigger a reload, because the cache was updated at write time, not read time.",
        ],
      },
      {
        type: "p",
        text: "This is a meaningfully different contract than cache-aside's invalidate-on-write: cache-aside deletes the stale entry and lets the *next reader* pay the cost of reloading it; write-through pays that cost immediately, on every write, so every subsequent read is guaranteed fresh (for the data write-through actually wrote — see the Tradeoffs section for the cache-miss case).",
      },
      {
        type: "p",
        text: "A system can implement write-through at the application layer (the app writes both explicitly, in that order, and rolls back or surfaces an error if the cache write fails) or the cache product can implement it as a single atomic client-facing operation, as DynamoDB Accelerator (DAX) does for its write APIs.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Write (write-through):
  App ──write(key, value)──▶ DB            [1. write DB]
  App ──write(key, value)──▶ Cache         [2. write Cache]
  Operation succeeds only if BOTH succeed.

Read (always a hit for anything already written):
  App ──get(key)──▶ Cache ──value──▶ App
  (DB is never touched on a read of previously-written data)

Compare to cache-aside's write:
  App ──write────────▶ DB
  App ──delete(key)──▶ Cache        (invalidate; next reader reloads it)`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      { operation: "Read (previously written key)", time: "O(1)", note: "Always a cache hit" },
      {
        operation: "Write",
        time: "O(1) cache write + cost of the DB write",
        note: "Pays cache-write latency on every write, not just misses",
      },
      {
        operation: "Read (key never written through this path)",
        time: "Depends on the surrounding pattern",
        note: "Write-through alone doesn't define miss behavior for data it never wrote — paired with read-through or cache-aside for that case",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "The cache is never stale for data that's gone through a write — no window where a reader can see an old value",
      "Reads stay simple and fast — a read never needs to fall back to the database for data that was written through",
      "A failed cache write fails the whole operation, so the application finds out immediately rather than discovering a silent cache/DB mismatch later",
    ],
    cons: [
      "Every write pays cache-write latency, not just cache misses — write-heavy workloads feel this directly",
      "A cache outage blocks writes too, not just reads — write-through makes the cache a dependency of the write path, which cache-aside avoids",
      "Doesn't help with cold data: a key that was never written through this path (e.g. data that existed before write-through was introduced) still needs some other strategy — read-through or cache-aside — to get into the cache",
      "Caches data that may never be read — unlike cache-aside, which only populates what's actually requested",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Data where staleness immediately after a write is unacceptable, even for a single read",
      "Read-heavy data that's also written relatively infrequently, so the extra write-time cost is paid rarely relative to how often it pays off on reads",
      "Systems where write failures should be visible immediately rather than surfacing later as a cache/DB inconsistency",
    ],
    whenNotToUse: [
      "Write-heavy workloads, where paying cache-write cost on every write adds up fast for data that may not even be read again soon",
      "Data that's rarely re-read after being written — caching it preemptively wastes cache memory on cold entries",
      "Systems that need to keep functioning (at least for reads) during a cache outage — write-through makes the cache a hard dependency of writes too",
    ],
  },
  {
    type: "comparison",
    id: "comparison",
    heading: "Write-Through vs. Cache-Aside",
    columns: ["", "Write-Through", "Cache-Aside"],
    rows: [
      {
        "": "On write",
        "Write-Through": "Writes DB and cache together, synchronously",
        "Cache-Aside": "Writes DB, then deletes the cache key",
      },
      {
        "": "Next read after a write",
        "Write-Through": "Always a cache hit with the fresh value",
        "Cache-Aside": "A deliberate miss — reloads from the DB",
      },
      {
        "": "Write latency",
        "Write-Through": "Higher — every write pays cache-write cost",
        "Cache-Aside": "Lower — cache isn't touched on write (beyond a delete)",
      },
      {
        "": "Cache outage impact",
        "Write-Through": "Blocks writes too",
        "Cache-Aside": "Reads degrade to always-miss; writes unaffected",
      },
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
          '**AWS\'s caching best-practices guide** describes write-through as updating the cache "in real time when the database is updated," and specifically recommends pairing it with lazy loading (cache-aside) to cover both write and read paths well.',
          '**Amazon DynamoDB Accelerator (DAX)** implements write-through natively: its documentation states that `PutItem`, `UpdateItem`, `DeleteItem`, and `BatchWriteItem` "are considered write-through" — data is written to the DynamoDB table first, then to the DAX cluster, and the operation only succeeds if both writes succeed.',
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "AWS — Caching Overview and Best Practices",
            url: "https://aws.amazon.com/caching/best-practices/",
            verified: "2026-09-17",
            note: "Describes write-through and its common pairing with lazy loading",
          },
          {
            name: "AWS Docs — DAX: How it works (write operations)",
            url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.html",
            verified: "2026-09-17",
            note: "Names PutItem/UpdateItem/DeleteItem/BatchWriteItem as write-through operations",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

interface Database {
  write(key: string, value: string): Promise<void>;
  read(key: string): Promise<string>;
}

async function writeThrough(db: Database, cache: Cache, key: string, value: string): Promise<void> {
  // Both writes must succeed for the operation to succeed.
  await db.write(key, value);
  await cache.set(key, value);
}

async function readWriteThrough(db: Database, cache: Cache, key: string): Promise<string> {
  const cached = await cache.get(key);
  if (cached !== null) return cached;
  // Not every key is guaranteed to be in cache (e.g. pre-existing data) —
  // write-through alone doesn't define this path; fall back like cache-aside.
  return db.read(key);
}

// Usage
await writeThrough(db, redisCache, \`user:\${id}\`, JSON.stringify({ name: "Alice" }));
const user = await readWriteThrough(db, redisCache, \`user:\${id}\`); // guaranteed fresh if written through`,

  python: `from typing import Protocol


class Cache(Protocol):
    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str) -> None: ...


class Database(Protocol):
    def write(self, key: str, value: str) -> None: ...
    def read(self, key: str) -> str: ...


def write_through(db: Database, cache: Cache, key: str, value: str) -> None:
    # Both writes must succeed for the operation to succeed.
    db.write(key, value)
    cache.set(key, value)


def read_write_through(db: Database, cache: Cache, key: str) -> str:
    cached = cache.get(key)
    if cached is not None:
        return cached
    # Not every key is guaranteed to be in cache (e.g. pre-existing data) —
    # write-through alone doesn't define this path; fall back like cache-aside.
    return db.read(key)


# Usage
write_through(db, redis_cache, f"user:{user_id}", json.dumps({"name": "Alice"}))
user = read_write_through(db, redis_cache, f"user:{user_id}")  # guaranteed fresh if written through`,

  java: `public interface Cache {
    String get(String key);
    void set(String key, String value);
}

public interface Database {
    void write(String key, String value);
    String read(String key);
}

public class WriteThrough {

    public static void writeThrough(Database db, Cache cache, String key, String value) {
        // Both writes must succeed for the operation to succeed.
        db.write(key, value);
        cache.set(key, value);
    }

    public static String readWriteThrough(Database db, Cache cache, String key) {
        String cached = cache.get(key);
        if (cached != null) return cached;
        // Not every key is guaranteed to be in cache (e.g. pre-existing data) —
        // write-through alone doesn't define this path; fall back like cache-aside.
        return db.read(key);
    }
}

// Usage
WriteThrough.writeThrough(db, redisCache, "user:" + id, toJson(new User("Alice")));
String user = WriteThrough.readWriteThrough(db, redisCache, "user:" + id); // guaranteed fresh if written through`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "write-through-conceptual",
    required: true,
    question:
      "Immediately after a successful write-through write to key K, a different request reads key K. What does it see?",
    options: [
      {
        id: "a",
        text: "The new value, guaranteed — write-through updates the cache synchronously as part of the write",
      },
      {
        id: "b",
        text: "A cache miss, because write-through invalidates rather than updates the cache",
      },
      { id: "c", text: "The old value, until the cache's TTL expires" },
      {
        id: "d",
        text: "It depends on which replica serves the read, with no guarantee either way",
      },
    ],
    correctOptionId: "a",
    explanation:
      "Write-through writes to the cache as part of the write operation itself, synchronously — the cache already holds the new value by the time the write is acknowledged as successful. This is exactly what distinguishes it from cache-aside, which invalidates (deletes) the key on write and leaves repopulation to the next reader, meaning the next read is a deliberate miss rather than an immediate hit.",
  },
  {
    type: "implementation",
    id: "write-through-implementation",
    required: true,
    title: "Implement Write-Through Read and Write Helpers",
    description: `Implement write-through against a simple cache and database:

- **writeThrough(db, cache, key, value)** — writes to the database, then to the cache. Both must succeed.
- **readWriteThrough(db, cache, key)** — returns the cached value on a hit; on a miss, falls back to reading from the database directly (without populating the cache — that's a different pattern).`,
    starterCode: {
      typescript: `interface Cache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

interface Database {
  write(key: string, value: string): void;
  read(key: string): string;
}

function writeThrough(db: Database, cache: Cache, key: string, value: string): void {
  // TODO: write to db, then to cache
}

function readWriteThrough(db: Database, cache: Cache, key: string): string {
  // TODO: return cached value on hit; on miss, read from db directly
  return db.read(key);
}`,
      python: `from typing import Protocol


class Cache(Protocol):
    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str) -> None: ...


class Database(Protocol):
    def write(self, key: str, value: str) -> None: ...
    def read(self, key: str) -> str: ...


def write_through(db: Database, cache: Cache, key: str, value: str) -> None:
    # TODO: write to db, then to cache
    pass


def read_write_through(db: Database, cache: Cache, key: str) -> str:
    # TODO: return cached value on hit; on miss, read from db directly
    return db.read(key)`,
      java: `public interface Cache {
    String get(String key);
    void set(String key, String value);
}

public interface Database {
    void write(String key, String value);
    String read(String key);
}

public class WriteThrough {
    public static void writeThrough(Database db, Cache cache, String key, String value) {
        // TODO: write to db, then to cache
    }

    public static String readWriteThrough(Database db, Cache cache, String key) {
        // TODO: return cached value on hit; on miss, read from db directly
        return db.read(key);
    }
}`,
    },
    hints: [
      "writeThrough always writes to the database first, then the cache — in that order",
      "readWriteThrough checks cache.get(key) first; only call db.read(key) if that returns nothing",
      "Don't populate the cache inside readWriteThrough on a miss — that would make this cache-aside, not write-through; write-through only updates the cache from the write path",
    ],
    solution: {
      typescript: `interface Cache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

interface Database {
  write(key: string, value: string): void;
  read(key: string): string;
}

function writeThrough(db: Database, cache: Cache, key: string, value: string): void {
  db.write(key, value);
  cache.set(key, value);
}

function readWriteThrough(db: Database, cache: Cache, key: string): string {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  return db.read(key);
}`,
      python: `from typing import Protocol


class Cache(Protocol):
    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str) -> None: ...


class Database(Protocol):
    def write(self, key: str, value: str) -> None: ...
    def read(self, key: str) -> str: ...


def write_through(db: Database, cache: Cache, key: str, value: str) -> None:
    db.write(key, value)
    cache.set(key, value)


def read_write_through(db: Database, cache: Cache, key: str) -> str:
    cached = cache.get(key)
    if cached is not None:
        return cached
    return db.read(key)`,
      java: `public class WriteThrough {
    public static void writeThrough(Database db, Cache cache, String key, String value) {
        db.write(key, value);
        cache.set(key, value);
    }

    public static String readWriteThrough(Database db, Cache cache, String key) {
        String cached = cache.get(key);
        if (cached != null) return cached;
        return db.read(key);
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "write-through-system-design",
    required: false,
    title: "Choosing Between Write-Through and Cache-Aside for an Inventory Service",
    scenario: `You're building the inventory service for an e-commerce platform. It has two very different access patterns:

1. **Stock level checks** — read extremely frequently (every product page view, every add-to-cart), and must never show stock as available when it's actually sold out (overselling is a serious business problem).
2. **Product descriptions, images, and metadata** — read frequently but changed rarely, and a few seconds of staleness after an edit is completely fine.

Both currently share one cache-aside layer. Should they? Design the caching strategy for each access pattern separately, and justify the choice.`,
    hints: [
      "Which of the two is more sensitive to the staleness window cache-aside has right after a write?",
      "Stock level writes (purchases, restocks) probably happen far more often than product-description edits — does write latency cost matter differently for the two?",
      "If the cache goes down, what's the acceptable behavior for each? Is blocking a purchase acceptable? Is blocking a product-description edit?",
      "Does splitting the two into different caching strategies conflict with using the same underlying cache technology (e.g. Redis) for both?",
    ],
    discussionPoints: [
      "**Stock levels → write-through:** The business cost of a stale read (overselling) outweighs the extra write latency. Write-through guarantees the next stock check after a purchase sees the decremented count immediately, with no window where cache-aside's invalidate-then-reload gap could show outdated availability.",
      "**Product metadata → cache-aside:** Edits are rare, reads are frequent, and brief staleness is acceptable — cache-aside's lower write cost and its only-caches-what's-actually-read property fit this access pattern better than paying write-through overhead on every edit.",
      "**Cache outage behavior differs deliberately:** If write-through's cache is down, purchases should probably fail loudly rather than risk divergence — that's arguably *correct* behavior for inventory (better to block a purchase than oversell). If cache-aside's cache is down for product metadata, reads degrading to always-hit-the-database is an acceptable, much less severe fallback.",
      "**Same cache technology, different access pattern per key namespace:** Nothing prevents using the same Redis cluster for both — the distinction is in the write path code for `inventory:*` keys versus `product-metadata:*` keys, not a requirement for physically separate caching infrastructure.",
      "**What doesn't fully solve the overselling problem on its own:** Even write-through doesn't prevent a race between two concurrent purchases both reading 'last unit available' before either write lands — that's a concurrency-control problem (e.g. a conditional/compare-and-swap decrement at the database), not something caching strategy alone resolves.",
    ],
  },
];
