import type { Challenge, Section } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Distributed systems frequently grant temporary ownership: one worker owns a queue partition, one node acts as leader, or one process may update a resource. Permanent ownership is dangerous because the holder can crash or become unreachable without releasing it. A **lease** solves that liveness problem by making authority expire automatically unless the holder renews it.",
      },
      {
        type: "p",
        text: "A lease resembles a distributed lock with a deadline, but the deadline changes the contract. The holder owns the resource only for a bounded interval and must stop acting when it can no longer prove renewal. Expiry restores availability after failure; it does not, by itself, prevent an old paused holder from resuming and acting after a newer holder has taken over.",
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
          "**Acquire:** a coordination service atomically grants a resource to one holder until an expiry time. The response includes a unique lease ID and, for safety-critical writes, a monotonically increasing fencing token.",
          "**Renew:** the holder periodically extends the deadline using the same lease ID. Renewal must succeed before the old deadline with enough safety margin for network and scheduling delay.",
          "**Expire:** if renewal stops, the coordination service eventually treats the lease as free. Another client may then acquire it with a newer fencing token.",
          "**Stop on uncertainty:** a holder that cannot renew must stop protected work. It cannot safely assume that a timeout means the renewal succeeded or that no replacement holder exists.",
          "**Fence stale holders:** the protected resource remembers the largest fencing token it has accepted and rejects operations carrying older tokens. This closes the pause-after-expiry race that time alone cannot close.",
        ],
      },
      {
        type: "p",
        text: "Lease duration is a failure-detection tradeoff. A short lease recovers quickly but is sensitive to pauses and network jitter. A long lease tolerates delay but keeps the resource unavailable longer after a real crash. Renewal is normally scheduled well before expiry rather than at the last instant.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Lease timeline",
    content: `time ─────────────────────────────────────────────────────────────▶

Client A:  acquire(token=41) ── renew ── [long pause] ───── resumes
Lease:     [=============== valid ===============] expires
Client B:                                       acquire(token=42) ──▶

Without fencing:
  A resumes and may still write after B took ownership.

With fencing at the resource:
  B writes with token 42  → ACCEPT
  A writes with token 41  → REJECT (stale authority)

Expiry restores liveness. Fencing preserves safety.`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity and operational cost",
    entries: [
      {
        operation: "Acquire",
        time: "O(1) logical operation",
        note: "May require a quorum round trip in a replicated coordinator",
      },
      {
        operation: "Renew",
        time: "O(1) per renewal",
        note: "Repeated for the lifetime of the lease",
      },
      { operation: "Release", time: "O(1)", note: "Conditional on matching the active lease ID" },
      {
        operation: "Failure recovery",
        time: "O(lease duration)",
        note: "A crashed holder cannot be replaced until expiry is observed",
      },
      {
        operation: "Coordinator state",
        time: "—",
        space: "O(L)",
        note: "L = number of active leases",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Automatically recovers ownership after a holder crashes",
      "Bounds how long stale coordination state can block progress",
      "Supports renewable leadership and partition ownership without permanent locks",
      "Fencing tokens can make protected writes safe even when old holders resume",
    ],
    cons: [
      "Correct tuning depends on network latency, scheduling pauses, and coordinator availability",
      "Renewal creates continuous coordination traffic and another failure path",
      "Time-bound ownership alone cannot stop a paused stale holder",
      "Long leases slow failover; short leases increase false expiry and ownership churn",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Assigning queue or stream partitions to workers",
      "Time-bounded leader authority for scheduled or maintenance work",
      "Temporary ownership that must recover automatically after crashes",
      "Service discovery registrations that should disappear when clients stop renewing",
    ],
    whenNotToUse: [
      "When work can be partitioned deterministically without shared coordination",
      "When idempotency or optimistic concurrency can make duplicate actors harmless",
      "When the protected resource cannot enforce fencing and stale writes would be catastrophic",
      "When a local mutex is sufficient because every actor lives in one process",
    ],
  },
  {
    type: "text",
    id: "production",
    heading: "Production considerations",
    body: [
      {
        type: "list",
        items: [
          "**Use a strongly consistent coordinator:** lease ownership is coordination state. A stale replica must not grant overlapping authority.",
          "**Renew early with jitter:** renew at a fraction of the lease duration, leave room for retries, and jitter many clients so renewals do not synchronize.",
          "**Use monotonic time for local deadlines:** wall clocks can jump. Treat the coordinator as authoritative and use elapsed-time clocks for local safety margins.",
          "**Make release conditional:** a delayed release from an old holder must never delete a newer holder's lease.",
          "**Observe churn:** alert on renewal latency, expiry count, ownership changes, failed fencing checks, and time spent without an owner.",
          "**Design graceful handoff:** stop accepting new work, checkpoint progress, release early, and let the successor resume from durable state.",
        ],
      },
    ],
  },
  {
    type: "comparison",
    id: "comparison",
    heading: "Lease vs related techniques",
    columns: ["Technique", "Authority", "Failure recovery", "Important caveat"],
    rows: [
      {
        Technique: "Local mutex",
        Authority: "One process",
        "Failure recovery": "Process lifecycle",
        "Important caveat": "Cannot coordinate machines",
      },
      {
        Technique: "Distributed lock",
        Authority: "Shared coordinator",
        "Failure recovery": "Explicit release or TTL",
        "Important caveat": "Needs safe ownership checks",
      },
      {
        Technique: "Lease",
        Authority: "Expires unless renewed",
        "Failure recovery": "Bounded by lease duration",
        "Important caveat": "Needs fencing for stale holders",
      },
      {
        Technique: "Optimistic concurrency",
        Authority: "No exclusive owner",
        "Failure recovery": "Retry on version conflict",
        "Important caveat": "Best when conflicts are acceptable",
      },
    ],
  },
];

export const implementations = {
  typescript: `type Lease = { id: string; fencingToken: number; expiresAtMs: number };

interface LeaseStore {
  acquire(resource: string, holder: string, ttlMs: number): Promise<Lease | null>;
  renew(resource: string, leaseId: string, ttlMs: number): Promise<Lease | null>;
  release(resource: string, leaseId: string): Promise<boolean>;
}

class LeaseGuard {
  constructor(private readonly store: LeaseStore) {}

  async run<T>(resource: string, holder: string, ttlMs: number,
    work: (token: number) => Promise<T>): Promise<T> {
    const lease = await this.store.acquire(resource, holder, ttlMs);
    if (!lease) throw new Error("resource already leased");
    try {
      // The protected resource must reject tokens older than this one.
      return await work(lease.fencingToken);
    } finally {
      await this.store.release(resource, lease.id);
    }
  }
}`,
  python: `from dataclasses import dataclass
from typing import Callable, TypeVar

T = TypeVar("T")

@dataclass(frozen=True)
class Lease:
    id: str
    fencing_token: int
    expires_at_ms: int

class LeaseGuard:
    def __init__(self, store) -> None:
        self.store = store

    def run(self, resource: str, holder: str, ttl_ms: int,
            work: Callable[[int], T]) -> T:
        lease = self.store.acquire(resource, holder, ttl_ms)
        if lease is None:
            raise RuntimeError("resource already leased")
        try:
            # The protected resource rejects older fencing tokens.
            return work(lease.fencing_token)
        finally:
            self.store.release(resource, lease.id)`,
  java: `public record Lease(String id, long fencingToken, long expiresAtMs) {}

public final class LeaseGuard {
    private final LeaseStore store;

    public LeaseGuard(LeaseStore store) { this.store = store; }

    public <T> T run(String resource, String holder, long ttlMs,
                     FencedWork<T> work) throws Exception {
        Lease lease = store.acquire(resource, holder, ttlMs);
        if (lease == null) throw new IllegalStateException("resource already leased");
        try {
            // The protected resource rejects older fencing tokens.
            return work.execute(lease.fencingToken());
        } finally {
            store.release(resource, lease.id());
        }
    }
}`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "lease-conceptual",
    required: true,
    question:
      "Worker A pauses until its lease expires. Worker B acquires the same resource and writes with fencing token 12. What makes it safe when A resumes with token 11?",
    options: [
      { id: "a", text: "A checks its local wall clock before writing" },
      { id: "b", text: "The coordinator sends a guaranteed cancellation message to A" },
      {
        id: "c",
        text: "The protected resource rejects token 11 because it has already accepted token 12",
      },
      { id: "d", text: "The lease TTL is longer than the average request duration" },
    ],
    correctOptionId: "c",
    explanation:
      "A paused process cannot be relied on to observe expiry or cancellation before acting. Fencing moves the final check to the protected resource, which rejects any token older than the greatest token already accepted.",
  },
  {
    type: "implementation",
    id: "lease-implementation",
    required: true,
    title: "Decide when a lease must be renewed",
    description:
      "Implement shouldRenew. Renew once the configured safety window has begun, and reject invalid lease timing instead of silently continuing with unsafe authority.",
    starterCode: {
      typescript: `function shouldRenew(nowMs: number, expiresAtMs: number, safetyMs: number): boolean {
  // TODO
  return false;
}`,
      python: `def should_renew(now_ms: int, expires_at_ms: int, safety_ms: int) -> bool:
    # TODO
    return False`,
      java: `static boolean shouldRenew(long nowMs, long expiresAtMs, long safetyMs) {
    // TODO
    return false;
}`,
    },
    hints: [
      "A negative safety window is invalid configuration.",
      "Renewal should begin when now + safety reaches or passes expiry.",
      "An already-expired lease also returns true, although the caller must treat renewal failure as loss of authority.",
    ],
    solution: {
      typescript: `function shouldRenew(nowMs: number, expiresAtMs: number, safetyMs: number): boolean {
  if (safetyMs < 0) throw new Error("safetyMs must be non-negative");
  return nowMs >= expiresAtMs - safetyMs;
}`,
      python: `def should_renew(now_ms: int, expires_at_ms: int, safety_ms: int) -> bool:
    if safety_ms < 0:
        raise ValueError("safety_ms must be non-negative")
    return now_ms >= expires_at_ms - safety_ms`,
      java: `static boolean shouldRenew(long nowMs, long expiresAtMs, long safetyMs) {
    if (safetyMs < 0) throw new IllegalArgumentException("safetyMs must be non-negative");
    return nowMs >= expiresAtMs - safetyMs;
}`,
    },
  },
  {
    type: "system-design",
    id: "lease-system-design",
    required: false,
    title: "Design partition ownership with renewable leases",
    scenario:
      "A stream processor assigns 1,000 partitions to autoscaled workers. Workers may pause for 20 seconds, networks occasionally delay requests, and a replacement must take over within one minute of a real crash. Design the lease lifecycle and safe handoff.",
    hints: [
      "Choose lease and renewal intervals from the pause, latency, and recovery bounds.",
      "Explain what a worker does when renewal is uncertain.",
      "Protect checkpoints and output writes from stale owners.",
    ],
    discussionPoints: [
      "**Timing:** choose a lease longer than expected pauses and renew early enough for multiple attempts, while keeping worst-case crash recovery below one minute.",
      "**Fencing:** issue a new monotonically increasing token for every ownership generation and include it in checkpoint and output writes.",
      "**Uncertainty:** a worker that cannot renew stops fetching new records and must not commit output after its safe local deadline.",
      "**Handoff:** checkpoint durable offsets, release early during graceful shutdown, and let replacements resume idempotently.",
      "**Observability:** monitor renewal latency, expirations, reassignment churn, stale-token rejection, and partitions without an owner.",
    ],
  },
];
