import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "A single copy of your data is a single point of failure: if the node holding it crashes, loses its disk, or becomes unreachable, that data is unavailable (or gone) until it's restored — and every read has to travel to wherever that one copy lives, which is slow for users far from it. Most systems can't tolerate either problem: they need to survive individual node failures without losing data, and they need to serve reads from somewhere close to the user.",
      },
      {
        type: "p",
        text: "**Replication** keeps multiple copies of the same data on different nodes, so the system survives losing any one copy and can serve reads from whichever copy is closest or least loaded. The central challenge it introduces: when there are multiple copies, how do you keep them consistent with each other, and what do you do when they temporarily disagree?",
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
          "**Primary-replica (leader-follower) replication**: one node (the primary/leader) accepts all writes and streams the resulting changes to one or more replicas (standbys/followers), which apply them and serve reads. This is the model used by PostgreSQL streaming replication and MySQL replication.",
          "**Synchronous replication**: the primary waits for a replica (or replicas) to confirm it has durably received a write before acknowledging that write to the client. This guarantees the acknowledged write survives a primary crash, at the cost of added latency (at minimum, the round-trip time to the replica) — and if the required synchronous replica becomes unreachable, writes can stall waiting for it, trading availability for that durability guarantee.",
          "**Asynchronous replication**: the primary acknowledges a write immediately, without waiting for replicas to catch up. This keeps write latency low and keeps the primary available even if replicas are slow or unreachable, but risks losing recently-committed data if the primary crashes before replicas caught up — data loss proportional to how far behind replication had fallen.",
          "**Quorum-based (leaderless) replication**: instead of one leader, writes and reads go to multiple replicas directly, and the system only needs enough of them to agree. With N total replicas, if a write is confirmed by W of them and a read queries R of them, choosing W + R > N guarantees every read overlaps with every write in at least one replica — so a read is guaranteed to see the latest acknowledged write, without any single leader.",
          "**Tuning the W/R tradeoff**: a higher W (more replicas required per write) makes writes slower but reads cheaper and more consistent; a higher R does the reverse. Systems like Cassandra expose this directly as a per-request consistency level, letting different operations trade off differently depending on how important that particular write or read is.",
        ],
      },
      {
        type: "p",
        text: "Across all these models, the same tension shows up: requiring more replicas to agree before acknowledging an operation increases durability/consistency, but increases latency and reduces availability if some replicas are slow or unreachable. Replication design is fundamentally about choosing where on that spectrum each operation sits.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Primary-replica, synchronous vs asynchronous:

  SYNC:   client -> PRIMARY --write--> REPLICA
                        |                 |
                        | <---- ack ------|
                        |
                     ack to client (after replica confirms)

  ASYNC:  client -> PRIMARY --write--> REPLICA
                        |
                     ack to client (immediately, before replica confirms)

Quorum (leaderless), N=3 replicas, W=2, R=2:

  write "x=5" -> confirmed by replicas {A, B}        (W=2 of 3)
  read  "x?"  -> queries replicas {B, C}              (R=2 of 3)
                 B overlaps with the write -> read sees "x=5"
  W + R = 4 > N = 3  ->  every read is guaranteed to overlap every write`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Write latency, asynchronous replication",
        time: "O(1) local",
        note: "Acknowledged as soon as the primary durably writes locally",
      },
      {
        operation: "Write latency, synchronous replication",
        time: "primary write + round-trip to replica",
        note: "Bounded below by network round-trip time to the slowest required replica",
      },
      {
        operation: "Quorum write/read (N replicas, W/R required)",
        time: "O(W) / O(R) network round-trips",
        note: "Only needs responses from W (or R) of N replicas, not all of them",
      },
      {
        operation: "Failover to a new primary",
        time: "Bounded by failure-detection time",
        note: "Not instantaneous — typically built on a leader-election mechanism",
      },
      {
        operation: "Read-your-writes consistency, quorum replication",
        time: "Guaranteed when W + R > N",
        note: "Every read set and every write set are guaranteed to intersect in at least one replica",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Survives individual node failures without data loss (with synchronous replication or a sufficient write quorum) or without full unavailability",
      "Lets reads be served from whichever replica is closest, least loaded, or otherwise most convenient, instead of always hitting one node",
      "Tunable per-operation durability/consistency via sync vs. async replication, or via W/R quorum sizes — not a single fixed tradeoff for the whole system",
      "Primary-replica models keep write conflict resolution simple (all writes go through one place) compared to leaderless models where concurrent writes to different replicas must be reconciled",
    ],
    cons: [
      "Synchronous replication adds latency to every write and can stall writes entirely if a required replica is unreachable — directly trading availability for durability",
      "Asynchronous replication risks losing recently-acknowledged writes on primary failure — data loss proportional to replication lag at the moment of failure",
      "Multiple copies mean replicas can disagree, at least temporarily — applications must reckon with reading stale data from a lagging replica unless they specifically pay for stronger consistency",
      "More replicas means more operational surface area: more nodes to monitor, more network paths that can fail, and (for leaderless systems) conflict-resolution logic for concurrent writes to different replicas",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Any system that needs to survive a single node's failure without data loss or extended downtime — which is most production databases and stateful services at any real scale",
      "Read-heavy workloads that benefit from spreading reads across multiple replicas, especially geographically distributed ones serving users from the nearest copy",
      "Workloads where different operations have genuinely different durability needs — e.g., financial transactions needing synchronous guarantees, high-volume low-stakes events (like chat messages) tolerating async replication, as PostgreSQL's own documentation recommends mixing per workload",
      "Systems already built around a leaderless/quorum model (e.g., Cassandra, DynamoDB) where tuning W and R per request is a natural, low-friction way to trade off consistency and latency",
    ],
    whenNotToUse: [
      "A single-node deployment where the operational cost of running and monitoring replicas genuinely outweighs the availability/durability benefit (rare in production, but real for some internal/dev tooling)",
      "Workloads that cannot tolerate any staleness and also cannot afford synchronous replication's latency cost — that combination may need a fundamentally different architecture (e.g., single-writer with no replica reads) rather than tuning replication parameters",
      "You need strict linearizability across arbitrary numbers of concurrent operations — quorum replication's W+R>N guarantee covers single-key read-after-write consistency, not full cross-key transactional isolation",
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
          '**PostgreSQL** documents that streaming replication "is asynchronous by default," warning that "if the primary server crashes then some transactions that were committed may not have been replicated to the standby server, causing data loss" proportional to replication delay — while synchronous replication "offers the ability to confirm that all changes made by a transaction have been transferred," at the cost that "transaction commits may never be completed if any one of the synchronous standbys should crash." PostgreSQL\'s own docs recommend mixing the two per workload: synchronous for critical data, asynchronous for "less important data...such as chat messages between users."',
          '**Apache Cassandra** implements quorum-based leaderless replication, documenting that "write operations are always sent to all replicas, regardless of consistency level" while "the consistency level simply controls how many responses the coordinator waits for," and that choosing QUORUM reads and writes with replication factor RF guarantees overlap since "W + R > RF" — directly the quorum formula this lesson\'s how-it-works section covers.',
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "PostgreSQL Docs — High Availability, Load Balancing, and Replication (Synchronous Replication)",
            url: "https://www.postgresql.org/docs/current/warm-standby.html",
            verified: "2026-11-05",
            note: "Async-by-default data-loss risk, synchronous replication's durability guarantee and availability cost, mixed per-workload recommendation",
          },
          {
            name: "Apache Cassandra Docs — Architecture (Dynamo)",
            url: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html",
            verified: "2026-11-05",
            note: "Writes always sent to all replicas, consistency level controls acknowledgment count, W + R > RF quorum guarantee",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `interface Replica {
  id: string;
  write(key: string, value: string, version: number): Promise<void>;
  read(key: string): Promise<{ value: string; version: number } | undefined>;
}

class QuorumReplicationClient {
  constructor(
    private readonly replicas: Replica[],
    private readonly writeQuorum: number,
    private readonly readQuorum: number
  ) {}

  async write(key: string, value: string): Promise<void> {
    const version = Date.now(); // simplified; real systems use vector clocks or similar
    const results = await Promise.allSettled(
      this.replicas.map((r) => r.write(key, value, version))
    );
    const successes = results.filter((r) => r.status === "fulfilled").length;
    if (successes < this.writeQuorum) {
      throw new Error(\`Write quorum not reached: \${successes}/\${this.writeQuorum}\`);
    }
  }

  async read(key: string): Promise<string | undefined> {
    const responses = await Promise.allSettled(this.replicas.map((r) => r.read(key)));
    const values = responses
      .filter((r): r is PromiseFulfilledResult<{ value: string; version: number } | undefined> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((v): v is { value: string; version: number } => v !== undefined);

    if (values.length < this.readQuorum) {
      throw new Error(\`Read quorum not reached: \${values.length}/\${this.readQuorum}\`);
    }
    // Return the most recent version among the replicas we heard from.
    return values.reduce((latest, v) => (v.version > latest.version ? v : latest)).value;
  }
}

// Usage: N=3 replicas, W=2, R=2 -- W + R > N guarantees read-after-write consistency
const client = new QuorumReplicationClient(replicas, 2, 2);
await client.write("x", "5");
await client.read("x"); // guaranteed to see "5" or newer`,

  python: `from dataclasses import dataclass
from typing import Protocol
import time


@dataclass
class VersionedValue:
    value: str
    version: float


class Replica(Protocol):
    def write(self, key: str, value: str, version: float) -> None: ...
    def read(self, key: str) -> VersionedValue | None: ...


class QuorumReplicationClient:
    def __init__(self, replicas: list[Replica], write_quorum: int, read_quorum: int) -> None:
        self.replicas = replicas
        self.write_quorum = write_quorum
        self.read_quorum = read_quorum

    def write(self, key: str, value: str) -> None:
        version = time.time()  # simplified; real systems use vector clocks or similar
        successes = 0
        for replica in self.replicas:
            try:
                replica.write(key, value, version)
                successes += 1
            except Exception:
                pass
        if successes < self.write_quorum:
            raise RuntimeError(f"Write quorum not reached: {successes}/{self.write_quorum}")

    def read(self, key: str) -> str | None:
        values: list[VersionedValue] = []
        for replica in self.replicas:
            try:
                result = replica.read(key)
                if result is not None:
                    values.append(result)
            except Exception:
                pass
        if len(values) < self.read_quorum:
            raise RuntimeError(f"Read quorum not reached: {len(values)}/{self.read_quorum}")
        # Return the most recent version among the replicas we heard from.
        return max(values, key=lambda v: v.version).value


# Usage: N=3 replicas, W=2, R=2 -- W + R > N guarantees read-after-write consistency
client = QuorumReplicationClient(replicas, write_quorum=2, read_quorum=2)
client.write("x", "5")
client.read("x")  # guaranteed to see "5" or newer`,

  java: `import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

public interface Replica {
    void write(String key, String value, long version) throws Exception;
    Optional<VersionedValue> read(String key) throws Exception;
}

public record VersionedValue(String value, long version) {}

public class QuorumReplicationClient {
    private final List<Replica> replicas;
    private final int writeQuorum;
    private final int readQuorum;

    public QuorumReplicationClient(List<Replica> replicas, int writeQuorum, int readQuorum) {
        this.replicas = replicas;
        this.writeQuorum = writeQuorum;
        this.readQuorum = readQuorum;
    }

    public void write(String key, String value) {
        long version = System.currentTimeMillis(); // simplified; real systems use vector clocks
        AtomicInteger successes = new AtomicInteger(0);
        for (Replica replica : replicas) {
            try {
                replica.write(key, value, version);
                successes.incrementAndGet();
            } catch (Exception ignored) {
            }
        }
        if (successes.get() < writeQuorum) {
            throw new RuntimeException("Write quorum not reached: " + successes + "/" + writeQuorum);
        }
    }

    public String read(String key) {
        List<VersionedValue> values = new java.util.ArrayList<>();
        for (Replica replica : replicas) {
            try {
                replica.read(key).ifPresent(values::add);
            } catch (Exception ignored) {
            }
        }
        if (values.size() < readQuorum) {
            throw new RuntimeException("Read quorum not reached: " + values.size() + "/" + readQuorum);
        }
        // Return the most recent version among the replicas we heard from.
        return values.stream()
                .max(java.util.Comparator.comparingLong(VersionedValue::version))
                .orElseThrow()
                .value();
    }
}

// Usage: N=3 replicas, W=2, R=2 -- W + R > N guarantees read-after-write consistency
QuorumReplicationClient client = new QuorumReplicationClient(replicas, 2, 2);
client.write("x", "5");
client.read("x"); // guaranteed to see "5" or newer`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "replication-conceptual",
    required: true,
    question:
      "A system uses quorum-based replication with N = 5 replicas. Which of the following (W, R) pairs guarantees that every read overlaps with every write (so a read is guaranteed to see the latest acknowledged write)?",
    options: [
      { id: "a", text: "W = 2, R = 2 (W + R = 4)" },
      { id: "b", text: "W = 3, R = 3 (W + R = 6)" },
      { id: "c", text: "W = 1, R = 1 (W + R = 2)" },
      { id: "d", text: "W = 5, R = 1, but only if reads happen before writes (W + R = 6)" },
    ],
    correctOptionId: "b",
    explanation:
      "The guarantee requires W + R > N. With N = 5, W = 3 and R = 3 gives W + R = 6 > 5, which guarantees the read set and write set must share at least one replica in common — so any read is guaranteed to see the most recent acknowledged write. W + R = 4 (option a) and W + R = 2 (option c) are both ≤ N = 5, so it's possible for a write's replica set and a read's replica set to not overlap at all, risking a stale read. Option d's W + R = 6 does satisfy the inequality, but the overlap guarantee doesn't depend on operation ordering — the guarantee is a property of set intersection given the chosen W and R, not of timing, which makes that option's reasoning incorrect even though its arithmetic happens to work.",
  },
  {
    type: "implementation",
    id: "replication-implementation",
    required: true,
    title: "Implement Quorum Write and Read",
    description: `Given a list of replicas, each supporting write(key, value, version) and read(key), implement a QuorumReplicationClient's write and read methods:

- **write(key, value)** — writes to all replicas (best-effort), and succeeds only if at least \`writeQuorum\` replicas confirmed the write; otherwise throws.
- **read(key)** — reads from all replicas (best-effort), and succeeds only if at least \`readQuorum\` replicas responded; returns the value with the highest version among the responses (the most recent one). Throws if fewer than \`readQuorum\` replicas responded.`,
    starterCode: {
      typescript: `interface Replica {
  write(key: string, value: string, version: number): Promise<void>;
  read(key: string): Promise<{ value: string; version: number } | undefined>;
}

class QuorumReplicationClient {
  constructor(
    private readonly replicas: Replica[],
    private readonly writeQuorum: number,
    private readonly readQuorum: number
  ) {}

  async write(key: string, value: string): Promise<void> {
    // TODO: attempt to write to every replica (best-effort -- don't let one
    // failure stop the others), count successes, and throw if fewer than
    // this.writeQuorum replicas confirmed
    const version = Date.now();
  }

  async read(key: string): Promise<string | undefined> {
    // TODO: attempt to read from every replica (best-effort), collect
    // successful responses, throw if fewer than this.readQuorum responded,
    // otherwise return the value with the highest version
    return undefined;
  }
}`,
      python: `class QuorumReplicationClient:
    def __init__(self, replicas: list, write_quorum: int, read_quorum: int) -> None:
        self.replicas = replicas
        self.write_quorum = write_quorum
        self.read_quorum = read_quorum

    def write(self, key: str, value: str) -> None:
        # TODO: attempt to write to every replica (best-effort -- don't let
        # one failure stop the others), count successes, and raise if fewer
        # than self.write_quorum replicas confirmed
        pass

    def read(self, key: str) -> str | None:
        # TODO: attempt to read from every replica (best-effort), collect
        # successful responses, raise if fewer than self.read_quorum
        # responded, otherwise return the value with the highest version
        return None`,
      java: `public class QuorumReplicationClient {
    private final List<Replica> replicas;
    private final int writeQuorum;
    private final int readQuorum;

    public QuorumReplicationClient(List<Replica> replicas, int writeQuorum, int readQuorum) {
        this.replicas = replicas;
        this.writeQuorum = writeQuorum;
        this.readQuorum = readQuorum;
    }

    public void write(String key, String value) {
        // TODO: attempt to write to every replica (best-effort -- don't
        // let one failure stop the others), count successes, and throw if
        // fewer than writeQuorum replicas confirmed
    }

    public String read(String key) {
        // TODO: attempt to read from every replica (best-effort), collect
        // successful responses, throw if fewer than readQuorum responded,
        // otherwise return the value with the highest version
        return null;
    }
}`,
    },
    hints: [
      "write(): loop through every replica and attempt the write in a try/catch (or Promise.allSettled) so one replica's failure doesn't abort attempts on the others.",
      "write(): after attempting all replicas, compare the count of successes against writeQuorum — throw only if the count falls short.",
      "read(): similarly attempt all replicas best-effort, but only keep responses that actually returned a value (not failures or missing keys).",
      "read(): after collecting responses, first check the count against readQuorum, then find the maximum by version among the collected values — don't just return the first one you got.",
    ],
    solution: {
      typescript: `class QuorumReplicationClient {
  constructor(
    private readonly replicas: Replica[],
    private readonly writeQuorum: number,
    private readonly readQuorum: number
  ) {}

  async write(key: string, value: string): Promise<void> {
    const version = Date.now();
    const results = await Promise.allSettled(
      this.replicas.map((r) => r.write(key, value, version))
    );
    const successes = results.filter((r) => r.status === "fulfilled").length;
    if (successes < this.writeQuorum) {
      throw new Error(\`Write quorum not reached: \${successes}/\${this.writeQuorum}\`);
    }
  }

  async read(key: string): Promise<string | undefined> {
    const responses = await Promise.allSettled(this.replicas.map((r) => r.read(key)));
    const values = responses
      .filter((r): r is PromiseFulfilledResult<{ value: string; version: number } | undefined> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((v): v is { value: string; version: number } => v !== undefined);

    if (values.length < this.readQuorum) {
      throw new Error(\`Read quorum not reached: \${values.length}/\${this.readQuorum}\`);
    }
    return values.reduce((latest, v) => (v.version > latest.version ? v : latest)).value;
  }
}`,
      python: `class QuorumReplicationClient:
    def write(self, key: str, value: str) -> None:
        version = time.time()
        successes = 0
        for replica in self.replicas:
            try:
                replica.write(key, value, version)
                successes += 1
            except Exception:
                pass
        if successes < self.write_quorum:
            raise RuntimeError(f"Write quorum not reached: {successes}/{self.write_quorum}")

    def read(self, key: str) -> str | None:
        values = []
        for replica in self.replicas:
            try:
                result = replica.read(key)
                if result is not None:
                    values.append(result)
            except Exception:
                pass
        if len(values) < self.read_quorum:
            raise RuntimeError(f"Read quorum not reached: {len(values)}/{self.read_quorum}")
        return max(values, key=lambda v: v.version).value`,
      java: `public class QuorumReplicationClient {
    public void write(String key, String value) {
        long version = System.currentTimeMillis();
        int successes = 0;
        for (Replica replica : replicas) {
            try {
                replica.write(key, value, version);
                successes++;
            } catch (Exception ignored) {
            }
        }
        if (successes < writeQuorum) {
            throw new RuntimeException("Write quorum not reached: " + successes + "/" + writeQuorum);
        }
    }

    public String read(String key) {
        List<VersionedValue> values = new java.util.ArrayList<>();
        for (Replica replica : replicas) {
            try {
                replica.read(key).ifPresent(values::add);
            } catch (Exception ignored) {
            }
        }
        if (values.size() < readQuorum) {
            throw new RuntimeException("Read quorum not reached: " + values.size() + "/" + readQuorum);
        }
        return values.stream()
                .max(java.util.Comparator.comparingLong(VersionedValue::version))
                .orElseThrow()
                .value();
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "replication-system-design",
    required: false,
    title: "Designing Replication for a Mixed-Workload Order Platform",
    scenario: `You're designing data replication for an e-commerce order platform with two very different workloads sharing the same database infrastructure:

1. **Order placement and payment records** — losing an acknowledged order or payment write is unacceptable (it means a customer paid but the order vanished, or vice versa).
2. **Product view/click analytics events** — high volume (thousands per second), and losing a small fraction during a rare failure is an acceptable, known tradeoff the analytics team has already signed off on.

Design the replication strategy for both workloads, referencing PostgreSQL's documented synchronous/asynchronous options, and discuss what happens operationally if the synchronous replica for the order workload goes down.`,
    hints: [
      "Does every workload need the same replication guarantees, or can they differ within the same system?",
      "What does PostgreSQL's own documentation suggest about mixing sync and async replication by workload importance?",
      "What's the operational risk of requiring synchronous replication for the order workload specifically?",
      "If the synchronous replica goes down, what are the options, and what does each one cost?",
    ],
    discussionPoints: [
      "**Different durability requirements get different replication modes, not one global setting**: orders and payments should use synchronous replication — PostgreSQL's own documentation describes exactly this pattern, recommending synchronous replication for the subset of 'important customer details' while using asynchronous replication for high-volume, lower-stakes data like the cited 'chat messages between users' example, which maps directly onto this scenario's analytics events.",
      "**Order/payment writes pay the latency cost deliberately**: per this lesson's complexity table, synchronous writes are bounded below by the round-trip time to the replica — acceptable here because order placement is not a latency-critical hot path at the microsecond level, and the durability guarantee (a confirmed order write survives a primary crash) is worth far more than shaving milliseconds off checkout.",
      "**Analytics events accept async replication's risk deliberately, not accidentally**: since the analytics team has already signed off on bounded data loss, asynchronous replication is the correct choice — it keeps write throughput high for the high-volume event stream and avoids holding transaction locks (as PostgreSQL's docs warn synchronous replication does) for data that doesn't need that guarantee.",
      "**What happens when the order workload's synchronous replica goes down**: per PostgreSQL's documented behavior, 'transaction commits may never be completed if any one of the synchronous standbys should crash' — so order writes would stall entirely, a direct availability cost for the durability guarantee. The documented mitigation is naming multiple potential synchronous standbys via synchronous_standby_names so a single replica's failure doesn't block commits; if that's exhausted, the operational choice becomes deliberately reducing the synchronous requirement (or disabling it temporarily) and explicitly accepting reduced durability until a healthy standby is restored — a conscious tradeoff decision, not a silent one.",
      "**Why not make everything synchronous 'to be safe'**: PostgreSQL's docs explicitly warn that 'incautious use of synchronous replication will reduce performance for database applications because of increased response times and higher contention' — applying it to the high-volume analytics stream would throttle that workload for a durability guarantee it doesn't need, which is precisely the mixed-workload reasoning this lesson's real-world section highlights as PostgreSQL's own recommended pattern.",
    ],
  },
];
