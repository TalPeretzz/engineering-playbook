export const pythonImpl = `class Node:
    def __init__(self, key: int, value: int):
        self.key = key
        self.value = value
        self.prev: "Node | None" = None
        self.next: "Node | None" = None


class LRUCache:
    def __init__(self, capacity: int):
        # Reject non-int (floats, NaN, Infinity), booleans, and non-positive values.
        if not isinstance(capacity, int) or isinstance(capacity, bool) or capacity <= 0:
            raise ValueError("Capacity must be a positive integer")
        self.capacity = capacity
        self.map: dict[int, Node] = {}  # key → Node
        # Sentinel nodes eliminate every empty-list edge case
        self.head = Node(0, 0)  # dummy MRU sentinel
        self.tail = Node(0, 0)  # dummy LRU sentinel
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key: int) -> int:
        if key not in self.map:
            return -1  # cache miss
        node = self.map[key]
        self._move_to_head(node)  # promote to MRU
        return node.value

    def put(self, key: int, value: int) -> None:
        if key in self.map:
            node = self.map[key]
            node.value = value
            self._move_to_head(node)  # update + promote
            return
        node = Node(key, value)
        self.map[key] = node
        self._add_to_head(node)
        if len(self.map) > self.capacity:
            lru = self._remove_tail()  # evict LRU
            del self.map[lru.key]

    def _add_to_head(self, node: Node) -> None:
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node  # type: ignore[union-attr]
        self.head.next = node

    def _remove_node(self, node: Node) -> None:
        node.prev.next = node.next  # type: ignore[union-attr]
        node.next.prev = node.prev  # type: ignore[union-attr]

    def _move_to_head(self, node: Node) -> None:
        self._remove_node(node)
        self._add_to_head(node)

    def _remove_tail(self) -> Node:
        lru = self.tail.prev  # type: ignore[assignment]
        self._remove_node(lru)
        return lru


# Usage
cache = LRUCache(3)
cache.put(1, 10)
cache.put(2, 20)
cache.put(3, 30)
print(cache.get(1))   # 10  — moves 1 to MRU
cache.put(4, 40)      # evicts 2 (LRU)
print(cache.get(2))   # -1  — evicted`;
