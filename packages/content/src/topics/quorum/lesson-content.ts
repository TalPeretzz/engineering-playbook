import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "When a cluster of nodes splits into two groups that can no longer talk to each other (a network partition), each group might be tempted to keep operating independently — electing its own leader, accepting its own writes. If both groups do this, you get **split-brain**: two halves of the same system disagreeing about reality, each believing it's in charge, with no way to reconcile the conflicting decisions they made in isolation.",
      },
      {
        type: "p",
        text: "A **quorum** is a minimum number of nodes — specifically, a strict majority — that must agree before a decision (electing a leader, committing a write, forming the active cluster) is considered valid. Because a strict majority of the *whole* cluster can only exist in one partition at a time, requiring a quorum makes split-brain mathematically impossible: at most one side of any partition can ever have enough nodes to act.",
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
          '**The quorum formula**: for a cluster of n members, the quorum (majority) size is ⌊n/2⌋ + 1 — etcd\'s documentation states this directly: "for a cluster with n members, quorum is (n/2)+1." This is more than half, not merely half, which is the detail that makes the guarantee work.',
          "**Why a strict majority, not just 'some nodes'**: if any smaller group could act, two disjoint smaller groups could both act simultaneously during a partition. A strict majority of n can never fit twice into n nodes — if one side of a partition has a majority, the other side mathematically cannot also have one.",
          "**Fault tolerance**: a cluster of n nodes requiring a majority can tolerate ⌊(n-1)/2⌋ node failures while still being able to reach quorum. A 3-node cluster tolerates 1 failure; a 5-node cluster tolerates 2; a 7-node cluster tolerates 3 — each step up in cluster size costs 2 more nodes to buy 1 more unit of fault tolerance.",
          "**Why odd-sized clusters are preferred**: an even-sized cluster doesn't buy extra fault tolerance over the next-smaller odd cluster — a 3-node and a 4-node cluster both tolerate exactly 1 failure, so the 4th node adds no fault-tolerance benefit on its own, only extra capacity to operate and more network overhead. etcd's documentation summarizes this general pattern directly: \"an odd-size cluster tolerates the same number of failures as an even-size cluster but with fewer nodes,\" which is why odd sizes (3, 5, 7) are the conventional choice for quorum-based clusters.",
          "**Applying quorum beyond leader election**: the same majority principle underlies consensus protocols' log commitment (an entry is only considered committed once a majority of nodes have durably stored it) and distributed locking (a lock is only considered held if a majority of nodes agree it's held) — any decision that must survive a partition without ambiguity can be gated on reaching quorum.",
        ],
      },
      {
        type: "p",
        text: 'The underlying guarantee: ZooKeeper\'s documentation puts it plainly — "if two machines fail, the remaining two machines do not constitute a majority" in a 5-node ensemble, so those two machines correctly refuse to act as the authoritative cluster, even though they can still talk to each other.',
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `5-node cluster, quorum = (5/2)+1 = 3

  Normal: all 5 reachable, {A,B,C,D,E} easily forms quorum of 3+

  Partition into {A,B,C} | {D,E}:

    {A,B,C}: 3 nodes >= quorum (3)  -> CAN elect a leader, commit writes
    {D,E}:   2 nodes <  quorum (3)  -> CANNOT act -- correctly refuses

  Only one side can ever reach quorum at once -- split-brain is
  mathematically impossible, not just unlikely

Fault tolerance by cluster size (quorum = majority):
  3 nodes -> quorum 2 -> tolerates 1 failure
  5 nodes -> quorum 3 -> tolerates 2 failures
  7 nodes -> quorum 4 -> tolerates 3 failures
  4 nodes -> quorum 3 -> tolerates 1 failure  (same as 3 nodes -- no gain!)`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      { operation: "Compute quorum size for n nodes", time: "O(1)", note: "⌊n/2⌋ + 1" },
      {
        operation: "Check whether a given node set has quorum",
        time: "O(1)",
        note: "Compare the set's size against the precomputed quorum size",
      },
      {
        operation: "Reach quorum agreement on a decision",
        time: "O(quorum size) responses needed",
        note: "Only a majority of nodes need to respond, not all n",
      },
      {
        operation: "Fault tolerance for n nodes",
        time: "⌊(n-1)/2⌋ failures tolerated",
        note: "A 3-node cluster tolerates 1 failure, 5-node tolerates 2, 7-node tolerates 3",
      },
      {
        operation: "Detecting loss of quorum",
        time: "Bounded by failure-detection time",
        note: "Not instantaneous — depends on how quickly unreachable nodes are detected as such",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Makes split-brain mathematically impossible rather than merely unlikely — at most one partition can ever hold a majority at a given moment",
      "Provides a clean, well-understood formula for reasoning about fault tolerance: a cluster of n nodes survives ⌊(n-1)/2⌋ failures",
      "Composable with many different decisions (leader election, log commitment, distributed locks) — the same majority principle applies uniformly",
      "Odd-sized clusters give the most fault tolerance per node, avoiding wasted capacity that doesn't improve resilience",
    ],
    cons: [
      "Costs availability during a partition: the minority side correctly refuses to act, even if it's otherwise healthy and has clients actively trying to reach it",
      "Scaling fault tolerance is expensive — going from tolerating 2 failures to 3 requires adding 2 more nodes (5 -> 7), not 1, since quorum size grows with cluster size",
      "A cluster that loses quorum (too many simultaneous failures) becomes completely unavailable for quorum-gated decisions until enough nodes recover, even though no single remaining node is itself broken",
      "Quorum alone only prevents split-brain for majority-gated decisions — any part of the system that bypasses the quorum check can still produce conflicting state during a partition",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Coordination services and consensus protocols (ZooKeeper, etcd, Raft/Paxos-based systems) that must guarantee at most one active leader or authoritative state at any time",
      "Distributed locks and leases where two holders of the 'same' lock during a partition would cause real damage",
      "Any decision where the cost of getting it wrong during a partition (two leaders, two lock holders, conflicting commits) is worse than the cost of reduced availability during that partition",
      "Systems already sized with an odd node count for other reasons — quorum sizing naturally fits that shape with no extra cost",
    ],
    whenNotToUse: [
      "Workloads that prioritize availability over consistency during partitions and can tolerate eventual reconciliation of conflicting writes (e.g., via CRDTs or last-write-wins) instead of refusing to act",
      "Small, low-stakes deployments where the operational cost of running 3+ nodes for quorum isn't justified by the failure modes being protected against",
      "Systems where the bottleneck is read/write throughput rather than leader/decision uniqueness — quorum-based consensus adds coordination overhead that pure data-replication quorums (the N/W/R model) don't necessarily require",
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
          '**etcd** documents the quorum formula directly: "for a cluster with n members, quorum is (n/2)+1," and provides a fault-tolerance table (3 nodes -> tolerates 1 failure, 5 nodes -> tolerates 2, 7 nodes -> tolerates 3) while explicitly noting that "an odd-size cluster tolerates the same number of failures as an even-size cluster but with fewer nodes" — the direct source of this lesson\'s odd-vs-even sizing guidance.',
          '**Apache ZooKeeper** documents that "for the ZooKeeper service to be active, there must be a majority of non-failing machines that can communicate with each other," and gives the concrete split-brain-prevention example that in a 5-node ensemble, "if two machines fail, the remaining two machines do not constitute a majority" — so they correctly stop acting as the authoritative ensemble rather than risk diverging from the majority side.',
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "etcd Docs — FAQ (Quorum and Fault Tolerance)",
            url: "https://etcd.io/docs/v3.5/faq/",
            verified: "2026-11-05",
            note: "Quorum formula (n/2)+1, fault-tolerance table by cluster size, odd-vs-even cluster sizing rationale",
          },
          {
            name: "Apache ZooKeeper Docs — Administrator's Guide",
            url: "https://zookeeper.apache.org/doc/current/zookeeperAdmin.html",
            verified: "2026-11-05",
            note: "Majority-of-non-failing-machines requirement, concrete split-brain-prevention example for a 5-node ensemble",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `class QuorumCluster {
  private readonly quorumSize: number;

  constructor(private readonly totalNodes: number) {
    if (totalNodes < 1) throw new Error("Cluster must have at least 1 node");
    this.quorumSize = Math.floor(totalNodes / 2) + 1;
  }

  getQuorumSize(): number {
    return this.quorumSize;
  }

  hasQuorum(reachableNodeCount: number): boolean {
    return reachableNodeCount >= this.quorumSize;
  }

  faultTolerance(): number {
    return Math.floor((this.totalNodes - 1) / 2);
  }

  // Given a partition that splits the cluster into disjoint groups, returns
  // the group (if any) that holds quorum -- at most one group ever can.
  findQuorumGroup(groups: number[][]): number[] | null {
    for (const group of groups) {
      if (this.hasQuorum(group.length)) return group;
    }
    return null;
  }
}

// Usage
const cluster = new QuorumCluster(5);
cluster.getQuorumSize(); // 3
cluster.faultTolerance(); // 2
cluster.hasQuorum(3); // true
cluster.hasQuorum(2); // false

// Partition {A,B,C} | {D,E}: only the first group can act
cluster.findQuorumGroup([["A", "B", "C"].length ? [1, 2, 3] : [], [4, 5]]); // [1, 2, 3]`,

  python: `class QuorumCluster:
    def __init__(self, total_nodes: int) -> None:
        if total_nodes < 1:
            raise ValueError("Cluster must have at least 1 node")
        self.total_nodes = total_nodes
        self.quorum_size = total_nodes // 2 + 1

    def has_quorum(self, reachable_node_count: int) -> bool:
        return reachable_node_count >= self.quorum_size

    def fault_tolerance(self) -> int:
        return (self.total_nodes - 1) // 2

    def find_quorum_group(self, groups: list[list[str]]) -> list[str] | None:
        """Given a partition that splits the cluster into disjoint groups,
        returns the group (if any) that holds quorum -- at most one can."""
        for group in groups:
            if self.has_quorum(len(group)):
                return group
        return None


# Usage
cluster = QuorumCluster(5)
cluster.quorum_size  # 3
cluster.fault_tolerance()  # 2
cluster.has_quorum(3)  # True
cluster.has_quorum(2)  # False

# Partition {A,B,C} | {D,E}: only the first group can act
cluster.find_quorum_group([["A", "B", "C"], ["D", "E"]])  # ["A", "B", "C"]`,

  java: `import java.util.List;

public class QuorumCluster {
    private final int totalNodes;
    private final int quorumSize;

    public QuorumCluster(int totalNodes) {
        if (totalNodes < 1) throw new IllegalArgumentException("Cluster must have at least 1 node");
        this.totalNodes = totalNodes;
        this.quorumSize = totalNodes / 2 + 1;
    }

    public int getQuorumSize() {
        return quorumSize;
    }

    public boolean hasQuorum(int reachableNodeCount) {
        return reachableNodeCount >= quorumSize;
    }

    public int faultTolerance() {
        return (totalNodes - 1) / 2;
    }

    // Given a partition that splits the cluster into disjoint groups, returns
    // the group (if any) that holds quorum -- at most one group ever can.
    public List<String> findQuorumGroup(List<List<String>> groups) {
        for (List<String> group : groups) {
            if (hasQuorum(group.size())) return group;
        }
        return null;
    }
}

// Usage
QuorumCluster cluster = new QuorumCluster(5);
cluster.getQuorumSize(); // 3
cluster.faultTolerance(); // 2
cluster.hasQuorum(3); // true
cluster.hasQuorum(2); // false

// Partition {A,B,C} | {D,E}: only the first group can act
cluster.findQuorumGroup(List.of(List.of("A", "B", "C"), List.of("D", "E"))); // ["A", "B", "C"]`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "quorum-conceptual",
    required: true,
    question:
      "Your team is deciding between a 3-node and a 4-node cluster for a quorum-based coordination service. Both cost roughly the same to add one more node. Based on the fault-tolerance math, what's the correct conclusion?",
    options: [
      { id: "a", text: "4 nodes tolerates more failures than 3 nodes, so it's strictly better" },
      {
        id: "b",
        text: "Both a 3-node and 4-node cluster tolerate exactly 1 failure, so the 4th node adds operational cost (one more node to run, more network overhead) without adding fault tolerance",
      },
      {
        id: "c",
        text: "3 nodes is always better than 4 because fewer nodes means fewer failure points",
      },
      { id: "d", text: "The difference only matters if the cluster is expected to grow further" },
    ],
    correctOptionId: "b",
    explanation:
      "Quorum size is ⌊n/2⌋+1. For 3 nodes, quorum = ⌊3/2⌋+1 = 2, so losing 1 node leaves 2 (still quorum) but losing 2 drops to 1 (below quorum) — 1 failure tolerated. For 4 nodes, quorum = ⌊4/2⌋+1 = 3, so losing 1 node leaves 3 (still quorum) but losing 2 drops to 2 (below quorum) — also exactly 1 failure tolerated. Both clusters tolerate the same single failure, so the 4th node buys no additional fault tolerance — only extra operational cost (one more node to run and monitor, more network/consensus overhead) — which is exactly the odd-vs-even inefficiency etcd's documentation describes. The next real gain in fault tolerance comes from going to 5 nodes (quorum 3, tolerates 2 failures), not from 3 to 4.",
  },
  {
    type: "implementation",
    id: "quorum-implementation",
    required: true,
    title: "Implement Quorum Size and Fault Tolerance Calculation",
    description: `Implement a QuorumCluster that, given a total node count, computes:

- **hasQuorum(reachableNodeCount)** — whether a given number of reachable nodes constitutes a quorum (strict majority) of the total cluster.
- **faultTolerance()** — the maximum number of simultaneous node failures the cluster can sustain while still being able to reach quorum.`,
    starterCode: {
      typescript: `class QuorumCluster {
  private readonly quorumSize: number;

  constructor(private readonly totalNodes: number) {
    // TODO: compute and store the quorum size (strict majority) for totalNodes
    this.quorumSize = 0;
  }

  hasQuorum(reachableNodeCount: number): boolean {
    // TODO: return whether reachableNodeCount meets or exceeds the quorum size
    return false;
  }

  faultTolerance(): number {
    // TODO: return the maximum number of simultaneous failures the cluster
    // can sustain while a majority is still reachable
    return 0;
  }
}`,
      python: `class QuorumCluster:
    def __init__(self, total_nodes: int) -> None:
        self.total_nodes = total_nodes
        # TODO: compute and store the quorum size (strict majority)
        self.quorum_size = 0

    def has_quorum(self, reachable_node_count: int) -> bool:
        # TODO: return whether reachable_node_count meets or exceeds the
        # quorum size
        return False

    def fault_tolerance(self) -> int:
        # TODO: return the maximum number of simultaneous failures the
        # cluster can sustain while a majority is still reachable
        return 0`,
      java: `public class QuorumCluster {
    private final int totalNodes;
    private final int quorumSize;

    public QuorumCluster(int totalNodes) {
        this.totalNodes = totalNodes;
        // TODO: compute and store the quorum size (strict majority)
        this.quorumSize = 0;
    }

    public boolean hasQuorum(int reachableNodeCount) {
        // TODO: return whether reachableNodeCount meets or exceeds the
        // quorum size
        return false;
    }

    public int faultTolerance() {
        // TODO: return the maximum number of simultaneous failures the
        // cluster can sustain while a majority is still reachable
        return 0;
    }
}`,
    },
    hints: [
      "Quorum size for n total nodes is ⌊n/2⌋ + 1 — integer division of n by 2, then add 1.",
      "hasQuorum: a simple >= comparison against the precomputed quorum size.",
      "faultTolerance: think about it as 'how many nodes can I lose and still have at least quorumSize remaining' — totalNodes - quorumSize gives exactly that.",
      "Sanity check your formula against known values: 3 nodes -> quorum 2 -> tolerance 1; 5 nodes -> quorum 3 -> tolerance 2; 7 nodes -> quorum 4 -> tolerance 3.",
    ],
    solution: {
      typescript: `class QuorumCluster {
  private readonly quorumSize: number;

  constructor(private readonly totalNodes: number) {
    this.quorumSize = Math.floor(totalNodes / 2) + 1;
  }

  hasQuorum(reachableNodeCount: number): boolean {
    return reachableNodeCount >= this.quorumSize;
  }

  faultTolerance(): number {
    return this.totalNodes - this.quorumSize;
  }
}`,
      python: `class QuorumCluster:
    def __init__(self, total_nodes: int) -> None:
        self.total_nodes = total_nodes
        self.quorum_size = total_nodes // 2 + 1

    def has_quorum(self, reachable_node_count: int) -> bool:
        return reachable_node_count >= self.quorum_size

    def fault_tolerance(self) -> int:
        return self.total_nodes - self.quorum_size`,
      java: `public class QuorumCluster {
    private final int totalNodes;
    private final int quorumSize;

    public QuorumCluster(int totalNodes) {
        this.totalNodes = totalNodes;
        this.quorumSize = totalNodes / 2 + 1;
    }

    public boolean hasQuorum(int reachableNodeCount) {
        return reachableNodeCount >= quorumSize;
    }

    public int faultTolerance() {
        return totalNodes - quorumSize;
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "quorum-system-design",
    required: false,
    title: "Sizing a Coordination Cluster Across Three Data Centers",
    scenario: `You're deploying a ZooKeeper-style coordination ensemble across three data centers (DC1, DC2, DC3) for geographic redundancy. The whole point is that the service should keep working even if one entire data center becomes unreachable (a DC-level network or power outage, not just individual machine failures).

Your team initially proposes 2 nodes per data center (6 nodes total). Evaluate this proposal using quorum math, and propose a better sizing if needed — explaining specifically what goes wrong with an even split across an even number of DCs.`,
    hints: [
      "With 6 total nodes, what's the quorum size? What happens if exactly one data center (2 nodes) becomes unreachable?",
      "Does 6 nodes actually buy more fault tolerance than fewer nodes, given this lesson's odd-vs-even sizing guidance?",
      "If you must keep nodes evenly spread across 3 DCs, what total node counts are even divisible by 3, and which of those are odd?",
      "What specifically breaks if the surviving nodes after a DC outage don't add up to quorum?",
    ],
    discussionPoints: [
      "**6 nodes (2 per DC) gives quorum = 4**: per the formula ⌊6/2⌋+1 = 4. If one entire data center goes down, only 4 nodes remain (2 DCs x 2 nodes) — which exactly equals quorum, so the cluster barely survives a single DC outage, with zero margin for any additional node failure on top of it.",
      "**6 nodes doesn't out-perform 5 nodes**: per this lesson's odd-vs-even guidance (directly sourced from etcd's documentation), a 6-node cluster's fault tolerance (6-4=2) is the same as a 5-node cluster's (5-3=2) — the 6th node adds a full extra node of operational cost (and, here, doesn't even map cleanly to '2 per DC' margin) without buying additional resilience.",
      "**The real problem is coupling quorum loss to a single DC's size**: with 2 nodes per DC, losing any one DC removes exactly 2 nodes — and if total cluster size is such that losing any 2 nodes drops below quorum (as it does at 6 nodes, quorum 4, losing 2 leaves exactly 4 — no safety margin at all), a single DC outage leaves the cluster unable to tolerate even one additional unrelated node failure elsewhere.",
      "**A better sizing uses an odd total, unevenly spread**: 3 nodes per 'majority side' DCs plus fewer elsewhere is a common real-world pattern, e.g. 3-2-2 (7 nodes total, quorum 4) or even simpler, 3 DCs with node counts like 3-2-2=7 so that losing the single largest DC (3 nodes) still leaves 4 — exactly quorum — while losing any 2-node DC still leaves 5, well above quorum, keeping meaningful fault-tolerance margin for additional failures layered on top of the DC outage.",
      "**The structural lesson**: quorum math doesn't care about geography by itself — it only cares about raw node counts. Designing for 'survive one full DC outage with margin to spare' means explicitly computing what remains after removing your largest single DC's node count and making sure that remainder is comfortably above quorum, not just barely at it, which the naive even-split proposal fails to do.",
    ],
  },
];
