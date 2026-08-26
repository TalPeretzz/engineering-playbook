import type { SystemDesignChallenge } from "@engineering-playbook/content-schema";

export const systemDesignChallenge: SystemDesignChallenge = {
  type: "system-design",
  id: "bloom-filter-system-design",
  required: false,
  title: "Crawler Deduplication at Scale",
  scenario: `You are building a web crawler that will process 10 billion URLs over its lifetime.
The crawler runs on a single machine with 8 GB of RAM.

The problem: before fetching a URL, you must check whether it has already been crawled.
Storing every URL in a hash set would require several terabytes of memory — clearly impractical.

Your task: design a memory-efficient deduplication system using what you know about Bloom Filters.

Consider:
- How large does the Bloom Filter need to be for 10 billion items?
- What false-positive rate is acceptable, and what is the cost of a false positive here?
- What happens when the filter fills up and the false-positive rate rises?
- How do you persist the filter state across crawler restarts?`,
  hints: [
    "At 1% false-positive rate, a Bloom Filter for 10B items needs ~11.9 GB — more than 8 GB of RAM. What if you accept a higher rate?",
    "At 10% false-positive rate, the same filter needs ~7.2 GB — more feasible. What does a false positive cost here?",
    "A false positive means skipping a URL that was never actually crawled. For most crawlers this is acceptable; for a legal archive it might not be.",
    "Consider a tiered approach: a compact in-memory Bloom Filter for recent URLs, backed by a disk store for confirmed-crawled URLs.",
    "The bit array is just bytes — serialize it to disk on shutdown and reload at startup. A 7 GB array can be memory-mapped quickly.",
  ],
  discussionPoints: [
    "**Sizing trade-off:** At 1% FP rate, 10B items needs ~11.96 GB — exceeds RAM. At 5%: ~8.6 GB, still tight. At 10%: ~7.2 GB, feasible. The right rate depends on coverage requirements: a news crawler can tolerate 10% missed URLs; a legal-archive crawler probably cannot.",
    "**Cost of a false positive:** Each false positive causes us to skip a URL that was never crawled. If coverage matters, combine the Bloom Filter with a confirmatory lookup (e.g., a RocksDB set on disk) for items that return 'maybe present'.",
    "**Rotation strategy:** As the filter approaches its design capacity the false-positive rate rises. Options: (1) spin up a second filter for new URLs while the first is retired; (2) use a Counting Bloom Filter which supports bounded deletions.",
    "**Persistence:** The internal bit array is a compact byte array — serialize to disk on shutdown, reload via mmap on startup. The entire state round-trips in seconds.",
    "**Distributed extension:** Multiple crawler nodes need a shared filter. Options: replicate to each node (eventual consistency) or centralize in Redis with its ReBloom module. Alternatively, partition URLs by hash so each node handles a non-overlapping range.",
  ],
};
