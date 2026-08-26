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
cache.get(1);         // "one" — moves 1 to MRU
cache.put(4, "four"); // evicts key 2 (LRU)
console.log(cache.get(2)); // null — evicted`,

    python: `from collections import OrderedDict
from typing import Generic, TypeVar, Optional

K = TypeVar("K")
V = TypeVar("V")


class LRUCache(Generic[K, V]):
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache: OrderedDict[K, V] = OrderedDict()

    def get(self, key: K) -> Optional[V]:
        if key not in self.cache:
            return None
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: K, value: V) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)  # evict LRU (first item)


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
        node.prev = head; node.next = head.next;
        head.next.prev = node; head.next = node;
    }
    private void removeNode(Node<K, V> node) {
        node.prev.next = node.next; node.next.prev = node.prev;
    }
    private void moveToHead(Node<K, V> node) { removeNode(node); addToHead(node); }
    private Node<K, V> removeTail() { Node<K, V> lru = tail.prev; removeNode(lru); return lru; }

    static class Node<K, V> {
        K key; V value; Node<K, V> prev, next;
        Node(K key, V value) { this.key = key; this.value = value; }
    }
}`,
  },

  sections: [
    {
      type: "text",
      id: "problem",
      heading: "What problem does it solve?",
      body: [
        {
          type: "p",
          text: "Caches are bounded. At some point the cache is full and you must decide what to evict to make room for new data. The eviction policy directly impacts your cache hit rate — and therefore your system's performance.",
        },
        {
          type: "p",
          text: "**LRU (Least Recently Used)** is one of the most widely used policies. The intuition: if you haven't accessed something recently, you're unlikely to need it soon. Evict the coldest item.",
        },
        {
          type: "p",
          text: "The challenge is efficiency. A naive approach — scanning the cache on every eviction — is O(n). The real implementation achieves O(1) for both get and put.",
        },
      ],
    },
    {
      type: "text",
      id: "how-it-works",
      heading: "How does it work?",
      body: [
        {
          type: "p",
          text: "LRU Cache is implemented using two data structures working together:",
        },
        {
          type: "list",
          items: [
            "**HashMap** — O(1) key lookup; maps keys to doubly-linked list nodes.",
            "**Doubly Linked List** — maintains access order; MRU at head, LRU at tail.",
          ],
        },
        {
          type: "heading",
          level: 3,
          text: "get(key)",
        },
        {
          type: "list",
          items: [
            "Look up the node in the HashMap",
            "Move it to the head (mark as recently used)",
            "Return its value",
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
            "If key exists: update value and move node to head",
            "If key is new: create a node, add to head, insert into HashMap. If over capacity: remove tail node and delete from HashMap.",
          ],
        },
        {
          type: "p",
          text: "**Why doubly linked?** To remove a node from the middle in O(1) you need both next and prev pointers. Singly linked lists require O(n) traversal to find the predecessor.",
        },
        {
          type: "p",
          text: "**Sentinel nodes:** Use dummy head and tail nodes to eliminate all edge cases for empty-list or single-element operations.",
        },
      ],
    },
    {
      type: "visual",
      id: "visual",
      heading: "Step-by-step visual",
      content: `capacity = 3

put(1, "a")  →  [1]
put(2, "b")  →  [2] ↔ [1]          head: 2  tail: 1
put(3, "c")  →  [3] ↔ [2] ↔ [1]   head: 3  tail: 1

get(1)       →  move 1 to head
             →  [1] ↔ [3] ↔ [2]   head: 1  tail: 2

put(4, "d")  →  cache full, evict tail (key 2)
             →  [4] ↔ [1] ↔ [3]   head: 4  tail: 3

get(2)       →  miss! (was evicted)`,
    },
    {
      type: "complexity",
      id: "complexity",
      heading: "Complexity",
      entries: [
        { operation: "get(key)", time: "O(1)", space: "O(1)" },
        { operation: "put(key, value)", time: "O(1)", space: "O(1)" },
        { operation: "Space (total)", time: "—", space: "O(capacity)" },
      ],
    },
    {
      type: "tradeoffs",
      id: "tradeoffs",
      heading: "Tradeoffs",
      pros: [
        "O(1) for both reads and writes — constant time regardless of cache size",
        "Simple, well-understood eviction policy that works well for temporal locality",
        "Naturally adapts to access patterns — hot data stays, cold data leaves",
        "Built-in support in many languages: Java LinkedHashMap, Python OrderedDict",
      ],
      cons: [
        "Does not handle frequency — one access promotes an item over frequently-used ones (LFU handles frequency-heavy workloads better)",
        "Cache pollution: a large sequential scan evicts all hot data (ARC and CLOCK are more scan-resistant)",
        "Not thread-safe by default — concurrent access requires external locking",
        "Memory overhead from doubly linked list pointers",
      ],
    },
    {
      type: "use-cases",
      id: "use-cases",
      heading: "When to use / when not to use",
      whenToUse: [
        "Bounded in-memory cache for frequently accessed data with temporal locality",
        "Database query result caches, API response caches, DNS caches",
        "You need O(1) get and put guarantees",
      ],
      whenNotToUse: [
        "Frequency-based workloads — consider LFU or TinyLFU (used by Caffeine/Guava)",
        "Sequential scans are common — they thrash an LRU cache; use CLOCK or ARC",
        "Distributed caching across nodes — use Redis or Memcached",
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
            "**Redis** — supports maxmemory-policy allkeys-lru for evicting LRU keys when memory is full",
            "**Memcached** — uses a slab allocator with per-slab LRU eviction",
            "**Java Caffeine** — high-performance cache using TinyLFU with a windowed LRU segment",
            "**CPU L1/L2 caches** — hardware caches use LRU-like policies for cache line eviction",
          ],
        },
      ],
    },
  ],

  challenges: [
    {
      type: "multiple-choice",
      id: "lru-cache-conceptual",
      required: true,
      question:
        "An LRU Cache with capacity 3 has keys [A, B, C] where C is most recently used. You call get(A), then put(D, ...). Which key is evicted?",
      options: [
        { id: "a", text: "A — it was least recently used before the get(A) call" },
        { id: "b", text: "B — it becomes least recently used after get(A) promotes A" },
        { id: "c", text: "C — it is the oldest key by insertion time" },
        { id: "d", text: "D — the new item is immediately evicted since the cache is full" },
      ],
      correctOptionId: "b",
      explanation:
        "After get(A), the order from MRU to LRU is: A, C, B. B is now the least recently used. When put(D) is called and the cache is full, B is evicted.",
    },
    {
      type: "implementation",
      id: "lru-cache-implementation",
      required: true,
      title: "Implement an LRU Cache",
      description: `Implement an LRUCache class with two methods:

- **get(key)** — returns the value if present, otherwise -1. Marks the key as recently used.
- **put(key, value)** — inserts or updates the key. If at capacity, evicts the least recently used key first.

Both operations must run in **O(1)** time.`,
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
        self.capacity = capacity

    def get(self, key: int) -> int:
        return -1

    def put(self, key: int, value: int) -> None:
        pass`,
        java: `class LRUCache {
    public LRUCache(int capacity) {}
    public int get(int key) { return -1; }
    public void put(int key, int value) {}
}`,
      },
      hints: [
        "A HashMap alone gives O(1) lookup but O(n) eviction — you need to find the LRU in O(1)",
        "A doubly linked list maintains order and allows O(1) removal of any node if you have a pointer to it",
        "Combine both: HashMap<key, ListNode> gives you a pointer directly to the node in the list",
        "Use dummy head/tail sentinel nodes to eliminate edge cases",
        "In Python, OrderedDict gives you this for free via move_to_end() and popitem(last=False)",
      ],
      solution: {
        typescript: `class LRUCache {
  private map = new Map<number, { key: number; value: number; prev: any; next: any }>();
  private head = { key: 0, value: 0, prev: null as any, next: null as any };
  private tail = { key: 0, value: 0, prev: null as any, next: null as any };

  constructor(private capacity: number) {
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: number): number {
    const node = this.map.get(key);
    if (!node) return -1;
    this.remove(node); this.addFront(node);
    return node.value;
  }

  put(key: number, value: number): void {
    if (this.map.has(key)) {
      const node = this.map.get(key)!;
      node.value = value;
      this.remove(node); this.addFront(node);
    } else {
      const node = { key, value, prev: null, next: null };
      this.map.set(key, node);
      this.addFront(node);
      if (this.map.size > this.capacity) {
        const lru = this.tail.prev;
        this.remove(lru); this.map.delete(lru.key);
      }
    }
  }

  private addFront(n: any) {
    n.next = this.head.next; n.prev = this.head;
    this.head.next.prev = n; this.head.next = n;
  }
  private remove(n: any) {
    n.prev.next = n.next; n.next.prev = n.prev;
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
        super(capacity, 0.75f, true);
        this.capacity = capacity;
    }

    public int get(int key) { return super.getOrDefault(key, -1); }
    public void put(int key, int value) { super.put(key, value); }

    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> e) {
        return size() > capacity;
    }
}`,
      },
    },
    {
      type: "system-design",
      id: "lru-cache-system-design",
      required: false,
      title: "Distributed Session Cache",
      scenario: `You are designing session management for a social platform with 50 million daily active users. Each session is ~2KB.

The system currently loads session data from PostgreSQL on every authenticated request. At peak load (500K concurrent users), the database is overwhelmed.

Your task: design a caching layer that reduces database load by at least 90%, handles 30-minute inactivity expiry, and keeps sessions consistent when users log out.`,
      hints: [
        "500K concurrent sessions × 2KB ≈ 1 GB of active session data — fits in memory",
        "LRU eviction handles memory pressure, but 30-minute TTL is time-based — you need both",
        "Redis supports per-key TTL and LRU eviction (maxmemory-policy). Refresh the TTL on every request for sliding expiry.",
        "Logout must immediately invalidate the session — LRU eviction alone is not sufficient",
        "Multiple app servers with local caches create inconsistency on logout — a shared cache solves this",
      ],
      discussionPoints: [
        "**Shared cache over local cache:** A local LRU per app server can't propagate logout invalidations. Use Redis Cluster as a shared session store.",
        "**TTL + LRU together:** Set TTL=30min on each session key. Refresh on every authenticated request (sliding expiry). Redis's LRU eviction handles memory pressure; TTL handles inactivity.",
        "**Logout invalidation:** Explicitly delete the session key from Redis on logout. Do not rely on expiry for security-sensitive invalidation.",
        "**Cache-aside pattern:** Read from Redis first; on miss, load from PostgreSQL and write back with TTL.",
        "**Failure mode:** If Redis is unavailable, fall through to PostgreSQL with a circuit breaker to prevent cascade failure.",
      ],
    },
  ],
};
