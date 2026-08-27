import type { SystemDesignChallenge } from "@engineering-playbook/content-schema";

export const systemDesignChallenge: SystemDesignChallenge = {
  type: "system-design",
  id: "bloom-filter-system-design",
  required: false,
  title: "Crawler Deduplication at Scale",
  scenario: `You are building a web crawler that will process 10 billion URLs over its lifetime.
The crawler runs on a single machine with 8 GB of RAM.

Before fetching a URL you must check whether it has already been crawled.
Storing every URL in a hash set would require several terabytes of memory — clearly impractical.

Design a memory-efficient deduplication system for this crawler. Think through:

1. How large a Bloom Filter do you need for 10 billion URLs at a 1% false-positive rate?
2. What does a false positive actually cost in this domain?
3. What happens as the filter fills up over time?
4. How do you survive a crawler restart?
5. How would you extend this to a fleet of crawlers?`,
  hints: [
    "Start with the sizing formula: m = -n·ln(p) / (ln 2)². Plug in n=10B and p=0.01 to find m.",
    "At 1% false-positive rate, 10B items needs ~11.9 GB — more than your 8 GB RAM. What lever can you pull? (Raise the acceptable FP rate, or split the problem.)",
    "A false positive means skipping a URL that was never actually crawled. For a news crawler this is usually fine. For a legal archive that must crawl every page, it is not.",
    "Consider a tiered approach: a compact in-memory Bloom Filter for recent URLs, backed by a disk-based confirmed-crawled store for older URLs. What are the tradeoffs?",
    "The bit array is just bytes — serialize it to disk on shutdown, reload it (possibly via mmap) at startup. A 7 GB array reloads in seconds with mmap.",
  ],
  discussionPoints: [
    "**Sizing trade-off:** At 1% FP rate, 10B items needs ~11.9 GB — exceeds RAM. Options: accept a higher rate (10% FP needs ~7.2 GB, feasible), shard URLs across multiple machines, or accept a smaller in-memory filter covering only recent URLs with a disk store for confirmed-crawled history.",
    "**Cost of a false positive:** Each false positive silently skips a URL that was never crawled. For most crawlers (news, search) this is acceptable. For a legal-archive or compliance crawler it may not be — in that case, add a confirmatory lookup in a persistent store (e.g., RocksDB) for items that return 'probably present'.",
    "**Filter saturation:** As the filter approaches its design capacity the false-positive rate rises. Monitor the ratio of inserted items to design capacity. Options: (1) rotate — spin up a fresh filter for new URLs while the old one handles lookups only; (2) use a Counting Bloom Filter which supports bounded deletions.",
    "**Persistence:** The bit array is a compact byte array. Serialize to disk on shutdown, reload via mmap on startup. No need to rebuild from scratch — the entire filter state round-trips in one file.",
    "**Distributed crawlers:** Multiple nodes need a consistent view of what has been crawled. Options: replicate the bit array to each node (eventual consistency, merge with OR); centralize in Redis using its ReBloom module; or partition URLs by hash domain so each node handles a non-overlapping range and never needs to share state.",
  ],
};
