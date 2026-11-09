import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "A single node — no matter how powerful — has a ceiling: a fixed amount of disk, memory, and CPU, and a fixed amount of network throughput. Once a dataset or its traffic outgrows what one machine can hold or serve, replication alone doesn't help — every replica still has to hold the *entire* dataset, so replicating a too-big dataset just gives you more copies of a problem, not a smaller one.",
      },
      {
        type: "p",
        text: "**Sharding** (horizontal partitioning) splits a dataset across multiple nodes, so each node only holds a slice of the whole — each shard independently handles its own storage and its own share of traffic. This is what lets a dataset or workload grow past what any single machine could handle, at the cost of a new, central design decision: how do you decide which shard a given piece of data lives on?",
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
          "**Shard key**: every sharded system picks one or more fields from each record to determine which shard it belongs to — MongoDB calls this the shard key, and \"a document's shard key value determines its distribution across the shards.\" Choosing this key well is the single most consequential decision in a sharded system's design.",
          '**Range-based sharding**: data is split into contiguous ranges of the shard key, each range assigned to one shard. MongoDB documents this as enabling "targeted operations" since "a range of shard keys whose values are close are more likely to reside on the same chunk" — queries for a range of keys can often be routed to just one or a few shards instead of broadcasting to all of them.',
          "**Hashed sharding**: the shard key is hashed before being used to assign a shard, scattering related keys across different shards. This trades away range-query efficiency (hashed keys that were originally adjacent end up on different shards, so range queries become cluster-wide broadcasts) for much more even distribution — particularly important for shard keys that increase monotonically (like timestamps or auto-incrementing IDs), which under range-based sharding would otherwise concentrate all new writes onto whichever shard holds the current high end of the range.",
          '**Hot shards / hot partitions**: when traffic or data isn\'t evenly spread across shard key values, some shards end up far busier than others, bottlenecking the whole system even though aggregate capacity across all shards is high. AWS explicitly recommends designing "for uniform activity across all partition keys," since every partition has a hard ceiling on throughput regardless of how much total capacity the table has.',
          '**Rebalancing**: as data grows or access patterns shift, a sharded system needs to redistribute data across shards to stay balanced. MongoDB runs a background **balancer** that migrates chunks between shards specifically "to achieve an even data distribution across all shards in the cluster."',
        ],
      },
      {
        type: "p",
        text: "The core tension sharding introduces: picking a shard key is a one-time-ish decision with long-lasting consequences — a poor choice doesn't just cost performance, it can concentrate load onto a single shard no matter how many shards exist in total, defeating the entire purpose of sharding.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Range-based sharding by user_id:
  Shard A: ids 1-1000        Shard B: ids 1001-2000
  Shard C: ids 2001-3000

  query "id BETWEEN 1 AND 50" -> only hits Shard A (targeted)
  new ids keep growing -> all writes land on Shard C (hot shard)

Hashed sharding by user_id:
  Shard A: hash(id) % 3 == 0
  Shard B: hash(id) % 3 == 1
  Shard C: hash(id) % 3 == 2

  query "id BETWEEN 1 AND 50" -> may hit A, B, and C (broadcast)
  new ids scatter evenly across A, B, C -- no hot shard`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Route a request given its shard key",
        time: "O(1)",
        note: "Hash or range lookup directly identifies the target shard",
      },
      {
        operation: "Single-shard read/write",
        time: "Cost of the operation on one node",
        note: "No different from an unsharded system, once routed",
      },
      {
        operation: "Range query, range-based sharding",
        time: "O(k) shards touched",
        note: "k = number of shards whose range overlaps the query, often just 1",
      },
      {
        operation: "Range query, hashed sharding",
        time: "O(N) shards touched",
        note: "N = total shard count; hashing destroys key adjacency, so most range queries broadcast",
      },
      {
        operation: "Rebalancing after adding/removing a shard",
        time: "Proportional to data moved",
        note: "A background process (e.g. MongoDB's balancer) migrates chunks to restore even distribution",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Scales storage and throughput horizontally past what any single node could hold or serve — add shards to add capacity",
      "Each shard operates largely independently, so a problem contained to one shard's data doesn't necessarily affect the others",
      "Range-based sharding with a well-chosen key enables efficient targeted queries that touch only the relevant shard(s)",
      "Hashed sharding gives strong, predictable load distribution even for monotonically increasing keys, without requiring careful manual range planning",
    ],
    cons: [
      "The shard key choice has long-lasting consequences — a poor choice can create a hot shard that bottlenecks the whole system regardless of total shard count",
      "Queries that don't include the shard key, or that span many shard key values, often require querying every shard (a broadcast/scatter-gather operation), losing the single-node simplicity of an unsharded query",
      "Cross-shard operations (joins, multi-record transactions spanning shards) are significantly harder and slower than their single-node equivalents",
      "Rebalancing — adding/removing shards or fixing an emerging hot shard — requires moving real data between nodes, which costs time and resources and must be done carefully to avoid disrupting live traffic",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "A dataset has genuinely outgrown what a single node (or its replicas) can store or serve — sharding is fundamentally a scaling-past-one-machine technique",
      "Access patterns are naturally keyed by something with high cardinality and roughly even demand (e.g., customer ID, device ID) that can serve as a good shard key",
      "Write-heavy workloads with monotonically increasing keys (timestamps, auto-increment IDs) where hashed sharding can prevent all new writes from concentrating on one shard",
      "Systems where most queries naturally include the shard key, so they can be routed to a single shard rather than broadcasting",
    ],
    whenNotToUse: [
      "The dataset and its traffic comfortably fit on a single well-provisioned node (plus replicas for availability) — sharding adds real operational and query complexity that isn't worth paying for prematurely",
      "The workload's access patterns are dominated by cross-cutting queries (joins across many records, aggregations that need most of the dataset) that don't naturally align with any single shard key — these become expensive broadcast operations once sharded",
      "No field in the data has high enough cardinality and evenly distributed access to serve as a good shard key — forcing a poor shard key choice is often worse than not sharding at all",
      "Strong cross-shard transactional guarantees are required and the sharding layer doesn't support them well — some systems trade this away entirely for scalability",
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
          '**MongoDB** documents sharding as how it supports "deployments with very large data sets and high throughput operations," using a shard key to distribute documents across shards, with range-based sharding enabling "targeted operations" at the cost that "poorly considered shard keys can result in uneven distribution of data," and hashed sharding trading that targeting ability for better distribution, "especially for shard keys that change monotonically." MongoDB runs a background balancer specifically to migrate data and "achieve an even data distribution across all shards."',
          '**Amazon DynamoDB** documents that every partition has a hard, fixed throughput ceiling (3,000 read units and 1,000 write units per second, independent of overall table-level provisioned capacity), and explicitly recommends that applications be "designed for uniform activity across all partition keys in the table" — the real-world consequence of the hot-shard problem this lesson\'s how-it-works section describes: a poorly chosen partition key bottlenecks on that fixed per-partition ceiling no matter how much total throughput the table has been provisioned with.',
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "MongoDB Docs — Sharding",
            url: "https://www.mongodb.com/docs/manual/sharding/",
            verified: "2026-11-05",
            note: "Shard key, range vs. hashed sharding tradeoffs, background balancer for even data distribution",
          },
          {
            name: "AWS Docs — Best Practices for Designing and Using Partition Keys Effectively (DynamoDB)",
            url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html",
            verified: "2026-11-05",
            note: "Per-partition throughput ceiling (3,000 RCU/1,000 WCU), uniform-activity partition key guidance",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `import { createHash } from "crypto";

interface Shard {
  id: string;
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

// Hashed sharding: scatters keys evenly, loses range-query locality.
class HashedShardRouter {
  constructor(private readonly shards: Shard[]) {}

  private shardFor(key: string): Shard {
    const hash = createHash("sha256").update(key).digest();
    const bucket = hash.readUInt32BE(0) % this.shards.length;
    return this.shards[bucket];
  }

  get(key: string): string | undefined {
    return this.shardFor(key).get(key);
  }

  set(key: string, value: string): void {
    this.shardFor(key).set(key, value);
  }
}

// Range-based sharding: preserves locality for range queries, risks hot shards
// if keys (e.g. monotonically increasing ids) concentrate at one end.
class RangeShardRouter {
  // boundaries[i] is the exclusive upper bound of shards[i]'s range.
  constructor(
    private readonly shards: Shard[],
    private readonly boundaries: number[]
  ) {}

  private shardFor(numericKey: number): Shard {
    for (let i = 0; i < this.boundaries.length; i++) {
      if (numericKey < this.boundaries[i]) return this.shards[i];
    }
    return this.shards[this.shards.length - 1];
  }

  get(numericKey: number): string | undefined {
    return this.shardFor(numericKey).get(String(numericKey));
  }

  set(numericKey: number, value: string): void {
    this.shardFor(numericKey).set(String(numericKey), value);
  }
}`,

  python: `import hashlib
from typing import Protocol


class Shard(Protocol):
    id: str

    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str) -> None: ...


class HashedShardRouter:
    """Scatters keys evenly across shards; loses range-query locality."""

    def __init__(self, shards: list[Shard]) -> None:
        self.shards = shards

    def _shard_for(self, key: str) -> Shard:
        digest = hashlib.sha256(key.encode()).digest()
        bucket = int.from_bytes(digest[:4], "big") % len(self.shards)
        return self.shards[bucket]

    def get(self, key: str) -> str | None:
        return self._shard_for(key).get(key)

    def set(self, key: str, value: str) -> None:
        self._shard_for(key).set(key, value)


class RangeShardRouter:
    """Preserves locality for range queries; risks hot shards if keys
    (e.g. monotonically increasing ids) concentrate at one end."""

    def __init__(self, shards: list[Shard], boundaries: list[int]) -> None:
        # boundaries[i] is the exclusive upper bound of shards[i]'s range.
        self.shards = shards
        self.boundaries = boundaries

    def _shard_for(self, numeric_key: int) -> Shard:
        for i, boundary in enumerate(self.boundaries):
            if numeric_key < boundary:
                return self.shards[i]
        return self.shards[-1]

    def get(self, numeric_key: int) -> str | None:
        return self._shard_for(numeric_key).get(str(numeric_key))

    def set(self, numeric_key: int, value: str) -> None:
        self._shard_for(numeric_key).set(str(numeric_key), value)`,

  java: `import java.security.MessageDigest;
import java.util.List;

public interface Shard {
    String getId();
    String get(String key);
    void set(String key, String value);
}

// Hashed sharding: scatters keys evenly, loses range-query locality.
public class HashedShardRouter {
    private final List<Shard> shards;

    public HashedShardRouter(List<Shard> shards) {
        this.shards = shards;
    }

    private Shard shardFor(String key) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(key.getBytes());
            int bucket = Math.floorMod(
                ((hash[0] & 0xFF) << 24) | ((hash[1] & 0xFF) << 16) | ((hash[2] & 0xFF) << 8) | (hash[3] & 0xFF),
                shards.size()
            );
            return shards.get(bucket);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public String get(String key) {
        return shardFor(key).get(key);
    }

    public void set(String key, String value) {
        shardFor(key).set(key, value);
    }
}

// Range-based sharding: preserves locality for range queries, risks hot
// shards if keys (e.g. monotonically increasing ids) concentrate at one end.
public class RangeShardRouter {
    private final List<Shard> shards;
    private final List<Integer> boundaries; // boundaries.get(i) = exclusive upper bound of shards.get(i)

    public RangeShardRouter(List<Shard> shards, List<Integer> boundaries) {
        this.shards = shards;
        this.boundaries = boundaries;
    }

    private Shard shardFor(int numericKey) {
        for (int i = 0; i < boundaries.size(); i++) {
            if (numericKey < boundaries.get(i)) return shards.get(i);
        }
        return shards.get(shards.size() - 1);
    }

    public String get(int numericKey) {
        return shardFor(numericKey).get(String.valueOf(numericKey));
    }

    public void set(int numericKey, String value) {
        shardFor(numericKey).set(String.valueOf(numericKey), value);
    }
}`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "sharding-conceptual",
    required: true,
    question:
      "A system shards an events table by auto-incrementing event_id using range-based sharding (e.g., Shard A holds ids 1-1,000,000, Shard B holds 1,000,001-2,000,000, and so on). Traffic is heavily write-dominated, with new events constantly being inserted. What's the most likely outcome?",
    options: [
      { id: "a", text: "Writes will be evenly distributed across all shards automatically" },
      {
        id: "b",
        text: "All new writes will concentrate on whichever shard holds the current highest range of ids, creating a hot shard, while older shards sit comparatively idle",
      },
      {
        id: "c",
        text: "Range-based sharding prevents hot shards by design, regardless of key distribution",
      },
      {
        id: "d",
        text: "The balancer will automatically convert this to hashed sharding to fix the imbalance",
      },
    ],
    correctOptionId: "b",
    explanation:
      "Since event_id increases monotonically and range-based sharding assigns contiguous ranges to each shard, every new insert's id is higher than all previous ones — meaning every single new write lands on the one shard currently responsible for the highest range, while every other shard only serves (comparatively rare) reads/writes to older ids. This is exactly the scenario this lesson's how-it-works section describes as the reason hashed sharding exists: hashing the shard key scatters monotonically increasing keys across shards rather than concentrating them, specifically to avoid this failure mode. A balancer can migrate data to rebalance chunk sizes, but it doesn't change the fundamental routing strategy — it can't fix a hot shard caused by the sharding strategy itself without actually re-sharding.",
  },
  {
    type: "implementation",
    id: "sharding-implementation",
    required: true,
    title: "Implement Hashed and Range-Based Shard Routers",
    description: `Implement two shard routing strategies:

- **HashedShardRouter.shardFor(key)** — hashes the key and maps it to one of the available shards, distributing keys as evenly as possible.
- **RangeShardRouter.shardFor(numericKey)** — given a sorted list of range boundaries (one fewer than the number of shards), returns the shard whose range contains the given numeric key.`,
    starterCode: {
      typescript: `class HashedShardRouter {
  constructor(private readonly shards: Shard[]) {}

  private shardFor(key: string): Shard {
    // TODO: hash the key, then map the hash to an index in [0, shards.length)
    return this.shards[0];
  }
}

class RangeShardRouter {
  constructor(
    private readonly shards: Shard[],
    private readonly boundaries: number[] // boundaries[i] = exclusive upper bound of shards[i]'s range
  ) {}

  private shardFor(numericKey: number): Shard {
    // TODO: find the first boundary numericKey is less than, and return
    // the corresponding shard; if numericKey exceeds every boundary,
    // return the last shard
    return this.shards[0];
  }
}`,
      python: `class HashedShardRouter:
    def __init__(self, shards: list) -> None:
        self.shards = shards

    def _shard_for(self, key: str):
        # TODO: hash the key, then map the hash to an index in
        # [0, len(shards))
        return self.shards[0]


class RangeShardRouter:
    def __init__(self, shards: list, boundaries: list[int]) -> None:
        # boundaries[i] = exclusive upper bound of shards[i]'s range
        self.shards = shards
        self.boundaries = boundaries

    def _shard_for(self, numeric_key: int):
        # TODO: find the first boundary numeric_key is less than, and
        # return the corresponding shard; if numeric_key exceeds every
        # boundary, return the last shard
        return self.shards[0]`,
      java: `public class HashedShardRouter {
    private final List<Shard> shards;

    public HashedShardRouter(List<Shard> shards) {
        this.shards = shards;
    }

    private Shard shardFor(String key) {
        // TODO: hash the key, then map the hash to an index in
        // [0, shards.size())
        return shards.get(0);
    }
}

public class RangeShardRouter {
    private final List<Shard> shards;
    private final List<Integer> boundaries; // boundaries.get(i) = exclusive upper bound of shards.get(i)

    public RangeShardRouter(List<Shard> shards, List<Integer> boundaries) {
        this.shards = shards;
        this.boundaries = boundaries;
    }

    private Shard shardFor(int numericKey) {
        // TODO: find the first boundary numericKey is less than, and
        // return the corresponding shard; if numericKey exceeds every
        // boundary, return the last shard
        return shards.get(0);
    }
}`,
    },
    hints: [
      "HashedShardRouter: hash the key with any decent hash function, take the hash's numeric value, and reduce it modulo the number of shards to get an index.",
      "HashedShardRouter: make sure the modulo result is non-negative (some languages' hash outputs or modulo operators can produce negative numbers if you're not careful with unsigned handling).",
      "RangeShardRouter: loop through boundaries in order, and return the shard at the same index as the first boundary that's greater than the key.",
      "RangeShardRouter: if you loop through every boundary without finding one greater than the key, that means the key belongs in the last (unbounded) shard — don't forget this fallback case.",
    ],
    solution: {
      typescript: `class HashedShardRouter {
  constructor(private readonly shards: Shard[]) {}

  private shardFor(key: string): Shard {
    const hash = createHash("sha256").update(key).digest();
    const bucket = hash.readUInt32BE(0) % this.shards.length;
    return this.shards[bucket];
  }
}

class RangeShardRouter {
  constructor(
    private readonly shards: Shard[],
    private readonly boundaries: number[]
  ) {}

  private shardFor(numericKey: number): Shard {
    for (let i = 0; i < this.boundaries.length; i++) {
      if (numericKey < this.boundaries[i]) return this.shards[i];
    }
    return this.shards[this.shards.length - 1];
  }
}`,
      python: `class HashedShardRouter:
    def _shard_for(self, key: str):
        digest = hashlib.sha256(key.encode()).digest()
        bucket = int.from_bytes(digest[:4], "big") % len(self.shards)
        return self.shards[bucket]


class RangeShardRouter:
    def _shard_for(self, numeric_key: int):
        for i, boundary in enumerate(self.boundaries):
            if numeric_key < boundary:
                return self.shards[i]
        return self.shards[-1]`,
      java: `public class HashedShardRouter {
    private Shard shardFor(String key) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(key.getBytes());
            int bucket = Math.floorMod(
                ((hash[0] & 0xFF) << 24) | ((hash[1] & 0xFF) << 16) | ((hash[2] & 0xFF) << 8) | (hash[3] & 0xFF),
                shards.size()
            );
            return shards.get(bucket);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}

public class RangeShardRouter {
    private Shard shardFor(int numericKey) {
        for (int i = 0; i < boundaries.size(); i++) {
            if (numericKey < boundaries.get(i)) return shards.get(i);
        }
        return shards.get(shards.size() - 1);
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "sharding-system-design",
    required: false,
    title: "Choosing a Shard Key for a Multi-Tenant SaaS Platform",
    scenario: `You're designing the data layer for a multi-tenant SaaS platform. Each customer ("tenant") has their own data — documents, users, records — isolated from other tenants. Tenant sizes vary enormously: your largest tenant has 50 million records and heavy daily traffic; most tenants have a few thousand records and light traffic.

The product team wants two things to both work efficiently: (1) "show me everything for tenant X" (the overwhelmingly common query pattern — almost everything is scoped to one tenant), and (2) avoiding a situation where your single largest tenant degrades service for everyone else.

Design a sharding strategy for this, addressing both requirements and the tenant-size skew specifically.`,
    hints: [
      "What's the natural shard key candidate given that nearly all queries are scoped to one tenant?",
      "What happens if you shard by tenant_id directly with simple hashed or range sharding, given the size skew described?",
      "Does every tenant need the same sharding treatment, or could large and small tenants be handled differently?",
      "How does this connect to the 'uniform activity across partition keys' guidance and the hot-partition problem from this lesson's real-world section?",
    ],
    discussionPoints: [
      "**tenant_id is the natural shard key for the dominant access pattern**: since nearly every query is already scoped to a single tenant, sharding by tenant_id means the overwhelming majority of queries route to exactly one shard — the targeted-operation benefit this lesson's how-it-works section describes for well-chosen shard keys, directly matching the stated product requirement.",
      "**Naive hashed sharding by tenant_id creates a hot shard from the largest tenant**: hashing distributes tenant_ids pseudo-randomly across shards, but it doesn't account for how much data or traffic each tenant actually has — the 50-million-record tenant lands entirely on one shard, and that shard inherits all of that tenant's traffic too. This is precisely the scenario this lesson's real-world section describes: a single partition hits its fixed throughput ceiling (per AWS's documented per-partition limits) regardless of how much total capacity the system has, and every other tenant sharing that shard suffers collateral slowdown.",
      "**Size-aware, not uniform, sharding treatment**: rather than treating every tenant identically, a workable design splits large tenants' data across multiple shards (effectively sub-sharding within a tenant, e.g. by a secondary key like document_id or a hash of it, scoped within that tenant) while letting many small tenants share a single shard together. This directly addresses the stated goal of not letting one oversized tenant degrade service for everyone else, by not forcing exactly one tenant onto exactly one shard as a rigid rule.",
      "**Still answering 'show me everything for tenant X' efficiently**: even with a large tenant split across multiple shards, the application layer knows which shards hold that tenant's data (from a tenant -> shard-set mapping maintained outside the hot query path) and can query just those shards in parallel, rather than broadcasting to the entire cluster — preserving the targeted-query benefit for the common case while still avoiding the hot-shard failure mode for the largest tenants.",
      "**Operational cost of this design**: this is more complex than naive hashed-by-tenant sharding — it requires tracking which tenants are 'large enough to split' and maintaining the tenant-to-shard-set mapping, and migrating a growing tenant from single-shard to multi-shard as it crosses a size threshold is itself a rebalancing operation (as covered in this lesson's complexity table) that must be done without disrupting that tenant's live traffic.",
    ],
  },
];
