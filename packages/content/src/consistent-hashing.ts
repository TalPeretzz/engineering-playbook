import type { Topic } from "@engineering-playbook/content-schema";

export const consistentHashing: Topic = {
  slug: "consistent-hashing",
  title: "Consistent Hashing",
  description:
    "A distributed hashing technique that minimizes key remapping when nodes are added or removed — essential for building scalable distributed caches and databases.",
  category: "distributed-systems",
  difficulty: "intermediate",
  estimatedMinutes: 25,
  prerequisites: ["hashing"],
  nextTopics: ["replication", "rate-limiter"],

  content: {
    problemStatement: `
In a distributed system with N servers, the naive approach is to assign keys using key % N. This works until you add or remove a server.

When N changes to N+1 or N-1, almost every key maps to a different server. In a distributed cache with millions of keys, this means a near-total cache miss storm — all requests fall through to the database simultaneously.

**Consistent Hashing** solves this: when a node is added or removed, only K/N keys need to be remapped (where K is the total number of keys and N is the number of nodes). In a 10-node cluster, adding one node remaps only ~10% of keys — not 100%.
    `.trim(),

    howItWorks: `
**The hash ring:**
Imagine the hash output space (e.g., 0 to 2^32-1) arranged as a circle. Both servers and keys are hashed onto this ring using the same hash function.

**Assigning keys to servers:**
Each key is assigned to the first server encountered when walking clockwise from the key's position on the ring. This server is the key's "responsible" node.

**Adding a node:**
When a new node is inserted at position P, only the keys between P and the previous node clockwise need to move from the next clockwise server to the new one. All other keys are unaffected.

**Removing a node:**
Keys that were assigned to the removed node are reassigned to the next clockwise node. All other keys stay put.

**Virtual nodes (vnodes):**
A plain ring with few physical nodes creates uneven distribution — one server might own 40% of the ring while another owns 10%. Virtual nodes solve this: each physical node is represented by V positions on the ring (e.g., V=150). The positions are spread by hashing "node-name-1", "node-name-2", etc. This creates a much more uniform distribution.
    `.trim(),

    visualExplanation: `
Hash ring (0 → 360°):

         0°
      Node A (90°)
    /             \\
  Node C (270°)   Node B (180°)
    \\             /
        360°/0°

Key "user:123" → hashes to 130° → assigned to Node B (next clockwise)
Key "order:456" → hashes to 50°  → assigned to Node A (next clockwise)
Key "item:789"  → hashes to 200° → assigned to Node C (next clockwise)

Add Node D at 160°:
  Key "user:123" (130°) → reassigned from B to D
  All other keys unaffected ✓
    `.trim(),

    complexity: [
      { operation: "Find node for key", time: "O(log N)", note: "Binary search on sorted ring positions" },
      { operation: "Add node", time: "O(log N + K/N)", note: "K/N keys remapped on average" },
      { operation: "Remove node", time: "O(log N + K/N)" },
      { operation: "Space", time: "-", space: "O(N × V)", note: "V virtual nodes per physical node" },
    ],

    tradeoffs: {
      pros: [
        "Minimal key remapping when cluster topology changes — only K/N keys affected",
        "Virtual nodes enable heterogeneous clusters where powerful nodes own more of the ring",
        "No central coordinator needed — any client with the ring state can route independently",
        "Scales horizontally — adding nodes incrementally redistributes load",
      ],
      cons: [
        "More complex than modulo hashing — harder to reason about and debug",
        "Virtual nodes require careful tuning — too few creates imbalance, too many wastes memory",
        "Monotonic keys (e.g., time-based IDs) can cause hotspots if they cluster on the ring",
        "Ring state must be propagated to all clients — adds consistency requirements",
        "Data migration during node changes still requires actual data movement, just less of it",
      ],
    },

    whenToUse: [
      "Distributed caches (Memcached, Redis Cluster) where cluster topology changes frequently",
      "Distributed databases where you need to shard data without full resharding on scale events",
      "Load balancers that need to consistently route requests to the same backend for session affinity",
      "Any system where you need to distribute keys across N nodes and N is expected to change",
    ],

    whenNotToUse: [
      "Single-server deployments — consistent hashing only matters when you have multiple nodes",
      "Small, static clusters that never change — modulo hashing is simpler and sufficient",
      "When you need range queries — consistent hashing doesn't preserve key ordering",
      "When data colocation matters — related keys may hash to different nodes, making joins expensive",
    ],

    realWorldExamples: [
      "**Amazon DynamoDB** — uses consistent hashing to partition data across storage nodes",
      "**Apache Cassandra** — uses a consistent hash ring with virtual nodes (vnodes) for data distribution",
      "**Memcached** — client-side consistent hashing to route cache reads/writes to the correct server",
      "**Discord** — uses consistent hashing to distribute WebSocket sessions across servers",
      "**Riak** — built around consistent hashing as the core data distribution mechanism",
      "**Nginx upstream hashing** — consistent hash directive for upstream server selection",
    ],
  },

  implementations: {
    typescript: `import * as crypto from "crypto";

class ConsistentHashRing {
  private ring = new Map<number, string>(); // position → node name
  private sortedPositions: number[] = [];
  private readonly virtualNodes: number;

  constructor(virtualNodes = 150) {
    this.virtualNodes = virtualNodes;
  }

  addNode(node: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const pos = this.hash(\`\${node}-\${i}\`);
      this.ring.set(pos, node);
    }
    this.sortedPositions = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  removeNode(node: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const pos = this.hash(\`\${node}-\${i}\`);
      this.ring.delete(pos);
    }
    this.sortedPositions = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  getNode(key: string): string | null {
    if (this.sortedPositions.length === 0) return null;
    const keyPos = this.hash(key);
    // Binary search for first position >= keyPos
    let lo = 0, hi = this.sortedPositions.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedPositions[mid] < keyPos) lo = mid + 1;
      else hi = mid;
    }
    // Wrap around: if keyPos > all positions, use first node
    const pos = this.sortedPositions[lo] >= keyPos
      ? this.sortedPositions[lo]
      : this.sortedPositions[0];
    return this.ring.get(pos) ?? null;
  }

  private hash(key: string): number {
    const buf = crypto.createHash("md5").update(key).digest();
    return buf.readUInt32BE(0);
  }
}

// Usage
const ring = new ConsistentHashRing(150);
ring.addNode("server-1");
ring.addNode("server-2");
ring.addNode("server-3");

console.log(ring.getNode("user:123"));  // e.g. "server-2"
console.log(ring.getNode("order:456")); // e.g. "server-1"

ring.removeNode("server-2");
// Only ~33% of keys are remapped`,

    python: `import hashlib
import bisect


class ConsistentHashRing:
    def __init__(self, virtual_nodes: int = 150):
        self.virtual_nodes = virtual_nodes
        self.ring: dict[int, str] = {}
        self.sorted_positions: list[int] = []

    def add_node(self, node: str) -> None:
        for i in range(self.virtual_nodes):
            pos = self._hash(f"{node}-{i}")
            self.ring[pos] = node
        self.sorted_positions = sorted(self.ring.keys())

    def remove_node(self, node: str) -> None:
        for i in range(self.virtual_nodes):
            pos = self._hash(f"{node}-{i}")
            self.ring.pop(pos, None)
        self.sorted_positions = sorted(self.ring.keys())

    def get_node(self, key: str) -> str | None:
        if not self.sorted_positions:
            return None
        pos = self._hash(key)
        # Find first ring position >= key position (wrap around)
        idx = bisect.bisect_left(self.sorted_positions, pos)
        if idx == len(self.sorted_positions):
            idx = 0
        return self.ring[self.sorted_positions[idx]]

    def _hash(self, key: str) -> int:
        digest = hashlib.md5(key.encode()).digest()
        return int.from_bytes(digest[:4], "big")


# Usage
ring = ConsistentHashRing(virtual_nodes=150)
ring.add_node("server-1")
ring.add_node("server-2")
ring.add_node("server-3")

print(ring.get_node("user:123"))   # e.g. "server-2"
print(ring.get_node("order:456"))  # e.g. "server-1"`,

    java: `import java.security.MessageDigest;
import java.util.SortedMap;
import java.util.TreeMap;

public class ConsistentHashRing {
    private final TreeMap<Long, String> ring = new TreeMap<>();
    private final int virtualNodes;

    public ConsistentHashRing(int virtualNodes) {
        this.virtualNodes = virtualNodes;
    }

    public void addNode(String node) {
        for (int i = 0; i < virtualNodes; i++) {
            ring.put(hash(node + "-" + i), node);
        }
    }

    public void removeNode(String node) {
        for (int i = 0; i < virtualNodes; i++) {
            ring.remove(hash(node + "-" + i));
        }
    }

    public String getNode(String key) {
        if (ring.isEmpty()) return null;
        long pos = hash(key);
        SortedMap<Long, String> tail = ring.tailMap(pos);
        // Wrap around to the first node if past the end
        Long nodePos = tail.isEmpty() ? ring.firstKey() : tail.firstKey();
        return ring.get(nodePos);
    }

    private long hash(String key) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(key.getBytes());
            return ((long)(digest[3] & 0xFF) << 24)
                 | ((long)(digest[2] & 0xFF) << 16)
                 | ((long)(digest[1] & 0xFF) << 8)
                 | ((long)(digest[0] & 0xFF));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}`,
  },

  challenges: [
    {
      type: "multiple-choice",
      id: "consistent-hashing-conceptual",
      question:
        "In a consistent hash ring with 4 nodes, you add a 5th node. Approximately what fraction of keys need to be remapped?",
      options: [
        { id: "a", text: "Nearly all keys — the entire ring is re-indexed" },
        { id: "b", text: "About 1/5 (20%) of keys" },
        { id: "c", text: "About 1/2 (50%) of keys" },
        { id: "d", text: "No keys need to move — the new node is empty" },
      ],
      correctOptionId: "b",
      explanation:
        "Consistent hashing guarantees that when a node is added to an N-node ring, only K/N keys are remapped on average (where K is the total number of keys). Adding a 5th node to a 4-node ring moves approximately 1/5 (20%) of keys from existing nodes to the new node. The other 80% are unaffected — this is the core advantage over modulo hashing.",
    },
    {
      type: "implementation",
      id: "consistent-hashing-implementation",
      title: "Implement a Consistent Hash Ring",
      description: `Implement a ConsistentHashRing with:

- **addNode(node)** — adds a node to the ring (with virtual nodes)
- **removeNode(node)** — removes a node and its virtual node positions
- **getNode(key)** — returns the node responsible for a given key

Use at least 3 virtual nodes per physical node. The getNode operation must wrap around the ring (if the key's hash is greater than all node positions, return the first node).`,
      starterCode: {
        typescript: `class ConsistentHashRing {
  private ring = new Map<number, string>();
  private sortedPositions: number[] = [];
  private readonly virtualNodes: number;

  constructor(virtualNodes = 3) {
    this.virtualNodes = virtualNodes;
  }

  addNode(node: string): void {
    // TODO: add virtualNodes positions for this node
  }

  removeNode(node: string): void {
    // TODO: remove all virtual node positions for this node
  }

  getNode(key: string): string | null {
    // TODO: find the first node clockwise from the key's hash position
    return null;
  }

  private hash(key: string): number {
    // Simple hash for this exercise
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }
}`,
        python: `import bisect


class ConsistentHashRing:
    def __init__(self, virtual_nodes: int = 3):
        self.virtual_nodes = virtual_nodes
        self.ring: dict[int, str] = {}
        self.sorted_positions: list[int] = []

    def add_node(self, node: str) -> None:
        # TODO: add virtual_nodes positions for this node
        pass

    def remove_node(self, node: str) -> None:
        # TODO: remove all virtual node positions for this node
        pass

    def get_node(self, key: str) -> str | None:
        # TODO: find the first node clockwise from the key's hash position
        return None

    def _hash(self, key: str) -> int:
        h = 0
        for char in key:
            h = (31 * h + ord(char)) & 0xFFFFFFFF
        return h`,
        java: `import java.util.TreeMap;
import java.util.SortedMap;

public class ConsistentHashRing {
    private final TreeMap<Integer, String> ring = new TreeMap<>();
    private final int virtualNodes;

    public ConsistentHashRing(int virtualNodes) {
        this.virtualNodes = virtualNodes;
    }

    public void addNode(String node) {
        // TODO: add virtualNodes positions for this node
    }

    public void removeNode(String node) {
        // TODO: remove all virtual node positions for this node
    }

    public String getNode(String key) {
        // TODO: find the first node clockwise from the key's hash position
        return null;
    }

    private int hash(String key) {
        int h = 0;
        for (char c : key.toCharArray()) {
            h = 31 * h + c;
        }
        return Math.abs(h);
    }
}`,
      },
      hints: [
        "For each physical node, generate virtual node keys like 'node-name-0', 'node-name-1', ... 'node-name-V'",
        "Store the sorted positions in an array — you'll need binary search to find the first position >= key's hash",
        "After adding/removing, always re-sort the positions array",
        "For wrap-around: if binary search returns an index past the end, use index 0 (the first node on the ring)",
        "In Python, bisect.bisect_left finds the insertion point; in Java, TreeMap.tailMap handles this naturally",
      ],
      testCases: [
        {
          id: "ch-tc-1",
          description: "getNode() returns a node after addNode()",
          code: `const ring = new ConsistentHashRing(3);
ring.addNode("server-a");
return ring.getNode("some-key") !== null;`,
          expected: true,
        },
        {
          id: "ch-tc-2",
          description: "Same key always maps to same node",
          code: `const ring = new ConsistentHashRing(3);
ring.addNode("server-a");
ring.addNode("server-b");
const n1 = ring.getNode("user-42");
const n2 = ring.getNode("user-42");
return n1 === n2;`,
          expected: true,
        },
        {
          id: "ch-tc-3",
          description: "getNode() returns null on an empty ring",
          code: `const ring = new ConsistentHashRing(3);
return ring.getNode("any-key");`,
          expected: null,
        },
        {
          id: "ch-tc-4",
          description: "Removing a node does not break getNode() for other keys",
          code: `const ring = new ConsistentHashRing(3);
ring.addNode("server-a");
ring.addNode("server-b");
ring.removeNode("server-a");
return ring.getNode("any-key") !== null;`,
          expected: true,
        },
      ],
      solution: {
        typescript: `class ConsistentHashRing {
  private ring = new Map<number, string>();
  private sortedPositions: number[] = [];
  private readonly virtualNodes: number;

  constructor(virtualNodes = 3) {
    this.virtualNodes = virtualNodes;
  }

  addNode(node: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const pos = this.hash(\`\${node}-\${i}\`);
      this.ring.set(pos, node);
    }
    this.sortedPositions = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  removeNode(node: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      this.ring.delete(this.hash(\`\${node}-\${i}\`));
    }
    this.sortedPositions = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  getNode(key: string): string | null {
    if (!this.sortedPositions.length) return null;
    const keyPos = this.hash(key);
    let lo = 0, hi = this.sortedPositions.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedPositions[mid] < keyPos) lo = mid + 1;
      else hi = mid;
    }
    const pos = this.sortedPositions[lo] >= keyPos
      ? this.sortedPositions[lo]
      : this.sortedPositions[0];
    return this.ring.get(pos) ?? null;
  }

  private hash(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }
}`,
        python: `import bisect

class ConsistentHashRing:
    def __init__(self, virtual_nodes: int = 3):
        self.virtual_nodes = virtual_nodes
        self.ring: dict[int, str] = {}
        self.sorted_positions: list[int] = []

    def add_node(self, node: str) -> None:
        for i in range(self.virtual_nodes):
            pos = self._hash(f"{node}-{i}")
            self.ring[pos] = node
        self.sorted_positions = sorted(self.ring.keys())

    def remove_node(self, node: str) -> None:
        for i in range(self.virtual_nodes):
            self.ring.pop(self._hash(f"{node}-{i}"), None)
        self.sorted_positions = sorted(self.ring.keys())

    def get_node(self, key: str) -> str | None:
        if not self.sorted_positions:
            return None
        pos = self._hash(key)
        idx = bisect.bisect_left(self.sorted_positions, pos)
        if idx == len(self.sorted_positions):
            idx = 0
        return self.ring[self.sorted_positions[idx]]

    def _hash(self, key: str) -> int:
        h = 0
        for char in key:
            h = (31 * h + ord(char)) & 0xFFFFFFFF
        return h`,
        java: `import java.util.TreeMap;
import java.util.SortedMap;

public class ConsistentHashRing {
    private final TreeMap<Integer, String> ring = new TreeMap<>();
    private final int virtualNodes;

    public ConsistentHashRing(int virtualNodes) {
        this.virtualNodes = virtualNodes;
    }

    public void addNode(String node) {
        for (int i = 0; i < virtualNodes; i++) {
            ring.put(hash(node + "-" + i), node);
        }
    }

    public void removeNode(String node) {
        for (int i = 0; i < virtualNodes; i++) {
            ring.remove(hash(node + "-" + i));
        }
    }

    public String getNode(String key) {
        if (ring.isEmpty()) return null;
        SortedMap<Integer, String> tail = ring.tailMap(hash(key));
        Integer pos = tail.isEmpty() ? ring.firstKey() : tail.firstKey();
        return ring.get(pos);
    }

    private int hash(String key) {
        int h = 0;
        for (char c : key.toCharArray()) h = 31 * h + c;
        return Math.abs(h);
    }
}`,
      },
    },
    {
      type: "system-design",
      id: "consistent-hashing-system-design",
      title: "Scaling a Distributed Cache",
      scenario: `You run a distributed Memcached cluster with 6 nodes caching product catalog data for an e-commerce platform. The cache holds 500GB of data.

Black Friday is approaching. You need to add 3 more nodes to handle the load increase.

**The problem:** When you add the 3 new nodes, how much data needs to move? What happens to cache hit rates during the transition? How do you minimize disruption?

Design the scaling operation using consistent hashing, and describe the operational procedure.`,
      hints: [
        "With consistent hashing, adding 3 nodes to a 6-node ring moves approximately 3/9 = 33% of keys",
        "During the transition, those 33% of keys will be cache misses until the new nodes warm up — what's the impact on your database?",
        "Can you pre-warm the new nodes before switching traffic to them?",
        "Consider adding nodes one at a time vs. all at once — what's the difference in cache miss rate?",
        "Virtual nodes (e.g., 150 per physical node) ensure that each new node takes roughly equal load from all existing nodes, not just its neighbors",
      ],
      discussionPoints: [
        "**Key remapping:** Adding 3 nodes to a 6-node ring means 9 total nodes. Each new node takes ~1/9 of the keyspace from its neighbors. Total remapping: ~33% of keys. With naive modulo hashing, nearly 100% would remap.",
        "**Cache miss storm:** The 33% of remapped keys will initially miss on the new nodes. If your database serves 10K req/s normally, this could mean 3.3K extra req/s hitting the DB — model this against your DB capacity before the operation.",
        "**Pre-warming strategy:** Before flipping traffic: (1) spin up new nodes in shadow mode, (2) replay recent cache write traffic to warm them, or (3) use lazy warming — accept the miss storm but ensure DB auto-scaling is ready.",
        "**Rolling addition:** Add nodes one at a time, wait for the miss rate to recover, then add the next. This spreads the miss storm over time instead of hitting the DB with 33% miss increase simultaneously.",
        "**Virtual nodes:** With 150 vnodes per physical node, each new node takes load evenly from all existing nodes. Without vnodes, a new node might take 80% from one neighbor and only 5% from another.",
        "**Monitoring:** Watch cache hit rate and DB connection count during the operation. Set up automated rollback (remove new nodes) if DB latency exceeds SLA.",
      ],
    },
  ],
};
