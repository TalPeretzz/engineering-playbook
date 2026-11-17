import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "A single process can use an in-memory mutex to ensure only one thread touches a shared resource at a time. But when the \"threads\" are actually separate processes running on different machines, an in-memory mutex doesn't exist across them — two independent services could both believe they're the one allowed to, say, process a specific order, write to a specific file, or run a specific scheduled job, and both proceed simultaneously.",
      },
      {
        type: "p",
        text: 'A **distributed lock** extends the mutual-exclusion guarantee of a local mutex across multiple processes and machines, typically by coordinating through a shared, external store (Redis, ZooKeeper, a database). As Redis\'s own documentation frames it: "distributed locks are a very useful primitive in many environments where different processes must operate with shared resources in a mutually exclusive way."',
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
          "**The basic single-instance pattern**: acquire a lock by setting a key only if it doesn't already exist, with a random unique value and an expiration — Redis documents this directly as `SET resource_name my_random_value NX PX 30000`. The `NX` flag makes the set conditional on the key not already existing (so only one client wins the race), and `PX` gives the lock a time-to-live so it auto-releases if the holder crashes.",
          '**Why the random value matters for release**: a naive unlock (just deleting the key) risks a client releasing a lock it no longer actually holds — for example, if it was slow and the lock already expired and was re-acquired by someone else. Redis\'s documentation explains the random value exists specifically "to release the lock in a safe way," deleting the key "only if it exists and the value stored at the key is exactly the one I expect to be," so a client can never accidentally release a lock that\'s no longer its own.',
          "**Scaling to multiple nodes (Redlock)**: a single lock-holding instance is a single point of failure. Redis's documented Redlock algorithm acquires the same lock across N independent instances (commonly N=5) in parallel, and only considers the lock acquired if a client succeeds on a **majority** of them (at least 3 of 5) within a bounded time — the same majority-quorum principle used for leader election and consensus, applied here to mutual exclusion specifically.",
          "**The fencing token problem**: a lock by itself only guarantees that the *lock service* thinks one client holds it — it says nothing about whether that client is still actually alive and executing promptly. Martin Kleppmann's widely-cited analysis (referenced directly by Redis's own documentation) describes the dangerous case: a client pauses (e.g., a long garbage-collection stop-the-world pause), its lock lease expires, a second client acquires the lock and starts working, and then the first client resumes — now believing it still holds the lock — and both end up acting concurrently on the protected resource.",
          '**Fencing tokens as the fix**: Kleppmann\'s solution is "a number that increases...every time a client acquires the lock," attached to every subsequent write the client makes to the protected resource. The resource itself (not just the lock service) then "rejects any writes on which the token has gone backwards" — so even if a paused, stale client wakes up and tries to write using an old token, the protected resource itself refuses the write because a newer token has already been seen. Redis\'s own documentation explicitly recommends this: "you should implement fencing tokens...especially important for processes that can take significant time."',
        ],
      },
      {
        type: "p",
        text: "The core lesson distributed locks teach: holding a lock is a claim made at one point in time, not a continuously-enforced guarantee — anything that can pause or delay a process for long enough (GC, scheduling, network partition) can make that claim stale without the process itself realizing it, which is exactly the gap fencing tokens are designed to close.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Without fencing -- a stale lock holder corrupts shared state:

  Client A: acquire lock -> [ STOP-THE-WORLD GC PAUSE, very long ] ...
  Client A's lease expires while paused
  Client B: acquires the SAME lock (A's lease is gone)   -> token=34
  Client B: writes "value=X" (token 34)                  -> ACCEPTED
  Client A: resumes, still thinks it holds the lock       -> token=33
  Client A: writes "value=Y" (token 33, STALE!)           -> ??? (danger)

With fencing tokens -- the storage rejects the stale write:

  Client B writes with token=34  -> storage: "34 > last seen (0)"  -> ACCEPTED
  Client A writes with token=33  -> storage: "33 < last seen (34)" -> REJECTED

  The lock service can be fooled by a pause; the storage layer cannot --
  it just compares token numbers, no timing assumptions needed`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Acquire lock, single instance",
        time: "O(1)",
        note: "One conditional SET (NX)",
      },
      {
        operation: "Release lock, single instance",
        time: "O(1)",
        note: "One conditional delete, gated on the random value matching",
      },
      {
        operation: "Acquire lock, Redlock (N instances)",
        time: "O(N) requests, needs majority",
        note: "Parallel requests to N instances; succeeds only with at least ⌊N/2⌋+1 confirmations",
      },
      {
        operation: "Fencing token check on each write",
        time: "O(1)",
        note: "A single integer comparison against the last-seen token at the protected resource",
      },
      {
        operation: "Lock auto-release after holder failure",
        time: "Bounded by TTL",
        note: "Not instantaneous — the resource is unavailable for locking up to the configured lock validity time",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Extends familiar mutual-exclusion semantics across process and machine boundaries, without requiring every participant to implement its own coordination logic",
      "TTL-based auto-release provides deadlock-freedom — a crashed lock holder doesn't permanently strand the resource",
      "Majority-quorum designs (like Redlock) avoid a single lock-server instance being a single point of failure",
      "Fencing tokens close the gap between 'the lock service thinks I hold the lock' and 'it's actually still safe for me to act,' at the cost of only a single integer comparison per write",
    ],
    cons: [
      "A lock's validity is time-bounded and clock-dependent — unsynchronized or drifting clocks across machines can undermine the safety guarantees the TTL-based approach relies on",
      "Without fencing tokens, a paused-then-resumed client can violate mutual exclusion even though the locking protocol itself was followed correctly, as Kleppmann's analysis documents",
      "Network partitions cost real availability — Redis's own Redlock documentation notes clients can be unable to acquire or release locks for up to the TTL duration during a partition, and this penalty repeats under continuous partitions",
      "Fencing tokens require the protected resource itself to cooperate (check and reject stale tokens) — they can't be bolted on by the locking layer alone if the resource being protected doesn't support token-based write rejection",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Coordinating exclusive access to a shared resource or critical section across multiple processes or services — e.g., ensuring only one instance of a scheduled job runs at a time",
      "Short, bounded critical sections where a reasonable TTL can be chosen with confidence the work will finish well within it",
      "Systems that can implement fencing tokens at the protected resource, for any critical section where a stale lock holder acting anyway would cause real damage",
      "Environments already running Redis, ZooKeeper, or a similar coordination-capable store, where adding distributed locking reuses existing infrastructure",
    ],
    whenNotToUse: [
      "Correctness-critical operations where you cannot add fencing-token support at the protected resource, and a brief dual-execution window (from a paused/resumed client) would be unacceptable — the lock alone doesn't fully protect against this",
      "Workloads with highly variable or unpredictable execution time, making any single TTL choice either too short (risking premature release while legitimate work is still in progress) or too long (delaying recovery after a real crash)",
      "Use cases where idempotent operations make the whole problem moot — if performing the same operation twice is harmless, the complexity of strict mutual exclusion may not be needed at all",
      "Extremely high-throughput locking needs where the coordination overhead of acquiring/releasing a distributed lock per operation becomes the actual bottleneck",
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
          '**Redis\'s documented Redlock algorithm** builds distributed locks from the single-instance pattern `SET resource_name my_random_value NX PX 30000`, extended across N=5 independent instances where a lock is only considered acquired with "the majority of the instances (at least 3)" responding successfully within a bounded time — and explicitly documents the safety/liveness tradeoff: "we pay an availability penalty equal to TTL time on network partitions."',
          '**Martin Kleppmann\'s fencing token analysis**, directly referenced by Redis\'s own documentation as essential reading, describes a fencing token as "a number that increases...every time a client acquires the lock," where the protected storage "rejects any writes on which the token has gone backwards" — the concrete mechanism Redis\'s docs point to when recommending "you should implement fencing tokens...especially important for processes that can take significant time."',
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Redis Docs — Distributed Locks with Redis (Redlock)",
            url: "https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/",
            verified: "2026-11-07",
            note: "SET NX PX single-instance pattern, random-value safe release, Redlock majority-quorum algorithm, explicit fencing-token recommendation",
          },
          {
            name: "Martin Kleppmann — How to do distributed locking",
            url: "http://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html",
            verified: "2026-11-07",
            note: "Fencing token definition, GC-pause stale-lock-holder scenario, storage-layer token rejection as the fix",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `interface LockStore {
  setIfNotExists(key: string, value: string, ttlMs: number): Promise<boolean>;
  deleteIfValueMatches(key: string, value: string): Promise<boolean>;
}

class DistributedLock {
  constructor(private readonly store: LockStore) {}

  async acquire(resource: string, ttlMs: number): Promise<string | null> {
    const token = crypto.randomUUID();
    const acquired = await this.store.setIfNotExists(resource, token, ttlMs);
    return acquired ? token : null;
  }

  async release(resource: string, token: string): Promise<boolean> {
    // Only deletes if the stored value still matches our token -- never
    // releases a lock that expired and was re-acquired by someone else.
    return this.store.deleteIfValueMatches(resource, token);
  }
}

// Fencing-token-aware protected resource.
class FencedResource {
  private lastSeenToken = 0;
  private value = "";

  write(fencingToken: number, newValue: string): boolean {
    if (fencingToken < this.lastSeenToken) {
      return false; // stale write from a paused/delayed client -- rejected
    }
    this.lastSeenToken = fencingToken;
    this.value = newValue;
    return true;
  }
}

// Usage: a lock service that hands out monotonically increasing fencing tokens.
class FencingTokenLockService {
  private nextToken = 0;
  private holder: string | null = null;

  acquire(clientId: string): number {
    this.holder = clientId;
    return ++this.nextToken;
  }
}`,

  python: `import uuid
from typing import Protocol


class LockStore(Protocol):
    def set_if_not_exists(self, key: str, value: str, ttl_ms: int) -> bool: ...
    def delete_if_value_matches(self, key: str, value: str) -> bool: ...


class DistributedLock:
    def __init__(self, store: LockStore) -> None:
        self.store = store

    def acquire(self, resource: str, ttl_ms: int) -> str | None:
        token = str(uuid.uuid4())
        acquired = self.store.set_if_not_exists(resource, token, ttl_ms)
        return token if acquired else None

    def release(self, resource: str, token: str) -> bool:
        # Only deletes if the stored value still matches our token -- never
        # releases a lock that expired and was re-acquired by someone else.
        return self.store.delete_if_value_matches(resource, token)


class FencedResource:
    """Fencing-token-aware protected resource."""

    def __init__(self) -> None:
        self.last_seen_token = 0
        self.value = ""

    def write(self, fencing_token: int, new_value: str) -> bool:
        if fencing_token < self.last_seen_token:
            return False  # stale write from a paused/delayed client -- rejected
        self.last_seen_token = fencing_token
        self.value = new_value
        return True


class FencingTokenLockService:
    """A lock service that hands out monotonically increasing fencing tokens."""

    def __init__(self) -> None:
        self.next_token = 0
        self.holder: str | None = None

    def acquire(self, client_id: str) -> int:
        self.holder = client_id
        self.next_token += 1
        return self.next_token`,

  java: `import java.util.UUID;

public interface LockStore {
    boolean setIfNotExists(String key, String value, long ttlMs);
    boolean deleteIfValueMatches(String key, String value);
}

public class DistributedLock {
    private final LockStore store;

    public DistributedLock(LockStore store) {
        this.store = store;
    }

    public String acquire(String resource, long ttlMs) {
        String token = UUID.randomUUID().toString();
        boolean acquired = store.setIfNotExists(resource, token, ttlMs);
        return acquired ? token : null;
    }

    public boolean release(String resource, String token) {
        // Only deletes if the stored value still matches our token -- never
        // releases a lock that expired and was re-acquired by someone else.
        return store.deleteIfValueMatches(resource, token);
    }
}

// Fencing-token-aware protected resource.
public class FencedResource {
    private long lastSeenToken = 0;
    private String value = "";

    public boolean write(long fencingToken, String newValue) {
        if (fencingToken < lastSeenToken) {
            return false; // stale write from a paused/delayed client -- rejected
        }
        lastSeenToken = fencingToken;
        value = newValue;
        return true;
    }
}

// A lock service that hands out monotonically increasing fencing tokens.
public class FencingTokenLockService {
    private long nextToken = 0;
    private String holder;

    public long acquire(String clientId) {
        holder = clientId;
        return ++nextToken;
    }
}`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "distributed-lock-conceptual",
    required: true,
    question:
      "Client A acquires a distributed lock and receives fencing token 7. A long GC pause causes its lease to expire; Client B then acquires the lock and receives fencing token 8, and writes to the protected resource. Client A resumes (still believing it holds the lock) and attempts a write using its token 7. What should happen, and why?",
    options: [
      {
        id: "a",
        text: "Client A's write should succeed, since it acquired the lock first and has priority",
      },
      {
        id: "b",
        text: "The protected resource should reject Client A's write, because its fencing token (7) is lower than the highest token the resource has already seen (8)",
      },
      {
        id: "c",
        text: "Both writes should be applied, with the resource keeping the most recent one based on wall-clock timestamp",
      },
      {
        id: "d",
        text: "The lock service itself should prevent Client A from sending the write at all",
      },
    ],
    correctOptionId: "b",
    explanation:
      "Fencing tokens work by having the protected resource itself — not the lock service — track the highest token it has seen and reject any write bearing a lower one. Client A has no way of knowing it's no longer the legitimate lock holder (it was paused, not notified), so the lock service can't stop it from attempting the write — the defense has to live at the resource being protected. Since Client B already wrote with token 8, the resource's last-seen token is 8, and Client A's token 7 is lower, so its write is rejected outright, regardless of wall-clock timing. This is exactly the mechanism Kleppmann's analysis describes and Redis's own documentation explicitly recommends implementing for any process that can be paused for a meaningful amount of time.",
  },
  {
    type: "implementation",
    id: "distributed-lock-implementation",
    required: true,
    title: "Implement a Safe Distributed Lock Acquire/Release",
    description: `Given a LockStore with setIfNotExists and deleteIfValueMatches primitives, implement a DistributedLock that acquires and releases locks safely:

- **acquire(resource, ttlMs)** — generates a unique random token, attempts to set it on the resource key only if the key doesn't already exist, and returns the token if successful (or null/None if the lock was already held).
- **release(resource, token)** — releases the lock only if the stored value still matches the given token, so a client can never release a lock it no longer actually holds.`,
    starterCode: {
      typescript: `interface LockStore {
  setIfNotExists(key: string, value: string, ttlMs: number): Promise<boolean>;
  deleteIfValueMatches(key: string, value: string): Promise<boolean>;
}

class DistributedLock {
  constructor(private readonly store: LockStore) {}

  async acquire(resource: string, ttlMs: number): Promise<string | null> {
    // TODO: generate a unique random token, attempt to set it on the
    // resource key only if it doesn't already exist, and return the
    // token if successful, null otherwise
    return null;
  }

  async release(resource: string, token: string): Promise<boolean> {
    // TODO: only delete the key if its current value still matches token
    return false;
  }
}`,
      python: `import uuid


class DistributedLock:
    def __init__(self, store) -> None:
        self.store = store

    def acquire(self, resource: str, ttl_ms: int) -> str | None:
        # TODO: generate a unique random token, attempt to set it on the
        # resource key only if it doesn't already exist, and return the
        # token if successful, None otherwise
        return None

    def release(self, resource: str, token: str) -> bool:
        # TODO: only delete the key if its current value still matches token
        return False`,
      java: `import java.util.UUID;

public class DistributedLock {
    private final LockStore store;

    public DistributedLock(LockStore store) {
        this.store = store;
    }

    public String acquire(String resource, long ttlMs) {
        // TODO: generate a unique random token, attempt to set it on the
        // resource key only if it doesn't already exist, and return the
        // token if successful, null otherwise
        return null;
    }

    public boolean release(String resource, String token) {
        // TODO: only delete the key if its current value still matches token
        return false;
    }
}`,
    },
    hints: [
      "acquire: generate the token first (a UUID or similarly unpredictable unique value works well), then pass it to setIfNotExists along with the resource key and ttlMs.",
      "acquire: the store's setIfNotExists return value tells you whether you actually won the race — only return the token if it returned true/True.",
      "release: don't just delete the key — call deleteIfValueMatches with both the resource key and the token, so the store itself can verify ownership atomically before deleting.",
      "release: simply return whatever deleteIfValueMatches returns — it already encodes whether the release actually happened.",
    ],
    solution: {
      typescript: `class DistributedLock {
  constructor(private readonly store: LockStore) {}

  async acquire(resource: string, ttlMs: number): Promise<string | null> {
    const token = crypto.randomUUID();
    const acquired = await this.store.setIfNotExists(resource, token, ttlMs);
    return acquired ? token : null;
  }

  async release(resource: string, token: string): Promise<boolean> {
    return this.store.deleteIfValueMatches(resource, token);
  }
}`,
      python: `class DistributedLock:
    def acquire(self, resource: str, ttl_ms: int) -> str | None:
        token = str(uuid.uuid4())
        acquired = self.store.set_if_not_exists(resource, token, ttl_ms)
        return token if acquired else None

    def release(self, resource: str, token: str) -> bool:
        return self.store.delete_if_value_matches(resource, token)`,
      java: `public class DistributedLock {
    public String acquire(String resource, long ttlMs) {
        String token = UUID.randomUUID().toString();
        boolean acquired = store.setIfNotExists(resource, token, ttlMs);
        return acquired ? token : null;
    }

    public boolean release(String resource, String token) {
        return store.deleteIfValueMatches(resource, token);
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "distributed-lock-system-design",
    required: false,
    title: "Designing Safe Exclusive Writes to a Shared Inventory File",
    scenario: `You're building a system where multiple worker processes periodically need exclusive access to update a shared inventory count stored in a backend database table. Workers can occasionally experience long pauses (garbage collection, container CPU throttling) lasting up to 10-15 seconds — well within the range that could cause a worker to exceed its lock's TTL while still believing it holds the lock.

A teammate proposes simply using a distributed lock (acquire before updating, release after) with a 5-second TTL and calls it done. Explain what's missing, referencing the GC-pause scenario from this lesson, and propose a complete design.`,
    hints: [
      "Given pauses can last 10-15 seconds and the proposed TTL is 5 seconds, what's the relationship between those two numbers, and why does it matter?",
      "If a worker's lock expires mid-pause, what happens when it resumes and tries to write, believing it still holds the lock?",
      "What needs to change at the inventory table itself, not just at the locking layer?",
      "Does simply making the TTL longer than the worst-case pause fully solve the problem on its own?",
    ],
    discussionPoints: [
      "**The TTL is already too short for the stated pause duration**: a 5-second TTL against pauses of up to 10-15 seconds means a worker can very plausibly still be paused when its lock expires — this is not an edge case here, it's the expected failure mode given the stated numbers. A first fix is raising the TTL meaningfully above the worst-case pause duration, but this alone is incomplete.",
      "**Lock-only is insufficient even with a longer TTL, per this lesson's core lesson**: even a well-chosen TTL doesn't eliminate the fundamental race — a worker could still pause for *longer* than any chosen TTL in a rare worst case, or two workers could still both end up believing they hold the lock across a boundary condition. The teammate's proposal treats 'acquire the lock, release the lock' as sufficient, which is exactly the gap Kleppmann's GC-pause scenario (cited in this lesson's real-world section) illustrates: the lock service's belief about who holds the lock can diverge from reality.",
      "**Fencing tokens close the gap at the inventory table itself**: the fix isn't only in the locking layer — the inventory table needs a `last_applied_fencing_token` column. Every update statement includes the fencing token the lock service handed out at acquisition time, and the update is only applied if the incoming token is greater than the table's currently stored token (an atomic compare-and-update, e.g. `UPDATE inventory SET count = ?, last_token = ? WHERE last_token < ?`). This directly mirrors this lesson's FencedResource pattern — the resource itself, not the lock, is the final safety check.",
      "**Why this specifically matters for inventory counts**: an inventory count is exactly the kind of shared mutable state where two workers writing 'concurrently' (one stale, one current) silently corrupts the value — unlike an idempotent operation where a duplicate write would be harmless, a stale inventory update applied after a newer one has already landed would overwrite correct data with wrong data, with no error raised anywhere.",
      "**Complete design**: (1) acquire the distributed lock with a TTL generously longer than the worst observed pause duration, receiving a fencing token; (2) perform the inventory read-modify-write using a conditional update gated on the fencing token being strictly greater than the table's last-applied token; (3) release the lock when done. Even if step 1's TTL assumption is wrong in some rare worse case, step 2's fencing check is what actually guarantees correctness — the lock's job is only to make the common case efficient (avoid most conflicts), not to be the sole safety mechanism.",
    ],
  },
];
