import type { StandardLessonSpec } from "./standard-lesson";

type ConciseSpec = {
  title: string;
  problem: string;
  flow: [string, string, string];
  key: string;
  caution: string;
  use: string;
  examples: [string, string, string];
  scenario: string;
};

function concise(spec: ConciseSpec): StandardLessonSpec {
  return {
    title: spec.title,
    problem: spec.problem,
    mechanics: spec.flow,
    visual: `${spec.flow[0]}\n        ↓\n${spec.flow[1]}\n        ↓\n${spec.flow[2]}`,
    complexity: [
      {
        operation: "Normal operation",
        time: "Depends on implementation",
        note: "Measure end-to-end latency and throughput in the target system",
      },
      {
        operation: "Coordination / metadata",
        time: "Bounded operational overhead",
        space: "Proportional to active state",
      },
    ],
    pros: [spec.key, spec.use, "Makes the relevant system behavior explicit and observable"],
    cons: [
      spec.caution,
      "Introduces operational state that must be monitored",
      "Guarantees depend on failure handling and configuration",
    ],
    useWhen: [spec.use, `When the team can test and monitor ${spec.title} under failure`],
    avoidWhen: [spec.caution, "When a simpler local or synchronous design meets the requirements"],
    examples: spec.examples,
    keyInsight: spec.key,
    misconception: `Using ${spec.title} automatically guarantees correctness without handling failures or edge cases.`,
    designScenario: spec.scenario,
    designPoints: [
      spec.key,
      spec.caution,
      "Define ownership, observability, recovery, and capacity limits",
    ],
  };
}

export const lessonSpecs: Record<string, StandardLessonSpec> = {
  trie: {
    title: "a Trie",
    problem:
      "Searching a large string collection by prefix is expensive when every candidate must be scanned. A trie indexes characters along shared prefix paths, so lookup cost depends on the query length rather than the number of stored words.",
    mechanics: [
      "Start at the root and follow one edge per character.",
      "Mark terminal nodes to distinguish complete words from prefixes.",
      "For autocomplete, find the prefix node and traverse its descendants.",
    ],
    visual:
      "root\n ├─ c ─ a ─ t*\n │       └─ r*\n └─ d ─ o ─ g*\n\n* marks a complete word; shared prefixes share nodes.",
    complexity: [
      {
        operation: "Insert / exact lookup",
        time: "O(L)",
        space: "O(L) worst case",
        note: "L = key length",
      },
      {
        operation: "Prefix lookup",
        time: "O(P + R)",
        note: "P = prefix length; R = reported results",
      },
    ],
    pros: [
      "Fast prefix queries",
      "Naturally produces lexicographic traversal",
      "Shared prefixes avoid repeated storage",
    ],
    cons: [
      "Pointer-heavy nodes can consume substantial memory",
      "Poor fit for keys with little prefix sharing",
      "Deletion and Unicode normalization require care",
    ],
    useWhen: [
      "Autocomplete and dictionary lookup",
      "Routing by string prefix",
      "Longest-prefix matching",
    ],
    avoidWhen: ["Only exact membership is needed", "Memory is tight and keys share few prefixes"],
    examples: [
      "Search suggestion indexes",
      "IP routing with a binary trie",
      "Spell-check dictionaries",
    ],
    keyInsight:
      "A trie trades memory for lookup time that scales with key length, not collection size.",
    misconception: "Every node stores a complete copy of every word beneath it.",
    designScenario:
      "Design autocomplete for millions of product names with top-ten suggestions under 50 ms.",
    designPoints: [
      "Store ranking metadata at prefix nodes",
      "Normalize case and Unicode before insertion",
      "Shard by leading prefix and cache popular prefixes",
    ],
  },
  "skip-list": {
    title: "a Skip List",
    problem:
      "A sorted linked list is simple but takes linear time to search. A skip list adds progressively sparser express lanes, providing expected logarithmic operations without tree rotations.",
    mechanics: [
      "Keep every item on level zero in sorted order.",
      "Promote items to higher levels randomly, commonly with probability 1/2.",
      "Search right while possible, then drop a level until reaching level zero.",
    ],
    visual:
      "L2: head ───── 20 ───────── 50\nL1: head ─ 10─20 ─ 35 ─── 50\nL0: head─5─10─20─27─35─42─50\n          right, then down, then right",
    complexity: [
      { operation: "Search / insert / delete", time: "O(log n) expected", space: "O(n) expected" },
      {
        operation: "Worst-case search",
        time: "O(n)",
        note: "Extremely unlikely with good randomness",
      },
    ],
    pros: [
      "Simpler than a balanced search tree",
      "Efficient ordered range scans",
      "Fine-grained concurrent variants are practical",
    ],
    cons: [
      "Only probabilistic balance",
      "Extra forward pointers cost memory",
      "Cache locality is weaker than array-based trees",
    ],
    useWhen: [
      "Ordered in-memory indexes",
      "Concurrent sorted sets",
      "Range queries with frequent updates",
    ],
    avoidWhen: [
      "Hard worst-case bounds are mandatory",
      "A compact static array can serve the data",
    ],
    examples: ["Redis sorted sets", "Memtable implementations", "Concurrent ordered maps"],
    keyInsight:
      "Randomly promoted express lanes yield expected logarithmic search without explicit rebalancing.",
    misconception: "A skip list scans every element because its base is a linked list.",
    designScenario:
      "Build an in-memory leaderboard supporting score updates, rank lookup, and range queries.",
    designPoints: [
      "Order by score plus a stable tie-breaker",
      "Choose promotion probability and maximum level",
      "Plan concurrency, persistence, and rank metadata",
    ],
  },
  "heap-priority-queue": {
    title: "a Heap / Priority Queue",
    problem:
      "Schedulers and graph algorithms repeatedly need the smallest or largest item without fully sorting the collection after every update. A heap maintains just enough order to expose the highest-priority item efficiently.",
    mechanics: [
      "Store a complete binary tree compactly in an array.",
      "After insertion, bubble the new item upward until the heap invariant holds.",
      "To remove the root, move the last item to the root and sift it downward.",
    ],
    visual:
      "min-heap array: [2, 5, 8, 12, 9]\n\n        2\n      /   \\\n     5     8\n    / \\\n   12  9\nparent is never greater than its children",
    complexity: [
      { operation: "Peek minimum/maximum", time: "O(1)" },
      { operation: "Insert / remove root", time: "O(log n)", space: "O(n)" },
      { operation: "Build heap", time: "O(n)" },
    ],
    pros: [
      "Constant-time access to the next priority",
      "Compact array representation",
      "Linear-time bulk construction",
    ],
    cons: [
      "Searching for an arbitrary item is O(n)",
      "Stable ordering needs an explicit sequence number",
      "Changing priority requires locating the item",
    ],
    useWhen: ["Job scheduling", "Dijkstra and A* frontiers", "Top-k streaming queries"],
    avoidWhen: ["Full sorted iteration is the main operation", "Arbitrary-key lookup dominates"],
    examples: ["Timer queues", "Operating-system schedulers", "Merge of sorted streams"],
    keyInsight:
      "A heap maintains partial order: only the root is globally ordered, which is enough for efficient priority operations.",
    misconception: "Every item in a heap is globally sorted in array order.",
    designScenario:
      "Design a retry scheduler that releases millions of delayed jobs at their next-attempt timestamp.",
    designPoints: [
      "Use due time and sequence as the priority",
      "Partition queues to avoid one global lock",
      "Define cancellation, persistence, and clock behavior",
    ],
  },
  "bitmaps-bitsets": {
    title: "Bitmaps and Bitsets",
    problem:
      "Representing millions of boolean flags as objects or hash-set entries wastes memory. A bitmap maps each integer position to one bit, packing 64 flags into one 64-bit word.",
    mechanics: [
      "Map value i to word floor(i / wordSize) and bit i mod wordSize.",
      "Set, clear, and test bits with bitwise operators.",
      "Combine sets quickly using word-level AND, OR, XOR, and NOT.",
    ],
    visual:
      "values:   0 1 2 3 4 5 6 7\nbits:     0 1 0 1 0 0 1 0\nset = {1, 3, 6}\n\nA AND B → intersection\nA OR  B → union",
    complexity: [
      { operation: "Set / clear / contains", time: "O(1)", space: "O(U / wordSize)" },
      {
        operation: "Union / intersection",
        time: "O(U / wordSize)",
        note: "U = represented universe",
      },
    ],
    pros: [
      "Extremely compact for dense integer sets",
      "Fast bit-parallel set operations",
      "Simple predictable layout",
    ],
    cons: [
      "Space follows the maximum universe value",
      "Sparse unbounded IDs waste space without compression",
      "Concurrent word updates need atomicity",
    ],
    useWhen: ["Dense ID membership", "Permission and feature flags", "Fast set intersections"],
    avoidWhen: [
      "Keys are strings without a stable mapping",
      "The integer universe is huge and very sparse",
    ],
    examples: ["Database bitmap indexes", "CPU capability flags", "Audience-segment intersections"],
    keyInsight:
      "A bitmap turns integer membership into direct bit addressing and word-parallel set algebra.",
    misconception: "Each boolean still occupies a full byte or object in a bitset.",
    designScenario:
      "Design a segment engine that intersects filters across one hundred million numbered users.",
    designPoints: [
      "Choose plain, compressed, or chunked bitmaps by density",
      "Partition by user-ID ranges",
      "Track mutation and cache derived intersections",
    ],
  },
  hyperloglog: {
    title: "HyperLogLog",
    problem:
      "Counting distinct values exactly requires remembering every value or maintaining a large exact set. HyperLogLog estimates cardinality from fixed-size registers, making massive-stream counts practical.",
    mechanics: [
      "Hash each value to a uniformly distributed bit string.",
      "Use leading hash bits to select a register and remaining bits to measure the first 1 position.",
      "Store the maximum observed rank per register and combine registers with a corrected harmonic mean.",
    ],
    visual:
      "hash(value) = [register index | remaining bits]\n                         010 | 000010...\nregister[2] = max(register[2], leadingZeros + 1)\n\nMany registers → bias-corrected cardinality estimate",
    complexity: [
      { operation: "Add", time: "O(1)", space: "O(m) fixed" },
      { operation: "Estimate", time: "O(m)" },
      { operation: "Merge", time: "O(m)", note: "Register-wise maximum" },
    ],
    pros: [
      "Tiny fixed memory",
      "Mergeable across shards",
      "Error is predictable from register count",
    ],
    cons: [
      "Returns an estimate, not exact membership",
      "Small-cardinality bias needs correction",
      "A poor hash function ruins accuracy",
    ],
    useWhen: [
      "Unique visitors at very large scale",
      "Distributed distinct counting",
      "Telemetry where bounded error is acceptable",
    ],
    avoidWhen: [
      "Exact billing or compliance counts",
      "Individual members must be listed or deleted",
    ],
    examples: [
      "Redis PFADD/PFCOUNT",
      "Database approximate distinct queries",
      "Large-scale analytics pipelines",
    ],
    keyInsight:
      "Rare long runs of leading zeroes reveal the approximate number of distinct hashed values seen.",
    misconception: "HyperLogLog can return the values that contributed to its estimate.",
    designScenario:
      "Estimate daily and monthly unique users across hundreds of independently processed event partitions.",
    designPoints: [
      "Use a stable high-quality hash",
      "Choose precision from the error budget",
      "Merge same-precision sketches and retain exact counts for billing",
    ],
  },
  "count-min-sketch": {
    title: "a Count-Min Sketch",
    problem:
      "Exact frequency maps grow with the number of distinct items in a stream. A Count-Min Sketch uses a fixed matrix of counters to estimate frequencies with one-sided error.",
    mechanics: [
      "Hash each item once per row to select one counter in that row.",
      "Increment every selected counter for each occurrence.",
      "Estimate frequency as the minimum selected counter, limiting inflation from collisions.",
    ],
    visual:
      "          h1(x) h2(x) h3(x)\nrow 1:  0  4 [9] 1  0\nrow 2: [7] 2  5  0  3\nrow 3:  1  8  2 [6] 0\nestimate(x) = min(9, 7, 6) = 6",
    complexity: [
      {
        operation: "Update / query",
        time: "O(d)",
        space: "O(d × w) fixed",
        note: "d hash rows; w counters per row",
      },
      { operation: "Merge", time: "O(d × w)" },
    ],
    pros: [
      "Fixed sub-linear memory",
      "Never underestimates in the standard positive-update model",
      "Sketches with equal dimensions merge easily",
    ],
    cons: [
      "Collisions overestimate counts",
      "Cannot enumerate keys by itself",
      "Deletion requires a carefully chosen variant",
    ],
    useWhen: [
      "Heavy-hitter detection",
      "Approximate telemetry frequencies",
      "DoS and abuse detection",
    ],
    avoidWhen: ["Exact per-key billing", "Negative updates or enumeration are core requirements"],
    examples: [
      "Network flow measurement",
      "Trending-query detection",
      "Approximate database frequency statistics",
    ],
    keyInsight:
      "Taking the minimum across independent collision-prone counters gives a bounded overestimate in fixed memory.",
    misconception: "The sketch stores each distinct key alongside its exact counter.",
    designScenario:
      "Detect the most frequent API keys in a stream too large for an exact in-memory map.",
    designPoints: [
      "Derive width and depth from error/confidence targets",
      "Pair the sketch with a bounded candidate heap",
      "Rotate windows and guard counters against overflow",
    ],
  },
  "merkle-tree": {
    title: "a Merkle Tree",
    problem:
      "Comparing two large replicas item by item is expensive. A Merkle tree hashes data into a hierarchy so equal root hashes prove equality and mismatched branches localize differences.",
    mechanics: [
      "Hash fixed data blocks into leaf nodes.",
      "Hash child hashes together repeatedly until one root remains.",
      "Compare roots first, descending only into branches whose hashes differ.",
    ],
    visual:
      "          H(ABCD)\n         /       \\\n     H(AB)       H(CD)\n     /  \\       /  \\\n   H(A) H(B)   H(C) H(D)\n\nOne changed block alters only its path to the root.",
    complexity: [
      { operation: "Build", time: "O(n)", space: "O(n)" },
      { operation: "Proof size / verification", time: "O(log n)", space: "O(log n)" },
      {
        operation: "Locate replica differences",
        time: "O(k log n)",
        note: "k differing regions, depending on tree layout",
      },
    ],
    pros: [
      "Efficient integrity proofs",
      "Localizes differences without full transfer",
      "Root compactly commits to all leaves",
    ],
    cons: [
      "Updates require rehashing a root path",
      "Tree shape and block boundaries must match",
      "Hashing does not resolve conflicting versions",
    ],
    useWhen: ["Replica anti-entropy", "Content verification", "Authenticated data structures"],
    avoidWhen: ["Datasets are tiny", "Peers cannot agree on canonical encoding and partitioning"],
    examples: [
      "Git object trees",
      "Blockchain transaction proofs",
      "Distributed database replica repair",
    ],
    keyInsight:
      "Hierarchical hashes make equality cheap to prove and inequality cheap to narrow down.",
    misconception: "A matching root reveals all underlying data to the verifier.",
    designScenario:
      "Synchronize two multi-terabyte object-store replicas while transferring only changed regions.",
    designPoints: [
      "Define deterministic leaf ranges and encoding",
      "Compare roots and recurse over mismatches",
      "Version snapshots so concurrent writes do not invalidate the comparison",
    ],
  },
  "leader-election": concise({
    title: "Leader Election",
    problem:
      "A cluster often needs one node to coordinate work, assign partitions, or perform maintenance. If several nodes act as leader simultaneously, conflicting decisions can corrupt state; if none acts, progress stops.",
    flow: [
      "Nodes campaign with a monotonically increasing term",
      "A quorum selects one leader for that term",
      "Followers reject stale leaders and trigger a new election after timeout",
    ],
    key: "Leadership is valid only within a term and must be backed by quorum; fencing stale leaders is as important as choosing a new one.",
    caution:
      "Election alone does not prevent an isolated former leader from continuing side effects unless writes carry a fencing token or quorum check.",
    use: "Use it when one coordinator simplifies decisions that must be serialized across a cluster.",
    examples: ["Raft-based control planes", "Kafka partition leaders", "Database primary election"],
    scenario:
      "Design leader election for a three-zone scheduler that must survive a zone outage without allowing two active schedulers.",
  }),
  replication: concise({
    title: "Replication",
    problem:
      "A single copy of data is both a failure risk and a throughput bottleneck. Replication maintains copies on multiple nodes so service can continue through failures and reads can be distributed.",
    flow: [
      "A write is accepted by a leader or replica set",
      "The change is propagated to additional replicas",
      "Reads select a replica according to freshness and availability requirements",
    ],
    key: "Replication improves availability and read capacity, but every replica introduces a consistency and conflict-resolution decision.",
    caution:
      "Asynchronous replicas can return stale data or lose acknowledged writes during failover; synchronous replication adds latency and can reduce availability.",
    use: "Use it when data must survive node loss or serve reads from several locations.",
    examples: [
      "PostgreSQL streaming replicas",
      "Dynamo-style replicated partitions",
      "Geo-replicated object storage",
    ],
    scenario:
      "Design replication for a regional account database with low-latency reads and no lost acknowledged balance updates.",
  }),
  sharding: concise({
    title: "Sharding",
    problem:
      "One machine eventually cannot store or process an entire growing dataset. Sharding partitions records across nodes so storage and request load can scale horizontally.",
    flow: [
      "Choose a shard key and mapping strategy",
      "Route each operation to the owning shard",
      "Rebalance ranges or buckets as capacity and traffic change",
    ],
    key: "The shard key determines load distribution, query locality, and how painful future rebalancing will be.",
    caution:
      "Hot keys, cross-shard transactions, and resharding can erase the expected scalability benefit.",
    use: "Use it after a vertically scaled single-node dataset approaches durable storage or throughput limits.",
    examples: [
      "Tenant-based SaaS partitions",
      "Hash-sharded key-value stores",
      "Geographic customer shards",
    ],
    scenario:
      "Shard a multi-tenant event store whose largest tenant produces thirty percent of all traffic.",
  }),
  quorum: concise({
    title: "Quorum Reads and Writes",
    problem:
      "With replicated data, clients need a rule for how many replicas must participate before an operation is accepted. Quorums let systems tune the overlap between reads and writes.",
    flow: [
      "Replicate each value to N nodes",
      "Wait for W acknowledgements on writes",
      "Consult R replicas on reads and reconcile their versions",
    ],
    key: "When R + W > N, read and write quorums overlap, but real correctness still depends on versioning, membership, and failure assumptions.",
    caution:
      "Sloppy quorums, concurrent writes, and changing replica membership weaken the simple arithmetic model.",
    use: "Use it in replicated stores that need an explicit consistency-versus-availability control.",
    examples: [
      "Dynamo-inspired databases",
      "Cassandra consistency levels",
      "Consensus majority voting",
    ],
    scenario:
      "Choose N, R, and W for a shopping-cart service that favors availability but must surface conflicting updates.",
  }),
  "gossip-protocol": concise({
    title: "a Gossip Protocol",
    problem:
      "Broadcasting membership or health state from a central coordinator creates a bottleneck and single failure point. Gossip spreads information through repeated peer-to-peer exchanges.",
    flow: [
      "Each node periodically selects one or more peers",
      "Peers exchange newer membership or state versions",
      "Repeated rounds spread updates throughout the cluster",
    ],
    key: "Gossip provides scalable eventual dissemination; it does not provide immediate global agreement.",
    caution:
      "Convergence time, duplicate traffic, and conflicting updates require versioning and careful tuning.",
    use: "Use it for membership, failure suspicion, and metadata that may converge eventually.",
    examples: [
      "Cassandra cluster membership",
      "Consul member lists",
      "Distributed anti-entropy protocols",
    ],
    scenario:
      "Disseminate membership changes across ten thousand nodes without a central registry.",
  }),
  heartbeats: concise({
    title: "Heartbeats",
    problem:
      "In a distributed system, silence is ambiguous: a node may have crashed, the network may be delayed, or the observer may be partitioned. Heartbeats provide evidence of recent liveness.",
    flow: [
      "A node emits periodic liveness signals",
      "Observers track the last accepted signal",
      "A missed-signal threshold changes the node from healthy to suspected",
    ],
    key: "Heartbeats implement failure suspicion, not perfect failure detection; timeout choice trades detection speed against false positives.",
    caution: "Pauses, overload, and network partitions can make healthy nodes appear dead.",
    use: "Use them to trigger failover, membership review, or health alerts when recent liveness matters.",
    examples: [
      "Worker health checks",
      "Database replica monitoring",
      "Service-discovery membership",
    ],
    scenario:
      "Set heartbeat and timeout behavior for workers processing long jobs across an unreliable network.",
  }),
  "distributed-lock": concise({
    title: "a Distributed Lock",
    problem:
      "Processes on different machines sometimes must serialize access to an external resource. Local mutexes cannot coordinate them, so ownership must be recorded in shared fault-tolerant state.",
    flow: [
      "Atomically acquire ownership with a unique token",
      "Renew or release ownership under the same token",
      "Reject stale holders using a monotonically increasing fencing value",
    ],
    key: "A safe distributed lock needs bounded ownership and fencing at the protected resource, not just a key that says locked.",
    caution:
      "Clock pauses, partitions, and expired owners can create concurrent actors unless the resource rejects stale fencing tokens.",
    use: "Use it when an operation truly cannot be made idempotent or partitioned by ownership.",
    examples: [
      "Singleton maintenance jobs",
      "Schema migration coordination",
      "Exclusive hardware control",
    ],
    scenario:
      "Coordinate one invoice-export job across twenty application replicas while surviving pauses and crashes.",
  }),
  lease: concise({
    title: "a Lease",
    problem:
      "Permanent distributed ownership can block forever when a holder crashes. A lease grants ownership only until a deadline, allowing automatic recovery.",
    flow: [
      "Acquire a resource with an expiry and fencing number",
      "Renew before expiry while work continues",
      "Stop work if renewal fails; a later holder receives a newer fence",
    ],
    key: "A lease is time-bounded authority, so holders must finish or renew before expiry and protected resources must fence old holders.",
    caution:
      "Clock uncertainty and process pauses make client-side expiry checks insufficient for correctness.",
    use: "Use it for renewable leadership or ownership that must recover automatically after holder failure.",
    examples: ["Partition ownership", "Leader leases", "Temporary resource reservations"],
    scenario:
      "Design leases for queue partitions where workers may pause for garbage collection longer than expected.",
  }),
  "saga-pattern": concise({
    title: "the Saga Pattern",
    problem:
      "A business operation spanning several services cannot rely on one database transaction. A saga coordinates local commits and compensating actions to reach an acceptable outcome after failures.",
    flow: [
      "Execute one local transaction and record its outcome",
      "Trigger the next step through orchestration or events",
      "On failure, run compensations for completed steps in reverse business order",
    ],
    key: "A saga provides failure recovery through explicit business compensations, not atomic rollback or isolation.",
    caution:
      "Compensations may fail, may not perfectly undo real-world effects, and concurrent sagas can observe intermediate state.",
    use: "Use it for long-lived cross-service workflows where two-phase commit is unavailable or undesirable.",
    examples: [
      "Travel booking workflows",
      "Order-payment-inventory coordination",
      "Account onboarding",
    ],
    scenario:
      "Design a travel-booking saga covering flight, hotel, payment, and partial compensation failures.",
  }),
  "outbox-pattern": concise({
    title: "the Transactional Outbox Pattern",
    problem:
      "Updating a database and publishing an event are two independent writes. A crash between them can leave state changed without an event, or an event published without the state.",
    flow: [
      "Commit domain data and an outbox row in one local transaction",
      "A relay reads unpublished outbox rows and sends them to the broker",
      "Mark progress while consumers deduplicate repeated delivery",
    ],
    key: "The outbox makes database state and intent-to-publish atomic, while delivery remains at least once.",
    caution: "Relays can publish duplicates, so event IDs and idempotent consumers are mandatory.",
    use: "Use it whenever a service must reliably publish events caused by its database transaction.",
    examples: [
      "Order-created integration events",
      "CDC-based event publication",
      "Reliable email-job enqueueing",
    ],
    scenario:
      "Guarantee that every committed order eventually produces an event despite crashes and broker outages.",
  }),
  cqrs: concise({
    title: "CQRS",
    problem:
      "One data model can become strained when writes enforce rich invariants while reads need denormalized, differently scaled views. CQRS separates command and query responsibilities.",
    flow: [
      "Commands validate intent and update the write model",
      "Changes propagate to one or more read projections",
      "Queries read purpose-built views without mutating domain state",
    ],
    key: "CQRS separates models because read and write workloads have different needs; it does not require event sourcing or microservices.",
    caution:
      "Asynchronous projections introduce staleness, operational complexity, and harder end-to-end debugging.",
    use: "Use it when read and write models genuinely need different schemas, scaling, or ownership.",
    examples: [
      "Commerce order commands and reporting views",
      "Search projections",
      "Collaborative workflow systems",
    ],
    scenario:
      "Design command and query models for an order platform with complex validation and high-volume dashboards.",
  }),
  "event-sourcing": concise({
    title: "Event Sourcing",
    problem:
      "Storing only current state loses the history of how it was reached. Event sourcing stores immutable domain facts and derives state by folding them in order.",
    flow: [
      "Validate a command against current aggregate state",
      "Append new immutable events with optimistic concurrency",
      "Rebuild state and projections by replaying events, optionally from snapshots",
    ],
    key: "Events are the source of truth and must represent durable domain facts with stable schemas.",
    caution:
      "Event evolution, replay cost, side-effect isolation, and eventual projections add significant complexity.",
    use: "Use it when audit history, temporal queries, or reconstructing alternative projections has high business value.",
    examples: ["Financial ledgers", "Workflow histories", "Inventory movement records"],
    scenario:
      "Design an event-sourced wallet ledger that supports audits, snapshots, and schema evolution.",
  }),
  "consumer-groups": concise({
    title: "Consumer Groups",
    problem:
      "A single consumer may not keep up with a partitioned event stream. Consumer groups divide partitions among cooperating instances while preserving one active consumer per partition within the group.",
    flow: [
      "Consumers join a named group",
      "A coordinator assigns each partition to one member",
      "Membership changes trigger reassignment and processing resumes from committed offsets",
    ],
    key: "Parallelism is bounded by partition count, and offsets represent group progress rather than message deletion.",
    caution: "Rebalances pause work and careless offset commits cause duplicates or loss.",
    use: "Use them to scale one logical stream-processing application across instances.",
    examples: ["Kafka consumer groups", "Managed stream processors", "Parallel event handlers"],
    scenario:
      "Process a twelve-partition order stream with autoscaling workers and safe deployment rebalances.",
  }),
  "dead-letter-queue": concise({
    title: "a Dead Letter Queue",
    problem:
      "A permanently bad message can fail repeatedly, consume retry capacity, and block later work. A dead letter queue isolates exhausted messages for diagnosis and controlled recovery.",
    flow: [
      "Process and retry transient failures with a bounded policy",
      "Attach failure context and move exhausted messages aside",
      "Inspect, repair, replay, or discard through an audited workflow",
    ],
    key: "A DLQ is a recovery workflow, not a place where failures can be forgotten.",
    caution: "Blind replay can reproduce side effects or create an endless poison-message loop.",
    use: "Use it when asynchronous messages can fail independently and must not block the main flow.",
    examples: [
      "Cloud queue redrive policies",
      "Kafka dead-letter topics",
      "Failed webhook delivery stores",
    ],
    scenario:
      "Design DLQ handling for payment events containing transient failures, invalid schemas, and sensitive data.",
  }),
  "delivery-semantics": concise({
    title: "Delivery Semantics",
    problem:
      "Networks can lose acknowledgements and processes can crash between work and checkpointing. Messaging systems therefore describe whether a message may be lost, duplicated, or effectively applied once.",
    flow: [
      "At-most-once acknowledges before or without retry",
      "At-least-once retries until acknowledged and may duplicate",
      "Effectively-once combines durable coordination with idempotent or transactional effects",
    ],
    key: "Delivery and processing are different: exactly-once transport cannot make an arbitrary external side effect exactly once.",
    caution: "Claims of exactly once apply only inside a defined transactional boundary.",
    use: "Choose semantics explicitly from the cost of loss versus duplication.",
    examples: [
      "Kafka transactional processing",
      "SQS at-least-once queues",
      "UDP-style best-effort telemetry",
    ],
    scenario:
      "Select delivery semantics for analytics, customer emails, and money transfers, explaining each tradeoff.",
  }),
  deduplication: concise({
    title: "Deduplication",
    problem:
      "Retries and broker redelivery can present the same logical operation more than once. Deduplication recognizes a stable message or operation ID and prevents repeated effects.",
    flow: [
      "Producer assigns a stable identifier to the logical operation",
      "Consumer atomically checks or records that identifier",
      "Duplicates return the stored result or skip the already-applied effect",
    ],
    key: "The deduplication record and protected side effect must share an atomic boundary or an equivalent idempotent design.",
    caution:
      "TTL expiry, unbounded ID storage, and check-then-act races can reintroduce duplicates.",
    use: "Use it for at-least-once delivery when duplicate side effects are unacceptable.",
    examples: ["Payment idempotency keys", "Inbox tables", "Webhook event-ID stores"],
    scenario:
      "Deduplicate webhook events across horizontally scaled consumers without losing valid retries.",
  }),
  ordering: concise({
    title: "Message Ordering",
    problem:
      "Parallel producers, partitions, retries, and consumers can reorder related events. Some state transitions are only valid when applied in causal or per-entity order.",
    flow: [
      "Define the required scope: global, partition, or entity",
      "Route related events through the same ordered lane",
      "Attach sequence/version metadata and detect gaps or stale events",
    ],
    key: "Ordering is meaningful only within a declared scope; global total order is expensive and often unnecessary.",
    caution:
      "Retries and blocked messages can stall a partition, while repartitioning can break assumptions.",
    use: "Use per-key ordering when later events depend on earlier state for that key.",
    examples: ["Account event sequences", "Kafka partition ordering", "Change-data-capture logs"],
    scenario:
      "Preserve per-order event order while processing millions of unrelated orders in parallel.",
  }),
  backpressure: concise({
    title: "Backpressure",
    problem:
      "When producers outpace consumers, queues grow until latency, memory, or dependencies collapse. Backpressure carries capacity information upstream so load stays bounded.",
    flow: [
      "Measure downstream demand or queue pressure",
      "Limit, pause, shed, or slow upstream production",
      "Resume gradually when capacity recovers",
    ],
    key: "Backpressure keeps outstanding work bounded by making overload visible to producers instead of hiding it in an unbounded queue.",
    caution:
      "If producers cannot slow down, the system needs explicit dropping, sampling, or durable spillover policies.",
    use: "Use it in pipelines where producer and consumer rates vary independently.",
    examples: ["Reactive Streams demand", "TCP flow control", "Bounded worker queues"],
    scenario:
      "Protect a thumbnail service from upload bursts while maintaining bounded memory and fair tenant service.",
  }),
  "competing-consumers": concise({
    title: "Competing Consumers",
    problem:
      "One worker may be unable to drain a queue fast enough. Multiple workers can compete for messages so each task is claimed by one worker and throughput scales horizontally.",
    flow: [
      "Workers poll or receive from the same queue",
      "The broker grants one worker temporary ownership",
      "Success acknowledges removal; failure or timeout makes the task available again",
    ],
    key: "Competition distributes independent work, but redelivery means handlers still need idempotency.",
    caution: "Long visibility timeouts delay recovery; short ones cause concurrent duplicate work.",
    use: "Use it for independent jobs that can be processed in any order by interchangeable workers.",
    examples: ["Image-processing workers", "Cloud task queues", "Email delivery pools"],
    scenario:
      "Scale a queue of variable-duration media jobs while handling worker crashes and tenant fairness.",
  }),
  "write-through": concise({
    title: "Write-Through Caching",
    problem:
      "When applications update a database and cache separately, failures can leave stale cache data. Write-through routes writes through a component that updates both synchronously.",
    flow: [
      "Application writes through the cache layer",
      "The layer persists the authoritative store",
      "The cache is updated or invalidated before success is returned",
    ],
    key: "Write-through improves cache consistency by putting persistence and cache maintenance on the synchronous write path.",
    caution:
      "Every write pays cache overhead, including values that may never be read, and partial failures still need a policy.",
    use: "Use it when read freshness is important and extra write latency is acceptable.",
    examples: ["Managed cache loaders/writers", "Product-record caches", "Configuration stores"],
    scenario:
      "Design write-through caching for product prices where stale discounts are unacceptable.",
  }),
  "write-behind": concise({
    title: "Write-Behind Caching",
    problem:
      "Synchronous database writes limit throughput when callers need very low latency. Write-behind accepts changes in a fast cache or buffer and persists them asynchronously.",
    flow: [
      "Acknowledge after updating a durable or replicated buffer",
      "Coalesce and batch pending changes",
      "Flush to the authoritative store with retry and ordering controls",
    ],
    key: "Write-behind moves durability work off the request path, trading latency for a larger loss and consistency window.",
    caution:
      "A non-durable cache failure can lose acknowledged writes, and reordering can overwrite newer values.",
    use: "Use it for high-volume writes where delayed persistence and carefully bounded loss are acceptable.",
    examples: ["Write-back CPU caches", "Batched counter persistence", "Session activity buffers"],
    scenario:
      "Buffer high-volume view counters while bounding loss and preserving monotonic totals.",
  }),
  "read-through": concise({
    title: "Read-Through Caching",
    problem:
      "Repeated application-level cache-aside code duplicates miss handling and loading logic. A read-through cache loads missing values through a configured loader.",
    flow: [
      "Application requests a key from the cache",
      "On a miss, the cache invokes the backing-store loader",
      "The cache stores and returns the loaded value",
    ],
    key: "Read-through centralizes miss loading behind the cache interface; it does not by itself solve staleness or stampedes.",
    caution: "Loader failures, null caching, and concurrent misses require explicit behavior.",
    use: "Use it when a platform can provide a reliable generic loading contract.",
    examples: [
      "LoadingCache libraries",
      "ORM second-level caches",
      "Managed distributed caches with loaders",
    ],
    scenario:
      "Build a read-through customer-profile cache with negative caching and protection from concurrent misses.",
  }),
  ttl: concise({
    title: "Time-to-Live Expiration",
    problem:
      "Cached or temporary state must not live forever. A TTL attaches an expiry deadline so stale data and abandoned records are eventually removed.",
    flow: [
      "Store the value with an expiry duration or timestamp",
      "Treat expired values as misses during reads",
      "Reclaim expired storage lazily, periodically, or with an expiry index",
    ],
    key: "TTL bounds staleness and retention; it does not guarantee deletion at the exact expiry instant.",
    caution:
      "Synchronized expirations cause load spikes, while short TTLs destroy hit rate and long TTLs preserve stale data.",
    use: "Use it when data has a natural freshness or retention bound.",
    examples: ["Session expiration", "DNS cache records", "Redis key TTLs"],
    scenario:
      "Choose and operate TTLs for authentication sessions and cached user profiles with different freshness needs.",
  }),
  "cache-invalidation": concise({
    title: "Cache Invalidation",
    problem:
      "A cache serves old data after the source changes unless entries are updated, removed, versioned, or allowed to expire. Invalidation defines how freshness is restored.",
    flow: [
      "Identify which cache keys depend on a changed record",
      "Delete, update, or version those keys",
      "Use TTL and reconciliation as safety nets for missed invalidations",
    ],
    key: "Invalidation correctness depends on knowing data dependencies and ordering updates relative to authoritative commits.",
    caution:
      "Lost or reordered invalidation events can preserve stale values indefinitely without a bounded fallback.",
    use: "Use explicit invalidation when freshness requirements are tighter than an acceptable TTL.",
    examples: ["CDN purge APIs", "Database change-event invalidation", "Versioned cache keys"],
    scenario:
      "Invalidate product pages assembled from price, inventory, and promotion records across regions.",
  }),
  "cache-stampede": concise({
    title: "Cache Stampede Protection",
    problem:
      "When a popular entry expires, many requests can miss simultaneously and all recompute or query the same data, overwhelming the dependency.",
    flow: [
      "Detect a miss or near-expiry hot key",
      "Allow one request to refresh while others wait or receive stale data",
      "Add expiry jitter and refresh ahead to avoid synchronized waves",
    ],
    key: "Stampede protection collapses concurrent work for the same key and smooths expirations over time.",
    caution: "A refresh lock without expiry or fencing can deadlock or publish stale work.",
    use: "Use it for expensive, frequently requested values with bursty access.",
    examples: [
      "Single-flight request coalescing",
      "Stale-while-revalidate CDNs",
      "Probabilistic early refresh",
    ],
    scenario:
      "Protect a homepage cache from millions of requests when a five-minute entry expires.",
  }),
  "distributed-cache": concise({
    title: "a Distributed Cache",
    problem:
      "Per-process caches waste duplicate memory and provide inconsistent hit rates across instances. A distributed cache shares fast data across the application fleet.",
    flow: [
      "Map a key to a cache node or partition",
      "Replicate and expire entries according to policy",
      "Handle misses, node loss, hot keys, and rebalancing in the client or service",
    ],
    key: "A distributed cache is a networked partial copy, so availability, partitioning, eviction, and consistency are first-class design concerns.",
    caution:
      "Treating the cache as durable truth can turn eviction or cluster loss into data loss.",
    use: "Use it when many application instances benefit from a shared working set.",
    examples: ["Redis Cluster", "Memcached pools", "Shared session caches"],
    scenario:
      "Design a multi-region cache for product data with hot-key protection and safe regional failure.",
  }),
  factory: concise({
    title: "the Factory Pattern",
    problem:
      "Callers become coupled to construction details when they instantiate concrete classes directly. A factory centralizes selection, validation, and assembly behind an intention-revealing creation API.",
    flow: [
      "Caller supplies a type or configuration",
      "Factory chooses and constructs the concrete implementation",
      "Caller receives the shared abstraction without knowing construction details",
    ],
    key: "A factory encapsulates creation decisions; it should not become a service locator containing unrelated application behavior.",
    caution:
      "Factories add indirection and can become oversized switch statements when extension boundaries are poorly chosen.",
    use: "Use it when construction varies, requires validation, or should be hidden from callers.",
    examples: ["Database driver factories", "Parser selection", "UI component creation"],
    scenario:
      "Create payment-provider clients from configuration while keeping business code independent of vendor SDKs.",
  }),
  adapter: concise({
    title: "the Adapter Pattern",
    problem:
      "Useful components often expose interfaces that do not match what the application expects. An adapter translates calls and data without changing either side.",
    flow: [
      "Define the interface the application needs",
      "Wrap the incompatible service or object",
      "Translate inputs, outputs, errors, and lifecycle semantics at the boundary",
    ],
    key: "An adapter converts one contract into another while containing vendor-specific or legacy details.",
    caution:
      "A leaky adapter that exposes foreign types merely relocates coupling instead of removing it.",
    use: "Use it to integrate third-party, legacy, or platform-specific APIs behind a stable application port.",
    examples: ["Payment gateway adapters", "Legacy API wrappers", "Storage-provider ports"],
    scenario:
      "Unify three shipping providers with different request models, errors, and tracking states.",
  }),
  decorator: concise({
    title: "the Decorator Pattern",
    problem:
      "Adding combinations of cross-cutting behavior through subclasses creates a class explosion. Decorators wrap the same interface and compose behavior dynamically.",
    flow: [
      "Implement the same contract as the wrapped component",
      "Delegate core work to the inner component",
      "Add behavior before, after, or around delegation",
    ],
    key: "A decorator preserves the wrapped contract so multiple independent behaviors can be composed in layers.",
    caution: "Deep wrapper stacks make ordering, identity, and debugging harder.",
    use: "Use it for orthogonal behavior such as logging, caching, authorization, or metrics.",
    examples: ["HTTP middleware", "Java I/O streams", "Instrumented repositories"],
    scenario:
      "Add retries, metrics, and caching around an API client with explicit and testable ordering.",
  }),
  observer: concise({
    title: "the Observer Pattern",
    problem:
      "When one object's state changes, several dependents may need notification. Hard-coded direct calls couple the subject to every reaction.",
    flow: [
      "Observers subscribe through a common callback contract",
      "The subject emits a notification after relevant change",
      "Observers react independently and can unsubscribe when their lifecycle ends",
    ],
    key: "Observer decouples the publisher from a changing set of in-process listeners, but notification semantics must be explicit.",
    caution:
      "Synchronous observers can block or re-enter the subject; forgotten subscriptions leak memory.",
    use: "Use it for in-process event notification where publisher and observers share a lifecycle.",
    examples: ["UI event listeners", "Domain-event dispatch", "Reactive state stores"],
    scenario:
      "Design observable document state for plugins while isolating listener failures and preventing subscription leaks.",
  }),
  command: concise({
    title: "the Command Pattern",
    problem:
      "Direct method calls are hard to queue, retry, audit, or undo because the request exists only on the call stack. A command represents intent as a first-class object.",
    flow: [
      "Capture operation name and validated parameters",
      "Pass the command to a handler or dispatcher",
      "Record outcome and optionally retain information needed for undo or retry",
    ],
    key: "A command separates the request for work from when and how a handler executes it.",
    caution:
      "Not every method call needs a command; excessive command classes add ceremony without operational value.",
    use: "Use it when requests must be queued, logged, retried, authorized, or undone.",
    examples: ["Job queues", "Editor undo stacks", "CQRS command handlers"],
    scenario:
      "Design commands for a collaborative editor with audit history, retries, and undo constraints.",
  }),
  repository: concise({
    title: "the Repository Pattern",
    problem:
      "Business logic becomes tied to SQL, ORM details, and remote APIs when it performs persistence directly. A repository presents domain-oriented retrieval and persistence operations.",
    flow: [
      "Application asks using domain concepts",
      "Repository translates to storage queries and mappings",
      "Repository returns domain objects or explicit result models",
    ],
    key: "A repository protects the domain from persistence details; it is not automatically a generic CRUD wrapper for every table.",
    caution:
      "Overly generic repositories hide useful database capabilities and create inefficient query patterns.",
    use: "Use it where domain logic needs a stable persistence boundary and test seam.",
    examples: ["Order repositories", "Aggregate persistence", "Ports-and-adapters architectures"],
    scenario:
      "Design an order repository that supports aggregate consistency without causing N+1 queries.",
  }),
  "dependency-injection": concise({
    title: "Dependency Injection",
    problem:
      "Objects that construct their own dependencies are tightly coupled to concrete implementations and difficult to test or configure. Dependency injection supplies collaborators from outside.",
    flow: [
      "Declare dependencies through constructors or explicit parameters",
      "A composition root chooses concrete implementations",
      "Application objects use abstractions without performing service lookup",
    ],
    key: "Dependency injection separates object use from object construction and makes dependencies visible in the API.",
    caution:
      "A global container or service locator hides dependencies and can shift errors from compile time to runtime.",
    use: "Use it to configure replaceable infrastructure and test business logic in isolation.",
    examples: [
      "Constructor-injected services",
      "Web-framework request scopes",
      "Plugin composition roots",
    ],
    scenario:
      "Compose an order service with production and test implementations for payments, storage, and messaging.",
  }),
};
