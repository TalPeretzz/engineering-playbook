import type { Section } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  // ─── UNDERSTAND ────────────────────────────────────────────────────────────

  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    phase: "understand",
    body: [
      {
        type: "p",
        text: "Your API service loads user profiles from a database. Each load takes 50 ms and costs a round-trip. The same 5% of profiles account for 80% of traffic — so you add an in-memory cache.",
      },
      {
        type: "p",
        text: "The cache helps — until it fills up. Now a new problem: when the cache is at capacity and a new entry arrives, **something must leave**. Which one?",
      },
      {
        type: "p",
        text: "**LRU (Least Recently Used)** answers that question: evict the entry accessed least recently. The intuition: if you haven't touched something in a while, you're unlikely to need it soon.",
      },
      {
        type: "list",
        items: [
          "**Cache hit** — key found; return the value and mark it as recently used.",
          "**Cache miss** — key absent; load from source, cache it, evict the LRU entry if at capacity.",
          "**Update** — putting an existing key updates its value **and** promotes it to MRU.",
          "**LRU is an eviction policy, not a complete caching strategy** — it decides what to remove when space is needed, not when entries expire or become stale.",
        ],
      },
      {
        type: "p",
        text: "The critical constraint: both `get` and `put` must run in **O(1) average** time. A naive scan to find the oldest item is O(n) and collapses at scale.",
      },
    ],
  },

  {
    type: "text",
    id: "intuition",
    heading: "The core intuition",
    phase: "understand",
    body: [
      {
        type: "p",
        text: "LRU Cache maintains two data structures in perfect sync:",
      },
      {
        type: "list",
        items: [
          "**A hash map** — maps each key directly to its list node, giving O(1) average lookup.",
          "**A doubly linked list** — stores nodes in recency order: head = MRU (most recently used), tail = LRU (least recently used).",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Why a doubly linked list?",
      },
      {
        type: "p",
        text: "Every `get` and `put` must move an arbitrary node to the MRU end. Removing a node from the middle of a list in O(1) requires knowing its predecessor. A singly linked list forces you to scan from the head — O(n). A **doubly linked list** gives each node a `prev` pointer, making any removal O(1) if you already have a pointer to the node.",
      },
      {
        type: "p",
        text: "The hash map supplies that direct pointer: `map[key]` is the node itself, not just the value. The combination makes every operation O(1) average.",
      },
      {
        type: "heading",
        level: 3,
        text: "The invariant",
      },
      {
        type: "list",
        items: [
          "Every cached key exists in the map exactly once.",
          "Every map entry points to exactly one node in the list.",
          "The list order represents recency — left (head) = MRU, right (tail) = LRU.",
          "The list length never exceeds capacity.",
        ],
      },
    ],
  },

  {
    type: "lru-visual",
    id: "visual",
    heading: "Interactive visualization",
    phase: "understand",
  },

  {
    type: "text",
    id: "how-it-works",
    heading: "How does it work?",
    phase: "understand",
    body: [
      {
        type: "heading",
        level: 3,
        text: "get(key)",
      },
      {
        type: "list",
        items: [
          "Look up the key in the hash map.",
          "If absent, return −1 (cache miss).",
          "Remove the node from its current list position.",
          "Move it to the MRU end (just after head sentinel).",
          "Return the node's value.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "put(key, value)",
      },
      {
        type: "list",
        items: [
          "If the key already exists: update its value and move its node to MRU.",
          "If new: create a node, insert it into the map, add it to the MRU end of the list.",
          "If the map now exceeds capacity: remove the LRU node (just before the tail sentinel).",
          "Delete the evicted key from the map.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Sentinel nodes",
      },
      {
        type: "p",
        text: "Dummy head and tail sentinels eliminate all edge cases for empty-list or single-element operations. Real nodes always live between them: `head.next` is always the MRU entry, `tail.prev` is always the LRU entry.",
      },
      {
        type: "heading",
        level: 3,
        text: "Edge cases",
      },
      {
        type: "list",
        items: [
          "**Capacity 1** — every put immediately evicts the previous entry.",
          "**Updating an existing key** — changes the value AND moves the node to MRU. Size does not change.",
          "**Repeated reads** — each `get` moves the key to MRU, making it the last candidate for eviction.",
          "**A cache hit changes the eviction candidate** — after `get(A)`, the next eviction targets the new LRU, not A.",
          "**Empty cache or missing key** — `get` returns −1; `put` adds normally.",
          "**Invalid capacity (≤ 0)** — this implementation throws in the constructor.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Common implementation bugs",
      },
      {
        type: "list",
        items: [
          "**Forgetting to delete the evicted key from the map** — the list evicts the tail node, but if you omit `map.delete(lru.key)`, the stale map entry remains. Subsequent gets return the evicted value instead of −1.",
          "**Duplicate node on update** — calling `put` on an existing key and creating a new node instead of updating in-place leaves a ghost node in the list and breaks the map invariant.",
          "**Wrong eviction timing** — checking `map.size > capacity` before inserting the new node evicts prematurely. Always check after insertion.",
          "**Skipping MRU promotion on `put`** — updating an existing key's value without moving its node to the MRU end violates the recency invariant. A recently-updated key may be evicted next.",
          "**Null-pointer crashes without sentinels** — using real nodes as list head/tail requires special-case branches for empty-list and single-node operations in every helper.",
        ],
      },
    ],
  },

  // ─── DEEP DIVE ─────────────────────────────────────────────────────────────

  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    phase: "deep-dive",
    entries: [
      {
        operation: "get(key)",
        time: "O(1) avg",
        space: "O(1)",
        note: "hash map lookup + list node move",
      },
      {
        operation: "put(key, value)",
        time: "O(1) avg",
        space: "O(1)",
        note: "hash map insert/update + list node add/move",
      },
      {
        operation: "Eviction",
        time: "O(1)",
        space: "O(1)",
        note: "remove tail.prev + map.delete",
      },
      {
        operation: "Total cache storage",
        time: "—",
        space: "O(capacity)",
        note: "map entries + list nodes, bounded by capacity",
      },
    ],
  },

  {
    type: "text",
    id: "complexity-note",
    heading: "Why other designs are slower",
    phase: "deep-dive",
    body: [
      {
        type: "p",
        text: "Hash map operations are O(1) **on average** — not worst-case in every theoretical model, but effectively constant in practice with a good hash function.",
      },
      {
        type: "list",
        items: [
          "**Array or list only** — lookup requires scanning the whole structure: O(n) per get.",
          "**Hash map + timestamp scanning** — lookup is O(1), but finding the minimum timestamp on eviction requires scanning all entries: O(n).",
          "**Hash map + min-heap** — eviction is O(log n); every `get` also requires a heap update: O(log n).",
          "**Hash map + doubly linked list** — lookup, recency update, and eviction are all O(1) average. No better asymptotic bound is achievable.",
        ],
      },
    ],
  },

  {
    type: "comparison",
    id: "eviction-comparison",
    heading: "LRU vs other eviction strategies",
    phase: "deep-dive",
    collapsible: true,
    columns: ["Strategy", "Eviction candidate", "Recency", "Frequency", "Complexity", "Best fit"],
    rows: [
      {
        Strategy: "LRU",
        "Eviction candidate": "Least recently accessed",
        Recency: "Yes",
        Frequency: "No",
        Complexity: "O(1) avg",
        "Best fit": "Temporal locality — repeated access to same items",
      },
      {
        Strategy: "FIFO",
        "Eviction candidate": "Oldest inserted",
        Recency: "No",
        Frequency: "No",
        Complexity: "O(1)",
        "Best fit": "Streaming, queues — recency does not predict access",
      },
      {
        Strategy: "LFU",
        "Eviction candidate": "Least frequently accessed",
        Recency: "No",
        Frequency: "Yes",
        Complexity: "O(1) with careful impl",
        "Best fit": "Popularity-skewed — some items are always hot",
      },
      {
        Strategy: "Random",
        "Eviction candidate": "Random entry",
        Recency: "No",
        Frequency: "No",
        Complexity: "O(1)",
        "Best fit": "Uniform access distributions; simplest possible",
      },
      {
        Strategy: "TTL expiration",
        "Eviction candidate": "Entries older than TTL",
        Recency: "No",
        Frequency: "No",
        Complexity: "O(1) per entry",
        "Best fit": "Data freshness — different problem from capacity",
      },
      {
        Strategy: "No eviction",
        "Eviction candidate": "None (unbounded growth)",
        Recency: "N/A",
        Frequency: "N/A",
        Complexity: "O(1)",
        "Best fit": "Fully bounded working set known at startup",
      },
    ],
  },

  {
    type: "text",
    id: "ttl-vs-lru",
    heading: "TTL and LRU solve different problems",
    phase: "deep-dive",
    collapsible: true,
    body: [
      {
        type: "p",
        text: "**TTL (Time to Live)** answers: is this entry too old to trust? It evicts entries after a fixed duration, regardless of how recently they were accessed.",
      },
      {
        type: "p",
        text: "**LRU** answers: which entry should I remove when I'm out of space? It evicts the entry accessed least recently, regardless of age.",
      },
      {
        type: "list",
        items: [
          "A frequently accessed but stale entry passes LRU eviction — it's 'recently used'. TTL is needed to catch it.",
          "A recently inserted but unread entry survives TTL — it's 'fresh'. LRU may evict it if space is needed.",
          "Production caches typically use both: LRU for capacity management, TTL for data freshness.",
        ],
      },
    ],
  },

  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    phase: "deep-dive",
    pros: [
      "Simple, widely understood eviction heuristic",
      "O(1) average for get, put, and eviction with the hash map + doubly linked list design",
      "Naturally adapts to recent access patterns — hot data stays, cold data leaves",
      "Bounded memory — cache size never exceeds capacity",
      "Effective when recent usage predicts future usage (temporal locality)",
    ],
    cons: [
      "Extra memory for linked-list node pointers (prev/next per entry)",
      "A single large sequential scan evicts all genuinely hot entries — scan-heavy workloads are poorly served",
      "Does not track access frequency — one access promotes an entry identically to a thousand",
      "Requires synchronization in concurrent environments; the shared recency list is a write-heavy contention point",
      "Does not inherently handle expiration, stale data, or distributed invalidation",
    ],
  },

  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    phase: "deep-dive",
    whenToUse: [
      "In-process caching of expensive computations or database query results",
      "Resource or object caching where recent access strongly predicts future access",
      "Bounded server-side caches for session data, rendered pages, or metadata",
      "Browser history, recently opened files, or recently viewed items",
      "Any cache needing O(1) average get/put with simple, predictable eviction",
    ],
    whenNotToUse: [
      "Workloads with frequent full scans — sequential reads pollute the cache and evict hot data",
      "Access frequency matters more than recency — consider LFU, TinyLFU, or ARC",
      "Data correctness requires immediate invalidation on change — LRU alone cannot handle staleness",
      "Entries have very different sizes but capacity counts only item count (size-aware eviction needed)",
      "Distributed caches requiring globally consistent eviction across nodes",
      "The working set is much larger than the cache with little temporal locality",
    ],
  },

  {
    type: "text",
    id: "real-world",
    heading: "Real-world usage",
    phase: "deep-dive",
    collapsible: true,
    body: [
      {
        type: "list",
        items: [
          "**Redis** — supports `maxmemory-policy allkeys-lru` and `volatile-lru` to approximate LRU eviction when memory is exhausted. Redis samples a small random subset of keys on each eviction rather than tracking a full sorted order, keeping overhead minimal.",
          "**Memcached** — uses per-slab LRU lists. Each memory class maintains its own LRU tail pointer, making eviction O(1) within a slab without global locking.",
          "**CPU L1/L2 caches** — hardware caches use pseudo-LRU or LRU-approximation policies for cache line eviction. True LRU in hardware is prohibitively expensive at nanosecond timescales.",
          "**Linux kernel page replacement** — uses the Clock algorithm (second-chance) as an efficient LRU approximation for page frame management.",
          "**Java Caffeine** — uses W-TinyLFU (windowed LRU + TinyLFU) combining a small LRU admission window with a frequency filter to achieve high hit rates even with scan-heavy workloads.",
          "**Database buffer pools** — PostgreSQL and MySQL InnoDB use LRU-based page replacement for their buffer pools, often with a 'young' and 'old' sublist to resist scan pollution from large sequential reads.",
        ],
      },
    ],
  },

  {
    type: "text",
    id: "production-considerations",
    heading: "Production considerations",
    phase: "deep-dive",
    collapsible: true,
    body: [
      {
        type: "p",
        text: "A basic LRU implementation is a useful mental model. Deploying one in production requires thinking through several additional concerns.",
      },
      {
        type: "heading",
        level: 3,
        text: "Concurrency",
      },
      {
        type: "list",
        items: [
          "**Thread safety** — every `get` mutates the list (moves a node), making the recency list a write-heavy contention point. A single global lock serializes all operations.",
          "**Lock contention** — shard the cache: partition keys by `hash(key) % numShards`, each shard owning its own map and list. Lock contention drops proportionally.",
          "**Lock-free approaches** — Caffeine uses a ring buffer of recent operations replayed by a background thread to defer recency updates, avoiding lock overhead on the read path.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Expiration",
      },
      {
        type: "list",
        items: [
          "**Lazy expiration** — check TTL on every read; return −1 and evict if expired. Simple, but leaves stale entries in memory until they're accessed.",
          "**Eager expiration** — a background thread periodically scans for and removes expired entries. Keeps memory usage predictable but adds background work.",
          "**Sliding TTL** — reset the TTL clock on every access (not just insertion). Useful for session caches where activity extends validity.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Cache stampede",
      },
      {
        type: "list",
        items: [
          "When a popular key expires or is evicted, concurrent requests all miss and simultaneously hit the backing store — the thundering herd problem.",
          "**Request coalescing** — only the first request fetches the data; the rest wait and share the result (promise/future pattern).",
          "**Probabilistic early expiration** — proactively refresh entries just before they expire with a probability proportional to the remaining time, avoiding a simultaneous miss wave.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Observability and tuning",
      },
      {
        type: "list",
        items: [
          "**Key metrics** — track hit rate, miss rate, eviction rate, load latency (cache hit vs. miss path), and memory consumption. Hit rate < 80% often indicates the cache is undersized or the workload has low temporal locality.",
          "**Capacity tuning** — analyze the hit-rate-vs-size curve to find the knee where additional capacity produces diminishing returns.",
          "**Warm-up** — on startup a cold cache causes a miss storm. Pre-warm by loading the expected hot keys before accepting traffic, or tolerate a ramp-up period.",
          "**Negative caching** — cache 'miss' results (e.g., 'key not found in database') to prevent repeated lookups for non-existent keys. Use a shorter TTL for negative entries.",
          "**Mutable values** — if cached values can be updated externally, the cache may serve stale data. Use TTL, invalidation callbacks, or versioning to keep it fresh.",
          "**Eviction callbacks** — fire a hook when an entry is evicted, useful for releasing resources such as file handles or database connections.",
          "**Serialization** — if the cache must survive restarts, serialize the map and list order to disk. Reload on startup to avoid a cold cache.",
          "**Entry size awareness** — standard LRU counts items, not bytes. For variable-size objects, a large entry may consume the same slot as a tiny one. Consider size-aware eviction if entry sizes vary significantly.",
        ],
      },
    ],
  },

  // ─── APPLY ─────────────────────────────────────────────────────────────────

  {
    type: "comparison",
    id: "recap",
    heading: "What should you remember?",
    phase: "apply",
    columns: ["Property", "What it means"],
    rows: [
      {
        Property: "Eviction policy",
        "What it means":
          "Removes the entry accessed least recently when the cache is at capacity.",
      },
      {
        Property: "Reads update recency",
        "What it means":
          "get() moves the accessed node to MRU — it is the last candidate for eviction after a hit.",
      },
      {
        Property: "Updates update recency",
        "What it means":
          "put() on an existing key updates the value AND promotes the node to MRU.",
      },
      {
        Property: "O(1) avg via hash map",
        "What it means":
          "map[key] gives a direct pointer to the list node — no scanning needed for lookup. Average-case constant time due to hash function.",
      },
      {
        Property: "O(1) via doubly linked list",
        "What it means":
          "Any node can be removed and moved to front in O(1) because each node knows its prev and next.",
      },
      {
        Property: "MRU/LRU consistency",
        "What it means":
          "head.next is always the MRU entry; tail.prev is always the LRU entry. Every operation must preserve this.",
      },
      {
        Property: "Capacity ≠ TTL",
        "What it means":
          "LRU handles memory pressure. Time-based expiration is a separate concern — production caches use both.",
      },
    ],
  },

  {
    type: "text",
    id: "simple-implementation",
    heading: "The bare-bones implementation",
    phase: "apply",
    body: [
      {
        type: "p",
        text: "Before the full implementation, here is the complete LRU mechanism in under 30 lines — fixed capacity, no generics, plain objects as nodes. Just: map + list + move-to-front.",
      },
      {
        type: "code",
        language: "typescript",
        code: `const capacity = 3;
const map = new Map();                            // key → node
const head = { prev: null, next: null };          // dummy MRU sentinel
const tail = { prev: null, next: null };          // dummy LRU sentinel
head.next = tail;
tail.prev = head;

function addToFront(node) {
  node.next = head.next;  node.prev = head;
  head.next.prev = node;  head.next = node;
}
function removeNode(node) {
  node.prev.next = node.next;  node.next.prev = node.prev;
}

function get(key) {
  if (!map.has(key)) return -1;          // cache miss
  const node = map.get(key);
  removeNode(node);  addToFront(node);   // promote to MRU
  return node.value;
}

function put(key, value) {
  if (map.has(key)) {
    const node = map.get(key);
    node.value = value;
    removeNode(node);  addToFront(node); // update + promote
    return;
  }
  const node = { key, value, prev: null, next: null };
  map.set(key, node);
  addToFront(node);
  if (map.size > capacity) {
    const lru = tail.prev;               // the actual LRU node
    removeNode(lru);
    map.delete(lru.key);
  }
}`,
      },
      {
        type: "p",
        text: "That is the complete algorithm. The full implementation below adds a class wrapper, generic typing, and capacity validation.",
      },
    ],
  },
];
