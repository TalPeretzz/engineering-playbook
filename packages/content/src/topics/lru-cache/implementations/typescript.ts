export const typescriptImpl = `class ListNode<K, V> {
  key: K;
  value: V;
  prev: ListNode<K, V> | null = null;
  next: ListNode<K, V> | null = null;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly map: Map<K, ListNode<K, V>>;
  private readonly head: ListNode<K, V>; // dummy MRU sentinel
  private readonly tail: ListNode<K, V>; // dummy LRU sentinel

  constructor(capacity: number) {
    if (capacity <= 0) throw new RangeError("Capacity must be positive");
    this.capacity = capacity;
    this.map = new Map();
    // Sentinel nodes eliminate every empty-list edge case
    this.head = new ListNode<K, V>(null as K, null as V);
    this.tail = new ListNode<K, V>(null as K, null as V);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V | null {
    const node = this.map.get(key);
    if (!node) return null; // cache miss
    this.moveToHead(node);  // promote to MRU
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing); // update + promote
      return;
    }
    const node = new ListNode(key, value);
    this.map.set(key, node);
    this.addToHead(node);
    if (this.map.size > this.capacity) {
      const lru = this.removeTail(); // evict LRU
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

// Usage
const cache = new LRUCache<number, string>(3);
cache.put(1, "one");
cache.put(2, "two");
cache.put(3, "three");
console.log(cache.get(1));   // "one"  — moves 1 to MRU
cache.put(4, "four");        // evicts 2 (LRU)
console.log(cache.get(2));   // null   — evicted`;
