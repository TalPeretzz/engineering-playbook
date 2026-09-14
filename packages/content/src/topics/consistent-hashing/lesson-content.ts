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
    const buf = crypto.createHash("md5").update(key).digest();
    return buf.readUInt32BE(0);
  }
}

const ring = new ConsistentHashRing(150);
ring.addNode("server-1");
ring.addNode("server-2");
ring.addNode("server-3");
console.log(ring.getNode("user:123"));  // e.g. "server-2"
ring.removeNode("server-2");            // ~33% of keys remapped`,

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
        digest = hashlib.md5(key.encode()).digest()
        return int.from_bytes(digest[:4], "big")`,

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
        Long nodePos = tail.isEmpty() ? ring.firstKey() : tail.firstKey();
        return ring.get(nodePos);
    }

    private long hash(String key) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] d = md.digest(key.getBytes());
            return ((long)(d[3] & 0xFF) << 24) | ((long)(d[2] & 0xFF) << 16)
                 | ((long)(d[1] & 0xFF) << 8)  | ((long)(d[0] & 0xFF));
        } catch (Exception e) { throw new RuntimeException(e); }
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
          text: "In a distributed system with N servers, the naive approach assigns keys using key % N. This works until you add or remove a server.",
        },
        {
          type: "p",
          text: "When N changes to N+1 or N-1, almost every key maps to a different server. In a distributed cache with millions of keys, this means a near-total cache-miss storm — all requests fall through to the database simultaneously.",
        },
        {
          type: "p",
          text: "**Consistent Hashing** solves this: when a node is added or removed, only K/N keys need to be remapped (where K is total keys and N is total nodes). In a 10-node cluster, adding one node remaps only ~10% of keys — not 100%.",
        },
      ],
    },
    {
      type: "text",
      id: "how-it-works",
      heading: "How does it work?",
      body: [
        {
          type: "heading",
          level: 3,
          text: "The hash ring",
        },
        {
          type: "p",
          text: "Imagine the hash output space (e.g., 0 to 2^32−1) arranged as a circle. Both servers and keys are hashed onto this ring using the same hash function.",
        },
        {
          type: "heading",
          level: 3,
          text: "Assigning keys to servers",
        },
        {
          type: "p",
          text: "Each key is assigned to the first server encountered when walking clockwise from the key's position on the ring.",
        },
        {
          type: "heading",
          level: 3,
          text: "Adding or removing a node",
        },
        {
          type: "list",
          items: [
            "**Adding:** Only keys between the new node's position and the previous node clockwise move to the new node. All others stay put.",
            "**Removing:** Keys owned by the removed node are reassigned to the next clockwise node. All others stay put.",
          ],
        },
        {
          type: "heading",
          level: 3,
          text: "Virtual nodes",
        },
        {
          type: "p",
          text: "A plain ring with few physical nodes can create uneven distribution — one server might own 40% of the ring while another owns 10%. Virtual nodes fix this: each physical node is represented by V positions on the ring (e.g., V=150), spread by hashing 'node-1', 'node-2', etc. This creates far more uniform distribution.",
        },
      ],
    },
    {
      type: "visual",
      id: "visual",
      heading: "Visual",
      content: `Hash ring (conceptual, 0 → 360°):

           0°
        Node A (90°)
      /              \\
Node C (270°)      Node B (180°)
      \\              /
          360°/0°

Key "user:123"  → hashes to 130° → Node B (next clockwise from 130°)
Key "order:456" → hashes to  50° → Node A (next clockwise from  50°)
Key "item:789"  → hashes to 200° → Node C (next clockwise from 200°)

Add Node D at 160°:
  Key "user:123" (130°) reassigned from B → D
  All other keys unaffected ✓`,
    },
    {
      type: "complexity",
      id: "complexity",
      heading: "Complexity",
      entries: [
        { operation: "Find node for key", time: "O(log N)", note: "Binary search on sorted ring positions" },
        { operation: "Add node", time: "O(log N + K/N)", note: "K/N keys remapped on average" },
        { operation: "Remove node", time: "O(log N + K/N)" },
        { operation: "Space (total)", time: "—", space: "O(N × V)", note: "V virtual nodes per physical node" },
      ],
    },
    {
      type: "tradeoffs",
      id: "tradeoffs",
      heading: "Tradeoffs",
      pros: [
        "Minimal key remapping on topology changes — only K/N keys affected, not all keys",
        "Virtual nodes enable heterogeneous clusters where powerful nodes own more of the ring",
        "No central coordinator — any client with ring state can route independently",
        "Scales horizontally by adding nodes incrementally",
      ],
      cons: [
        "More complex than modulo hashing — harder to reason about and debug",
        "Virtual nodes require tuning — too few creates imbalance, too many wastes memory",
        "Monotonic keys (e.g., time-based IDs) can cluster on the ring and create hotspots",
        "Ring state must be propagated to all clients — requires a consistency mechanism",
      ],
    },
    {
      type: "use-cases",
      id: "use-cases",
      heading: "When to use / when not to use",
      whenToUse: [
        "Distributed caches (Memcached, Redis Cluster) where cluster topology changes",
        "Distributed databases that need to shard data without full resharding on scale events",
        "Load balancers that route requests to the same backend for session affinity",
      ],
      whenNotToUse: [
        "Single-server deployments — consistent hashing only matters across multiple nodes",
        "Small, static clusters that never change — modulo hashing is simpler",
        "When range queries are needed — consistent hashing doesn't preserve key ordering",
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
            "**Amazon DynamoDB** — uses consistent hashing to partition data across storage nodes",
            "**Apache Cassandra** — uses a consistent hash ring with virtual nodes (vnodes) for data distribution",
            "**Memcached** — client libraries implement consistent hashing to route reads/writes to the correct server",
            "**Riak** — built around consistent hashing as its core data distribution mechanism",
          ],
        },
      ],
    },
  ],

  challenges: [
    {
      type: "multiple-choice",
      id: "consistent-hashing-conceptual",
      required: true,
      question:
        "In a consistent hash ring with 4 nodes, you add a 5th node. Approximately what fraction of keys need to be remapped?",
      options: [
        { id: "a", text: "Nearly all keys — the entire ring is re-indexed" },
        { id: "b", text: "About 1/5 (20%) of keys" },
        { id: "c", text: "About 1/2 (50%) of keys" },
        { id: "d", text: "No keys move — the new node starts empty" },
      ],
      correctOptionId: "b",
      explanation:
        "Consistent hashing guarantees that when a node is added to an N-node ring, only K/N keys are remapped on average. Adding a 5th node to a 4-node ring moves approximately 1/5 (20%) of keys from existing nodes to the new node. The other 80% are unaffected — this is the core advantage over modulo hashing.",
    },
    {
      type: "implementation",
      id: "consistent-hashing-implementation",
      required: true,
      title: "Implement a Consistent Hash Ring",
      description: `Implement a ConsistentHashRing with:

- **addNode(node)** — adds a node with virtual node positions
- **removeNode(node)** — removes all virtual node positions for a given node
- **getNode(key)** — returns the node responsible for a given key (wrap around the ring)

Use at least 3 virtual nodes per physical node.`,
      starterCode: {
        typescript: `class ConsistentHashRing {
  private ring = new Map<number, string>();
  private sortedPositions: number[] = [];
  private readonly virtualNodes: number;

  constructor(virtualNodes = 3) {
    this.virtualNodes = virtualNodes;
  }

  addNode(node: string): void {
    // TODO: add virtualNodes positions for this node, re-sort
  }

  removeNode(node: string): void {
    // TODO: remove all virtual positions for this node, re-sort
  }

  getNode(key: string): string | null {
    // TODO: binary search for the first position >= key hash; wrap around
    return null;
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
        # TODO: add virtual_nodes positions for this node
        pass

    def remove_node(self, node: str) -> None:
        # TODO: remove all virtual positions for this node
        pass

    def get_node(self, key: str) -> str | None:
        # TODO: find first clockwise node; wrap around
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
        // TODO: remove all virtual positions for this node
    }

    public String getNode(String key) {
        // TODO: find first clockwise node; wrap around
        return null;
    }

    private int hash(String key) {
        int h = 0;
        for (char c : key.toCharArray()) h = 31 * h + c;
        return Math.abs(h);
    }
}`,
      },
      hints: [
        "For each physical node, hash 'node-name-0', 'node-name-1', ..., 'node-name-V' to get V ring positions",
        "Keep positions in a sorted array — binary search lets you find the first position >= key hash in O(log N)",
        "After addNode or removeNode, always re-sort the positions array",
        "Wrap-around: if the key hash is greater than all ring positions, return the node at index 0",
        "In Java, TreeMap.tailMap(pos) gives you all entries >= pos, making wrap-around easy",
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
      this.ring.set(this.hash(\`\${node}-\${i}\`), node);
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
      ? this.sortedPositions[lo] : this.sortedPositions[0];
    return this.ring.get(pos) ?? null;
  }

  private hash(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
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

    public ConsistentHashRing(int virtualNodes) { this.virtualNodes = virtualNodes; }

    public void addNode(String node) {
        for (int i = 0; i < virtualNodes; i++) ring.put(hash(node + "-" + i), node);
    }

    public void removeNode(String node) {
        for (int i = 0; i < virtualNodes; i++) ring.remove(hash(node + "-" + i));
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
      required: false,
      title: "Scaling a Distributed Cache",
      scenario: `You run a distributed Memcached cluster with 6 nodes caching product catalog data for an e-commerce platform. The cluster holds 500 GB of data.

Black Friday is approaching. You need to add 3 more nodes to handle increased load.

The question: when you add the 3 new nodes, how much data needs to move? What happens to cache hit rates during the transition? How do you minimize disruption?

Design the scaling operation using consistent hashing and describe the operational procedure.`,
      hints: [
        "Adding 3 nodes to a 6-node ring → 9 total nodes. Each new node takes ~1/9 of the keyspace. Total remapping: ~33%.",
        "During the transition, ~33% of keys will be cache misses until new nodes warm up — what is the impact on your database?",
        "Can you pre-warm the new nodes before switching traffic to them?",
        "Consider adding nodes one at a time vs. all at once — what changes about the miss storm?",
        "Virtual nodes (150 per physical node) ensure each new node takes load evenly from all existing nodes",
      ],
      discussionPoints: [
        "**Key remapping:** 3 new nodes in a 9-node ring → ~33% of keys remapped. With naive modulo hashing, nearly 100% would remap.",
        "**Cache miss storm:** 33% miss increase hits the database. If the DB serves 10K req/s normally, model whether it can handle 13.3K before the operation.",
        "**Rolling addition:** Add nodes one at a time, wait for hit rate to recover, then add the next — spreads the miss storm over time.",
        "**Pre-warming:** Replay recent cache write traffic to new nodes before flipping traffic to them, or use lazy warming with DB auto-scaling ready.",
        "**Virtual nodes:** Ensure each new node takes load evenly from all existing nodes, not just its neighbors.",
        "**Monitoring:** Watch cache hit rate and DB connection count during the operation. Automate rollback if DB latency exceeds SLA.",
      ],
    },
  ],
};
