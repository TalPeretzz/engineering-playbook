import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Pub/sub's fan-out model is great for broadcasting an event to many independent systems — but it doesn't help with a different, very common need: processing a single high-volume stream of messages faster than one consumer can keep up with. If a topic receives 10,000 messages a second and one consumer can only handle 1,000, plain pub/sub doesn't have an answer — every subscriber gets every message, so adding more subscribers doesn't divide the work, it just multiplies it.",
      },
      {
        type: "p",
        text: "**Consumer groups** solve this by letting multiple consumer instances share the work of processing one stream, cooperatively, without any single message being processed twice within the group.",
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
          "A topic is split into multiple **partitions** — independent, ordered sub-streams of the topic's messages.",
          "Consumer instances that share a **group ID** form a consumer group. The partitions of the topic are divided among the group's members — each partition is assigned to exactly one consumer in the group at a time.",
          "As consumers join or leave the group, partitions are **rebalanced** — reassigned so the remaining/new members each get a proportional share.",
          "Multiple, independent consumer groups can all subscribe to the same topic — each group gets its own complete copy of every message. It's only *within* a single group that a message goes to exactly one consumer.",
        ],
      },
      {
        type: "p",
        text: "This is the mechanism that makes a single system (Kafka is the canonical example) behave like a queue and a pub/sub broker at the same time: within one consumer group, partitioned delivery gives you queue-like load distribution; across multiple consumer groups subscribed to the same topic, every group gets a full copy, which is pub/sub-style fan-out. The two aren't a tradeoff you have to pick between — they compose.",
      },
      {
        type: "p",
        text: "The group-to-partition ratio matters directly: with equal numbers of partitions and consumers, every consumer gets exactly one partition and the group is fully utilized. With more consumers than partitions, the extras sit idle — a partition can only be consumed by one group member at a time, so adding a fifth consumer to a four-partition topic doesn't speed anything up. With more partitions than consumers, some consumers handle more than one partition each.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Topic "orders" — 4 partitions

Consumer Group "fulfillment" (3 consumers):
  Partition 0 ──▶ Consumer A
  Partition 1 ──▶ Consumer B
  Partition 2 ──▶ Consumer B   (2 partitions — more partitions than consumers)
  Partition 3 ──▶ Consumer C

Consumer Group "analytics" (independent group, same topic):
  Partition 0 ──▶ Consumer X
  Partition 1 ──▶ Consumer Y
  Partition 2 ──▶ Consumer Y
  Partition 3 ──▶ Consumer Z

Both groups see every message published to "orders" — each is an
independent full copy (pub/sub, across groups).
Within "fulfillment", each message is processed by exactly one of
A/B/C — never twice (queue-like, within a group).`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Max parallelism within one group",
        time: "—",
        note: "Bounded by partition count — a group can never usefully have more active consumers than the topic has partitions",
      },
      {
        operation: "Rebalance (consumer joins/leaves)",
        time: "—",
        note: "Pauses consumption for affected partitions during reassignment",
      },
      {
        operation: "Fan-out across N independent groups",
        time: "O(N) full copies",
        note: "Each group receives every message independently — cost scales with group count, not divided among them",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Scales processing throughput for one logical consumer by adding more instances, up to the partition count",
      "Combines queue-like load distribution (within a group) with pub/sub-style fan-out (across groups) in one system",
      "Automatic rebalancing handles consumers joining and leaving without manual partition reassignment",
      "Per-partition ordering is preserved even while multiple consumers in the group process different partitions in parallel",
    ],
    cons: [
      "Parallelism within a group is capped by partition count — adding consumers past that point does nothing",
      "Rebalancing pauses affected partitions, which can cause a brief processing stall every time group membership changes",
      "Ordering is only guaranteed within a partition, not across the whole topic — messages in different partitions can be processed out of relative order",
      "Choosing the right number of partitions up front matters — too few limits future scaling; too many adds per-partition overhead and can be costly to change later",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "A single high-volume stream needs more processing throughput than one consumer instance can provide",
      "Multiple independent systems need their own full copy of the same stream, while each also scales its own processing horizontally",
      "Per-key ordering matters (e.g. all events for one user) and keys can be partitioned so related events land in the same partition",
    ],
    whenNotToUse: [
      "Strict ordering across the entire topic, not just within a partition, is required — partitioning fundamentally trades this away for parallelism",
      "The message volume is low enough that a single consumer instance comfortably keeps up — the added complexity of partitioning and rebalancing isn't earning its cost",
      "True broadcast semantics are needed where every single subscriber must independently process every message — that's plain pub/sub, not something a shared group should do",
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
          "**Apache Kafka** is the system that popularized this model: Confluent's documentation describes how partitions are divided among a consumer group's members and automatically reassigned ('rebalanced') as membership changes, with idle consumers resulting whenever there are more consumers than partitions.",
          "Kafka's design explicitly combines queuing and pub/sub through this mechanism: each partition is consumed by exactly one consumer within a given group, but multiple independent groups can each subscribe to the same topic and receive their own full copy.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Confluent Developer — Kafka Clients FAQ (What is a Kafka consumer group?)",
            url: "https://developer.confluent.io/faq/apache-kafka/kafka-clients/",
            verified: "2026-11-04",
            note: "Partition division among group members; idle consumers when consumers exceed partitions",
          },
          {
            name: "Confluent Docs — Kafka Consumer Design",
            url: "https://docs.confluent.io/kafka/design/consumer-design.html",
            verified: "2026-11-04",
            note: "Each partition consumed by exactly one consumer per group; multiple groups each get a full copy",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `type Message = { partition: number; offset: number; payload: string };

class ConsumerGroup {
  private assignments = new Map<string, number[]>(); // consumerId -> assigned partitions

  constructor(private partitionCount: number) {}

  addConsumer(consumerId: string): void {
    this.rebalance([...this.assignments.keys(), consumerId]);
  }

  removeConsumer(consumerId: string): void {
    this.rebalance([...this.assignments.keys()].filter((id) => id !== consumerId));
  }

  private rebalance(consumerIds: string[]): void {
    this.assignments.clear();
    if (consumerIds.length === 0) return;

    // Simple round-robin partition assignment — real brokers use pluggable strategies.
    for (const id of consumerIds) this.assignments.set(id, []);
    for (let partition = 0; partition < this.partitionCount; partition++) {
      const consumerId = consumerIds[partition % consumerIds.length];
      this.assignments.get(consumerId)!.push(partition);
    }
  }

  partitionsFor(consumerId: string): number[] {
    return this.assignments.get(consumerId) ?? [];
  }
}

// Usage — 4 partitions, 3 consumers: one consumer gets 2 partitions, the rest get 1 each.
const group = new ConsumerGroup(4);
group.addConsumer("consumer-a");
group.addConsumer("consumer-b");
group.addConsumer("consumer-c");
console.log(group.partitionsFor("consumer-a")); // e.g. [0, 3]`,

  python: `from collections import defaultdict


class ConsumerGroup:
    def __init__(self, partition_count: int) -> None:
        self.partition_count = partition_count
        self.assignments: dict[str, list[int]] = {}

    def add_consumer(self, consumer_id: str) -> None:
        self._rebalance([*self.assignments.keys(), consumer_id])

    def remove_consumer(self, consumer_id: str) -> None:
        self._rebalance([c for c in self.assignments if c != consumer_id])

    def _rebalance(self, consumer_ids: list[str]) -> None:
        self.assignments = {c: [] for c in consumer_ids}
        if not consumer_ids:
            return
        # Simple round-robin partition assignment — real brokers use pluggable strategies.
        for partition in range(self.partition_count):
            consumer_id = consumer_ids[partition % len(consumer_ids)]
            self.assignments[consumer_id].append(partition)

    def partitions_for(self, consumer_id: str) -> list[int]:
        return self.assignments.get(consumer_id, [])


# Usage — 4 partitions, 3 consumers: one consumer gets 2 partitions, the rest get 1 each.
group = ConsumerGroup(4)
group.add_consumer("consumer-a")
group.add_consumer("consumer-b")
group.add_consumer("consumer-c")
print(group.partitions_for("consumer-a"))  # e.g. [0, 3]`,

  java: `import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ConsumerGroup {
    private final int partitionCount;
    private final Map<String, List<Integer>> assignments = new LinkedHashMap<>();

    public ConsumerGroup(int partitionCount) {
        this.partitionCount = partitionCount;
    }

    public void addConsumer(String consumerId) {
        List<String> ids = new ArrayList<>(assignments.keySet());
        ids.add(consumerId);
        rebalance(ids);
    }

    public void removeConsumer(String consumerId) {
        List<String> ids = new ArrayList<>(assignments.keySet());
        ids.remove(consumerId);
        rebalance(ids);
    }

    private void rebalance(List<String> consumerIds) {
        assignments.clear();
        if (consumerIds.isEmpty()) return;

        for (String id : consumerIds) assignments.put(id, new ArrayList<>());
        // Simple round-robin partition assignment — real brokers use pluggable strategies.
        for (int partition = 0; partition < partitionCount; partition++) {
            String consumerId = consumerIds.get(partition % consumerIds.size());
            assignments.get(consumerId).add(partition);
        }
    }

    public List<Integer> partitionsFor(String consumerId) {
        return assignments.getOrDefault(consumerId, List.of());
    }
}

// Usage — 4 partitions, 3 consumers: one consumer gets 2 partitions, the rest get 1 each.
ConsumerGroup group = new ConsumerGroup(4);
group.addConsumer("consumer-a");
group.addConsumer("consumer-b");
group.addConsumer("consumer-c");
System.out.println(group.partitionsFor("consumer-a")); // e.g. [0, 3]`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "consumer-groups-conceptual",
    required: true,
    question:
      "A topic has 4 partitions. Group A has 3 consumers, and Group B (a separate, independent consumer group) also subscribes to the same topic with 2 consumers. A message is published. How many consumers process it?",
    options: [
      {
        id: "a",
        text: "Exactly 1 — only one consumer across both groups processes any given message",
      },
      {
        id: "b",
        text: "Exactly 2 — one in Group A and one in Group B, since each group gets its own copy",
      },
      { id: "c", text: "All 5 consumers process it" },
      { id: "d", text: "Exactly 4 — one per partition" },
    ],
    correctOptionId: "b",
    explanation:
      "Each consumer group gets its own independent full copy of the topic's messages (pub/sub-style fan-out across groups). Within each group, the message is delivered to exactly one consumer — whichever one owns the partition it landed in (queue-like load distribution within a group). So a message reaches exactly one consumer in Group A and exactly one consumer in Group B: 2 total, not 1 (that would mean groups don't get independent copies) and not 5 (that would mean no load distribution is happening within each group at all).",
  },
  {
    type: "implementation",
    id: "consumer-groups-implementation",
    required: true,
    title: "Implement Partition Assignment for a Consumer Group",
    description: `Implement a simplified consumer group's partition assignment:

- **addConsumer(consumerId)** — adds a consumer to the group and rebalances partitions across all current members.
- **removeConsumer(consumerId)** — removes a consumer and rebalances the remaining members.
- **partitionsFor(consumerId)** — returns the list of partition indices currently assigned to that consumer.

Use round-robin assignment: partition \`i\` goes to \`consumerIds[i % consumerIds.length]\`, based on the current, stable ordering of group members.`,
    starterCode: {
      typescript: `class ConsumerGroup {
  private assignments = new Map<string, number[]>();

  constructor(private partitionCount: number) {}

  addConsumer(consumerId: string): void {
    // TODO: add to the group, then rebalance all members round-robin
  }

  removeConsumer(consumerId: string): void {
    // TODO: remove from the group, then rebalance remaining members round-robin
  }

  partitionsFor(consumerId: string): number[] {
    return this.assignments.get(consumerId) ?? [];
  }
}`,
      python: `class ConsumerGroup:
    def __init__(self, partition_count: int) -> None:
        self.partition_count = partition_count
        self.assignments: dict[str, list[int]] = {}

    def add_consumer(self, consumer_id: str) -> None:
        # TODO: add to the group, then rebalance all members round-robin
        pass

    def remove_consumer(self, consumer_id: str) -> None:
        # TODO: remove from the group, then rebalance remaining members round-robin
        pass

    def partitions_for(self, consumer_id: str) -> list[int]:
        return self.assignments.get(consumer_id, [])`,
      java: `import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

public class ConsumerGroup {
    private final int partitionCount;
    private final Map<String, List<Integer>> assignments = new LinkedHashMap<>();

    public ConsumerGroup(int partitionCount) {
        this.partitionCount = partitionCount;
    }

    public void addConsumer(String consumerId) {
        // TODO: add to the group, then rebalance all members round-robin
    }

    public void removeConsumer(String consumerId) {
        // TODO: remove from the group, then rebalance remaining members round-robin
    }

    public List<Integer> partitionsFor(String consumerId) {
        return assignments.getOrDefault(consumerId, List.of());
    }
}`,
    },
    hints: [
      "Keep a stable, ordered list of current consumer IDs — both add and remove should recompute assignments from scratch based on that list",
      "Round-robin: for partition index i, the owner is consumerIds[i % consumerIds.length]",
      "If there are no consumers left, every partition is unassigned — don't divide by zero",
      "Rebalancing from scratch on every join/leave is simpler (and matches what this challenge asks for) than trying to minimize partition movement — real brokers do optimize for that, but it's a different, harder problem",
    ],
    solution: {
      typescript: `class ConsumerGroup {
  private assignments = new Map<string, number[]>();

  constructor(private partitionCount: number) {}

  addConsumer(consumerId: string): void {
    this.rebalance([...this.assignments.keys(), consumerId]);
  }

  removeConsumer(consumerId: string): void {
    this.rebalance([...this.assignments.keys()].filter((id) => id !== consumerId));
  }

  private rebalance(consumerIds: string[]): void {
    this.assignments.clear();
    if (consumerIds.length === 0) return;

    for (const id of consumerIds) this.assignments.set(id, []);
    for (let partition = 0; partition < this.partitionCount; partition++) {
      const consumerId = consumerIds[partition % consumerIds.length];
      this.assignments.get(consumerId)!.push(partition);
    }
  }

  partitionsFor(consumerId: string): number[] {
    return this.assignments.get(consumerId) ?? [];
  }
}`,
      python: `class ConsumerGroup:
    def __init__(self, partition_count: int) -> None:
        self.partition_count = partition_count
        self.assignments: dict[str, list[int]] = {}

    def add_consumer(self, consumer_id: str) -> None:
        self._rebalance([*self.assignments.keys(), consumer_id])

    def remove_consumer(self, consumer_id: str) -> None:
        self._rebalance([c for c in self.assignments if c != consumer_id])

    def _rebalance(self, consumer_ids: list[str]) -> None:
        self.assignments = {c: [] for c in consumer_ids}
        if not consumer_ids:
            return
        for partition in range(self.partition_count):
            consumer_id = consumer_ids[partition % len(consumer_ids)]
            self.assignments[consumer_id].append(partition)

    def partitions_for(self, consumer_id: str) -> list[int]:
        return self.assignments.get(consumer_id, [])`,
      java: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

public class ConsumerGroup {
    private final int partitionCount;
    private final Map<String, List<Integer>> assignments = new LinkedHashMap<>();

    public ConsumerGroup(int partitionCount) {
        this.partitionCount = partitionCount;
    }

    public void addConsumer(String consumerId) {
        List<String> ids = new ArrayList<>(assignments.keySet());
        ids.add(consumerId);
        rebalance(ids);
    }

    public void removeConsumer(String consumerId) {
        List<String> ids = new ArrayList<>(assignments.keySet());
        ids.remove(consumerId);
        rebalance(ids);
    }

    private void rebalance(List<String> consumerIds) {
        assignments.clear();
        if (consumerIds.isEmpty()) return;

        for (String id : consumerIds) assignments.put(id, new ArrayList<>());
        for (int partition = 0; partition < partitionCount; partition++) {
            String consumerId = consumerIds.get(partition % consumerIds.size());
            assignments.get(consumerId).add(partition);
        }
    }

    public List<Integer> partitionsFor(String consumerId) {
        return assignments.getOrDefault(consumerId, List.of());
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "consumer-groups-system-design",
    required: false,
    title: "Sizing Partitions for a Growing Order-Processing Pipeline",
    scenario: `Your order-processing pipeline reads from a topic with 6 partitions, consumed by a group of 6 instances — one partition each, fully utilized. The business is growing fast, and you're asked to plan for 10x order volume over the next year, with the ability to scale the consumer group accordingly.

The team currently sets the partition count once when a topic is created and has historically been reluctant to change it, because increasing partition count later changes how keys map to partitions, which can affect ordering guarantees for any key that was relying on consistently landing in the same partition.

Design the partition strategy for this pipeline, accounting for both near-term scaling and this specific repartitioning risk.`,
    hints: [
      "What's the actual ceiling on how many consumers can usefully process this topic in parallel, given its current partition count?",
      "If you don't want to repartition later, what does that imply about how many partitions you should create now, versus how many consumers you run today?",
      "What's actually at risk if partition count changes and a key that used to land in partition 2 now lands in partition 5?",
      "Is 10x order volume necessarily the same as needing 10x consumers — does each order need the exact same amount of processing?",
      "Are there operational costs to over-provisioning partitions well beyond current need, or is more partitions strictly better?",
    ],
    discussionPoints: [
      "**Partition count is a ceiling, not a current requirement:** You can create more partitions than you currently have consumers for — a 6-consumer group against a 60-partition topic just means most consumers handle 10 partitions each today. Running fewer consumers than partitions is completely normal and lets the group scale later by adding consumers, with zero need to touch partition count again.",
      "**Repartitioning risk is specifically about key-based ordering:** The risk the team is worried about only matters for use cases that depend on a specific key consistently mapping to the same partition (e.g. all events for order #123 must process in order, so they must stay in the same partition across the order's lifetime). If partition assignment is purely round-robin with no ordering dependency on key-to-partition stability, repartitioning risk doesn't apply — the mitigation depends on which case this pipeline actually is.",
      "**Overprovisioning has real costs too:** More partitions isn't free — each partition adds some per-partition overhead on the broker side (open file handles, replication traffic, memory), and an excessively high partition count for current traffic can itself become an operational burden. The right number is 'comfortably above the 10x target with room for further growth,' not 'as many as possible.'",
      "**10x volume isn't automatically 10x consumers:** If per-order processing gets more efficient (batching, faster downstream calls) or the processing work per order doesn't scale linearly with order count, the actual consumer-count needed to handle 10x volume might be less than 10x — partition planning should be based on a throughput estimate, not a naive multiply of the current ratio.",
      "**A concrete plan:** Create the topic with partitions sized for the 10x target from the start (e.g. 60 partitions for 10x of a 6-partition baseline, rounded up for headroom), run 6 consumers today, and scale the consumer group up to match real growth over the year — no repartitioning needed at any point.",
    ],
  },
];
