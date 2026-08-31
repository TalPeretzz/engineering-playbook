export const javaImpl = `import java.util.HashMap;

public class LRUCache {
    private final int capacity;
    private final HashMap<Integer, Node> map;
    private final Node head; // dummy MRU sentinel
    private final Node tail; // dummy LRU sentinel

    public LRUCache(int capacity) {
        // The int type already rejects fractions, NaN, and infinities at compile time.
        if (capacity <= 0) throw new IllegalArgumentException("Capacity must be a positive integer");
        this.capacity = capacity;
        this.map = new HashMap<>();
        // Sentinel nodes eliminate every empty-list edge case
        this.head = new Node(0, 0);
        this.tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1; // cache miss
        moveToHead(node);            // promote to MRU
        return node.value;
    }

    public void put(int key, int value) {
        Node existing = map.get(key);
        if (existing != null) {
            existing.value = value;
            moveToHead(existing);    // update + promote
            return;
        }
        Node node = new Node(key, value);
        map.put(key, node);
        addToHead(node);
        if (map.size() > capacity) {
            Node lru = removeTail(); // evict LRU
            map.remove(lru.key);
        }
    }

    private void addToHead(Node node) {
        node.prev = head;
        node.next = head.next;
        head.next.prev = node;
        head.next = node;
    }

    private void removeNode(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void moveToHead(Node node) {
        removeNode(node);
        addToHead(node);
    }

    private Node removeTail() {
        Node lru = tail.prev;
        removeNode(lru);
        return lru;
    }

    static class Node {
        int key, value;
        Node prev, next;

        Node(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }
}

// Usage (in a main method or test):
// LRUCache cache = new LRUCache(3);
// cache.put(1, 10);
// cache.put(2, 20);
// cache.put(3, 30);
// System.out.println(cache.get(1)); // 10  — moves 1 to MRU
// cache.put(4, 40);                 // evicts 2 (LRU)
// System.out.println(cache.get(2)); // -1  — evicted`;
