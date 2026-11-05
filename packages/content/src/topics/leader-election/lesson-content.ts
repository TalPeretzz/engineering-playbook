import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Some tasks must be done by exactly one node at a time: assigning work to a cluster of workers, writing to a resource that can't tolerate concurrent writers, or acting as the single source of truth for cluster membership changes. If every node in a cluster tried to do this independently, you'd get duplicate work, conflicting writes, or split-brain decisions. But picking a single leader by fiat (hardcoding one node) doesn't survive that node crashing — the cluster needs a way to agree on a leader, and to detect and replace it automatically when it fails.",
      },
      {
        type: "p",
        text: "**Leader election** is a protocol that lets a cluster of nodes agree on exactly one coordinator at a time, and automatically elect a new one if the current leader crashes or becomes unreachable — without any node being hardcoded as special.",
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
          "**A shared coordination point**: nodes need somewhere to register candidacy and observe who currently holds leadership — in practice this is almost always a strongly-consistent coordination service (ZooKeeper, etcd, Consul) rather than the application nodes talking peer-to-peer, since the coordination service already solves the hard consensus problem once, correctly.",
          "**Lease- or sequence-based claim**: a candidate attempts to claim leadership, either by creating a uniquely-ordered marker (ZooKeeper's ephemeral sequential znodes — lowest sequence number wins) or by acquiring a time-bounded lease tied to a key (etcd's Election API, backed by a lease with a TTL).",
          "**Liveness via the coordination layer, not custom heartbeats**: instead of candidates pinging each other, the coordination service itself detects a dead leader — an ephemeral znode disappears when its owning session disconnects (ZooKeeper), or a lease expires if its holder stops renewing it before the TTL (etcd) — and this disappearance is what other candidates watch for.",
          "**Avoiding a thundering herd on failover**: naively, every waiting candidate could watch the current leader directly and all wake up simultaneously when it fails, hammering the coordination service at once. ZooKeeper's documented recipe instead has each candidate watch only the next-lowest-numbered candidate ahead of it — so when a node fails, only the one candidate immediately behind it needs to react.",
          "**Becoming leader**: when a candidate observes (via its watch) that it now holds the lowest sequence number (ZooKeeper) or that its campaign call has returned successfully (etcd), it considers itself leader and begins acting as one — until its own session/lease is lost, at which point it must step down and the process repeats.",
        ],
      },
      {
        type: "p",
        text: "The key design principle across real implementations: leader election is reduced to a narrower, already-solved problem (atomic claim + failure detection via a consensus-backed coordination service), rather than every application reinventing distributed consensus from scratch.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `ZooKeeper election: ephemeral sequential znodes

  guid-n_001   <- node A (lowest seq -> LEADER)
  guid-n_002   <- node B (watches n_001, its predecessor)
  guid-n_003   <- node C (watches n_002, NOT the leader)

Node A crashes -> session ends -> n_001 auto-deleted

  B watches n_001 -> fires -> B checks: am I lowest? yes
  B becomes LEADER

  guid-n_002   <- node B (LEADER)
  guid-n_003   <- node C (still watches n_002, unchanged)

Only B reacted -- C never woke up (no thundering herd)`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Claim candidacy (create ephemeral/sequential node or acquire lease)",
        time: "O(1)",
        note: "Single write to the coordination service",
      },
      {
        operation: "Determine current leader",
        time: "O(1)",
        note: "Read the lowest-sequence child, or the lease holder",
      },
      {
        operation: "React to a leader failure",
        time: "O(1) per watching candidate",
        note: "Only the next-in-line candidate's watch fires, not every candidate's",
      },
      {
        operation: "Full re-election across n candidates after a crash",
        time: "O(1) amortized per crash",
        note: "Each crash triggers exactly one watch notification to exactly one candidate, not O(n) notifications",
      },
      {
        operation: "Detect a dead leader",
        time: "Bounded by session timeout / lease TTL",
        note: "Not instantaneous — there's an inherent detection delay set by the coordination service's timeout configuration",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Reduces a hard distributed-consensus problem to a narrow, well-tested primitive (atomic claim + liveness detection) backed by a proven coordination service",
      "Automatic failover with no manual intervention — a crashed leader's lease/session expires and another candidate takes over",
      "The herd-avoidance pattern (watch only your immediate predecessor) keeps failover cheap even with many waiting candidates",
      "Decouples 'who is leader' from any single node's identity — any candidate can become leader, so there's no special hardcoded node to fail catastrophically",
    ],
    cons: [
      "Leader detection is not instantaneous — there's an unavoidable window (the session timeout or lease TTL) during which the old leader may be dead but not yet detected as such, or worse, briefly still acting as leader while a new one is elected",
      "Introduces a dependency on an external coordination service (ZooKeeper, etcd, Consul) being available and correctly configured — the coordination layer itself becomes critical infrastructure",
      "A slow-but-alive leader (e.g., stuck in a long GC pause) can fail to renew its lease/session in time and be demoted even though it never crashed — a stop-the-world pause can cause an unwanted leadership change",
      "Doesn't by itself prevent a demoted-but-still-running old leader from taking an action after a new leader is elected (a 'zombie leader' problem) unless paired with fencing tokens or similar mechanisms",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Coordinating a single writer or coordinator role in a cluster — e.g., a primary database replica, a cluster's scheduling coordinator, or a cron-job runner that must not run duplicate instances",
      "Systems that already depend on a consensus-backed coordination service (ZooKeeper, etcd, Consul) for other purposes, where leader election is a natural additional use of that same infrastructure",
      "Any scenario needing automatic failover without manual operator intervention when a coordinator node dies",
      "Reducing a complex distributed-consensus requirement to a narrower, already-solved coordination primitive rather than hand-rolling it",
    ],
    whenNotToUse: [
      "The work can be done by multiple nodes concurrently without coordination (idempotent, naturally parallelizable work) — leader election adds complexity and a failure point for no benefit there",
      "You can't tolerate the inherent detection-delay window — leader election doesn't give instantaneous failover, only bounded-time failover",
      "You don't already have (and don't want to operate) a consensus-backed coordination service — standing one up just for leader election is a meaningful operational cost",
      "Correctness requires strictly preventing any action from an old, not-yet-detected-as-dead leader — that needs fencing tokens or similar guarantees layered on top of basic leader election, not leader election alone",
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
          '**Apache ZooKeeper\'s documented leader election recipe** uses "SEQUENCE|EPHEMERAL" znodes where "the process that created the znode with the smallest appended sequence number is the leader," and explicitly documents the herd-avoidance pattern of each candidate watching only the next-lowest-numbered znode ahead of it, rather than the leader directly — "this elegant design prevents all processes from simultaneously awakening and hammering the server whenever a leader fails."',
          '**etcd\'s Election service** (`Campaign`, `Leader`, `Observe`, `Resign` RPCs) ties leadership to a lease: a candidate campaigns with "the ID of the lease attached to leadership of the election," and documents that "if the lease expires or is revoked before resigning leadership, then the leadership is transferred to the next campaigner, if any" — the lease-TTL mechanism this lesson\'s how-it-works section describes as etcd\'s liveness-detection approach.',
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Apache ZooKeeper — Recipes and Solutions (Leader Election)",
            url: "https://zookeeper.apache.org/doc/current/recipes.html",
            verified: "2026-11-05",
            note: "Ephemeral sequential znodes, lowest-sequence-wins, watch-only-your-predecessor herd avoidance",
          },
          {
            name: "etcd Docs — Concurrency API Reference (Election service)",
            url: "https://etcd.io/docs/v3.3/dev-guide/api_concurrency_reference_v3/",
            verified: "2026-11-05",
            note: "Campaign/Leader/Observe/Resign RPCs; lease-ID-based leadership with automatic transfer on lease expiry",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `// A simplified ZooKeeper-style election using an in-memory stand-in for a
// coordination service (ephemeral sequential nodes + watches).

interface CoordinationService {
  createSequential(path: string): string; // returns e.g. "guid-n_0000000003"
  delete(path: string): void;
  listChildren(prefix: string): string[];
  watchForDeletion(path: string, onDeleted: () => void): void;
}

class LeaderElection {
  private myNode: string | null = null;
  private isLeader = false;

  constructor(
    private readonly coordination: CoordinationService,
    private readonly electionPath: string,
    private readonly onBecomeLeader: () => void
  ) {}

  join(): void {
    this.myNode = this.coordination.createSequential(this.electionPath);
    this.checkPosition();
  }

  private checkPosition(): void {
    const children = this.coordination.listChildren(this.electionPath).sort();
    const myIndex = children.indexOf(this.myNode!);

    if (myIndex === 0) {
      this.isLeader = true;
      this.onBecomeLeader();
      return;
    }

    // Watch only the node immediately ahead of us -- not the leader directly.
    const predecessor = children[myIndex - 1];
    this.coordination.watchForDeletion(predecessor, () => this.checkPosition());
  }

  resign(): void {
    if (this.myNode) this.coordination.delete(this.myNode);
    this.isLeader = false;
  }
}`,

  python: `from typing import Callable, Protocol


class CoordinationService(Protocol):
    def create_sequential(self, path: str) -> str: ...
    def delete(self, path: str) -> None: ...
    def list_children(self, prefix: str) -> list[str]: ...
    def watch_for_deletion(self, path: str, on_deleted: Callable[[], None]) -> None: ...


class LeaderElection:
    def __init__(
        self,
        coordination: CoordinationService,
        election_path: str,
        on_become_leader: Callable[[], None],
    ) -> None:
        self.coordination = coordination
        self.election_path = election_path
        self.on_become_leader = on_become_leader
        self.my_node: str | None = None
        self.is_leader = False

    def join(self) -> None:
        self.my_node = self.coordination.create_sequential(self.election_path)
        self._check_position()

    def _check_position(self) -> None:
        children = sorted(self.coordination.list_children(self.election_path))
        my_index = children.index(self.my_node)

        if my_index == 0:
            self.is_leader = True
            self.on_become_leader()
            return

        # Watch only the node immediately ahead of us -- not the leader directly.
        predecessor = children[my_index - 1]
        self.coordination.watch_for_deletion(predecessor, self._check_position)

    def resign(self) -> None:
        if self.my_node:
            self.coordination.delete(self.my_node)
        self.is_leader = False`,

  java: `import java.util.List;
import java.util.function.Consumer;

public interface CoordinationService {
    String createSequential(String path);
    void delete(String path);
    List<String> listChildren(String prefix);
    void watchForDeletion(String path, Runnable onDeleted);
}

public class LeaderElection {
    private final CoordinationService coordination;
    private final String electionPath;
    private final Runnable onBecomeLeader;
    private String myNode;
    private boolean isLeader = false;

    public LeaderElection(CoordinationService coordination, String electionPath, Runnable onBecomeLeader) {
        this.coordination = coordination;
        this.electionPath = electionPath;
        this.onBecomeLeader = onBecomeLeader;
    }

    public void join() {
        this.myNode = coordination.createSequential(electionPath);
        checkPosition();
    }

    private void checkPosition() {
        List<String> children = coordination.listChildren(electionPath);
        children.sort(String::compareTo);
        int myIndex = children.indexOf(myNode);

        if (myIndex == 0) {
            isLeader = true;
            onBecomeLeader.run();
            return;
        }

        // Watch only the node immediately ahead of us -- not the leader directly.
        String predecessor = children.get(myIndex - 1);
        coordination.watchForDeletion(predecessor, this::checkPosition);
    }

    public void resign() {
        if (myNode != null) coordination.delete(myNode);
        isLeader = false;
    }
}`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "leader-election-conceptual",
    required: true,
    question:
      "In ZooKeeper's documented leader election recipe, why does each waiting candidate watch only the znode immediately ahead of it (the next-lowest sequence number), rather than watching the current leader's znode directly?",
    options: [
      { id: "a", text: "Watching the leader directly isn't technically possible in ZooKeeper" },
      {
        id: "b",
        text: "To avoid a thundering herd: if every candidate watched the leader, all of them would wake up and hit the coordination service simultaneously on every leader failure, instead of just the one candidate next in line",
      },
      {
        id: "c",
        text: "Watching your predecessor is required to preserve FIFO ordering of znode creation",
      },
      { id: "d", text: "It has no functional purpose — it's purely a ZooKeeper API convention" },
    ],
    correctOptionId: "b",
    explanation:
      "If every waiting candidate watched the current leader's znode directly, a single leader failure would trigger every single candidate's watch simultaneously, all of them racing to re-check their position and hammering the coordination service at once — a thundering herd. By having each candidate watch only the one znode immediately ahead of it in sequence order, a leader's failure only ever wakes up the one candidate who is next in line to potentially become leader; every other candidate's watch stays untouched. This is explicitly documented in ZooKeeper's own leader election recipe as the reason for the design, as cited in this lesson's real-world section.",
  },
  {
    type: "implementation",
    id: "leader-election-implementation",
    required: true,
    title: "Implement ZooKeeper-Style Leader Election",
    description: `Given a CoordinationService that supports creating sequential nodes, listing children, deleting a node, and watching a specific node for deletion, implement the core election logic:

- **join()** — registers this instance as a candidate and checks its position.
- **checkPosition()** (called initially by join(), and again whenever a watched predecessor is deleted) — determines whether this instance is now the leader (lowest sequence number); if not, sets a watch on the node immediately ahead of it in sequence order (not the current leader).`,
    starterCode: {
      typescript: `interface CoordinationService {
  createSequential(path: string): string;
  delete(path: string): void;
  listChildren(prefix: string): string[];
  watchForDeletion(path: string, onDeleted: () => void): void;
}

class LeaderElection {
  private myNode: string | null = null;
  private isLeader = false;

  constructor(
    private readonly coordination: CoordinationService,
    private readonly electionPath: string,
    private readonly onBecomeLeader: () => void
  ) {}

  join(): void {
    // TODO: create this candidate's sequential node under electionPath,
    // store it in this.myNode, then call checkPosition()
  }

  private checkPosition(): void {
    // TODO: list and sort all children under electionPath; if this
    // candidate's node is first (lowest), become leader and call
    // onBecomeLeader(); otherwise watch the node immediately ahead of
    // this one for deletion, calling checkPosition() again when it fires
  }
}`,
      python: `from typing import Callable, Protocol


class CoordinationService(Protocol):
    def create_sequential(self, path: str) -> str: ...
    def delete(self, path: str) -> None: ...
    def list_children(self, prefix: str) -> list[str]: ...
    def watch_for_deletion(self, path: str, on_deleted: Callable[[], None]) -> None: ...


class LeaderElection:
    def __init__(
        self,
        coordination: CoordinationService,
        election_path: str,
        on_become_leader: Callable[[], None],
    ) -> None:
        self.coordination = coordination
        self.election_path = election_path
        self.on_become_leader = on_become_leader
        self.my_node: str | None = None
        self.is_leader = False

    def join(self) -> None:
        # TODO: create this candidate's sequential node under
        # self.election_path, store it in self.my_node, then call
        # self._check_position()
        pass

    def _check_position(self) -> None:
        # TODO: list and sort all children under self.election_path; if
        # this candidate's node is first (lowest), become leader and call
        # self.on_become_leader(); otherwise watch the node immediately
        # ahead of this one for deletion, calling self._check_position()
        # again when it fires
        pass`,
      java: `import java.util.List;

public interface CoordinationService {
    String createSequential(String path);
    void delete(String path);
    List<String> listChildren(String prefix);
    void watchForDeletion(String path, Runnable onDeleted);
}

public class LeaderElection {
    private final CoordinationService coordination;
    private final String electionPath;
    private final Runnable onBecomeLeader;
    private String myNode;
    private boolean isLeader = false;

    public LeaderElection(CoordinationService coordination, String electionPath, Runnable onBecomeLeader) {
        this.coordination = coordination;
        this.electionPath = electionPath;
        this.onBecomeLeader = onBecomeLeader;
    }

    public void join() {
        // TODO: create this candidate's sequential node under
        // electionPath, store it in myNode, then call checkPosition()
    }

    private void checkPosition() {
        // TODO: list and sort all children under electionPath; if this
        // candidate's node is first (lowest), become leader and call
        // onBecomeLeader.run(); otherwise watch the node immediately
        // ahead of this one for deletion, calling checkPosition() again
        // when it fires
    }
}`,
    },
    hints: [
      "join(): the coordination service's createSequential() call both registers this candidate and returns a unique, ordered identifier for it — save that identifier before checking position.",
      "checkPosition(): after sorting all children, find this candidate's own index within that sorted list (not just check if the list is empty).",
      "checkPosition(): index 0 means lowest sequence number, i.e. leader — any other index means there's exactly one specific node to watch: the one at index - 1, not index 0 (the leader) and not any other node.",
      "checkPosition(): the watch's callback should call checkPosition() again, not just set isLeader — a deleted predecessor doesn't necessarily make this candidate the leader if there are candidates with even lower sequence numbers that are still alive (though in practice, watching only your immediate predecessor already guarantees this can't happen if everyone follows the same protocol).",
    ],
    solution: {
      typescript: `class LeaderElection {
  private myNode: string | null = null;
  private isLeader = false;

  constructor(
    private readonly coordination: CoordinationService,
    private readonly electionPath: string,
    private readonly onBecomeLeader: () => void
  ) {}

  join(): void {
    this.myNode = this.coordination.createSequential(this.electionPath);
    this.checkPosition();
  }

  private checkPosition(): void {
    const children = this.coordination.listChildren(this.electionPath).sort();
    const myIndex = children.indexOf(this.myNode!);

    if (myIndex === 0) {
      this.isLeader = true;
      this.onBecomeLeader();
      return;
    }

    const predecessor = children[myIndex - 1];
    this.coordination.watchForDeletion(predecessor, () => this.checkPosition());
  }
}`,
      python: `class LeaderElection:
    def join(self) -> None:
        self.my_node = self.coordination.create_sequential(self.election_path)
        self._check_position()

    def _check_position(self) -> None:
        children = sorted(self.coordination.list_children(self.election_path))
        my_index = children.index(self.my_node)

        if my_index == 0:
            self.is_leader = True
            self.on_become_leader()
            return

        predecessor = children[my_index - 1]
        self.coordination.watch_for_deletion(predecessor, self._check_position)`,
      java: `public class LeaderElection {
    public void join() {
        this.myNode = coordination.createSequential(electionPath);
        checkPosition();
    }

    private void checkPosition() {
        List<String> children = coordination.listChildren(electionPath);
        children.sort(String::compareTo);
        int myIndex = children.indexOf(myNode);

        if (myIndex == 0) {
            isLeader = true;
            onBecomeLeader.run();
            return;
        }

        String predecessor = children.get(myIndex - 1);
        coordination.watchForDeletion(predecessor, this::checkPosition);
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "leader-election-system-design",
    required: false,
    title: "Designing Coordinator Failover for a Job Scheduling Cluster",
    scenario: `You're operating a cluster of 5 identical worker nodes that run a job-scheduling service. At any time, exactly one node must act as the "coordinator" — assigning jobs to the other workers and tracking overall cluster state. If the coordinator crashes, another node must take over within a few seconds, automatically, with no human intervention.

You have an existing etcd cluster available (used elsewhere in your infrastructure). Design the coordinator failover using etcd's lease-based election primitives, and discuss what happens if the coordinator is alive but network-partitioned from etcd (not crashed, just unreachable).`,
    hints: [
      "What should the lease TTL be, and what's the tradeoff of making it shorter vs. longer?",
      "How does a node renew its leadership claim to stay coordinator?",
      "What does etcd do automatically if a coordinator stops renewing its lease?",
      "If the coordinator is alive but can't reach etcd, is it still safe for it to act as coordinator? What could go wrong if it keeps acting as coordinator anyway?",
    ],
    discussionPoints: [
      "**Lease TTL as the core tuning knob**: each of the 5 nodes campaigns for leadership using etcd's Election API with a lease attached, per this lesson's real-world section. A shorter TTL means faster failover detection but requires more frequent keepalive renewals (and risks spurious leadership loss under transient slowness); a longer TTL means slower failover but more tolerance for brief renewal delays. A TTL in the single-digit seconds range, with keepalives sent well inside that window (e.g., every TTL/3), is a common starting point.",
      '**Renewal, not re-election, under normal operation**: the coordinator doesn\'t re-campaign repeatedly — it holds its lease and sends periodic keepalives to etcd to prevent expiry. As documented, "if the lease expires or is revoked before resigning leadership, then the leadership is transferred to the next campaigner" — so normal operation requires no coordinator-side election logic beyond keeping its lease alive.',
      "**Automatic failover on crash**: if the coordinator process crashes outright, it stops sending keepalives, its lease expires at the TTL boundary, and etcd automatically makes the next campaigning node the new leader — no custom failure-detection code needed on the application side, since etcd's lease mechanism is the failure detector.",
      "**The network-partition case is the hard one**: if the coordinator is alive but cut off from etcd specifically (not crashed), it cannot renew its lease — so from etcd's perspective it looks identical to a crashed coordinator, and etcd will correctly elect a new leader once the TTL expires. But the original coordinator's own process is still running and may not immediately know it has lost leadership if it isn't checking its lease status — if it keeps assigning jobs based on stale local state after a new coordinator has taken over, you get two nodes simultaneously believing they're coordinator (a 'zombie leader'), exactly the failure mode flagged in this lesson's tradeoffs section.",
      "**Mitigating the zombie-leader case**: the coordinator's own logic should treat 'my lease keepalive is failing' as an immediate signal to stop acting as coordinator locally, even before etcd formally elects someone else — don't wait to be told you're no longer leader, proactively stand down the moment you can't confirm you still are. For actions with real consequences (e.g., assigning a job that shouldn't run twice), pairing this with a fencing token (an attached, monotonically increasing value tied to the current leadership term, checked by whatever system executes the coordinator's commands) closes the gap completely — this lesson's tradeoffs section calls out that leader election alone doesn't guarantee this without such a mechanism layered on top.",
    ],
  },
];
