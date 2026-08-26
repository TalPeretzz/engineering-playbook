import type { Section } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Imagine building a web crawler that visits billions of URLs. Before fetching each URL you need to know: have we already crawled this? Storing every URL in a hash set would require hundreds of gigabytes of RAM. You need something much leaner.",
      },
      {
        type: "p",
        text: "Or consider a database serving millions of reads. Before hitting disk for a row that might not exist, you want a cheap in-memory gate that eliminates most pointless I/O. You do not need 100% certainty — you just need to quickly rule out items that are **definitely not** in the set.",
      },
      {
        type: "p",
        text: "This is the Bloom Filter's role: **membership testing with near-zero memory overhead**, at the cost of a small, tunable chance of false positives.",
      },
    ],
  },

  {
    type: "text",
    id: "how-it-works",
    heading: "How does it work?",
    body: [
      {
        type: "heading",
        level: 3,
        text: "The two components",
      },
      {
        type: "list",
        items: [
          "**A bit array of size m** — all bits start at 0. This is the entire storage.",
          "**k independent hash functions** — each one maps any input string to a position in the bit array.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Inserting a value",
      },
      {
        type: "p",
        text: "Run the value through all k hash functions. Set each resulting bit position to 1. The value itself is not stored — only the bit positions it touches.",
      },
      {
        type: "heading",
        level: 3,
        text: "Querying a value",
      },
      {
        type: "p",
        text: "Run the query through the same k hash functions. Check each resulting bit position.",
      },
      {
        type: "list",
        items: [
          "If **any bit is 0** → the value is **definitely not** in the set. No element that was inserted could have left that bit at 0.",
          "If **all bits are 1** → the value is **probably** in the set. But those bits could have been set by other elements (see false positives below).",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Why are there no false negatives?",
      },
      {
        type: "p",
        text: "Insertion only ever sets bits — it never clears them. So if a value was inserted, its k bit positions remain 1 forever. Querying those same positions will always find all bits set, and the filter will always answer 'probably present'. A 'definitely not in set' answer is always correct.",
      },
    ],
  },

  {
    type: "text",
    id: "false-positives",
    heading: "Understanding false positives",
    body: [
      {
        type: "p",
        text: "A **false positive** occurs when has() returns true for a value that was never inserted. Here is how it happens:",
      },
      {
        type: "list",
        items: [
          "Every inserted value sets several bit positions.",
          "Over time, many bits get set by many different values.",
          "When you query a new value, its hash functions may point to positions that were already set by previously inserted values.",
          "The filter sees all bits set and returns 'probably present' — even though this specific value was never added.",
        ],
      },
      {
        type: "p",
        text: "Think of it as a collision at the bit level, not the key level.",
      },
      {
        type: "heading",
        level: 3,
        text: "The key rule to remember",
      },
      {
        type: "list",
        items: [
          "**\"No\"** = definitely not present. This answer is always correct.",
          "**\"Yes\"** = maybe present. This answer has a small, tunable probability of being wrong.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Controlling the false-positive rate",
      },
      {
        type: "p",
        text: "The false-positive probability is approximately **(1 − e^(−kn/m))^k**, where n is the number of inserted items, m is the bit array size, and k is the number of hash functions. In plain terms: the more items you insert relative to the size of the bit array, the more bits get set, and the higher the chance of a false positive. You can tune m and k at construction time to hit a target rate (e.g. 1%).",
      },
    ],
  },

  {
    type: "visual",
    id: "visual",
    heading: "Step-by-step visual",
    content: `Bit array (m=12, all zeros):
Index:  0  1  2  3  4  5  6  7  8  9 10 11
Bits:   0  0  0  0  0  0  0  0  0  0  0  0

── add("apple") ──────────────────────────
  h1("apple") → 2   set bit 2
  h2("apple") → 5   set bit 5
  h3("apple") → 9   set bit 9
Bits:   0  0  1  0  0  1  0  0  0  1  0  0

── add("grape") ──────────────────────────
  h1("grape") → 1   set bit 1
  h2("grape") → 5   already set
  h3("grape") → 8   set bit 8
Bits:   0  1  1  0  0  1  0  0  1  1  0  0

── has("apple")? ─────────────────────────
  h1 → bit 2 ✓  h2 → bit 5 ✓  h3 → bit 9 ✓
  → PROBABLY IN SET  (correct — was inserted)

── has("mango")? ─────────────────────────
  h1 → bit 3 ✗
  → DEFINITELY NOT IN SET  (correct)

── has("peach")? ─────────────────────────
  h1 → bit 1 ✓  h2 → bit 5 ✓  h3 → bit 8 ✓
  → PROBABLY IN SET  ← FALSE POSITIVE
  "peach" was never inserted, but all three of
  its hash positions were already set by other items.`,
  },

  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "add(value)",
        time: "O(k)",
        space: "O(1)",
        note: "k hash computations, k bit writes",
      },
      {
        operation: "has(value)",
        time: "O(k)",
        space: "O(1)",
        note: "k hash computations, k bit reads",
      },
      {
        operation: "Space (total)",
        time: "—",
        space: "O(m)",
        note: "m bits, fixed regardless of how many items are inserted",
      },
    ],
  },

  {
    type: "comparison",
    id: "set-vs-bloom-filter",
    heading: "Set vs Bloom Filter",
    columns: ["Feature", "Set", "Bloom Filter"],
    rows: [
      { Feature: "Stores original values", Set: "Yes", "Bloom Filter": "No — only bit positions" },
      { Feature: "False positives", Set: "Never", "Bloom Filter": "Possible (tunable rate)" },
      { Feature: "False negatives", Set: "Never", "Bloom Filter": "Never" },
      { Feature: "Memory usage", Set: "Grows with each item", "Bloom Filter": "Fixed bit array" },
      { Feature: "Can enumerate members", Set: "Yes", "Bloom Filter": "No" },
      { Feature: "Can delete members", Set: "Yes", "Bloom Filter": "No (standard filter)" },
    ],
  },

  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Extremely memory efficient — fixed bit array regardless of the number of inserted elements",
      "O(k) time for both add and lookup — typically just a handful of hash computations",
      "No false negatives — a 'definitely not in set' answer is always correct",
      "Cache friendly — the bit array is a compact contiguous block of memory",
      "False-positive rate is tunable at construction time by choosing m and k",
    ],
    cons: [
      "False positives — the filter may incorrectly report an element as present",
      "Cannot delete elements in a standard Bloom Filter (Counting Bloom Filters support deletion at higher memory cost)",
      "Cannot enumerate members — there is no way to list what was inserted",
      "False-positive rate rises as more elements are inserted beyond the design capacity",
    ],
  },

  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Fast membership tests on very large sets where a small false-positive rate is acceptable",
      "As a pre-filter in front of an expensive operation (disk read, network call, database query) — reject definite misses instantly",
      "Memory is constrained and the dataset contains millions or billions of elements",
      "Deduplication in streaming pipelines where perfect accuracy is not required",
      "CDN or cache existence checks before falling back to origin",
    ],
    whenNotToUse: [
      "False positives are unacceptable for correctness (e.g. authentication, financial records, security gates)",
      "You need to delete elements — use a Counting Bloom Filter or a different structure",
      "You need to enumerate or retrieve the stored values",
      "The dataset is small enough that a plain Set fits comfortably in memory",
      "You need exact occurrence counts — use a Count-Min Sketch instead",
    ],
  },

  {
    type: "text",
    id: "real-world",
    heading: "Real-world usage",
    body: [
      {
        type: "p",
        text: "The following examples are well-documented and specific about the role Bloom Filters play:",
      },
      {
        type: "list",
        items: [
          "**Apache Cassandra, HBase, RocksDB** — each maintains a per-SSTable Bloom Filter to avoid reading disk blocks for keys that are not in that table, dramatically reducing unnecessary I/O",
          "**PostgreSQL** — supports Bloom Filter indexes (since v9.6) to filter heap fetches for multi-column queries on low-cardinality data",
          "**Google Chrome Safe Browsing** — the browser downloads a compact Bloom Filter of known-malicious URL hashes and checks it locally before performing a full server lookup",
          "**Bitcoin SPV wallets** — Simplified Payment Verification clients send Bloom Filters to full nodes to request only the transactions relevant to their wallet addresses, minimizing data transfer",
        ],
      },
    ],
  },
];
