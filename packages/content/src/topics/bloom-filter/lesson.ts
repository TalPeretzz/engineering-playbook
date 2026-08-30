import type { Section } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  // ─── UNDERSTAND ────────────────────────────────────────────────────────────

  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    phase: "understand",
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
        text: "This is the Bloom Filter's role: **highly memory-efficient membership testing** — it uses far less memory than storing the original values — at the cost of a small, tunable chance of false positives.",
      },
    ],
  },

  {
    type: "text",
    id: "intuition",
    heading: "The core intuition",
    phase: "understand",
    body: [
      {
        type: "p",
        text: "Think of a Bloom Filter as an extremely compact fingerprint of a set. Instead of storing the items themselves, it stores only which bits each item touches — a handful of positions set by hash functions. The trade-off: this fingerprint is lossy. Different items can produce overlapping positions, causing false positives.",
      },
      {
        type: "p",
        text: "The essential logic is just two operations:",
      },
      {
        type: "list",
        items: [
          "**add(value):** run the value through k hash functions → set those k bit positions to 1",
          "**has(value):** run the query through the same k hash functions → if any bit is 0, the value is **definitely absent**; if all bits are 1, it is **probably present**",
        ],
      },
      {
        type: "p",
        text: "Because bits are only ever set and never cleared, a 'definitely absent' answer is always correct. The filter can lie in one direction only: it may say 'probably present' for something that was never inserted. It will never say 'probably present' for something and be wrong in the other direction — **there are no false negatives**.",
      },
    ],
  },

  {
    type: "visual",
    id: "visual",
    heading: "Step-by-step visual",
    phase: "understand",
    steps: [
      {
        label: "Initial state  (m=12 bits, k=3 hash functions)",
        description:
          "A Bloom Filter starts as a compact bit array of all zeros. We use m=12 bits and k=3 independent hash functions. No values have been inserted yet.",
        bitArray: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
      {
        label: 'add("apple")',
        description:
          'Run "apple" through all 3 hash functions. Set each resulting bit position to 1. The string itself is never stored — only the bit positions it touches.',
        bitArray: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        activeIndices: [2, 5, 9],
        hashOutputs: [
          { fn: 'h1("apple")', output: 2 },
          { fn: 'h2("apple")', output: 5 },
          { fn: 'h3("apple")', output: 9 },
        ],
      },
      {
        label: 'add("grape")',
        description:
          'Run "grape" through the same 3 hash functions. Position 5 was already set by "apple" — that is fine, bits are never cleared.',
        bitArray: [0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0],
        activeIndices: [1, 5, 8],
        hashOutputs: [
          { fn: 'h1("grape")', output: 1 },
          { fn: 'h2("grape")', output: 5 },
          { fn: 'h3("grape")', output: 8 },
        ],
      },
      {
        label: 'has("apple")?',
        description:
          'Check all 3 hash positions for "apple". Every bit is 1. The filter answers: probably in set. Correct — "apple" was inserted.',
        bitArray: [0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0],
        activeIndices: [2, 5, 9],
        hashOutputs: [
          { fn: 'h1("apple")', output: 2 },
          { fn: 'h2("apple")', output: 5 },
          { fn: 'h3("apple")', output: 9 },
        ],
        result: {
          type: "in-set",
          text: "PROBABLY IN SET — all 3 bits are 1  ✓  (correct)",
        },
      },
      {
        label: 'has("banana")? — definite absence',
        description:
          'Check hash position 4 for "banana". Bit 4 is still 0. We stop immediately — no element ever inserted could have left that bit at 0. This "definitely not in set" answer is always correct.',
        bitArray: [0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0],
        activeIndices: [4],
        hashOutputs: [{ fn: 'h1("banana")', output: 4 }],
        result: {
          type: "not-in-set",
          text: "DEFINITELY NOT IN SET — bit 4 is 0  ✓  (always correct)",
        },
      },
      {
        label: 'has("peach")? — false positive',
        description:
          '"peach" was never inserted. Its hash functions point to positions 1, 2, and 9. Position 1 was set by "grape", positions 2 and 9 were set by "apple". All three bits happen to be 1 — set by different values — so the filter incorrectly answers: probably in set. This is the key false-positive intuition: no single hash collision is required; bits set by different values can conspire.',
        bitArray: [0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0],
        activeIndices: [1, 2, 9],
        hashOutputs: [
          { fn: 'h1("peach")', output: 1 },
          { fn: 'h2("peach")', output: 2 },
          { fn: 'h3("peach")', output: 9 },
        ],
        result: {
          type: "false-positive",
          text: 'PROBABLY IN SET — false positive! "peach" was never inserted',
        },
      },
    ],
  },

  {
    type: "text",
    id: "how-it-works",
    heading: "How does it work?",
    phase: "understand",
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
          "If **all bits are 1** → the value is **probably** in the set. But those bits could have been set by other elements.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Why are there no false negatives?",
      },
      {
        type: "p",
        text: "Insertion only ever sets bits — it never clears them. So if a value was inserted, its k bit positions remain 1 forever. A 'definitely not in set' answer is always correct.",
      },
    ],
  },

  // ─── DEEP DIVE ─────────────────────────────────────────────────────────────

  {
    type: "text",
    id: "false-positives",
    collapsible: true,
    heading: "Understanding false positives",
    phase: "deep-dive",
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
          "When you query a new value, its hash functions may point to positions already set by previously inserted values.",
          "The filter sees all bits set and returns 'probably present' — even though this specific value was never added.",
        ],
      },
      {
        type: "p",
        text: "Think of it as a collision at the bit level, not the key level. The queried value's bits can have been set by a **combination of different inserted values** — no single collision is needed.",
      },
      {
        type: "heading",
        level: 3,
        text: "The two possible answers",
      },
      {
        type: "list",
        items: [
          "**'Definitely not present'** — always correct. At least one bit is 0, which is impossible if the value was ever inserted.",
          "**'Probably present'** — may be wrong. All bits are 1, but they may have been set by other items.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Controlling the false-positive rate",
      },
      {
        type: "p",
        text: "The false-positive probability is approximately **(1 − e^(−kn/m))^k**, where n is the number of inserted items, m is the bit array size, and k is the number of hash functions. The more items you insert relative to the bit array size, the more bits get set, and the higher the chance of a false positive. You can tune m and k at construction time to hit a target rate (e.g. 1%).",
      },
    ],
  },

  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    phase: "deep-dive",
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
    collapsible: true,
    heading: "Set vs Bloom Filter",
    phase: "deep-dive",
    columns: ["Feature", "Set", "Bloom Filter"],
    rows: [
      {
        Feature: "Membership answer",
        Set: "Exact yes / no",
        "Bloom Filter": "Definitely absent or probably present",
      },
      {
        Feature: "Stores original values",
        Set: "Yes",
        "Bloom Filter": "No — only bit positions",
      },
      {
        Feature: "Memory usage",
        Set: "Grows with each item",
        "Bloom Filter": "Fixed bit array (set at construction)",
      },
      {
        Feature: "False positives",
        Set: "Never",
        "Bloom Filter": "Possible (tunable rate)",
      },
      {
        Feature: "False negatives",
        Set: "Never",
        "Bloom Filter": "Never",
      },
      {
        Feature: "Enumerate members",
        Set: "Yes",
        "Bloom Filter": "No",
      },
      {
        Feature: "Delete members",
        Set: "Yes",
        "Bloom Filter": "No (standard filter)",
      },
      {
        Feature: "Ideal use case",
        Set: "Small/medium sets, exact membership needed",
        "Bloom Filter": "Millions+ items, tolerable false-positive rate",
      },
    ],
  },

  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    phase: "deep-dive",
    pros: [
      "Extremely memory efficient — fixed bit array regardless of how many items are inserted",
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
    phase: "deep-dive",
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
    collapsible: true,
    heading: "Real-world usage",
    phase: "deep-dive",
    body: [
      {
        type: "list",
        items: [
          "**Apache Cassandra, HBase, RocksDB** — each maintains a per-SSTable Bloom Filter to avoid reading disk blocks for keys that are not in that table, dramatically reducing unnecessary I/O. This is one of the most impactful uses: a single bit-level check eliminates a full disk seek.",
          "**PostgreSQL** — supports Bloom Filter indexes (since v9.6) to filter heap fetches for multi-column queries on low-cardinality data.",
          "**Google Chrome Safe Browsing** — the browser downloads a compact Bloom Filter of known-malicious URL hashes and checks it locally before performing a full server lookup, keeping most checks private and fast.",
        ],
      },
    ],
  },

  {
    type: "text",
    id: "production-considerations",
    heading: "Production considerations",
    collapsible: true,
    phase: "deep-dive",
    body: [
      {
        type: "p",
        text: "Before deploying a Bloom Filter, decide on these parameters at construction time — they cannot be changed without rebuilding the filter.",
      },
      {
        type: "list",
        items: [
          "**Expected item count (n)** — how many items you plan to insert over the filter's lifetime. Under-estimating raises the false-positive rate.",
          "**Desired false-positive rate (p)** — common targets are 1% or 0.1%. Lower rates require more bits.",
          "**Bit-array size (m)** — derived from n and p: m = -n·ln(p) / (ln 2)². A 1% rate for 1M items needs ~9.6M bits (~1.2 MB).",
          "**Number of hash functions (k)** — optimal k = (m/n)·ln 2. More functions reduce false positives up to the optimal point, then hurt performance.",
          "**Hash quality** — use fast, uniform hash functions (MurmurHash3, xxHash). Poor hash functions cause uneven bit distribution and raise effective false-positive rates.",
          "**Serialization** — the bit array is just bytes. Serialize to disk on shutdown and reload (e.g. via mmap) to persist filter state across restarts.",
          "**Concurrency** — a standard bit array is not thread-safe. Use atomic bit operations or partition the filter across shards for concurrent workloads.",
        ],
      },
    ],
  },

  // ─── APPLY ─────────────────────────────────────────────────────────────────

  {
    type: "text",
    id: "recap",
    heading: "What should you remember?",
    phase: "apply",
    body: [
      {
        type: "list",
        items: [
          "A Bloom Filter answers **'definitely not present'** (always correct) or **'probably present'** (may be wrong). It never gives a definitive yes.",
          "There are **no false negatives** — bits are only ever set, never cleared.",
          "Memory is **fixed at construction time** regardless of how many items are inserted.",
          "Both add and lookup are **O(k)** — just k hash computations and k bit reads/writes.",
          "The false-positive rate is **tunable** by choosing bit-array size m and hash-function count k at construction time.",
          "Standard Bloom Filters **cannot delete elements** or enumerate members.",
          "Use them as a **pre-filter** in front of expensive operations — reject definite misses cheaply, fall through to the real store for maybes.",
        ],
      },
    ],
  },

  {
    type: "text",
    id: "simple-implementation",
    heading: "The bare-bones implementation",
    phase: "apply",
    body: [
      {
        type: "p",
        text: "Before the full implementation, here is the entire idea in under 20 lines — no sizing math, no production complexity. Just: hash → set bits → check bits.",
      },
      {
        type: "code",
        language: "typescript",
        code: `const bits = new Uint8Array(1000); // fixed-size bit array, all zeros

function add(value: string): void {
  bits[hash1(value) % bits.length] = 1;
  bits[hash2(value) % bits.length] = 1;
  bits[hash3(value) % bits.length] = 1;
}

function has(value: string): boolean {
  return (
    bits[hash1(value) % bits.length] === 1 &&
    bits[hash2(value) % bits.length] === 1 &&
    bits[hash3(value) % bits.length] === 1
  );
  // If any bit is 0 → definitely absent (return false)
  // If all bits are 1 → probably present (return true)
}`,
      },
      {
        type: "p",
        text: "That is the complete data structure. The full implementation below adds proper sizing formulas, optimal k calculation, and production-quality hash functions.",
      },
    ],
  },
];
