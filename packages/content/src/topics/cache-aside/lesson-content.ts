import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Databases are slow and expensive to read from compared to memory — a disk-backed query might take milliseconds where an in-memory lookup takes microseconds, and a database under heavy read load has to scale its compute, not just its storage, to keep up. Most applications have data that's read far more often than it changes: a user's profile, a product listing, a config value. Re-querying the database for the same rarely-changing data on every single request wastes both time and database capacity.",
      },
      {
        type: "p",
        text: "**Cache-aside** (also called lazy loading) is the simplest fix: keep a fast in-memory cache next to the database, and let the application check the cache before it checks the database. It's the default caching pattern most people reach for first — simple to reason about, and it only caches data that's actually being requested.",
      },
    ],
  },
  {
    type: "text",
    id: "how-it-works",
    heading: "How does it work?",
    body: [
      { type: "heading", level: 3, text: "Reads" },
      {
        type: "list",
        items: [
          "Check the cache for the key.",
          "**Hit:** return the cached value. The database is never touched.",
          "**Miss:** load the value from the database, write it into the cache, then return it. The next read for that key is a hit.",
        ],
      },
      { type: "heading", level: 3, text: "Writes" },
      {
        type: "p",
        text: "This is the part people get wrong. On a write, cache-aside does **not** update the cache with the new value — it writes to the database and then deletes (invalidates) the cache entry. The next read for that key is a deliberate miss, which reloads the fresh value from the database and repopulates the cache.",
      },
      {
        type: "p",
        text: "Why delete instead of update? Because updating the cache on every write requires the write path to duplicate whatever transformation logic produced the cached value in the first place — and if two writes to the same key race, whichever cache update lands last can overwrite a newer value with a stale one. Deleting is idempotent and order-independent: no matter how many concurrent writes delete the same key, the net effect is identical (the key is gone), and the next reader reloads current data. The tradeoff is one extra cache miss per write instead of a correctness risk.",
      },
      {
        type: "p",
        text: "This doesn't eliminate every race condition — a read that started just before a concurrent write can still repopulate the cache with the pre-write value a moment after the delete, leaving a stale entry until the next write. Facebook's well-known 'Scaling Memcache' paper documents this exact race and describes **leases** (a token the cache hands out to whichever client experiences the miss, so a stale set from an unrelated stale read can be detected and rejected) as their mitigation.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Read (cache hit):
  App ──get(key)──▶ Cache ──value──▶ App
  (database never touched)

Read (cache miss):
  App ──get(key)──▶ Cache ──miss──▶ App
  App ──query────────────────────────▶ DB ──row──▶ App
  App ──set(key, value)──▶ Cache
  App returns value

Write:
  App ──update────────────────────────▶ DB
  App ──delete(key)──▶ Cache          (invalidate, don't update)
  (next read for key is a deliberate miss → reloads fresh value)`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      { operation: "Cache hit", time: "O(1)", note: "A single cache lookup" },
      {
        operation: "Cache miss",
        time: "O(1) cache op + cost of the DB query",
        note: "One extra round trip versus a hit",
      },
      {
        operation: "Write",
        time: "O(1)",
        note: "A DB write plus a cache delete, not a cache write",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Simple to implement and reason about — plain read/miss/populate logic in the application",
      "Only caches data that's actually requested — no wasted memory on cold data",
      "The cache and database can fail somewhat independently — a cache outage degrades to 'every read hits the database', not a hard failure",
      "Works with any cache (Redis, Memcached, an in-process map) with no special integration",
    ],
    cons: [
      "Every cache miss pays full database latency — no pre-warming",
      "A brief staleness window is possible even with invalidate-on-write (see the leases discussion above)",
      "Cache logic is duplicated across every place that reads the data, unless centralized behind a repository/data-access layer",
      "A burst of misses for the same hot key at the same time (e.g. right after the key expires) can send a thundering herd of identical queries to the database — see the Cache Stampede topic",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Read-heavy workloads where the same keys are requested repeatedly",
      "Data where brief staleness (seconds, until the next write invalidates it) is acceptable",
      "As a default first caching strategy — it's the simplest one to add without restructuring how the application talks to the database",
    ],
    whenNotToUse: [
      "Data that must always be perfectly current on every read (use write-through, or skip caching)",
      "Extremely write-heavy keys, where the cache would be invalidated almost as often as it's populated — the caching overhead isn't earning its keep",
      "When cold-start latency matters and pre-warming the cache (read-through or write-through) would serve users better than an initial wave of misses",
    ],
  },
  {
    type: "comparison",
    id: "comparison",
    heading: "Cache-Aside vs. Read-Through vs. Write-Through",
    columns: ["Pattern", "Who loads on a miss", "What happens on a write", "Main risk"],
    rows: [
      {
        Pattern: "Cache-Aside",
        "Who loads on a miss": "The application",
        "What happens on a write": "App writes the DB, then deletes the cache key",
        "Main risk":
          "Brief staleness if a stale read repopulates the cache right after invalidation",
      },
      {
        Pattern: "Read-Through",
        "Who loads on a miss": "The cache itself, via a loader function you configure once",
        "What happens on a write":
          "Same invalidate-on-write as cache-aside — the read path is what differs",
        "Main risk":
          "Same staleness risk as cache-aside; loader logic is centralized instead of duplicated in app code",
      },
      {
        Pattern: "Write-Through",
        "Who loads on a miss": "The cache (loader)",
        "What happens on a write":
          "The cache is written synchronously, before the write is acknowledged",
        "Main risk": "Every write pays cache-write latency, and a cache outage blocks writes too",
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
          "**AWS's caching best practices guide** documents cache-aside under the name 'lazy loading' as one of its two core patterns, contrasted directly against write-through.",
          "**Facebook's Memcached tier** (documented in their widely-cited 'Scaling Memcache at Facebook' paper) uses a look-aside caching model at massive scale, and specifically introduced a lease mechanism to address the stale-set race condition inherent to this pattern.",
          "Most application frameworks' 'cache decorator' or 'memoize with TTL' utilities are cache-aside under the hood: check cache, miss, call the wrapped function, store the result.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "AWS — Caching Overview and Best Practices",
            url: "https://aws.amazon.com/caching/best-practices/",
            verified: "2026-09-16",
            note: 'Describes cache-aside as "lazy caching", contrasted with write-through',
          },
          {
            name: "Nishtala et al. — Scaling Memcache at Facebook (NSDI 2013)",
            url: "https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf",
            verified: "2026-09-16",
            note: "Introduces leases to mitigate the stale-set race condition in look-aside caching",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

async function getWithCacheAside(
  cache: Cache,
  key: string,
  loadFromDb: () => Promise<string>,
  ttlSeconds = 300
): Promise<string> {
  const cached = await cache.get(key);
  if (cached !== null) return cached;

  const value = await loadFromDb();
  await cache.set(key, value, ttlSeconds);
  return value;
}

async function updateWithCacheAside(
  cache: Cache,
  key: string,
  writeToDb: () => Promise<void>
): Promise<void> {
  await writeToDb();
  await cache.delete(key); // invalidate, don't update — next read repopulates
}

// Usage
const userJson = await getWithCacheAside(redisCache, \`user:\${id}\`, async () => {
  const user = await db.users.findById(id);
  return JSON.stringify(user);
});

await updateWithCacheAside(redisCache, \`user:\${id}\`, () => db.users.update(id, { name: "Alice" }));`,

  python: `from typing import Callable, Protocol


class Cache(Protocol):
    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str, ttl_seconds: int) -> None: ...
    def delete(self, key: str) -> None: ...


def get_with_cache_aside(
    cache: Cache, key: str, load_from_db: Callable[[], str], ttl_seconds: int = 300
) -> str:
    cached = cache.get(key)
    if cached is not None:
        return cached

    value = load_from_db()
    cache.set(key, value, ttl_seconds)
    return value


def update_with_cache_aside(cache: Cache, key: str, write_to_db: Callable[[], None]) -> None:
    write_to_db()
    cache.delete(key)  # invalidate, don't update — next read repopulates


# Usage
user_json = get_with_cache_aside(
    redis_cache, f"user:{user_id}", lambda: json.dumps(db.users.find_by_id(user_id))
)

update_with_cache_aside(redis_cache, f"user:{user_id}", lambda: db.users.update(user_id, name="Alice"))`,

  java: `import java.util.function.Supplier;

public interface Cache {
    String get(String key);
    void set(String key, String value, int ttlSeconds);
    void delete(String key);
}

public class CacheAside {

    public static String getWithCacheAside(
            Cache cache, String key, Supplier<String> loadFromDb, int ttlSeconds) {
        String cached = cache.get(key);
        if (cached != null) return cached;

        String value = loadFromDb.get();
        cache.set(key, value, ttlSeconds);
        return value;
    }

    public static void updateWithCacheAside(Cache cache, String key, Runnable writeToDb) {
        writeToDb.run();
        cache.delete(key); // invalidate, don't update — next read repopulates
    }
}

// Usage
String userJson = CacheAside.getWithCacheAside(
    redisCache, "user:" + id, () -> toJson(db.findUserById(id)), 300
);

CacheAside.updateWithCacheAside(redisCache, "user:" + id, () -> db.updateUser(id, "Alice"));`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "cache-aside-conceptual",
    required: true,
    question:
      "When a cache-aside cache handles a write to a key that's currently cached, what should it do?",
    options: [
      {
        id: "a",
        text: "Update the cached value in place with the new data, so the cache stays warm",
      },
      {
        id: "b",
        text: "Delete the cached entry, so the next read reloads fresh data from the database",
      },
      {
        id: "c",
        text: "Leave the cache entry untouched — writes don't affect the cache in cache-aside",
      },
      { id: "d", text: "Write the new value to the cache first, then to the database" },
    ],
    correctOptionId: "b",
    explanation:
      "Cache-aside invalidates on write rather than updating in place. Updating the cache on write requires duplicating the write-path transformation logic in the cache-update code, and concurrent writes to the same key can race such that a stale update overwrites a newer one. Deleting the key is idempotent — however many concurrent writes delete it, the net result is the same — and the next read simply reloads current data from the database, at the cost of one extra miss.",
  },
  {
    type: "implementation",
    id: "cache-aside-implementation",
    required: true,
    title: "Implement Cache-Aside Read and Write Helpers",
    description: `Implement two functions against a simple key-value cache:

- **getWithCacheAside(cache, key, loadFromDb)** — returns the cached value on a hit; on a miss, calls \`loadFromDb()\`, stores the result in the cache, and returns it.
- **updateWithCacheAside(cache, key, writeToDb)** — calls \`writeToDb()\`, then removes \`key\` from the cache (invalidate, don't update).`,
    starterCode: {
      typescript: `interface Cache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

function getWithCacheAside(cache: Cache, key: string, loadFromDb: () => string): string {
  // TODO: return cached value on hit; on miss, load, store, and return
  return loadFromDb();
}

function updateWithCacheAside(cache: Cache, key: string, writeToDb: () => void): void {
  // TODO: write to the DB, then invalidate the cache entry
  writeToDb();
}`,
      python: `from typing import Callable, Protocol


class Cache(Protocol):
    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str) -> None: ...
    def delete(self, key: str) -> None: ...


def get_with_cache_aside(cache: Cache, key: str, load_from_db: Callable[[], str]) -> str:
    # TODO: return cached value on hit; on miss, load, store, and return
    return load_from_db()


def update_with_cache_aside(cache: Cache, key: str, write_to_db: Callable[[], None]) -> None:
    # TODO: write to the DB, then invalidate the cache entry
    write_to_db()`,
      java: `import java.util.function.Supplier;

public interface Cache {
    String get(String key);
    void set(String key, String value);
    void delete(String key);
}

public class CacheAside {
    public static String getWithCacheAside(Cache cache, String key, Supplier<String> loadFromDb) {
        // TODO: return cached value on hit; on miss, load, store, and return
        return loadFromDb.get();
    }

    public static void updateWithCacheAside(Cache cache, String key, Runnable writeToDb) {
        // TODO: write to the DB, then invalidate the cache entry
        writeToDb.run();
    }
}`,
    },
    hints: [
      "getWithCacheAside: check cache.get(key) first — only call loadFromDb() if that returns nothing",
      "Don't forget to populate the cache with the freshly loaded value before returning it on a miss",
      "updateWithCacheAside always calls writeToDb() first, then cache.delete(key) — never the other way around",
      "Order matters: if you invalidated the cache before the DB write finished, a concurrent reader could repopulate the cache with the pre-write value",
    ],
    solution: {
      typescript: `interface Cache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

function getWithCacheAside(cache: Cache, key: string, loadFromDb: () => string): string {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const value = loadFromDb();
  cache.set(key, value);
  return value;
}

function updateWithCacheAside(cache: Cache, key: string, writeToDb: () => void): void {
  writeToDb();
  cache.delete(key);
}`,
      python: `from typing import Callable, Protocol


class Cache(Protocol):
    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str) -> None: ...
    def delete(self, key: str) -> None: ...


def get_with_cache_aside(cache: Cache, key: str, load_from_db: Callable[[], str]) -> str:
    cached = cache.get(key)
    if cached is not None:
        return cached

    value = load_from_db()
    cache.set(key, value)
    return value


def update_with_cache_aside(cache: Cache, key: str, write_to_db: Callable[[], None]) -> None:
    write_to_db()
    cache.delete(key)`,
      java: `import java.util.function.Supplier;

public class CacheAside {
    public static String getWithCacheAside(Cache cache, String key, Supplier<String> loadFromDb) {
        String cached = cache.get(key);
        if (cached != null) return cached;

        String value = loadFromDb.get();
        cache.set(key, value);
        return value;
    }

    public static void updateWithCacheAside(Cache cache, String key, Runnable writeToDb) {
        writeToDb.run();
        cache.delete(key);
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "cache-aside-system-design",
    required: false,
    title: "A Flash Sale Melts the Database",
    scenario: `An e-commerce site uses cache-aside with a 60-second TTL to cache product listing pages. It works fine under normal traffic.

At noon, a flash sale goes live on one specific product. Traffic to that product's page spikes to 50,000 requests/second. Every 60 seconds, when the cached entry expires, your monitoring shows a sharp spike in database CPU and query latency — sometimes bad enough to time out — followed by recovery once the cache is repopulated, until the next expiry.

Diagnose exactly what's happening during each spike, and propose fixes. Consider what changes if the fix has to work without redesigning the caching pattern entirely.`,
    hints: [
      "At the moment the cached entry expires, how many of those 50,000 requests/second see a cache miss in the same window, and what does each one of them do?",
      "This is a specific, well-known failure mode of cache-aside under high concurrency on a single hot key — what's it usually called?",
      "Could the application coordinate so that only one request repopulates the cache while the other 49,999 wait for it, instead of all 50,000 querying the database independently?",
      "Is there a way to avoid the sharp expiry-triggered spike in the first place, rather than just handling it better when it happens?",
      "What would change about this problem for a key that's merely popular (1,000 req/s) versus this flash-sale scale?",
    ],
    discussionPoints: [
      "**Diagnosis — cache stampede:** When the entry expires, every one of the ~50,000 requests/second arriving in that window sees a miss simultaneously and independently queries the database for the same row — a thundering herd against a single hot key, not a general capacity problem.",
      "**Request coalescing / single-flight:** Have the first request that sees a miss take a lock (or use a library with built-in single-flight support) and load from the database while all concurrent requests for the same key wait on that in-flight load instead of issuing their own query. This turns 50,000 concurrent DB queries into 1.",
      "**Stale-while-revalidate:** Serve the expired (stale) value immediately while one request refreshes it in the background, instead of having every request block on a miss. Trades a few seconds of staleness for eliminating the spike entirely.",
      "**Jittered TTLs:** If many keys expire in a synchronized wave (e.g. all warmed at the same deploy time), randomizing each key's TTL slightly prevents mass-simultaneous expiry — less relevant for a single hot key, but relevant if the real problem is many keys expiring together.",
      "**Proactive refresh for known-hot keys:** For a predictable event like a flash sale, pre-warm the cache and refresh it on a schedule (push-based) rather than relying purely on pull-based expiry-triggered reload for that specific key during the sale window.",
    ],
  },
];
