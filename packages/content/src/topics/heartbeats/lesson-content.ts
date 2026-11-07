import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "A distributed system needs to know which nodes are actually alive and able to do work — a dead or hung node that keeps being treated as healthy means requests get routed to it and fail, or a failover that should have happened doesn't. But failure isn't something a node can announce on its way out — a crashed process can't send a final \"I'm dead\" message, and a hung process is, by definition, not responding to anything. The system has to *infer* death from silence.",
      },
      {
        type: "p",
        text: "**Heartbeats** are periodic \"I'm alive\" signals a node sends (or a signal a monitor actively probes for), so that the absence of a heartbeat for long enough becomes the signal that something is wrong. The core design problem heartbeats create: how long should you wait before declaring a silent node dead, given that waiting too short risks false alarms (a node that's just briefly slow) and waiting too long delays real failure detection?",
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
          "**Push-based heartbeats**: each node periodically sends a small \"I'm alive\" message to a monitor (or to its peers). If the monitor doesn't receive one within an expected window, it suspects the node is down.",
          "**Pull-based heartbeats (active probing)**: instead of nodes announcing themselves, a monitor actively polls each node on a schedule and checks for a response — Kubernetes liveness probes work this way, with the kubelet periodically checking each container and taking action if it doesn't respond correctly.",
          '**Fixed-threshold failure detection**: the simplest approach declares a node dead after missing a fixed number of consecutive checks. Kubernetes exposes this directly as configuration: `periodSeconds` controls how often a probe runs (with a documented default of 10 seconds), and `failureThreshold` controls how many consecutive failures trigger action — after exceeding it, "the kubelet restarts the container." This is simple and predictable, but the threshold is a single fixed number that has to be chosen once and applies uniformly regardless of how noisy or variable the network actually is at any given moment.',
          '**Adaptive (accrual) failure detection**: rather than a hard yes/no threshold, some systems compute a continuously-varying suspicion level based on the actual recent pattern of heartbeat arrivals. Cassandra runs "a variant of the Phi Accrual Failure Detector, in which every node is constantly making an independent decision of if their peer nodes are available or not," based "primarily...on received heartbeat state" — a peer becomes "convicted" (judged dead) once that suspicion level crosses a threshold, rather than after a single fixed missed-heartbeat count.',
          "**The fundamental tradeoff heartbeats can't escape**: any heartbeat-based scheme trades detection speed against false-positive risk. A short timeout detects real failures fast but risks wrongly declaring a briefly-slow (but alive) node dead; a long timeout avoids false positives but leaves the system treating a genuinely dead node as healthy for longer.",
        ],
      },
      {
        type: "p",
        text: "Heartbeats are a building block, not a complete solution on their own: what a system *does* once it suspects a node is dead — stop routing traffic to it, trigger a failover, restart it — is a separate decision layered on top of the heartbeat mechanism itself.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Fixed-threshold (e.g. Kubernetes-style):

  t=0s   heartbeat OK
  t=10s  heartbeat OK
  t=20s  MISSED (1/3)
  t=30s  MISSED (2/3)
  t=40s  MISSED (3/3) -> failureThreshold hit -> restart triggered

  Same threshold applies no matter how noisy the network has been

Adaptive (phi accrual style):

  recent heartbeat gaps: 10s, 11s, 9s, 10s  (very regular)
  one heartbeat now 25s late
    -> 25s is a BIG outlier vs. the regular ~10s pattern
    -> suspicion (phi) rises SHARPLY -> convicted sooner

  recent heartbeat gaps: 8s, 22s, 6s, 19s   (already noisy)
  one heartbeat now 25s late
    -> 25s is NOT unusual given how noisy this peer already is
    -> suspicion (phi) rises GENTLY -> not yet convicted`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Send/check one heartbeat",
        time: "O(1)",
        note: "A single small message or probe per interval",
      },
      {
        operation: "Fixed-threshold detection time",
        time: "periodSeconds × failureThreshold",
        note: "A deterministic, configured window — e.g. Kubernetes' documented pattern",
      },
      {
        operation: "Adaptive (phi accrual) detection time",
        time: "Variable, based on recent heartbeat regularity",
        note: "Shorter when a peer's heartbeats have been very regular; longer when they've already been noisy",
      },
      {
        operation: "Monitor overhead (pull-based) for n nodes",
        time: "O(n) probes per period",
        note: "One probe per monitored node, per scheduling interval",
      },
      {
        operation: "Memory for adaptive detection, per monitored peer",
        time: "O(w)",
        note: "w = size of the recent-heartbeat-interval window kept for computing suspicion level",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Simple, well-understood mechanism for inferring liveness without requiring a node to announce its own death (which is often impossible)",
      "Fixed-threshold detection is predictable and easy to reason about — the exact detection-time bound is a direct function of configured parameters",
      "Adaptive detection responds to real network conditions rather than one static number, reducing false positives during transient noisy periods while still detecting failures reasonably fast when a peer has otherwise been reliable",
      "Composable with many failure-response actions (restart, failover, remove from load balancing) — heartbeats just supply the liveness signal; the response is a separate, pluggable decision",
    ],
    cons: [
      "Fundamentally a tradeoff between detection speed and false-positive rate — no choice of parameters eliminates this tension, only shifts where on the spectrum a system sits",
      "Fixed thresholds that work well under normal conditions can cause false-positive failovers during real but transient network congestion, exactly when the system is already under stress",
      "Adaptive detection is more complex to implement and reason about than a fixed threshold, and its behavior is less immediately predictable from the configuration alone",
      "Heartbeats themselves consume some amount of network and processing overhead proportional to cluster size and check frequency — tuning for faster detection directly costs more overhead",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Container/process health monitoring where a hung or crashed process needs automatic restart — the textbook Kubernetes liveness-probe use case",
      "Cluster membership and failure detection in distributed databases and coordination systems, often combined with gossip-based dissemination of the resulting liveness state",
      "Any system where a monitor or peer needs to detect the absence of a healthy counterpart to trigger failover, re-routing, or alerting",
      "Environments with genuinely variable network conditions, where adaptive (accrual-style) detection's resistance to false positives during noisy periods is worth its added complexity",
    ],
    whenNotToUse: [
      "A node can announce its own graceful shutdown through an explicit, reliable out-of-band mechanism, making a heartbeat-based inference about failure unnecessary for that specific case (though heartbeats are typically still needed to catch *ungraceful* failures like crashes)",
      "Extremely latency-sensitive failure detection where even a short, well-tuned heartbeat interval is too slow — some systems need hardware-level or protocol-level failure signals instead",
      "Very small, simple systems where a hardcoded restart policy or manual monitoring is sufficient and the operational overhead of tuning heartbeat parameters isn't justified",
      "Systems where false-positive failovers are specifically unacceptable and network conditions are known to be highly variable — these need careful tuning (or adaptive detection) rather than a naive fixed threshold",
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
          '**Kubernetes liveness probes** use fixed-threshold, pull-based heartbeat checking: the kubelet periodically probes each container (documented default `periodSeconds` of 10 seconds), and documents that "many applications running for long periods of time eventually transition to broken states, and cannot recover except by being restarted" — which is exactly what liveness probes exist to detect and remedy, triggering a container restart once the configured failure threshold is exceeded.',
          '**Apache Cassandra** runs "a variant of the Phi Accrual Failure Detector, in which every node is constantly making an independent decision of if their peer nodes are available or not," based "primarily...on received heartbeat state," with a peer becoming "convicted" once the computed suspicion level crosses a threshold — the adaptive alternative to a single fixed missed-heartbeat count this lesson\'s how-it-works section contrasts against Kubernetes\' fixed-threshold approach.',
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Kubernetes Docs — Liveness, Readiness, and Startup Probes",
            url: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/",
            verified: "2026-11-07",
            note: "Liveness probe purpose and restart-on-failure behavior, periodSeconds default of 10s",
          },
          {
            name: "Apache Cassandra Docs — Architecture (Dynamo)",
            url: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html",
            verified: "2026-11-07",
            note: "Phi Accrual Failure Detector: independent per-node availability decisions based on heartbeat state, peer 'conviction'",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `// Fixed-threshold heartbeat monitor.
class FixedThresholdMonitor {
  private missedCount = new Map<string, number>();

  constructor(
    private readonly failureThreshold: number,
    private readonly onDeclaredDead: (nodeId: string) => void
  ) {}

  recordHeartbeat(nodeId: string): void {
    this.missedCount.set(nodeId, 0);
  }

  // Called once per periodSeconds for each monitored node.
  checkInterval(nodeId: string, heartbeatReceivedThisInterval: boolean): void {
    if (heartbeatReceivedThisInterval) {
      this.missedCount.set(nodeId, 0);
      return;
    }
    const missed = (this.missedCount.get(nodeId) ?? 0) + 1;
    this.missedCount.set(nodeId, missed);
    if (missed >= this.failureThreshold) {
      this.onDeclaredDead(nodeId);
    }
  }
}

// Simplified adaptive (phi-accrual-inspired) heartbeat monitor.
class AdaptiveMonitor {
  private readonly intervals = new Map<string, number[]>();
  private readonly lastHeartbeatAt = new Map<string, number>();
  private readonly windowSize = 10;
  private readonly phiThreshold = 8;

  recordHeartbeat(nodeId: string, now: number): void {
    const last = this.lastHeartbeatAt.get(nodeId);
    if (last !== undefined) {
      const gap = now - last;
      const history = this.intervals.get(nodeId) ?? [];
      history.push(gap);
      if (history.length > this.windowSize) history.shift();
      this.intervals.set(nodeId, history);
    }
    this.lastHeartbeatAt.set(nodeId, now);
  }

  // phi grows the longer the current silence is, relative to the peer's
  // own recent heartbeat-gap variability -- a consistently-regular peer
  // trips the threshold sooner for the same silence than a historically
  // noisy one.
  suspicionLevel(nodeId: string, now: number): number {
    const last = this.lastHeartbeatAt.get(nodeId);
    const history = this.intervals.get(nodeId) ?? [];
    if (last === undefined || history.length === 0) return 0;

    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length;
    const stddev = Math.max(Math.sqrt(variance), 1); // avoid div-by-zero

    const timeSinceLastHeartbeat = now - last;
    return Math.max(0, (timeSinceLastHeartbeat - mean) / stddev);
  }

  isSuspected(nodeId: string, now: number): boolean {
    return this.suspicionLevel(nodeId, now) >= this.phiThreshold;
  }
}`,

  python: `class FixedThresholdMonitor:
    """Fixed-threshold heartbeat monitor."""

    def __init__(self, failure_threshold: int, on_declared_dead) -> None:
        self.failure_threshold = failure_threshold
        self.on_declared_dead = on_declared_dead
        self.missed_count: dict[str, int] = {}

    def record_heartbeat(self, node_id: str) -> None:
        self.missed_count[node_id] = 0

    def check_interval(self, node_id: str, heartbeat_received_this_interval: bool) -> None:
        """Called once per period for each monitored node."""
        if heartbeat_received_this_interval:
            self.missed_count[node_id] = 0
            return
        missed = self.missed_count.get(node_id, 0) + 1
        self.missed_count[node_id] = missed
        if missed >= self.failure_threshold:
            self.on_declared_dead(node_id)


class AdaptiveMonitor:
    """Simplified adaptive (phi-accrual-inspired) heartbeat monitor."""

    def __init__(self, window_size: int = 10, phi_threshold: float = 8.0) -> None:
        self.window_size = window_size
        self.phi_threshold = phi_threshold
        self.intervals: dict[str, list[float]] = {}
        self.last_heartbeat_at: dict[str, float] = {}

    def record_heartbeat(self, node_id: str, now: float) -> None:
        last = self.last_heartbeat_at.get(node_id)
        if last is not None:
            gap = now - last
            history = self.intervals.setdefault(node_id, [])
            history.append(gap)
            if len(history) > self.window_size:
                history.pop(0)
        self.last_heartbeat_at[node_id] = now

    def suspicion_level(self, node_id: str, now: float) -> float:
        """Grows the longer the current silence is, relative to the peer's
        own recent heartbeat-gap variability -- a consistently-regular peer
        trips the threshold sooner for the same silence than a historically
        noisy one."""
        last = self.last_heartbeat_at.get(node_id)
        history = self.intervals.get(node_id, [])
        if last is None or not history:
            return 0.0

        mean = sum(history) / len(history)
        variance = sum((x - mean) ** 2 for x in history) / len(history)
        stddev = max(variance ** 0.5, 1.0)  # avoid div-by-zero

        time_since_last_heartbeat = now - last
        return max(0.0, (time_since_last_heartbeat - mean) / stddev)

    def is_suspected(self, node_id: str, now: float) -> bool:
        return self.suspicion_level(node_id, now) >= self.phi_threshold`,

  java: `import java.util.*;
import java.util.function.Consumer;

// Fixed-threshold heartbeat monitor.
public class FixedThresholdMonitor {
    private final Map<String, Integer> missedCount = new HashMap<>();
    private final int failureThreshold;
    private final Consumer<String> onDeclaredDead;

    public FixedThresholdMonitor(int failureThreshold, Consumer<String> onDeclaredDead) {
        this.failureThreshold = failureThreshold;
        this.onDeclaredDead = onDeclaredDead;
    }

    public void recordHeartbeat(String nodeId) {
        missedCount.put(nodeId, 0);
    }

    // Called once per periodSeconds for each monitored node.
    public void checkInterval(String nodeId, boolean heartbeatReceivedThisInterval) {
        if (heartbeatReceivedThisInterval) {
            missedCount.put(nodeId, 0);
            return;
        }
        int missed = missedCount.getOrDefault(nodeId, 0) + 1;
        missedCount.put(nodeId, missed);
        if (missed >= failureThreshold) {
            onDeclaredDead.accept(nodeId);
        }
    }
}

// Simplified adaptive (phi-accrual-inspired) heartbeat monitor.
public class AdaptiveMonitor {
    private final Map<String, List<Double>> intervals = new HashMap<>();
    private final Map<String, Double> lastHeartbeatAt = new HashMap<>();
    private final int windowSize = 10;
    private final double phiThreshold = 8.0;

    public void recordHeartbeat(String nodeId, double now) {
        Double last = lastHeartbeatAt.get(nodeId);
        if (last != null) {
            double gap = now - last;
            List<Double> history = intervals.computeIfAbsent(nodeId, k -> new ArrayList<>());
            history.add(gap);
            if (history.size() > windowSize) history.remove(0);
        }
        lastHeartbeatAt.put(nodeId, now);
    }

    // phi grows the longer the current silence is, relative to the peer's
    // own recent heartbeat-gap variability -- a consistently-regular peer
    // trips the threshold sooner for the same silence than a historically
    // noisy one.
    public double suspicionLevel(String nodeId, double now) {
        Double last = lastHeartbeatAt.get(nodeId);
        List<Double> history = intervals.getOrDefault(nodeId, List.of());
        if (last == null || history.isEmpty()) return 0.0;

        double mean = history.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double variance = history.stream().mapToDouble(x -> (x - mean) * (x - mean)).average().orElse(0);
        double stddev = Math.max(Math.sqrt(variance), 1.0); // avoid div-by-zero

        double timeSinceLastHeartbeat = now - last;
        return Math.max(0, (timeSinceLastHeartbeat - mean) / stddev);
    }

    public boolean isSuspected(String nodeId, double now) {
        return suspicionLevel(nodeId, now) >= phiThreshold;
    }
}`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "heartbeats-conceptual",
    required: true,
    question:
      "A peer has sent heartbeats every ~10 seconds, very consistently, for the last hour. It's now been 24 seconds since its last heartbeat. Under an adaptive (phi-accrual-style) failure detector, how does this compare to the same 24-second silence from a peer whose heartbeat gaps have ranged wildly between 5 and 30 seconds over the same period?",
    options: [
      {
        id: "a",
        text: "Both peers are treated identically — the detector only cares about the raw elapsed time, not historical pattern",
      },
      {
        id: "b",
        text: "The consistent peer is judged more suspicious for the same 24-second gap, because 24 seconds is a much bigger deviation from its usual ~10-second rhythm than it is from the noisy peer's already-wide range",
      },
      {
        id: "c",
        text: "The noisy peer is always judged more suspicious, since historical unreliability is inherently penalized regardless of the current gap",
      },
      {
        id: "d",
        text: "Adaptive detectors ignore historical heartbeat data entirely and only look at the single most recent interval",
      },
    ],
    correctOptionId: "b",
    explanation:
      "The core idea behind accrual-style failure detection is that suspicion is computed relative to a peer's own recent heartbeat-interval pattern, not an absolute fixed threshold applied uniformly to everyone. For the consistent peer (gaps reliably near 10s), a 24-second silence is a large, unusual deviation from its established rhythm — so suspicion rises sharply. For the noisy peer (gaps already ranging 5-30s), a 24-second gap falls within its normal variability — so the same absolute silence duration produces much lower suspicion. This is exactly the behavior this lesson's visual section illustrates, and it's the structural advantage adaptive detection has over a fixed threshold: it naturally adjusts its sensitivity to each peer's actual observed behavior instead of applying one number to every peer regardless of their individual network conditions.",
  },
  {
    type: "implementation",
    id: "heartbeats-implementation",
    required: true,
    title: "Implement a Fixed-Threshold Heartbeat Monitor",
    description: `Implement a FixedThresholdMonitor that tracks, for each monitored node, how many consecutive intervals it has missed a heartbeat in a row:

- **recordHeartbeat(nodeId)** — resets the missed-count for a node to 0 (called whenever a heartbeat actually arrives).
- **checkInterval(nodeId, heartbeatReceivedThisInterval)** — called once per monitoring interval per node; if a heartbeat was received this interval, resets the missed count; otherwise increments it, and calls \`onDeclaredDead(nodeId)\` once the missed count reaches \`failureThreshold\`.`,
    starterCode: {
      typescript: `class FixedThresholdMonitor {
  private missedCount = new Map<string, number>();

  constructor(
    private readonly failureThreshold: number,
    private readonly onDeclaredDead: (nodeId: string) => void
  ) {}

  recordHeartbeat(nodeId: string): void {
    // TODO: reset this node's missed count to 0
  }

  checkInterval(nodeId: string, heartbeatReceivedThisInterval: boolean): void {
    // TODO: if a heartbeat was received, reset the missed count to 0;
    // otherwise increment it, and call onDeclaredDead if it has now
    // reached failureThreshold
  }
}`,
      python: `class FixedThresholdMonitor:
    def __init__(self, failure_threshold: int, on_declared_dead) -> None:
        self.failure_threshold = failure_threshold
        self.on_declared_dead = on_declared_dead
        self.missed_count: dict[str, int] = {}

    def record_heartbeat(self, node_id: str) -> None:
        # TODO: reset this node's missed count to 0
        pass

    def check_interval(self, node_id: str, heartbeat_received_this_interval: bool) -> None:
        # TODO: if a heartbeat was received, reset the missed count to 0;
        # otherwise increment it, and call on_declared_dead if it has now
        # reached failure_threshold
        pass`,
      java: `public class FixedThresholdMonitor {
    private final Map<String, Integer> missedCount = new HashMap<>();
    private final int failureThreshold;
    private final Consumer<String> onDeclaredDead;

    public FixedThresholdMonitor(int failureThreshold, Consumer<String> onDeclaredDead) {
        this.failureThreshold = failureThreshold;
        this.onDeclaredDead = onDeclaredDead;
    }

    public void recordHeartbeat(String nodeId) {
        // TODO: reset this node's missed count to 0
    }

    public void checkInterval(String nodeId, boolean heartbeatReceivedThisInterval) {
        // TODO: if a heartbeat was received, reset the missed count to 0;
        // otherwise increment it, and call onDeclaredDead if it has now
        // reached failureThreshold
    }
}`,
    },
    hints: [
      "recordHeartbeat: this is a simple reset — set the stored count for nodeId to 0.",
      "checkInterval: handle the 'heartbeat received' case first and return early — it always resets to 0 regardless of prior state.",
      "checkInterval: for the missed case, read the current count (defaulting to 0 if this node has no entry yet), add 1, and store it back before checking the threshold.",
      "checkInterval: the dead-declaration check should happen after incrementing, comparing the new count against failureThreshold with >=, not >, so a count that exactly equals the threshold still triggers.",
    ],
    solution: {
      typescript: `class FixedThresholdMonitor {
  private missedCount = new Map<string, number>();

  constructor(
    private readonly failureThreshold: number,
    private readonly onDeclaredDead: (nodeId: string) => void
  ) {}

  recordHeartbeat(nodeId: string): void {
    this.missedCount.set(nodeId, 0);
  }

  checkInterval(nodeId: string, heartbeatReceivedThisInterval: boolean): void {
    if (heartbeatReceivedThisInterval) {
      this.missedCount.set(nodeId, 0);
      return;
    }
    const missed = (this.missedCount.get(nodeId) ?? 0) + 1;
    this.missedCount.set(nodeId, missed);
    if (missed >= this.failureThreshold) {
      this.onDeclaredDead(nodeId);
    }
  }
}`,
      python: `class FixedThresholdMonitor:
    def record_heartbeat(self, node_id: str) -> None:
        self.missed_count[node_id] = 0

    def check_interval(self, node_id: str, heartbeat_received_this_interval: bool) -> None:
        if heartbeat_received_this_interval:
            self.missed_count[node_id] = 0
            return
        missed = self.missed_count.get(node_id, 0) + 1
        self.missed_count[node_id] = missed
        if missed >= self.failure_threshold:
            self.on_declared_dead(node_id)`,
      java: `public class FixedThresholdMonitor {
    public void recordHeartbeat(String nodeId) {
        missedCount.put(nodeId, 0);
    }

    public void checkInterval(String nodeId, boolean heartbeatReceivedThisInterval) {
        if (heartbeatReceivedThisInterval) {
            missedCount.put(nodeId, 0);
            return;
        }
        int missed = missedCount.getOrDefault(nodeId, 0) + 1;
        missedCount.put(nodeId, missed);
        if (missed >= failureThreshold) {
            onDeclaredDead.accept(nodeId);
        }
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "heartbeats-system-design",
    required: false,
    title: "Tuning Failure Detection for a Payment Processing Fleet",
    scenario: `You operate a fleet of payment-processing worker nodes behind a load balancer. The load balancer uses heartbeat-based health checks to decide which workers receive traffic. Two incidents happened last month:

1. A worker genuinely crashed, but it took 90 seconds before the load balancer stopped routing traffic to it — during that window, a number of payment requests failed.
2. A different, perfectly healthy worker was briefly removed from rotation during a short network blip (about 15 seconds of packet loss), causing an unnecessary capacity dip right when traffic was already elevated.

Both incidents involved the same fixed-threshold heartbeat configuration. Propose a fix, explaining the tension between the two incidents and why naively shortening the timeout to fix incident 1 would make incident 2 worse.`,
    hints: [
      "What does incident 1 suggest about the current failure-threshold window (periodSeconds x failureThreshold)?",
      "What does incident 2 suggest about that same window?",
      "Can a single fixed-threshold configuration simultaneously satisfy 'detect real failures fast' and 'tolerate brief network blips' when the blip and the desired detection time are close in duration?",
      "Does this lesson's adaptive/phi-accrual alternative change the tradeoff, and if so, how?",
    ],
    discussionPoints: [
      "**Incident 1 points toward a shorter detection window; incident 2 points toward a longer one**: the 90-second detection delay in incident 1 directly cost real payment failures — a strong case for lowering periodSeconds x failureThreshold. But incident 2's 15-second network blip falsely triggering removal shows the current window is already not much longer than real transient noise — shortening it further would make transient blips trigger false removals even more often, directly worsening incident 2's failure mode.",
      "**Why a single fixed threshold can't satisfy both incidents at once**: if the real crash in incident 1 should be detected faster than 90 seconds, but the network blip in incident 2 (15 seconds of loss) should NOT trigger removal, the fixed threshold needs to sit somewhere above 15 seconds but as close to that as safely possible, below 90 seconds, with no overlap guaranteed — a single number is being asked to distinguish 'genuinely dead' from 'transiently slow' using only elapsed time, when both incidents actually looked identical from the monitor's point of view in the moment (silence of some duration).",
      "**This is precisely where this lesson's fixed-threshold-vs-adaptive tradeoff becomes concrete, not theoretical**: a fixed threshold is a single number applied uniformly regardless of how that specific worker has actually been behaving. An adaptive (phi-accrual-style) detector computes suspicion relative to each worker's own recent heartbeat-regularity pattern — a worker with history of very consistent heartbeats hitting a sudden 15-second gap during a known good run looks different (and can be judged differently) than if that same worker had already been somewhat noisy.",
      "**Adaptive detection doesn't eliminate the tradeoff, but it changes its shape**: switching to phi-accrual-style detection for this fleet means tuning a suspicion threshold (phi) rather than a fixed time window — a worker that's been extremely regular can be judged dead faster for an unusual silence than the old fixed 90-second window allowed (addressing incident 1), while a worker whose recent heartbeats already show some natural jitter gets more tolerance for an equivalent gap (reducing incident 2's kind of false removal) — without requiring the operator to find one number that happens to separate every real failure from every transient blip.",
      "**What this doesn't solve on its own**: adaptive detection still needs a chosen phi threshold, and an unusually bad network period across the *whole* fleet (not just one worker) can still produce correlated false suspicions if every worker's heartbeats degrade together — a separate concern from per-worker tuning, better addressed by also tracking whether failures are isolated to one worker or correlated across many before triggering fleet-wide action.",
    ],
  },
];
