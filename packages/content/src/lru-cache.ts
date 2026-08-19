import type { Topic } from "@engineering-playbook/content-schema";

export const lruCache: Topic = {
  slug: "lru-cache",
  title: "LRU Cache",
  description:
    "A cache eviction policy that removes the Least Recently Used item when the cache reaches capacity — keeping hot data in memory and cold data out.",
  category: "data-structures",
  difficulty: "intermediate",
  estimatedMinutes: 25,
  prerequisites: ["hashing"],
  nextTopics: ["bloom-filter", "consistent-hashing"],

  content: {
    problemStatement: `
Caches are bounded. At some point, the cache is full and you must decide what to evict to make room for new data. The eviction policy directly impacts your cache hit rate — and therefore your system's performance.

**LRU (Least Recently Used)** is one of the most widely used policies. The intuition: if you haven't accessed something recently, you're unlikely to need it soon. Evict the coldest item.

The challenge is doing this efficiently. A naive approach (scan the cache on every eviction) is O(n). The real implementation achieves O(1) for both get and put.
    `.trim(),

    howItWorks: `
LRU Cache is implemented using a combination of two data structures:

**1. HashMap** — provides O(1) key lookup. Maps keys to doubly-linked list nodes.

**2. Doubly Linked List** — maintains access order. The most recently used item is at the head (front), the least recently used is at the tail (back).

**get(key):**
- Look up the node in the HashMap
- Move that node to the head of the list (mark as recently used)
- Return the value

**put(key, value):**
- If key exists: update the value and move to head
- If key is new:
  - Create a new node, add to head
  - Insert into HashMap
  - If over capacity: remove the tail node and delete from HashMap

**Why doubly linked?**
To remove a node from the middle of the list in O(1), you need both the next and previous pointers. Singly linked lists require O(n) traversal to find the predecessor.

**Sentinel nodes:**
A common implementation trick is to use dummy head and tail sentinel nodes. This eliminates edge cases for empty list or single-element operations.
    `.trim(),

    visualExplanation: `
capacity = 3

put(1, "a")  →  [1] ← head
put(2, "b")  →  [2] ↔ [1] ← head: 2, tail: 1
put(3, "c")  →  [3] ↔ [2] ↔ [1] ← head: 3, tail: 1

get(1)       →  move 1 to head
             →  [1] ↔ [3] ↔ [2] ← head: 1, tail: 2

put(4, "d")  →  cache full, evict tail (2)
             →  [4] ↔ [1] ↔ [3] ← head: 4, tail: 3

get(2)       →  miss! (was evicted)
    `.trim(),

    complexity: [
      { operation: "get(key)", time: "O(1)", space: "O(1)" },
      { operation: "put(key, value)", time: "O(1)", space: "O(1)" },
      { operation: "Space total", time: "-", space: "O(capacity)" },
    ],

    tradeoffs: {
      pros: [
        "O(1) for both reads and writes — constant time regardless of cache size",
        "Simple, well-understood eviction policy that works well for temporal locality",
        "Naturally adapts to access patterns — hot data stays, cold data leaves",
        "Built-in in many languages (Java LinkedHashMap, Python OrderedDict)",
      ],
      cons: [
        "Does not handle frequency — a single access promotes an item over frequently accessed ones (LFU is better for frequency-heavy workloads)",
        "Cache pollution: a large one-time sequential scan evicts all hot data (scan-resistant caches like ARC handle this)",
        "Not thread-safe by default — concurrent access requires locking",
        "Memory overhead of the doubly linked list pointers",
      ],
    },

    whenToUse: [
      "You need a bounded in-memory cache for frequently accessed data",
      "Your access pattern exhibits temporal locality (recently used items are likely to be used again)",
      "You need O(1) performance for reads and writes",
      "Database query result caches, API response caches, DNS caches",
    ],

    whenNotToUse: [
      "Your workload is frequency-based, not recency-based — consider LFU or TinyLFU (used by Caffeine/Guava)",
      "Sequential scans are common — they thrash an LRU cache. Use CLOCK or ARC instead",
      "You need persistence — LRU Cache is in-memory only",
      "You need distributed caching across multiple nodes — use Redis/Memcached instead",
    ],

    realWorldExamples: [
      "**CPU L1/L2 caches** — hardware caches use LRU-like policies for cache line eviction",
      "**Redis** — supports maxmemory-policy allkeys-lru for evicting LRU keys when memory is full",
      "**Memcached** — uses a slab allocator with LRU eviction per slab class",
      "**Java Caffeine** — high-performance cache using TinyLFU with a windowed LRU segment",
      "**Browser cache** — browsers use LRU-like policies for caching DNS entries and HTTP responses",
      "**LeetCode Problem 146** — LRU Cache is one of the most common system design-adjacent coding problems",
    ],
  },

  implementations: {
    typescript: `class LRUCache<K, V> {
  private capacity: number;
  private map: Map<K, ListNode<K, V>>;
  private head: ListNode<K, V>; // dummy head (MRU side)
  private tail: ListNode<K, V>; // dummy tail (LRU side)

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
    // Sentinel nodes eliminate edge cases
    this.head = new ListNode<K, V>(null as any, null as any);
    this.tail = new ListNode<K, V>(null as any, null as any);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V | null {
    const node = this.map.get(key);
    if (!node) return null;
    this.moveToHead(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }
    const node = new ListNode(key, value);
    this.map.set(key, node);
    this.addToHead(node);
    if (this.map.size > this.capacity) {
      const lru = this.removeTail();
      this.map.delete(lru.key);
    }
  }

  private addToHead(node: ListNode<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private removeNode(node: ListNode<K, V>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private moveToHead(node: ListNode<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): ListNode<K, V> {
    const lru = this.tail.prev!;
    this.removeNode(lru);
    return lru;
  }
}

class ListNode<K, V> {
  key: K;
  value: V;
  prev: ListNode<K, V> | null = null;
  next: ListNode<K, V> | null = null;
  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

// Usage
const cache = new LRUCache<number, string>(3);
cache.put(1, "one");
cache.put(2, "two");
cache.put(3, "three");
cache.get(1);        // "one" — moves 1 to MRU
cache.put(4, "four"); // evicts key 2 (LRU)
console.log(cache.get(2)); // null — evicted`,

    python: `from collections import OrderedDict
from typing import Generic, TypeVar, Optional

K = TypeVar("K")
V = TypeVar("V")


class LRUCache(Generic[K, V]):
    """
    Python's OrderedDict maintains insertion order and supports
    move_to_end(), making LRU trivial. In interviews, implement
    with a doubly linked list + dict for full control.
    """
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache: OrderedDict[K, V] = OrderedDict()

    def get(self, key: K) -> Optional[V]:
        if key not in self.cache:
            return None
        self.cache.move_to_end(key)  # mark as recently used
        return self.cache[key]

    def put(self, key: K, value: V) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)  # evict LRU (first item)


# Usage
cache: LRUCache[int, str] = LRUCache(capacity=3)
cache.put(1, "one")
cache.put(2, "two")
cache.put(3, "three")
cache.get(1)          # "one" — moves 1 to MRU
cache.put(4, "four")  # evicts key 2 (LRU)
print(cache.get(2))   # None — evicted`,

    java: `import java.util.HashMap;

public class LRUCache<K, V> {
    private final int capacity;
    private final HashMap<K, Node<K, V>> map;
    private final Node<K, V> head; // dummy head (MRU side)
    private final Node<K, V> tail; // dummy tail (LRU side)

    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        this.head = new Node<>(null, null);
        this.tail = new Node<>(null, null);
        head.next = tail;
        tail.prev = head;
    }

    public V get(K key) {
        Node<K, V> node = map.get(key);
        if (node == null) return null;
        moveToHead(node);
        return node.value;
    }

    public void put(K key, V value) {
        Node<K, V> existing = map.get(key);
        if (existing != null) {
            existing.value = value;
            moveToHead(existing);
            return;
        }
        Node<K, V> node = new Node<>(key, value);
        map.put(key, node);
        addToHead(node);
        if (map.size() > capacity) {
            Node<K, V> lru = removeTail();
            map.remove(lru.key);
        }
    }

    private void addToHead(Node<K, V> node) {
        node.prev = head;
        node.next = head.next;
        head.next.prev = node;
        head.next = node;
    }

    private void removeNode(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void moveToHead(Node<K, V> node) {
        removeNode(node);
        addToHead(node);
    }

    private Node<K, V> removeTail() {
        Node<K, V> lru = tail.prev;
        removeNode(lru);
        return lru;
    }

    static class Node<K, V> {
        K key;
        V value;
        Node<K, V> prev, next;
        Node(K key, V value) { this.key = key; this.value = value; }
    }
}`,
  },

  challenges: [
    {
      type: "multiple-choice",
      id: "lru-cache-conceptual",
      question:
        "An LRU Cache with capacity 3 has keys [A, B, C] where C is the most recently used. You call get(A), then put(D, ...). Which key is evicted?",
      options: [
        { id: "a", text: "A — it was accessed least recently before the get(A) call" },
        { id: "b", text: "B — it becomes the least recently used after get(A) moves A to MRU" },
        { id: "c", text: "C — it is the oldest key by insertion time" },
        { id: "d", text: "D — the new item is immediately evicted since the cache is full" },
      ],
      correctOptionId: "b",
      explanation:
        "After get(A), the order from MRU to LRU is: A, C, B. B is now the least recently used. When put(D) is called and the cache is full, B is evicted to make room for D.",
    },
    {
      type: "implementation",
      id: "lru-cache-implementation",
      title: "Implement an LRU Cache",
      description: `Implement an LRUCache class with two methods:

- **get(key)** — returns the value if present, otherwise -1 (or null). Marks the key as recently used.
- **put(key, value)** — inserts or updates the key. If at capacity, evicts the least recently used key first.

Both operations must run in **O(1)** time.

Hint: You'll need two data structures working together.`,
      starterCode: {
        typescript: `class LRUCache {
  constructor(private capacity: number) {
    // TODO: initialize your data structures
  }

  get(key: number): number {
    // TODO: return value or -1, mark as recently used
    return -1;
  }

  put(key: number, value: number): void {
    // TODO: insert or update, evict LRU if over capacity
  }
}`,
        python: `class LRUCache:
    def __init__(self, capacity: int):
        # TODO: initialize your data structures
        self.capacity = capacity

    def get(self, key: int) -> int:
        # TODO: return value or -1, mark as recently used
        return -1

    def put(self, key: int, value: int) -> None:
        # TODO: insert or update, evict LRU if over capacity
        pass`,
        java: `class LRUCache {
    public LRUCache(int capacity) {
        // TODO: initialize your data structures
    }

    public int get(int key) {
        // TODO: return value or -1, mark as recently used
        return -1;
    }

    public void put(int key, int value) {
        // TODO: insert or update, evict LRU if over capacity
    }
}`,
      },
      hints: [
        "A HashMap alone gives O(1) lookup but O(n) eviction — you need to find the LRU in O(1)",
        "A doubly linked list maintains order and allows O(1) removal of any node if you have a pointer to it",
        "Combine both: HashMap<key, ListNode> gives you a pointer directly to the node in the list",
        "Use dummy head/tail sentinel nodes to eliminate edge cases when inserting/removing from the list ends",
        "In Python, OrderedDict gives you this for free via move_to_end() and popitem(last=False)",
      ],
      solution: {
        typescript: `class LRUCache {
  private map = new Map<number, { key: number; value: number; prev: any; next: any }>();
  private head = { key: -1, value: -1, prev: null as any, next: null as any };
  private tail = { key: -1, value: -1, prev: null as any, next: null as any };

  constructor(private capacity: number) {
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: number): number {
    const node = this.map.get(key);
    if (!node) return -1;
    this.remove(node);
    this.addFront(node);
    return node.value;
  }

  put(key: number, value: number): void {
    if (this.map.has(key)) {
      const node = this.map.get(key)!;
      node.value = value;
      this.remove(node);
      this.addFront(node);
    } else {
      const node = { key, value, prev: null, next: null };
      this.map.set(key, node);
      this.addFront(node);
      if (this.map.size > this.capacity) {
        const lru = this.tail.prev;
        this.remove(lru);
        this.map.delete(lru.key);
      }
    }
  }

  private addFront(node: any) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  private remove(node: any) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }
}`,
        python: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)`,
        java: `import java.util.LinkedHashMap;
import java.util.Map;

class LRUCache extends LinkedHashMap<Integer, Integer> {
    private final int capacity;

    public LRUCache(int capacity) {
        super(capacity, 0.75f, true); // accessOrder=true
        this.capacity = capacity;
    }

    public int get(int key) {
        return super.getOrDefault(key, -1);
    }

    public void put(int key, int value) {
        super.put(key, value);
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
        return size() > capacity;
    }
}`,
      },
    },
    {
      type: "system-design",
      id: "lru-cache-system-design",
      title: "Distributed Session Cache",
      scenario: `You are designing the session management layer for a social platform with 50 million daily active users. Each user session is ~2KB of data.

The system currently loads session data from PostgreSQL on every authenticated request. At peak load (500K concurrent users), the database is overwhelmed.

**Your task:** Design a session caching layer that:
1. Reduces database load by at least 90%
2. Handles session expiry (sessions expire after 30 minutes of inactivity)
3. Scales as user base grows
4. Maintains session consistency when users log out

Consider what role LRU eviction plays, and where its limitations matter here.`,
      hints: [
        "500K concurrent sessions × 2KB = ~1GB of active session data — fits comfortably in memory",
        "LRU eviction naturally handles 'inactive session' eviction, but 30-minute TTL is a time-based requirement, not purely recency-based",
        "Redis supports both LRU eviction (maxmemory-policy) and per-key TTL — combining both solves the problem",
        "What happens during a logout? The cache entry must be invalidated immediately, not just left to expire",
        "If you add more app servers, each with a local cache, a logout on server A must propagate to servers B and C",
      ],
      discussionPoints: [
        "**Cache layer choice:** A local LRU cache per app server doesn't work for logout propagation — use a shared Redis cluster instead. Redis supports both LRU eviction and per-key TTL natively.",
        "**TTL + LRU together:** Set TTL=30min on each session key. Redis's LRU eviction handles memory pressure; TTL handles inactivity expiry. On every authenticated request, refresh the TTL (sliding expiry).",
        "**Logout invalidation:** On logout, explicitly delete the session key from Redis. With a local cache, you'd need a pub/sub invalidation mechanism (Redis pub/sub or a message bus).",
        "**Cache-aside pattern:** App reads from Redis first. On miss, loads from PostgreSQL and writes back to Redis with TTL. On write (session update), write to Redis and async to PostgreSQL.",
        "**Scaling:** Redis Cluster shards session keys across nodes by key hash. Session stickiness isn't required — any node serves any session.",
        "**Failure mode:** If Redis goes down, fall through to PostgreSQL. Implement a circuit breaker to prevent overwhelming the DB during a Redis outage.",
        "**LRU limitation here:** LRU eviction is a memory-pressure safety valve, not the primary TTL mechanism. Don't rely on eviction for correctness — always set explicit TTLs.",
      ],
    },
  ],
};
