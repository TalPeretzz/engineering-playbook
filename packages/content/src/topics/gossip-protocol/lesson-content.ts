import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "In a large cluster, every node needs to know things about every other node: who's alive, who just joined, who just left, what each node's current state is. A central registry that every node polls or pushes to works fine at small scale, but becomes a bottleneck and a single point of failure as the cluster grows — and it reintroduces exactly the kind of centralized dependency that distributed systems are often trying to avoid.",
      },
      {
        type: "p",
        text: "A **gossip protocol** (epidemic protocol) spreads state through a cluster the way a rumor spreads through a social network: each node periodically picks a few random peers and exchanges what it currently knows with them. No central coordinator, no node needing to talk to all n-1 others — just repeated small, local exchanges that converge the whole cluster toward the same shared view of the world.",
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
          '**Periodic random exchange**: on a fixed interval, each node picks a small number of random peers and exchanges state with them — Cassandra\'s documented implementation "runs every second and exchanges state messages with up to three other nodes in the cluster."',
          "**Each exchange spreads more than just the two nodes' own state**: nodes don't only share their own information — they also relay what they've already learned about other nodes. Cassandra's docs describe this directly: \"the nodes exchange information about themselves and about the other nodes that they have gossiped about, so all nodes quickly learn about all other nodes in the cluster.\"",
          '**Versioned state resolves conflicts**: each piece of gossiped state carries a version, so when two nodes exchange information about a third node, whichever version is newer wins and overwrites the older one — "a gossip message has a version associated with it, so that during a gossip exchange, older information is overwritten with the most current state."',
          '**Exponential, logarithmic-time spread**: because every node that learns something new immediately becomes a source for spreading it further (not just the original sender), the number of informed nodes roughly doubles each round — Wikipedia\'s documented example: "in a network with 25,000 machines, we can find the best match after about 30 rounds of gossip," since convergence time scales with the logarithm of cluster size, not the cluster size itself.',
          "**Resilient to message loss by construction**: since information keeps getting re-gossiped round after round from whichever nodes already have it, a few lost or dropped messages in one round don't stop the information from eventually reaching everyone — the redundancy of repeated, overlapping spread is what makes gossip protocols tolerate unreliable networks without needing acknowledgments or retries for every single message.",
        ],
      },
      {
        type: "p",
        text: "The core design tradeoff: gossip trades instant, guaranteed consistency (which a central coordinator or synchronous broadcast could in principle offer) for eventual, highly scalable, failure-tolerant consistency — every node will converge on the same view, just not immediately, and not in a way any single message's loss can derail.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Round 1: A knows "A=alive". A gossips to a random peer.

  A --gossip--> B          B now knows: A=alive, B=alive

Round 2: A and B each gossip to a random peer (not necessarily each other).

  A --gossip--> C          B --gossip--> D
  C now knows:              D now knows:
    A=alive, C=alive           A=alive, B=alive, D=alive

Round 3: now FOUR nodes (A,B,C,D) each gossip onward --
  informed set roughly DOUBLES each round, not grows by a fixed amount

  round 1: 2 informed     round 2: 4 informed     round 3: ~8 informed
  -> convergence time scales with log(cluster size), not cluster size`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "State exchanged per node, per round",
        time: "O(1) peers contacted",
        note: "A fixed small number of random peers (e.g. Cassandra's 3), regardless of cluster size",
      },
      {
        operation: "Rounds to spread info to the whole cluster",
        time: "O(log n)",
        note: "n = cluster size; the informed set roughly doubles each round",
      },
      {
        operation: "Total messages to reach full convergence",
        time: "O(n log n)",
        note: "n nodes each sending O(log n) rounds of messages",
      },
      {
        operation: "Memory per node",
        time: "O(n)",
        note: "Each node tracks versioned state for every other node it has learned about",
      },
      {
        operation: "Resilience to message loss",
        time: "Self-healing across rounds",
        note: "A dropped message in one round doesn't block convergence — the same info is re-gossiped in later rounds via other paths",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "No single coordinator or bottleneck — every node does a small, constant amount of work per round regardless of cluster size",
      "Scales to very large clusters: convergence time grows logarithmically with cluster size, not linearly",
      "Naturally resilient to dropped messages and transient node failures — redundant, repeated spread means no single lost message derails convergence",
      "Decentralized failure detection falls out naturally: if a node stops gossiping and stops appearing as 'alive' in its peers' views, that absence itself propagates through the cluster",
    ],
    cons: [
      "Only eventually consistent — there's an inherent delay (on the order of O(log n) rounds) before all nodes agree on the latest state, unlike a synchronous broadcast or coordinator-based update",
      "Convergence time, while logarithmic, is still nonzero and grows with cluster size, so it's unsuitable for anything needing immediate, guaranteed up-to-date state across the whole cluster",
      "Random peer selection means no control over which specific nodes learn new information first — individual nodes can lag behind the cluster's overall convergence for a round or two by chance",
      "More nodes means more total gossip traffic in aggregate (O(n log n) messages), even though any single node's per-round work stays constant",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Cluster membership and failure detection at scale — who's currently part of the cluster, who just joined or left, without a central registry becoming a bottleneck",
      "Spreading metadata or configuration changes through a large, decentralized cluster where eventual propagation (seconds, not milliseconds) is acceptable",
      "Systems that already favor decentralization and eventual consistency for other reasons (e.g., Dynamo-style databases), where gossip fits the same design philosophy",
      "Large clusters (hundreds to thousands of nodes) where any approach requiring linear-in-cluster-size coordination overhead per node would become a real bottleneck",
    ],
    whenNotToUse: [
      "You need immediate, strongly consistent agreement on state across the whole cluster — gossip's eventual-consistency delay is fundamentally unsuitable for that",
      "The cluster is small enough that simpler approaches (a coordination service, direct broadcast) work fine without the added complexity and indirection of gossip",
      "The information being spread is sensitive to staleness in a way that eventual consistency can't tolerate, even for a few seconds",
      "You need deterministic, auditable propagation paths — gossip's randomized peer selection makes the exact path information took to reach a given node non-deterministic",
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
          '**Apache Cassandra** uses gossip for cluster membership and failure detection, documenting that "the gossip process runs every second and exchanges state messages with up to three other nodes in the cluster," with nodes relaying what they\'ve learned about others so that "all nodes quickly learn about all other nodes in the cluster," and versioned messages ensuring "older information is overwritten with the most current state."',
          '**The general gossip/epidemic protocol model**, as documented, achieves convergence in "logarithmic time in the size of the network" — with a concrete cited example of reaching full propagation "after about 30 rounds of gossip" across a 25,000-machine network — and derives its robustness from the fact that "this round-by-round doubling phenomenon makes the protocol very robust, even if some messages get lost," the structural property this lesson\'s complexity and tradeoffs sections both build on.',
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "DataStax Docs — Internode Communications (Gossip), Cassandra 3.x",
            url: "https://docs.datastax.com/en/cassandra-oss/3.x/cassandra/architecture/archGossipAbout.html",
            verified: "2026-11-07",
            note: "1-second gossip interval, exchange with up to 3 peers per round, versioned state overwrite",
          },
          {
            name: "Wikipedia — Gossip protocol",
            url: "https://en.wikipedia.org/wiki/Gossip_protocol",
            verified: "2026-11-07",
            note: "Logarithmic-time convergence, 25,000-node/30-round example, robustness to message loss via round-by-round doubling",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `interface NodeState {
  nodeId: string;
  alive: boolean;
  version: number;
}

class GossipNode {
  private readonly knownState = new Map<string, NodeState>();

  constructor(
    public readonly id: string,
    private readonly peers: () => GossipNode[]
  ) {
    this.knownState.set(id, { nodeId: id, alive: true, version: 0 });
  }

  // Called periodically (e.g. once per second in a real system).
  gossipRound(randomPeerCount = 3): void {
    const candidates = this.peers().filter((p) => p.id !== this.id);
    const chosen = pickRandom(candidates, randomPeerCount);
    for (const peer of chosen) {
      this.exchangeWith(peer);
    }
  }

  private exchangeWith(peer: GossipNode): void {
    // Each side merges the other's state in, keeping only newer versions.
    for (const [nodeId, state] of peer.knownState) {
      this.mergeState(state);
    }
    for (const [nodeId, state] of this.knownState) {
      peer.mergeState(state);
    }
  }

  private mergeState(incoming: NodeState): void {
    const existing = this.knownState.get(incoming.nodeId);
    if (!existing || incoming.version > existing.version) {
      this.knownState.set(incoming.nodeId, incoming);
    }
  }

  markSelfState(alive: boolean): void {
    const current = this.knownState.get(this.id)!;
    this.knownState.set(this.id, { ...current, alive, version: current.version + 1 });
  }

  view(): NodeState[] {
    return [...this.knownState.values()];
  }
}

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}`,

  python: `import random
from dataclasses import dataclass, replace


@dataclass
class NodeState:
    node_id: str
    alive: bool
    version: int


class GossipNode:
    def __init__(self, node_id: str, peers_fn) -> None:
        self.id = node_id
        self._peers_fn = peers_fn  # callable returning list[GossipNode]
        self.known_state: dict[str, NodeState] = {
            node_id: NodeState(node_id, alive=True, version=0)
        }

    def gossip_round(self, random_peer_count: int = 3) -> None:
        """Called periodically (e.g. once per second in a real system)."""
        candidates = [p for p in self._peers_fn() if p.id != self.id]
        chosen = random.sample(candidates, min(random_peer_count, len(candidates)))
        for peer in chosen:
            self._exchange_with(peer)

    def _exchange_with(self, peer: "GossipNode") -> None:
        # Each side merges the other's state in, keeping only newer versions.
        for state in list(peer.known_state.values()):
            self._merge_state(state)
        for state in list(self.known_state.values()):
            peer._merge_state(state)

    def _merge_state(self, incoming: NodeState) -> None:
        existing = self.known_state.get(incoming.node_id)
        if existing is None or incoming.version > existing.version:
            self.known_state[incoming.node_id] = incoming

    def mark_self_state(self, alive: bool) -> None:
        current = self.known_state[self.id]
        self.known_state[self.id] = replace(current, alive=alive, version=current.version + 1)

    def view(self) -> list[NodeState]:
        return list(self.known_state.values())`,

  java: `import java.util.*;
import java.util.function.Supplier;

public class GossipNode {
    public record NodeState(String nodeId, boolean alive, int version) {}

    public final String id;
    private final Supplier<List<GossipNode>> peersSupplier;
    private final Map<String, NodeState> knownState = new HashMap<>();

    public GossipNode(String id, Supplier<List<GossipNode>> peersSupplier) {
        this.id = id;
        this.peersSupplier = peersSupplier;
        this.knownState.put(id, new NodeState(id, true, 0));
    }

    // Called periodically (e.g. once per second in a real system).
    public void gossipRound(int randomPeerCount) {
        List<GossipNode> candidates = new ArrayList<>();
        for (GossipNode p : peersSupplier.get()) {
            if (!p.id.equals(this.id)) candidates.add(p);
        }
        Collections.shuffle(candidates);
        for (GossipNode peer : candidates.subList(0, Math.min(randomPeerCount, candidates.size()))) {
            exchangeWith(peer);
        }
    }

    private void exchangeWith(GossipNode peer) {
        // Each side merges the other's state in, keeping only newer versions.
        for (NodeState state : new ArrayList<>(peer.knownState.values())) {
            this.mergeState(state);
        }
        for (NodeState state : new ArrayList<>(this.knownState.values())) {
            peer.mergeState(state);
        }
    }

    private void mergeState(NodeState incoming) {
        NodeState existing = knownState.get(incoming.nodeId());
        if (existing == null || incoming.version() > existing.version()) {
            knownState.put(incoming.nodeId(), incoming);
        }
    }

    public void markSelfState(boolean alive) {
        NodeState current = knownState.get(id);
        knownState.put(id, new NodeState(id, alive, current.version() + 1));
    }

    public Collection<NodeState> view() {
        return knownState.values();
    }
}`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "gossip-protocol-conceptual",
    required: true,
    question:
      "A cluster has 1,024 nodes. Node A learns a new piece of information and gossips it to 1 random peer per round, and every node that learns the information does the same in the next round. Roughly how many rounds does it take for all 1,024 nodes to learn it?",
    options: [
      { id: "a", text: "About 1,024 rounds — one node learns it per round" },
      {
        id: "b",
        text: "About 10 rounds — the informed set roughly doubles each round (2^10 = 1024)",
      },
      { id: "c", text: "1 round — gossip protocols broadcast to the whole cluster instantly" },
      { id: "d", text: "512 rounds — half the cluster learns it per round" },
    ],
    correctOptionId: "b",
    explanation:
      "Because every node that learns the information becomes a new source spreading it further (not just the original node continuing to spread it alone), the informed set roughly doubles each round: 1, 2, 4, 8, 16... after k rounds, roughly 2^k nodes are informed. Solving 2^k = 1024 gives k = 10. This doubling behavior is exactly why gossip convergence scales with the logarithm of cluster size rather than the cluster size itself — this lesson's real-world section cites a similar real-world case (roughly 30 rounds to inform 25,000 machines), where actual peer-selection randomness introduces some redundant contact with already-informed nodes, making real convergence a bit slower than the idealized clean doubling used here, but following the same fundamentally logarithmic shape.",
  },
  {
    type: "implementation",
    id: "gossip-protocol-implementation",
    required: true,
    title: "Implement Gossip State Exchange",
    description: `Given a GossipNode that tracks versioned state for every node it knows about, implement the core gossip exchange logic:

- **gossipRound(randomPeerCount)** — selects \`randomPeerCount\` random peers (excluding itself) and exchanges state with each.
- **mergeState(incoming)** — merges an incoming piece of node state into this node's known state, keeping whichever version is newer.`,
    starterCode: {
      typescript: `interface NodeState {
  nodeId: string;
  alive: boolean;
  version: number;
}

class GossipNode {
  private readonly knownState = new Map<string, NodeState>();

  constructor(
    public readonly id: string,
    private readonly peers: () => GossipNode[]
  ) {
    this.knownState.set(id, { nodeId: id, alive: true, version: 0 });
  }

  gossipRound(randomPeerCount = 3): void {
    // TODO: pick randomPeerCount random peers (excluding self), and
    // exchange state with each by merging both directions
  }

  private mergeState(incoming: NodeState): void {
    // TODO: only replace existing state for incoming.nodeId if incoming
    // has a strictly higher version (or no existing state yet)
  }
}`,
      python: `import random
from dataclasses import dataclass


@dataclass
class NodeState:
    node_id: str
    alive: bool
    version: int


class GossipNode:
    def __init__(self, node_id: str, peers_fn) -> None:
        self.id = node_id
        self._peers_fn = peers_fn
        self.known_state: dict[str, NodeState] = {
            node_id: NodeState(node_id, alive=True, version=0)
        }

    def gossip_round(self, random_peer_count: int = 3) -> None:
        # TODO: pick random_peer_count random peers (excluding self), and
        # exchange state with each by merging both directions
        pass

    def _merge_state(self, incoming: NodeState) -> None:
        # TODO: only replace existing state for incoming.node_id if
        # incoming has a strictly higher version (or no existing state yet)
        pass`,
      java: `public class GossipNode {
    public record NodeState(String nodeId, boolean alive, int version) {}

    public final String id;
    private final java.util.function.Supplier<java.util.List<GossipNode>> peersSupplier;
    private final java.util.Map<String, NodeState> knownState = new java.util.HashMap<>();

    public GossipNode(String id, java.util.function.Supplier<java.util.List<GossipNode>> peersSupplier) {
        this.id = id;
        this.peersSupplier = peersSupplier;
        this.knownState.put(id, new NodeState(id, true, 0));
    }

    public void gossipRound(int randomPeerCount) {
        // TODO: pick randomPeerCount random peers (excluding self), and
        // exchange state with each by merging both directions
    }

    private void mergeState(NodeState incoming) {
        // TODO: only replace existing state for incoming.nodeId() if
        // incoming has a strictly higher version (or no existing state yet)
    }
}`,
    },
    hints: [
      "gossipRound: filter the peer list to exclude yourself, then randomly shuffle or sample to pick the requested count.",
      "gossipRound: for each chosen peer, the exchange is two-way — merge the peer's known state into yours, AND merge your known state into the peer's (both sides should end up more informed).",
      "mergeState: look up the existing entry for incoming.nodeId — if there isn't one, or if incoming's version is strictly greater than the existing one's, store the incoming state.",
      "mergeState: don't overwrite on equal versions — only a strictly newer version should replace existing state, otherwise you risk flip-flopping between two equally 'current' copies.",
    ],
    solution: {
      typescript: `class GossipNode {
  private readonly knownState = new Map<string, NodeState>();

  gossipRound(randomPeerCount = 3): void {
    const candidates = this.peers().filter((p) => p.id !== this.id);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, randomPeerCount);
    for (const peer of chosen) {
      for (const state of peer.knownState.values()) this.mergeState(state);
      for (const state of this.knownState.values()) peer.mergeState(state);
    }
  }

  private mergeState(incoming: NodeState): void {
    const existing = this.knownState.get(incoming.nodeId);
    if (!existing || incoming.version > existing.version) {
      this.knownState.set(incoming.nodeId, incoming);
    }
  }
}`,
      python: `class GossipNode:
    def gossip_round(self, random_peer_count: int = 3) -> None:
        candidates = [p for p in self._peers_fn() if p.id != self.id]
        chosen = random.sample(candidates, min(random_peer_count, len(candidates)))
        for peer in chosen:
            for state in list(peer.known_state.values()):
                self._merge_state(state)
            for state in list(self.known_state.values()):
                peer._merge_state(state)

    def _merge_state(self, incoming: NodeState) -> None:
        existing = self.known_state.get(incoming.node_id)
        if existing is None or incoming.version > existing.version:
            self.known_state[incoming.node_id] = incoming`,
      java: `public class GossipNode {
    public void gossipRound(int randomPeerCount) {
        List<GossipNode> candidates = new ArrayList<>();
        for (GossipNode p : peersSupplier.get()) {
            if (!p.id.equals(this.id)) candidates.add(p);
        }
        Collections.shuffle(candidates);
        for (GossipNode peer : candidates.subList(0, Math.min(randomPeerCount, candidates.size()))) {
            for (NodeState state : new ArrayList<>(peer.knownState.values())) this.mergeState(state);
            for (NodeState state : new ArrayList<>(this.knownState.values())) peer.mergeState(state);
        }
    }

    private void mergeState(NodeState incoming) {
        NodeState existing = knownState.get(incoming.nodeId());
        if (existing == null || incoming.version() > existing.version()) {
            knownState.put(incoming.nodeId(), incoming);
        }
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "gossip-protocol-system-design",
    required: false,
    title: "Designing Membership and Failure Detection for a 2,000-Node Fleet",
    scenario: `You're operating a fleet of 2,000 worker nodes that process jobs from a queue. Each worker needs a reasonably up-to-date view of "which other workers are currently alive" to avoid assigning work to dead nodes. Workers join and leave frequently (scaling events, deploys, occasional crashes).

A teammate proposes a central "registry service" that every worker polls every few seconds to get the full list of alive workers. You're concerned this won't scale cleanly to 2,000+ nodes and want to propose gossip instead. Make the case using this lesson's material, and discuss what "eventual" consistency means concretely for this use case.`,
    hints: [
      "What happens to the central registry's load as the fleet grows from 2,000 to 10,000 nodes, versus what happens to each individual node's gossip workload?",
      "How many rounds would it take for membership info to propagate across 2,000 nodes via gossip, roughly?",
      "Is a few-seconds-stale view of 'who's alive' actually a problem for a job-assignment use case specifically?",
      "What happens to the registry approach if the registry itself is briefly unreachable, versus what happens to gossip in the same scenario?",
    ],
    discussionPoints: [
      "**Central registry load scales with fleet size; gossip's per-node load doesn't**: every one of 2,000 workers polling a central registry every few seconds means the registry handles on the order of thousands of requests per polling interval, and that number grows linearly as the fleet grows. With gossip, each node still only exchanges state with a fixed small number of peers (e.g., 3) per round regardless of whether the fleet is 2,000 or 20,000 nodes — the per-node cost this lesson's complexity table documents as O(1) peers contacted per round, not O(n).",
      "**Convergence time stays manageable at this scale**: per this lesson's O(log n) rounds property, propagating a membership change across 2,000 nodes takes on the order of log2(2000) ≈ 11 rounds — at a 1-second gossip interval (matching Cassandra's documented cadence), that's roughly 11 seconds for full convergence, which is a concrete, boundable number to put in front of a teammate skeptical of 'eventual' consistency.",
      "**Is a few seconds of staleness actually a problem here?**: for job assignment specifically, the failure mode of acting on slightly-stale membership info is 'occasionally assign a job to a node that died a few seconds ago' — a recoverable situation if the job queue has standard retry/redelivery semantics (the job gets reassigned once the failure is detected), not a correctness catastrophe. This is the kind of use case gossip's eventual-consistency tradeoff fits well, as opposed to a use case needing instant, guaranteed-fresh state.",
      "**Registry unavailability vs. gossip under the same network hiccup**: if the central registry becomes briefly unreachable (a deploy, a network blip, an overloaded instance), every worker's view of cluster membership stalls simultaneously — a single point of failure for the entire fleet's membership visibility. With gossip, there's no single component whose unavailability stalls everyone; a transient issue reaching one specific peer just means that round's exchange with that peer didn't happen, and the next round (with likely different random peers) continues the spread regardless — directly the message-loss robustness this lesson's tradeoffs section describes.",
      "**What the registry approach does get right that gossip doesn't, and the honest tradeoff**: a central registry can offer a single, immediately-queryable source of truth with no propagation delay at all (when it's up) — if the use case genuinely needed guaranteed-fresh membership on every single lookup, that property is worth something gossip structurally can't match. The honest case for gossip here isn't 'always strictly better' — it's that for this specific use case (job assignment tolerating brief staleness, at a scale where centralization becomes an operational liability), gossip's tradeoffs line up better with the actual requirements.",
    ],
  },
];
