import type { Topic } from "@engineering-playbook/content-schema";

export const bloomFilter: Topic = {
  slug: "bloom-filter",
  title: "Bloom Filter",
  description:
    "A space-efficient probabilistic data structure that tests whether an element is a member of a set — with a small chance of false positives but never false negatives.",
  category: "data-structures",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: ["hashing"],
  nextTopics: ["lru-cache", "consistent-hashing"],

  content: {
    problemStatement: `
Imagine you're building a web crawler that visits billions of URLs. You need to check whether a URL has already been crawled before fetching it. Storing every URL in a hash set would require hundreds of gigabytes of memory. You need something faster and leaner.

Or consider a database that handles millions of reads. Before hitting the disk for a row that might not exist, you want a cheap in-memory gate that eliminates most unnecessary I/O. You don't need 100% certainty — you just need to quickly rule out elements that are *definitely* not in the set.

This is exactly what a Bloom Filter solves: **membership testing with near-zero memory overhead**, at the cost of occasional false positives.
    `.trim(),

    howItWorks: `
A Bloom Filter is built from two components:

**1. A bit array of size m**
All bits start at 0.

**2. k independent hash functions**
Each function maps an input to a position in the bit array.

**Adding an element:**
Run the element through all k hash functions. Set each resulting bit position to 1.

**Querying an element:**
Run it through the same k hash functions. If *all* k bits are 1 → the element *might* be in the set. If *any* bit is 0 → the element is *definitely not* in the set.

**Why no false negatives?**
Adding an element only sets bits — it never clears them. So if an element was added, its bits remain set forever. A "definitely not in set" answer is always correct.

**Why false positives?**
Different elements can share bit positions. After many insertions, bits set by other elements may satisfy the query for an element that was never inserted. The probability of false positives increases as the filter fills up.

**False positive probability:**
Approximately (1 - e^(-kn/m))^k, where n is the number of inserted elements, m is the bit array size, and k is the number of hash functions. The optimal k for a given m and n is (m/n) * ln(2).
    `.trim(),

    visualExplanation: `
Bit array (m=10):  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

add("apple")
  h1("apple") → 2   → set bit 2
  h2("apple") → 5   → set bit 5
  h3("apple") → 8   → set bit 8
→ [0, 0, 1, 0, 0, 1, 0, 0, 1, 0]

add("grape")
  h1("grape") → 1   → set bit 1
  h2("grape") → 5   → set bit 5 (already set)
  h3("grape") → 7   → set bit 7
→ [0, 1, 1, 0, 0, 1, 0, 1, 1, 0]

has("apple")?
  h1 → 2 ✓, h2 → 5 ✓, h3 → 8 ✓  → MAYBE (correct)

has("mango")?
  h1 → 1 ✓, h2 → 5 ✓, h3 → 3 ✗  → DEFINITELY NOT (correct)

has("peach")?
  h1 → 1 ✓, h2 → 5 ✓, h3 → 8 ✓  → MAYBE (false positive!)
  "peach" was never added, but its hash positions are all set
    `.trim(),

    complexity: [
      { operation: "add(value)", time: "O(k)", space: "O(1)", note: "k = number of hash functions" },
      { operation: "has(value)", time: "O(k)", space: "O(1)" },
      { operation: "Space total", time: "-", space: "O(m)", note: "m bits, independent of n elements" },
    ],

    tradeoffs: {
      pros: [
        "Extremely memory efficient — fixed bit array regardless of how many elements are inserted",
        "O(k) time for both add and lookup, typically very fast",
        "No false negatives — 'definitely not in set' is always accurate",
        "Cache friendly — a bit array is a compact contiguous block of memory",
        "Naturally parallelizable — hash functions are independent",
      ],
      cons: [
        "False positives — may incorrectly report an element as present",
        "Cannot remove elements (standard Bloom Filter) — deletion requires Counting Bloom Filters",
        "Cannot enumerate members — no way to list what was inserted",
        "False positive rate increases as more elements are inserted",
        "Choosing optimal m and k requires knowing the expected number of elements",
      ],
    },

    whenToUse: [
      "You need fast membership tests on large sets where some false positives are acceptable",
      "The cost of a false positive is low (e.g., an unnecessary disk read or network call) versus the benefit of rejecting most negatives instantly",
      "Memory is constrained and you're working with billions of elements",
      "As a pre-filter in front of an expensive operation (database lookup, network request)",
      "Deduplication in streaming pipelines where you don't need perfect accuracy",
    ],

    whenNotToUse: [
      "False positives are unacceptable for correctness (e.g., authentication, financial records)",
      "You need to delete elements from the set",
      "You need to enumerate members or retrieve the stored values",
      "The dataset is small enough to fit in a hash set — just use a Set",
      "You need exact counts of elements (use Count-Min Sketch instead)",
    ],

    realWorldExamples: [
      "**Google Bigtable / HBase / Cassandra** — each uses Bloom Filters to avoid disk lookups for rows that don't exist",
      "**Google Chrome** — uses a Bloom Filter to check URLs against a local list of known malicious sites before a full server check",
      "**PostgreSQL** — uses Bloom Filter indexes to avoid heap fetches for missing rows",
      "**Medium / Quora** — filter out already-seen content recommendations without storing full user history in memory",
      "**Apache Kafka / Spark** — deduplication in streaming pipelines",
      "**Bitcoin** — SPV (Simplified Payment Verification) nodes use Bloom Filters to request only relevant transactions from full nodes",
    ],
  },

  implementations: {
    typescript: `class BloomFilter {
  private readonly bits: Uint8Array;
  private readonly m: number; // bit array size
  private readonly k: number; // number of hash functions

  constructor(expectedItems: number, falsePositiveRate = 0.01) {
    // Optimal bit array size: m = -n * ln(p) / (ln(2)^2)
    this.m = Math.ceil((-expectedItems * Math.log(falsePositiveRate)) / (Math.LN2 * Math.LN2));
    // Optimal number of hash functions: k = (m/n) * ln(2)
    this.k = Math.max(1, Math.round((this.m / expectedItems) * Math.LN2));
    this.bits = new Uint8Array(Math.ceil(this.m / 8));
  }

  add(value: string): void {
    for (let i = 0; i < this.k; i++) {
      const pos = this.hash(value, i) % this.m;
      this.bits[Math.floor(pos / 8)] |= 1 << pos % 8;
    }
  }

  has(value: string): boolean {
    for (let i = 0; i < this.k; i++) {
      const pos = this.hash(value, i) % this.m;
      if (!(this.bits[Math.floor(pos / 8)] & (1 << pos % 8))) {
        return false; // definitely not in set
      }
    }
    return true; // probably in set
  }

  // FNV-1a variant seeded by index for k independent hashes
  private hash(value: string, seed: number): number {
    let h = 2166136261 ^ seed;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }
}

// Usage
const filter = new BloomFilter(1000, 0.01); // 1000 items, 1% false positive rate
filter.add("apple");
filter.add("banana");

console.log(filter.has("apple"));  // true  (correct)
console.log(filter.has("mango"));  // false (correct — definitely not in set)
console.log(filter.has("peach"));  // false or true (if true, it's a false positive)`,

    python: `import math
from typing import List


class BloomFilter:
    def __init__(self, expected_items: int, false_positive_rate: float = 0.01):
        # Optimal bit array size: m = -n * ln(p) / (ln(2)^2)
        self.m = math.ceil(
            (-expected_items * math.log(false_positive_rate)) / (math.log(2) ** 2)
        )
        # Optimal number of hash functions: k = (m/n) * ln(2)
        self.k = max(1, round((self.m / expected_items) * math.log(2)))
        self.bits = bytearray(math.ceil(self.m / 8))

    def add(self, value: str) -> None:
        for i in range(self.k):
            pos = self._hash(value, i) % self.m
            self.bits[pos // 8] |= 1 << (pos % 8)

    def has(self, value: str) -> bool:
        for i in range(self.k):
            pos = self._hash(value, i) % self.m
            if not (self.bits[pos // 8] & (1 << (pos % 8))):
                return False  # definitely not in set
        return True  # probably in set

    def _hash(self, value: str, seed: int) -> int:
        """FNV-1a variant seeded by index for k independent hashes."""
        h = 2166136261 ^ seed
        for char in value.encode("utf-8"):
            h ^= char
            h = (h * 16777619) & 0xFFFFFFFF
        return h


# Usage
bloom = BloomFilter(expected_items=1000, false_positive_rate=0.01)
bloom.add("apple")
bloom.add("banana")

print(bloom.has("apple"))   # True  (correct)
print(bloom.has("mango"))   # False (correct — definitely not in set)
print(bloom.has("peach"))   # False or True (if True, it's a false positive)`,

    java: `import java.nio.charset.StandardCharsets;

public class BloomFilter {
    private final byte[] bits;
    private final int m; // bit array size
    private final int k; // number of hash functions

    public BloomFilter(int expectedItems, double falsePositiveRate) {
        // Optimal bit array size: m = -n * ln(p) / (ln(2)^2)
        this.m = (int) Math.ceil(
            (-expectedItems * Math.log(falsePositiveRate)) / (Math.log(2) * Math.log(2))
        );
        // Optimal number of hash functions: k = (m/n) * ln(2)
        this.k = Math.max(1, (int) Math.round((double) m / expectedItems * Math.log(2)));
        this.bits = new byte[(int) Math.ceil((double) m / 8)];
    }

    public void add(String value) {
        for (int i = 0; i < k; i++) {
            int pos = Math.abs(hash(value, i)) % m;
            bits[pos / 8] |= (byte) (1 << (pos % 8));
        }
    }

    public boolean has(String value) {
        for (int i = 0; i < k; i++) {
            int pos = Math.abs(hash(value, i)) % m;
            if ((bits[pos / 8] & (1 << (pos % 8))) == 0) {
                return false; // definitely not in set
            }
        }
        return true; // probably in set
    }

    // FNV-1a variant seeded by index for k independent hashes
    private int hash(String value, int seed) {
        int h = (int) 2166136261L ^ seed;
        for (byte b : value.getBytes(StandardCharsets.UTF_8)) {
            h ^= b;
            h *= 16777619;
        }
        return h;
    }

    public static void main(String[] args) {
        BloomFilter filter = new BloomFilter(1000, 0.01);
        filter.add("apple");
        filter.add("banana");

        System.out.println(filter.has("apple"));  // true  (correct)
        System.out.println(filter.has("mango"));  // false (correct — definitely not in set)
        System.out.println(filter.has("peach"));  // false or true (if true, it's a false positive)
    }
}`,
  },

  challenges: [
    {
      type: "multiple-choice",
      id: "bloom-filter-conceptual",
      question: "Which statement about Bloom Filters is true?",
      options: [
        { id: "a", text: "They can produce false negatives (reporting an element as absent when it was added)" },
        { id: "b", text: "They can produce false positives (reporting an element as present when it was never added)" },
        { id: "c", text: "They store the original values that were inserted" },
        { id: "d", text: "Removing an element is as simple as resetting its bits" },
      ],
      correctOptionId: "b",
      explanation:
        "Bloom Filters can produce false positives — bits set by other elements may satisfy the query for an element never inserted. They never produce false negatives: once bits are set, they stay set, so a 'definitely not in set' answer is always correct. They don't store values (only bit positions), and removing elements is unsafe because bits are shared between elements.",
    },
    {
      type: "implementation",
      id: "bloom-filter-implementation",
      title: "Implement a Basic Bloom Filter",
      description: `Implement a BloomFilter class with two methods:

- **add(value)** — inserts a value into the filter
- **has(value)** — returns true if the value *might* be in the filter, false if it's *definitely not*

Requirements:
- Use a fixed-size bit array (you can use a simple boolean array or Uint8Array)
- Use at least 2 hash functions
- The implementation should correctly return false for elements that were never added (aside from the rare false positive)

You don't need to calculate optimal m and k — a fixed size is fine for this exercise.`,
      starterCode: {
        typescript: `class BloomFilter {
  private bits: boolean[];
  private size: number;

  constructor(size: number) {
    this.size = size;
    this.bits = new Array(size).fill(false);
  }

  add(value: string): void {
    // TODO: compute hash positions and set the corresponding bits
  }

  has(value: string): boolean {
    // TODO: check if all hash positions are set
    return false;
  }

  private hash1(value: string): number {
    // TODO: implement a hash function
    return 0;
  }

  private hash2(value: string): number {
    // TODO: implement a different hash function
    return 0;
  }
}`,
        python: `class BloomFilter:
    def __init__(self, size: int):
        self.size = size
        self.bits = [False] * size

    def add(self, value: str) -> None:
        # TODO: compute hash positions and set the corresponding bits
        pass

    def has(self, value: str) -> bool:
        # TODO: check if all hash positions are set
        return False

    def _hash1(self, value: str) -> int:
        # TODO: implement a hash function
        return 0

    def _hash2(self, value: str) -> int:
        # TODO: implement a different hash function
        return 0`,
        java: `public class BloomFilter {
    private boolean[] bits;
    private int size;

    public BloomFilter(int size) {
        this.size = size;
        this.bits = new boolean[size];
    }

    public void add(String value) {
        // TODO: compute hash positions and set the corresponding bits
    }

    public boolean has(String value) {
        // TODO: check if all hash positions are set
        return false;
    }

    private int hash1(String value) {
        // TODO: implement a hash function
        return 0;
    }

    private int hash2(String value) {
        // TODO: implement a different hash function
        return 0;
    }
}`,
      },
      hints: [
        "Use two different starting constants in your hash function to produce two independent positions",
        "For hash1 try FNV-1a (h = 2166136261, then for each char: h ^= charCode, h *= 16777619)",
        "For hash2 use a different seed or multiplier (e.g., h = 0x811c9dc5 ^ 0x1234)",
        "Take Math.abs(result) % size to keep positions in bounds",
      ],
      testCases: [
        {
          id: "bf-tc-1",
          description: "has() returns false for items never added",
          code: `const filter = new BloomFilter(100);
return filter.has("apple");`,
          expected: false,
        },
        {
          id: "bf-tc-2",
          description: "has() returns true immediately after add()",
          code: `const filter = new BloomFilter(100);
filter.add("apple");
return filter.has("apple");`,
          expected: true,
        },
        {
          id: "bf-tc-3",
          description: "Multiple items can be added independently",
          code: `const filter = new BloomFilter(200);
filter.add("apple");
filter.add("banana");
filter.add("cherry");
return filter.has("banana");`,
          expected: true,
        },
        {
          id: "bf-tc-4",
          description: "Absent item still returns false after other inserts",
          code: `const filter = new BloomFilter(200);
filter.add("apple");
filter.add("banana");
return filter.has("mango");`,
          expected: false,
        },
      ],
      solution: {
        typescript: `class BloomFilter {
  private bits: boolean[];
  private size: number;

  constructor(size: number) {
    this.size = size;
    this.bits = new Array(size).fill(false);
  }

  add(value: string): void {
    this.bits[this.hash1(value) % this.size] = true;
    this.bits[this.hash2(value) % this.size] = true;
  }

  has(value: string): boolean {
    return (
      this.bits[this.hash1(value) % this.size] &&
      this.bits[this.hash2(value) % this.size]
    );
  }

  private hash1(value: string): number {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  private hash2(value: string): number {
    let h = 0x811c9dc5 ^ 0x1234;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return Math.abs(h);
  }
}`,
        python: `class BloomFilter:
    def __init__(self, size: int):
        self.size = size
        self.bits = [False] * size

    def add(self, value: str) -> None:
        self.bits[self._hash1(value) % self.size] = True
        self.bits[self._hash2(value) % self.size] = True

    def has(self, value: str) -> bool:
        return (
            self.bits[self._hash1(value) % self.size] and
            self.bits[self._hash2(value) % self.size]
        )

    def _hash1(self, value: str) -> int:
        h = 2166136261
        for char in value.encode("utf-8"):
            h ^= char
            h = (h * 16777619) & 0xFFFFFFFF
        return h

    def _hash2(self, value: str) -> int:
        h = 0x811c9dc5 ^ 0x1234
        for char in value.encode("utf-8"):
            h ^= char
            h = (h * 0x01000193) & 0xFFFFFFFF
        return h`,
        java: `public class BloomFilter {
    private boolean[] bits;
    private int size;

    public BloomFilter(int size) {
        this.size = size;
        this.bits = new boolean[size];
    }

    public void add(String value) {
        bits[Math.abs(hash1(value)) % size] = true;
        bits[Math.abs(hash2(value)) % size] = true;
    }

    public boolean has(String value) {
        return bits[Math.abs(hash1(value)) % size] &&
               bits[Math.abs(hash2(value)) % size];
    }

    private int hash1(String value) {
        int h = (int) 2166136261L;
        for (byte b : value.getBytes()) {
            h ^= b;
            h *= 16777619;
        }
        return h;
    }

    private int hash2(String value) {
        int h = 0x811c9dc5 ^ 0x1234;
        for (byte b : value.getBytes()) {
            h ^= b;
            h *= 0x01000193;
        }
        return h;
    }
}`,
      },
    },
    {
      type: "system-design",
      id: "bloom-filter-system-design",
      title: "Crawler Deduplication at Scale",
      scenario: `You are building a web crawler that processes 10 billion URLs over its lifetime.
The crawler runs on a single machine with 8 GB of RAM.

**The problem:** Before fetching a URL, you must check whether it has already been crawled. Storing every URL in a hash set would require several terabytes of memory — clearly impractical.

**Your task:** Design a memory-efficient deduplication system for the crawler using what you know about Bloom Filters.

Consider:
- How large does the Bloom Filter need to be?
- What false positive rate is acceptable?
- What happens when a false positive occurs?
- What happens when the filter is full?
- How do you persist state across restarts?`,
      hints: [
        "A Bloom Filter for 10 billion items at 1% FP rate needs roughly 12 GB — too large for 8 GB RAM. What if you accept a higher FP rate?",
        "At 10% false positive rate, you need about 6 GB for 10 billion items — more feasible. What's the cost of a 10% FP rate in your crawler?",
        "The cost of a false positive is skipping a URL that was never actually crawled — you just miss it. Depending on your coverage requirements, this may be acceptable.",
        "Consider a tiered approach: a small in-memory Bloom Filter for recent URLs + a disk-backed store for confirmed crawled URLs.",
        "How would you handle restarts? The bit array can be serialized to disk and loaded back at startup.",
      ],
      discussionPoints: [
        "**Sizing trade-off:** At 1% FP rate, 10B items needs ~11.96 GB — exceeds RAM. At 5% FP rate: ~8.6 GB, still tight. At 10% FP rate: ~7.2 GB, feasible. The acceptable FP rate depends on coverage requirements — a news crawler might tolerate 10% missed URLs, a legal archive crawler might not.",
        "**Cost of false positives:** Each false positive means we skip a URL that was never crawled. If coverage completeness matters, pair the Bloom Filter with a confirmatory database check for 'might be present' results.",
        "**Rotation strategy:** When the filter approaches its design capacity, the false positive rate rises. Consider: (1) using a second Bloom Filter for new URLs while the first is retired, or (2) using a counting Bloom Filter that allows measured eviction.",
        "**Persistence:** The bit array is a compact byte array — serialize it to disk on shutdown, reload on startup. A 6 GB bit array takes seconds to mmap.",
        "**Distributed extension:** If you scale to multiple crawler nodes, you need a shared Bloom Filter — either replicated (eventual consistency) or centralized via Redis (which has a ReBloom module). Alternatively, each node gets a hash partition of the URL space.",
        "**Alternative to consider:** HyperLogLog tracks cardinality but not membership. Count-Min Sketch handles frequency. For this use case, Bloom Filter is the right tool — but it's worth knowing the landscape.",
      ],
    },
  ],
};
