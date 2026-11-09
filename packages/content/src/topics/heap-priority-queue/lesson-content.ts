import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: 'Many problems need repeated access to "the smallest (or largest) item currently in a collection," where items are added and removed over time: the next task to run in a scheduler, the next node to visit in Dijkstra\'s shortest-path algorithm, the top-k results in a ranking. A sorted array gives O(1) access to the minimum, but inserting a new item costs O(n) to keep it sorted. An unsorted array gives O(1) insertion, but finding the minimum costs O(n) every time.',
      },
      {
        type: "p",
        text: "A **heap** gives both operations O(log n): find-the-minimum stays effectively O(1) (it's always at a fixed position), while insert and remove-minimum cost O(log n) — a real improvement over paying O(n) for one side or the other.",
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
          "A (binary) heap is a complete binary tree — every level is fully filled except possibly the last, which fills left to right. This shape lets it be stored compactly in a plain array, with no pointers needed.",
          "The **heap property**: in a min-heap, every node's value is less than or equal to both its children's values. (A max-heap is the mirror image.) This means the overall minimum is always at the root — O(1) to read.",
          "**Insert**: add the new element at the next open array slot (keeping the tree complete), then **sift up** — repeatedly swap it with its parent while it's smaller than the parent, until the heap property holds again.",
          "**Remove the minimum**: take the root (the minimum), move the last element into the root's position, then **sift down** — repeatedly swap it with its smaller child while it's larger than that child, until the heap property holds again.",
        ],
      },
      {
        type: "p",
        text: "Both sift operations only ever move an element along one path from root to leaf (or leaf to root) — the height of a complete binary tree with n nodes is O(log n), which is exactly why insert and remove-minimum cost O(log n): the element moves at most that many levels.",
      },
      {
        type: "p",
        text: 'A **priority queue** is the abstract interface (insert an item with a priority, retrieve/remove the highest-priority item) that a heap is the standard way to implement efficiently — the two terms are often used interchangeably in practice, with "heap" referring to the concrete array-based structure and "priority queue" to what it\'s used for.',
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Min-heap as a tree:              Same heap as an array:

            3                        index:  0  1  2  3  4  5
          /   \\                      value:  3  7  5  9  8  6
         7     5
        / \\   / \\                    children of index i: 2i+1, 2i+2
       9   8 6                       parent of index i:    (i-1)/2

Insert 2:                          Remove min (3):
  append 2 at the end                move last (6) to the root
  2 < parent(8) -> swap               6 > children(7,5) -> swap with 5
  2 < parent(3) -> swap               5 > child(6)?  no -> done
  2 is now the root (new min)         5 is now the root (new min)`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Find minimum (peek)",
        time: "O(1)",
        note: "Always at the root / array index 0",
      },
      {
        operation: "Insert",
        time: "O(log n)",
        note: "Append, then sift up at most tree height levels",
      },
      {
        operation: "Remove minimum",
        time: "O(log n)",
        note: "Replace root, then sift down at most tree height levels",
      },
      {
        operation: "Build a heap from n elements",
        time: "O(n)",
        note: "Sifting down from the bottom up is cheaper than n individual inserts, despite looking similar",
      },
      {
        operation: "Search for an arbitrary element",
        time: "O(n)",
        note: "The heap property only orders parent-child pairs — it gives no help finding an arbitrary value",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "O(1) access to the minimum (or maximum) with O(log n) insert and removal — a solid balance neither a sorted nor unsorted array achieves on both sides",
      "Compact array-based storage with no pointer overhead, unlike a pointer-based balanced tree",
      "Simple to implement correctly compared to self-balancing trees (no rotations, no rebalancing logic)",
      "Building a heap from an existing collection is O(n), not O(n log n)",
    ],
    cons: [
      "Only the minimum (or maximum) is cheap to access — finding or removing an arbitrary element costs O(n), unlike a balanced BST which supports O(log n) search for any key",
      "Not sorted overall — only the parent-child relationship is ordered, so iterating a heap's array doesn't give you sorted output",
      "No efficient way to decrease an arbitrary element's priority in a plain array-based heap without first finding its index, which itself costs O(n) unless a separate index is maintained",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Task schedulers and event simulators that repeatedly need 'the next thing to happen/run' ordered by time or priority",
      "Graph algorithms like Dijkstra's shortest path and Prim's minimum spanning tree, which repeatedly extract the minimum-distance/weight node",
      "Top-k problems — maintaining the k largest (or smallest) items seen so far in a stream",
      "Merging multiple already-sorted sequences efficiently",
    ],
    whenNotToUse: [
      "You need to search for or update arbitrary elements by value frequently — a balanced BST or a hash map (with an auxiliary structure) fits better",
      "You need the data in fully sorted order at the end — a heap doesn't give you that for free; sorting all n elements via repeated remove-min costs O(n log n) anyway, the same as just sorting",
      "You need to efficiently decrease an arbitrary element's key and the standard library's heap doesn't support that operation directly — some algorithms (notably textbook Dijkstra) assume a decrease-key operation a plain heap doesn't provide out of the box",
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
          "**Java's `PriorityQueue`** is explicitly documented as binary-heap-backed, with O(log n) for `offer`/`poll`/`add`/`remove()`, O(1) for `peek`, and — notably — O(n) for `remove(Object)` and `contains(Object)`, a direct illustration of the 'cheap at the top, expensive to search' tradeoff.",
          "**Python's `heapq` module** documents heaps as well suited to schedulers ('the tree holds all incoming events, and the win condition means the smallest scheduled time'), as well as merging sorted sequences and large external sorts.",
          "**Dijkstra's shortest-path algorithm** is commonly implemented with a min-heap priority queue to repeatedly extract the next-closest unvisited node, giving the well-known O((V+E) log V) running time with a binary heap.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Oracle Java SE 8 Docs — PriorityQueue<E>",
            url: "https://docs.oracle.com/javase/8/docs/api/java/util/PriorityQueue.html",
            verified: "2026-11-04",
            note: "O(log n) offer/poll/remove(), O(1) peek, O(n) remove(Object)/contains(Object)",
          },
          {
            name: "Python Docs — heapq — Heap queue algorithm",
            url: "https://docs.python.org/3/library/heapq.html",
            verified: "2026-11-04",
            note: "Heap invariant, and scheduler/merge/external-sort use cases",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `class MinHeap {
  private heap: number[] = [];

  size(): number {
    return this.heap.length;
  }

  peek(): number | undefined {
    return this.heap[0];
  }

  insert(value: number): void {
    this.heap.push(value);
    this.siftUp(this.heap.length - 1);
  }

  extractMin(): number | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return min;
  }

  private siftUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[index] >= this.heap[parent]) break;
      [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
      index = parent;
    }
  }

  private siftDown(index: number): void {
    const n = this.heap.length;
    for (;;) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;
      if (left < n && this.heap[left] < this.heap[smallest]) smallest = left;
      if (right < n && this.heap[right] < this.heap[smallest]) smallest = right;
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

// Usage
const heap = new MinHeap();
for (const n of [5, 3, 8, 1, 9]) heap.insert(n);
heap.peek(); // 1
heap.extractMin(); // 1 — heap re-balances internally
heap.extractMin(); // 3`,

  python: `import heapq

# Python's heapq operates directly on a plain list — min-heap only.
heap: list[int] = []
for n in [5, 3, 8, 1, 9]:
    heapq.heappush(heap, n)

heap[0]  # 1 — peek is just reading index 0
heapq.heappop(heap)  # 1 — removes and returns the minimum, re-heapifies internally
heapq.heappop(heap)  # 3


# A from-scratch implementation, for understanding what heapq does internally:
class MinHeap:
    def __init__(self) -> None:
        self.heap: list[int] = []

    def peek(self) -> int | None:
        return self.heap[0] if self.heap else None

    def insert(self, value: int) -> None:
        self.heap.append(value)
        self._sift_up(len(self.heap) - 1)

    def extract_min(self) -> int | None:
        if not self.heap:
            return None
        min_val = self.heap[0]
        last = self.heap.pop()
        if self.heap:
            self.heap[0] = last
            self._sift_down(0)
        return min_val

    def _sift_up(self, index: int) -> None:
        while index > 0:
            parent = (index - 1) // 2
            if self.heap[index] >= self.heap[parent]:
                break
            self.heap[index], self.heap[parent] = self.heap[parent], self.heap[index]
            index = parent

    def _sift_down(self, index: int) -> None:
        n = len(self.heap)
        while True:
            left, right = 2 * index + 1, 2 * index + 2
            smallest = index
            if left < n and self.heap[left] < self.heap[smallest]:
                smallest = left
            if right < n and self.heap[right] < self.heap[smallest]:
                smallest = right
            if smallest == index:
                break
            self.heap[index], self.heap[smallest] = self.heap[smallest], self.heap[index]
            index = smallest`,

  java: `import java.util.ArrayList;
import java.util.List;

public class MinHeap {
    private final List<Integer> heap = new ArrayList<>();

    public int size() {
        return heap.size();
    }

    public Integer peek() {
        return heap.isEmpty() ? null : heap.get(0);
    }

    public void insert(int value) {
        heap.add(value);
        siftUp(heap.size() - 1);
    }

    public Integer extractMin() {
        if (heap.isEmpty()) return null;
        int min = heap.get(0);
        int last = heap.remove(heap.size() - 1);
        if (!heap.isEmpty()) {
            heap.set(0, last);
            siftDown(0);
        }
        return min;
    }

    private void siftUp(int index) {
        while (index > 0) {
            int parent = (index - 1) / 2;
            if (heap.get(index) >= heap.get(parent)) break;
            swap(index, parent);
            index = parent;
        }
    }

    private void siftDown(int index) {
        int n = heap.size();
        while (true) {
            int left = 2 * index + 1, right = 2 * index + 2, smallest = index;
            if (left < n && heap.get(left) < heap.get(smallest)) smallest = left;
            if (right < n && heap.get(right) < heap.get(smallest)) smallest = right;
            if (smallest == index) break;
            swap(index, smallest);
            index = smallest;
        }
    }

    private void swap(int i, int j) {
        int tmp = heap.get(i);
        heap.set(i, heap.get(j));
        heap.set(j, tmp);
    }
}

// Usage
MinHeap heap = new MinHeap();
for (int n : new int[]{5, 3, 8, 1, 9}) heap.insert(n);
heap.peek(); // 1
heap.extractMin(); // 1 — heap re-balances internally
heap.extractMin(); // 3`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "heap-priority-queue-conceptual",
    required: true,
    question:
      "A min-heap contains [2, 5, 4, 9, 7, 8] (array form). What is the time complexity of finding whether the value 7 exists anywhere in the heap?",
    options: [
      { id: "a", text: "O(1), because the heap property makes any element directly addressable" },
      { id: "b", text: "O(log n), the same as insert and extractMin" },
      {
        id: "c",
        text: "O(n), because the heap property only orders parent-child pairs, not all elements",
      },
      { id: "d", text: "O(n log n), because you'd need to sort the heap first" },
    ],
    correctOptionId: "c",
    explanation:
      "The heap property only guarantees that a parent is ≤ its children — it says nothing about the relationship between, say, a node and its sibling's subtree, or any two arbitrary nodes. There's no way to prune the search the way a balanced BST's ordering lets you, so finding an arbitrary value requires checking every element in the worst case: O(n). This is exactly the tradeoff that makes a heap excellent for 'give me the minimum fast' but a poor fit for 'does this specific value exist.'",
  },
  {
    type: "implementation",
    id: "heap-priority-queue-implementation",
    required: true,
    title: "Implement a Min-Heap",
    description: `Implement a binary min-heap backed by an array:

- **insert(value)** — adds a value to the heap, maintaining the heap property.
- **extractMin()** — removes and returns the minimum value, maintaining the heap property. Returns undefined/None/null if the heap is empty.
- **peek()** — returns the minimum value without removing it.`,
    starterCode: {
      typescript: `class MinHeap {
  private heap: number[] = [];

  peek(): number | undefined {
    return this.heap[0];
  }

  insert(value: number): void {
    // TODO: append the value, then sift it up until the heap property holds
  }

  extractMin(): number | undefined {
    // TODO: save the root, move the last element to the root, sift down, return the saved min
    return undefined;
  }
}`,
      python: `class MinHeap:
    def __init__(self) -> None:
        self.heap: list[int] = []

    def peek(self) -> int | None:
        return self.heap[0] if self.heap else None

    def insert(self, value: int) -> None:
        # TODO: append the value, then sift it up until the heap property holds
        pass

    def extract_min(self) -> int | None:
        # TODO: save the root, move the last element to the root, sift down, return the saved min
        return None`,
      java: `import java.util.ArrayList;
import java.util.List;

public class MinHeap {
    private final List<Integer> heap = new ArrayList<>();

    public Integer peek() {
        return heap.isEmpty() ? null : heap.get(0);
    }

    public void insert(int value) {
        // TODO: append the value, then sift it up until the heap property holds
    }

    public Integer extractMin() {
        // TODO: save the root, move the last element to the root, sift down, return the saved min
        return null;
    }
}`,
    },
    hints: [
      "insert: push/append the new value at the end of the array, then compare it to its parent at index (i-1)/2, swapping and moving up while it's smaller than its parent",
      "extractMin: before removing anything, save heap[0] to return at the end",
      "extractMin: pop the LAST element off the array and place it at index 0, rather than just removing index 0 directly — this keeps the tree complete",
      "extractMin's sift-down: compare the node to BOTH children, swap with whichever is smaller (not just the left child), and stop once it's smaller than both remaining children",
    ],
    solution: {
      typescript: `class MinHeap {
  private heap: number[] = [];

  peek(): number | undefined {
    return this.heap[0];
  }

  insert(value: number): void {
    this.heap.push(value);
    let index = this.heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[index] >= this.heap[parent]) break;
      [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
      index = parent;
    }
  }

  extractMin(): number | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      let index = 0;
      const n = this.heap.length;
      for (;;) {
        const left = 2 * index + 1;
        const right = 2 * index + 2;
        let smallest = index;
        if (left < n && this.heap[left] < this.heap[smallest]) smallest = left;
        if (right < n && this.heap[right] < this.heap[smallest]) smallest = right;
        if (smallest === index) break;
        [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
        index = smallest;
      }
    }
    return min;
  }
}`,
      python: `class MinHeap:
    def __init__(self) -> None:
        self.heap: list[int] = []

    def peek(self) -> int | None:
        return self.heap[0] if self.heap else None

    def insert(self, value: int) -> None:
        self.heap.append(value)
        index = len(self.heap) - 1
        while index > 0:
            parent = (index - 1) // 2
            if self.heap[index] >= self.heap[parent]:
                break
            self.heap[index], self.heap[parent] = self.heap[parent], self.heap[index]
            index = parent

    def extract_min(self) -> int | None:
        if not self.heap:
            return None
        min_val = self.heap[0]
        last = self.heap.pop()
        if self.heap:
            self.heap[0] = last
            index = 0
            n = len(self.heap)
            while True:
                left, right = 2 * index + 1, 2 * index + 2
                smallest = index
                if left < n and self.heap[left] < self.heap[smallest]:
                    smallest = left
                if right < n and self.heap[right] < self.heap[smallest]:
                    smallest = right
                if smallest == index:
                    break
                self.heap[index], self.heap[smallest] = self.heap[smallest], self.heap[index]
                index = smallest
        return min_val`,
      java: `import java.util.ArrayList;
import java.util.List;

public class MinHeap {
    private final List<Integer> heap = new ArrayList<>();

    public Integer peek() {
        return heap.isEmpty() ? null : heap.get(0);
    }

    public void insert(int value) {
        heap.add(value);
        int index = heap.size() - 1;
        while (index > 0) {
            int parent = (index - 1) / 2;
            if (heap.get(index) >= heap.get(parent)) break;
            int tmp = heap.get(index);
            heap.set(index, heap.get(parent));
            heap.set(parent, tmp);
            index = parent;
        }
    }

    public Integer extractMin() {
        if (heap.isEmpty()) return null;
        int min = heap.get(0);
        int last = heap.remove(heap.size() - 1);
        if (!heap.isEmpty()) {
            heap.set(0, last);
            int index = 0, n = heap.size();
            while (true) {
                int left = 2 * index + 1, right = 2 * index + 2, smallest = index;
                if (left < n && heap.get(left) < heap.get(smallest)) smallest = left;
                if (right < n && heap.get(right) < heap.get(smallest)) smallest = right;
                if (smallest == index) break;
                int tmp = heap.get(index);
                heap.set(index, heap.get(smallest));
                heap.set(smallest, tmp);
                index = smallest;
            }
        }
        return min;
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "heap-priority-queue-system-design",
    required: false,
    title: "Designing a Delayed Job Scheduler",
    scenario: `You're building a job scheduler: clients submit jobs with a "run at" timestamp (which can be any time from now up to months in the future), and a background worker process needs to efficiently find and execute the next job that's due, repeatedly, as new jobs are submitted at arbitrary times.

At any given moment there can be millions of pending jobs. Submissions happen continuously. The worker needs to always know "what's the very next job to run" without scanning the whole pending set.

Design this using a heap-based priority queue, and address: what happens if a job needs to be cancelled or rescheduled after submission (a real, frequent requirement)?`,
    hints: [
      "What should the heap's ordering key be, and does min-heap or max-heap fit the 'what's due soonest' requirement?",
      "The worker needs to know when the next job is due, not just that it exists — how would you avoid busy-polling the heap constantly?",
      "Cancelling or rescheduling a job means finding and modifying a specific entry, not the minimum — what does this lesson say is cheap vs. expensive in a plain heap?",
      "Is there a design that avoids actually removing a cancelled job from the heap at cancellation time?",
    ],
    discussionPoints: [
      "**Min-heap keyed by run-at timestamp:** The job with the soonest run time should always be extractable in O(1) peek / O(log n) extract — a min-heap ordered by timestamp is the natural fit. The worker peeks the minimum, and if its timestamp has arrived, extracts and runs it; otherwise it sleeps until that timestamp (not busy-polling).",
      "**Cancellation is the hard part, directly because of what this lesson covers:** Finding an arbitrary job in the heap to cancel or reschedule it is O(n) in a plain array-based heap — there's no efficient 'find job #4521' operation, only 'find the minimum.' This is the central design tension the scenario is testing.",
      "**Lazy deletion ('tombstoning') avoids the O(n) search:** Instead of removing a cancelled job from the heap immediately, mark it cancelled in a separate hash map keyed by job ID (O(1) to update). When the worker extracts the minimum and finds it's tombstoned, it silently discards it and extracts the next one instead — cancellation becomes O(1), at the cost of the heap temporarily holding dead entries until they bubble to the top and get discarded.",
      "**Rescheduling as cancel + resubmit:** Rather than trying to update an entry's key in place (which a plain heap doesn't support efficiently), reschedule by tombstoning the old entry and inserting a new one with the new timestamp — reuses the same O(1) cancellation mechanism instead of needing a more complex 'decrease-key'-capable structure.",
      "**What this doesn't fully solve:** If cancellations are extremely frequent relative to actual execution, tombstoned entries can accumulate and bloat the heap faster than they're naturally discarded — a periodic compaction pass (rebuild the heap excluding tombstoned entries) may be needed at scale, which is itself an O(n) operation done occasionally rather than on every cancellation.",
    ],
  },
];
