import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "In cache-aside, every place in the application that reads cached data has to implement the same miss-handling logic: check the cache, and if it's empty, query the database, store the result, and return it. When that logic lives in five different services (or even five different functions in the same service), it's duplicated five times — and if the loading logic needs to change (a different query, added error handling, a new data source), every copy needs to change with it.",
      },
      {
        type: "p",
        text: "**Read-through** moves that miss-handling logic into the cache itself. The application calls one method — `get(key)` — and the cache transparently loads the value from the underlying data source on a miss, without the caller ever needing to know a miss happened.",
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
          "The cache is configured once with a **loader function** (sometimes called a `CacheLoader` or `MapLoader`) that knows how to fetch a value for a given key from the underlying data source.",
          "The application calls a single method, typically `get(key)`, and never calls the data source directly.",
          "**Hit:** the cache returns the stored value immediately — identical to any other caching pattern.",
          "**Miss:** the cache itself invokes the loader, stores the result, and returns it. The application code calling `get(key)` can't tell whether it was a hit or a miss — both return the value the same way.",
        ],
      },
      {
        type: "p",
        text: "This is structurally the same thing cache-aside does on a miss — load from the source, populate the cache, return the value — just with the responsibility moved from every call site into one place: the cache configuration. Google Guava's `LoadingCache` is a canonical example: `get(key)` either returns an already-cached value, or uses the cache's `CacheLoader` to atomically load a new value into the cache, and the caller's code looks identical either way.",
      },
      {
        type: "p",
        text: "The JSR-107 (JCache) standard formalizes this as a configuration flag — `setReadThrough(true)` plus a registered `CacheLoaderFactory` — making read-through a portable, declarative setting rather than something every caller has to implement by hand.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Cache-aside (miss-handling lives at every call site):
  Caller A: cache.get(k) -> miss -> db.query(k) -> cache.set(k, v) -> v
  Caller B: cache.get(k) -> miss -> db.query(k) -> cache.set(k, v) -> v
  (same four-step dance duplicated everywhere data is read)

Read-through (miss-handling lives once, inside the cache):
  Caller A: cache.get(k) ──▶ [cache checks itself, loader fetches on miss] ──▶ v
  Caller B: cache.get(k) ──▶ [same cache, same loader, same logic]        ──▶ v
  (callers only ever see get(key) — hit or miss is the cache's problem)`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      { operation: "Read (hit)", time: "O(1)", note: "Identical to any cache hit" },
      {
        operation: "Read (miss)",
        time: "O(1) cache op + cost of the loader",
        note: "Same cost as cache-aside's miss path — just invoked by the cache, not the caller",
      },
      {
        operation: "Code at each call site",
        time: "—",
        note: "O(1) lines — one get(key) call instead of a check-miss-load-populate block",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Miss-handling logic exists in exactly one place — the loader — instead of duplicated at every call site",
      "Callers have a simpler, uniform interface: get(key) always just works, with no branching on hit vs. miss",
      "Changing how data is loaded (a different query, added retries, a new backing store) means changing the loader once, not every caller",
    ],
    cons: [
      "Requires a cache implementation (or library) that actually supports configuring a loader — not every cache does this out of the box",
      "The loader function is coupled to the cache's lifecycle and configuration, which can make it less flexible than cache-aside's fully-manual control over exactly when and how a reload happens",
      "Harder to apply different loading strategies for different callers of the same key — the loader is one function serving everyone, where cache-aside lets each call site do something different if it needs to",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "The same cached data is read from many different places in the codebase, and the miss-handling logic would otherwise be duplicated",
      "Using a cache library or product that supports configuring a loader (Guava's LoadingCache, JCache-compliant caches, Hazelcast's MapStore, etc.)",
      "Teams that want a simple, uniform get(key) interface and don't need per-call-site control over loading behavior",
    ],
    whenNotToUse: [
      "Different call sites genuinely need different loading behavior for the same key — a single shared loader can't express that",
      "The caching layer in use doesn't support a loader abstraction, and building one is more complexity than the duplication it would remove",
      "Only one or two places in the codebase ever read this data — cache-aside's manual duplication isn't actually a problem yet",
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
          "**Google Guava's `LoadingCache`** is a direct, widely-used implementation: `get(key)` either returns a cached value or uses the attached `CacheLoader` to atomically compute and cache a new one — callers never branch on hit vs. miss.",
          "**The JSR-107 (JCache) standard** — the Java caching API that Spring's `@Cacheable` and other JCache-compliant providers build on — formalizes read-through as a configuration setting (`setReadThrough(true)` plus a registered `CacheLoaderFactory`), making it portable across any compliant cache provider rather than something hand-rolled per project.",
          "**Hazelcast's MapStore** supports read-through as one of its caching modes: on a miss, Hazelcast asks the configured `MapLoader`/`MapStore` to load the entry from the external system, transparent to the code calling `map.get(key)`.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Google Guava Wiki — CachesExplained",
            url: "https://github.com/google/guava/wiki/cachesexplained",
            verified: "2026-11-04",
            note: "LoadingCache.get() atomically loads via CacheLoader on a miss",
          },
          {
            name: "Hazelcast Docs — Building a Cache with MapStore",
            url: "https://docs.hazelcast.com/hazelcast/5.5/mapstore/working-with-external-data",
            verified: "2026-11-04",
            note: "Read-through: the cache asks MapLoader/MapStore to load a missing entry",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `type Loader<K, V> = (key: K) => Promise<V>;

class ReadThroughCache<K, V> {
  private cache = new Map<K, V>();

  constructor(private loader: Loader<K, V>) {}

  async get(key: K): Promise<V> {
    if (this.cache.has(key)) return this.cache.get(key)!;

    const value = await this.loader(key);
    this.cache.set(key, value);
    return value;
  }
}

// Usage — the loader is configured once; every caller just calls get(key).
const userCache = new ReadThroughCache<string, User>(async (id) => {
  return db.users.findById(id); // only this one place knows how to load a User
});

const user = await userCache.get("42"); // miss: loader runs, result cached, returned
const sameUser = await userCache.get("42"); // hit: returned directly, loader not called`,

  python: `from typing import Callable, Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


class ReadThroughCache(Generic[K, V]):
    def __init__(self, loader: Callable[[K], V]) -> None:
        self.loader = loader
        self.cache: dict[K, V] = {}

    def get(self, key: K) -> V:
        if key in self.cache:
            return self.cache[key]

        value = self.loader(key)
        self.cache[key] = value
        return value


# Usage — the loader is configured once; every caller just calls get(key).
user_cache: ReadThroughCache[str, User] = ReadThroughCache(lambda id: db.users.find_by_id(id))

user = user_cache.get("42")  # miss: loader runs, result cached, returned
same_user = user_cache.get("42")  # hit: returned directly, loader not called`,

  java: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

public class ReadThroughCache<K, V> {
    private final Map<K, V> cache = new ConcurrentHashMap<>();
    private final Function<K, V> loader;

    public ReadThroughCache(Function<K, V> loader) {
        this.loader = loader;
    }

    public V get(K key) {
        return cache.computeIfAbsent(key, loader); // loader only runs on a miss
    }
}

// Usage — the loader is configured once; every caller just calls get(key).
ReadThroughCache<String, User> userCache = new ReadThroughCache<>(id -> db.findUserById(id));

User user = userCache.get("42"); // miss: loader runs, result cached, returned
User sameUser = userCache.get("42"); // hit: returned directly, loader not called`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "read-through-conceptual",
    required: true,
    question:
      "In a read-through cache, where does the code that fetches data from the database on a cache miss live?",
    options: [
      { id: "a", text: "In every place in the application that reads this cached data" },
      { id: "b", text: "In a loader function, configured once on the cache itself" },
      { id: "c", text: "Nowhere — read-through caches never miss, by definition" },
      { id: "d", text: "In the database, as a stored procedure the cache calls" },
    ],
    correctOptionId: "b",
    explanation:
      "This is the entire point of read-through: the miss-handling logic (fetch from the database, populate the cache) lives in one place — the loader function configured on the cache — instead of being duplicated at every call site that reads the data, which is what cache-aside requires. Read-through caches absolutely can miss (option c is wrong); the difference from cache-aside is only who's responsible for handling the miss.",
  },
  {
    type: "implementation",
    id: "read-through-implementation",
    required: true,
    title: "Implement a Read-Through Cache",
    description: `Implement a generic read-through cache:

- **ReadThroughCache(loader)** — constructed with a loader function that knows how to fetch a value for a given key.
- **get(key)** — returns the cached value on a hit. On a miss, calls the loader, stores the result, and returns it. The loader must never be called more than once for the same key as long as that key stays cached.`,
    starterCode: {
      typescript: `type Loader<K, V> = (key: K) => Promise<V>;

class ReadThroughCache<K, V> {
  private cache = new Map<K, V>();

  constructor(private loader: Loader<K, V>) {}

  async get(key: K): Promise<V> {
    // TODO: return cached value on hit; on miss, call the loader, store, and return
    return this.loader(key);
  }
}`,
      python: `from typing import Callable, Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


class ReadThroughCache(Generic[K, V]):
    def __init__(self, loader: Callable[[K], V]) -> None:
        self.loader = loader
        self.cache: dict[K, V] = {}

    def get(self, key: K) -> V:
        # TODO: return cached value on hit; on miss, call the loader, store, and return
        return self.loader(key)`,
      java: `import java.util.Map;
import java.util.HashMap;
import java.util.function.Function;

public class ReadThroughCache<K, V> {
    private final Map<K, V> cache = new HashMap<>();
    private final Function<K, V> loader;

    public ReadThroughCache(Function<K, V> loader) {
        this.loader = loader;
    }

    public V get(K key) {
        // TODO: return cached value on hit; on miss, call the loader, store, and return
        return loader.apply(key);
    }
}`,
    },
    hints: [
      "Check the cache for the key first — only call the loader if the key isn't present",
      "Store the loader's result in the cache before returning it, so the next get() for the same key is a hit",
      "In Java, Map.computeIfAbsent(key, loader) does exactly this in one call — but understand why it only invokes the loader on a miss before reaching for it",
      "The key property to preserve: calling get(key) twice in a row for the same key should only invoke the loader once",
    ],
    solution: {
      typescript: `type Loader<K, V> = (key: K) => Promise<V>;

class ReadThroughCache<K, V> {
  private cache = new Map<K, V>();

  constructor(private loader: Loader<K, V>) {}

  async get(key: K): Promise<V> {
    if (this.cache.has(key)) return this.cache.get(key)!;

    const value = await this.loader(key);
    this.cache.set(key, value);
    return value;
  }
}`,
      python: `from typing import Callable, Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


class ReadThroughCache(Generic[K, V]):
    def __init__(self, loader: Callable[[K], V]) -> None:
        self.loader = loader
        self.cache: dict[K, V] = {}

    def get(self, key: K) -> V:
        if key in self.cache:
            return self.cache[key]

        value = self.loader(key)
        self.cache[key] = value
        return value`,
      java: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

public class ReadThroughCache<K, V> {
    private final Map<K, V> cache = new ConcurrentHashMap<>();
    private final Function<K, V> loader;

    public ReadThroughCache(Function<K, V> loader) {
        this.loader = loader;
    }

    public V get(K key) {
        return cache.computeIfAbsent(key, loader);
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "read-through-system-design",
    required: false,
    title: "Centralizing Product Lookups Across Five Services",
    scenario: `Your e-commerce platform has five services — checkout, search, recommendations, inventory, and the admin dashboard — each independently caching product data with its own hand-rolled cache-aside logic: check cache, miss, query the product database, populate, return.

A recent incident: the product database schema changed (a field was renamed), and four of the five services were updated to match, but the fifth (recommendations) was missed. It silently continued reading the old field name, returning null for a property that should have been populated, for three days before anyone noticed.

Propose a redesign using read-through, and explain specifically how it would have prevented this incident — and what it wouldn't have prevented.`,
    hints: [
      "Where does the knowledge of 'how to query the product database and shape the result' currently live, and how many copies of it exist?",
      "If that knowledge lived in exactly one place, what happens when the schema changes?",
      "Does read-through help if the shared loader itself has the bug? What kind of bug does centralizing actually protect against?",
      "All five services presumably still need a product-shaped value back from get(key) — does moving to read-through change what each service does with the result once they have it?",
      "Is there a deployment/ownership question here — who owns the shared loader, and what happens if one of the five services needs a different shape of data from it?",
    ],
    discussionPoints: [
      "**Root cause this directly addresses:** The incident happened because the same loading logic was duplicated five times and one copy drifted out of sync with a schema change. A read-through cache with one shared loader means there's exactly one place to update when the schema changes — not five, with four getting updated and one forgotten.",
      "**What it doesn't prevent:** If the shared loader itself has the bug (the schema-change update is applied incorrectly), all five services now see the same wrong behavior instead of four being right and one being wrong. Centralizing reduces the *number* of places a bug can hide, not the possibility of a bug — it would have turned a partial, silent 3-day incident into (hopefully) an immediately obvious one affecting everything at once, which is easier to catch, not a guarantee against the underlying mistake.",
      "**Ownership:** A shared loader used by five services needs a clear owner and a deployment/versioning story — if the loader lives in a shared library, all five services need to pick up a new version when it changes, which trades 'five places to edit' for 'five places to redeploy,' a different but real coordination cost.",
      "**Per-caller flexibility is reduced:** If the admin dashboard genuinely needs a different, richer shape of product data than checkout does, a single shared loader can't express that without either overfetching for everyone or adding parameters/variants to the loader — read-through's simplicity assumes most callers want the same thing.",
      "**Detection, not just prevention:** Centralizing also makes monitoring easier — one loader means one place to add logging, metrics, or alerting on load failures, instead of needing five separate instrumentation efforts (which is itself plausibly why the incident went unnoticed for three days).",
    ],
  },
];
