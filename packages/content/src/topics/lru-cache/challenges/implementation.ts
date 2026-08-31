import type { ImplementationChallenge } from "@engineering-playbook/content-schema";

export const implementationChallenge: ImplementationChallenge = {
  type: "implementation",
  id: "lru-cache-implementation",
  required: true,
  title: "Implement an LRU Cache",
  description: `Implement an LRUCache class with two methods:

- **get(key)** — returns the value for the key if it exists, otherwise −1. Marks the key as recently used.
- **put(key, value)** — inserts or updates the key-value pair. If the cache is at capacity, evict the least recently used entry first.

Both operations must run in **O(1)** time on average.

The starter code uses plain JavaScript — no TypeScript types are required. The test runner executes your code directly.`,
  starterCode: {
    typescript: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();                                             // key → node
    this.head = { key: null, value: null, prev: null, next: null };  // dummy MRU sentinel
    this.tail = { key: null, value: null, prev: null, next: null };  // dummy LRU sentinel
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    // TODO: look up key in this.map
    // If absent, return -1
    // Otherwise: call _moveToHead(node) then return node.value
    return -1;
  }

  put(key, value) {
    // TODO: if key exists → update node.value, call _moveToHead(node), return
    // Create node = { key, value, prev: null, next: null }
    // Add to this.map and call _addToHead(node)
    // If this.map.size > this.capacity → call _removeTail(), delete its key from map
  }

  _addToHead(node) {
    // TODO: wire node between this.head and this.head.next
    // node.prev = this.head; node.next = this.head.next
    // this.head.next.prev = node; this.head.next = node
  }

  _removeNode(node) {
    // TODO: unlink node from its neighbors
    // node.prev.next = node.next; node.next.prev = node.prev
  }

  _moveToHead(node) {
    // TODO: call _removeNode(node) then _addToHead(node)
  }

  _removeTail() {
    // TODO: const lru = this.tail.prev; _removeNode(lru); return lru
  }
}`,
    python: `class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        # TODO: initialize your data structures

    def get(self, key: int) -> int:
        # TODO: return the value if present, otherwise -1
        # Mark the key as most recently used
        return -1

    def put(self, key: int, value: int) -> None:
        # TODO: insert or update the key
        # If at capacity after inserting, evict the least recently used key
        pass`,
    java: `class LRUCache {
    public LRUCache(int capacity) {
        // TODO: initialize your data structures
    }
    public int get(int key) {
        // TODO: return the value if present, otherwise -1
        return -1;
    }
    public void put(int key, int value) {
        // TODO: insert or update the key
    }
}`,
  },
  hints: [
    "A plain Map gives O(1) lookup but O(n) eviction — you need to find the LRU in O(1)",
    "A doubly linked list maintains recency order and allows O(1) removal of any node if you hold a pointer to it",
    "Combine both: Map<key, node> gives you a direct pointer to the list node for any key",
    "Use dummy head and tail sentinel nodes to eliminate empty-list edge cases in addToFront / removeTail",
    "addToFront, removeNode, moveToFront, and removeTail are the four private helpers — implement each separately",
  ],
  solution: {
    typescript: `class LRUCache {
  constructor(capacity) {
    if (capacity <= 0) throw new RangeError("Capacity must be positive");
    this.capacity = capacity;
    this.map = new Map();
    this.head = { prev: null, next: null }; // dummy MRU sentinel
    this.tail = { prev: null, next: null }; // dummy LRU sentinel
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) return -1;
    this._remove(node);
    this._addFront(node);
    return node.value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.value = value;
      this._remove(node);
      this._addFront(node);
      return;
    }
    const node = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this._addFront(node);
    if (this.map.size > this.capacity) {
      const lru = this.tail.prev;
      this._remove(lru);
      this.map.delete(lru.key);
    }
  }

  _addFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }
}`,
    python: `class Node:
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}
        self.head = Node(0, 0)  # dummy MRU sentinel
        self.tail = Node(0, 0)  # dummy LRU sentinel
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key):
        if key not in self.map:
            return -1
        node = self.map[key]
        self._move_to_head(node)
        return node.value

    def put(self, key, value):
        if key in self.map:
            node = self.map[key]
            node.value = value
            self._move_to_head(node)
            return
        node = Node(key, value)
        self.map[key] = node
        self._add_to_head(node)
        if len(self.map) > self.capacity:
            lru = self._remove_tail()
            del self.map[lru.key]

    def _add_to_head(self, node):
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node
        self.head.next = node

    def _remove_node(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _move_to_head(self, node):
        self._remove_node(node)
        self._add_to_head(node)

    def _remove_tail(self):
        lru = self.tail.prev
        self._remove_node(lru)
        return lru`,
    java: `import java.util.HashMap;

class LRUCache {
    private int capacity;
    private HashMap<Integer, Node> map;
    private Node head, tail;

    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        this.head = new Node(0, 0);
        this.tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;
        moveToHead(node);
        return node.value;
    }

    public void put(int key, int value) {
        Node existing = map.get(key);
        if (existing != null) {
            existing.value = value;
            moveToHead(existing);
            return;
        }
        Node node = new Node(key, value);
        map.put(key, node);
        addToHead(node);
        if (map.size() > capacity) {
            Node lru = removeTail();
            map.remove(lru.key);
        }
    }

    private void addToHead(Node node) {
        node.prev = head; node.next = head.next;
        head.next.prev = node; head.next = node;
    }

    private void removeNode(Node node) {
        node.prev.next = node.next; node.next.prev = node.prev;
    }

    private void moveToHead(Node node) { removeNode(node); addToHead(node); }

    private Node removeTail() {
        Node lru = tail.prev; removeNode(lru); return lru;
    }

    static class Node {
        int key, value; Node prev, next;
        Node(int k, int v) { key = k; value = v; }
    }
}`,
  },
};
