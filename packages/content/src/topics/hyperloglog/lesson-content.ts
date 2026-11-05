import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Counting the number of *distinct* items in a massive stream — unique visitors to a page today, unique search queries, unique IP addresses hitting an endpoint — normally requires remembering every item you've already seen, so you don't count it twice. A hash set does this exactly, but its memory grows linearly with the number of distinct items: tracking 100 million unique visitor IDs can mean gigabytes of memory, just to answer a single number.",
      },
      {
        type: "p",
        text: "**HyperLogLog** answers 'approximately how many distinct items have I seen' using a small, fixed amount of memory — a few kilobytes — regardless of whether the true count is a thousand or a trillion. It trades exactness for a typical error around 1-2%, which is an excellent trade for analytics and monitoring use cases that don't need an exact number.",
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
          "**Hash every incoming item** with a good hash function, producing a uniformly-distributed random-looking bit string. From here on, the algorithm only looks at hash output, never the original item — this is why it never needs to store the items themselves.",
          "**Split each hash into two parts**: the first b bits select one of m = 2^b 'registers' (buckets); the remaining bits are examined for their number of leading zeros.",
          "**Key insight**: in a random bit string, seeing k leading zeros before the first 1 happens with probability 1/2^(k+1) — so observing a long run of leading zeros is a (weak, noisy) signal that you've hashed a lot of distinct items. Each register keeps only the *maximum* leading-zero count it has ever seen.",
          "**Combine all registers with a harmonic mean** (not a plain average) to produce the final cardinality estimate — the harmonic mean specifically minimizes the variance of the combined estimate, which is why the algorithm uses it instead of simpler aggregations.",
          "**Why this is so compact**: only one small number (the max leading-zero count, which fits in ~5-6 bits) is stored per register — not the items themselves. With m = 16,384 registers at under a byte each, the whole structure fits in a few kilobytes no matter how many billions of items pass through it.",
          "**Merging is trivial**: to get the combined cardinality of two independently-tracked streams (e.g., two days of traffic, or two servers), take the elementwise maximum of their registers — the union's HyperLogLog is itself a valid HyperLogLog, with no need to replay either stream.",
        ],
      },
      {
        type: "p",
        text: "The standard error of the estimate is approximately 1.04/√m — more registers means a smaller, more precise estimate, at the cost of slightly more memory. This is the core space-vs-accuracy dial the algorithm exposes.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Item "user_42" -> hash -> 101101 00000011...
                              \\____/ \\______/
                           6 bits    remaining bits,
                           select    count leading
                           register  zeros before
                           #45       the first 1
                                     (here: 6 zeros)

Registers (showing max leading-zero count seen so far):
  reg:    0    1    2   ...  45   ...  m-1
  value:  3    5    2         6         4

estimate = alpha_m * m^2 / sum(2^(-reg[i]) for all i)   (harmonic-mean-based)

Merging two HLLs A and B (union cardinality), register-by-register:
  A:  3  5  2  6  4         max(A, B):  3  5  2  6  5
  B:  1  2  1  4  5     ->  no replay of either stream needed`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Add an item (hash + update one register)",
        time: "O(1)",
        note: "One hash computation and one register comparison",
      },
      {
        operation: "Estimate cardinality (PFCOUNT-equivalent)",
        time: "O(m)",
        note: "m = number of registers (fixed), not the number of items added — effectively O(1) in practice",
      },
      {
        operation: "Merge two HyperLogLogs",
        time: "O(m)",
        note: "Elementwise max of two register arrays of fixed size m",
      },
      {
        operation: "Memory",
        time: "O(m), fixed",
        note: "Independent of the number of items counted — Redis's implementation uses up to 12 KB regardless of whether 100 or 10^18 items were added",
      },
      {
        operation: "Standard error",
        time: "≈ 1.04 / √m",
        note: "More registers (more memory) shrinks the error; this is the core space-vs-accuracy tradeoff",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Fixed, tiny memory footprint (kilobytes) regardless of true cardinality — counting a billion distinct items costs the same memory as counting a thousand",
      "O(1) add, and mergeable without replaying source streams — union cardinality across shards, servers, or time windows is cheap",
      "Well-understood, predictable error bound (≈1.04/√m) that can be tuned by choosing the register count",
      "No need to store or even retain the original items — useful when storing raw identifiers (e.g., IP addresses) would be a privacy or storage liability",
    ],
    cons: [
      "The count is an approximation, not exact — unsuitable for anything requiring a precise number (billing, financial counts, legal compliance)",
      "Cannot list or recover the actual distinct items — it answers 'how many,' never 'which ones'",
      "Cannot remove an item once added — there's no way to 'un-add' something from the registers",
      "Accuracy is probabilistic, not guaranteed for any single run — a small fraction of estimates will be further from the truth than the average error suggests",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Unique visitor / unique user counts for dashboards and analytics, where an approximate number refreshed frequently beats an exact number computed slowly",
      "Counting unique search queries, unique error signatures, or unique API callers per time window, especially at high volume",
      "Any case needing cardinality merged across shards or time buckets (e.g., daily HLLs unioned into a weekly estimate) without replaying raw event logs",
      "Situations where storing raw identifiers (IPs, user IDs) long-term is undesirable for privacy or storage-cost reasons — HLL only needs the hash, transiently",
    ],
    whenNotToUse: [
      "You need an exact count — billing, inventory, compliance reporting, or anywhere a 1-2% error is unacceptable",
      "You need to know *which* items were seen, not just how many — HyperLogLog cannot enumerate members",
      "The dataset is small enough that an exact hash set is cheap anyway — HyperLogLog's advantage only matters at real scale",
      "You need to remove previously-counted items — a plain hash set (or a different structure entirely) supports deletion; HyperLogLog does not",
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
          '**Redis\'s HyperLogLog** (`PFADD`/`PFCOUNT`/`PFMERGE`) is documented as using "up to 12 KB of memory and provid[ing] a standard error rate of 0.81%," with `PFADD` and `PFCOUNT` both O(1) and `PFMERGE` O(n) in the number of HLLs merged. Redis explicitly documents unique-visitor and unique-query counting as the intended use cases, and notes that storing raw identifiers like IP addresses can itself be a legal/privacy liability — part of why an HLL (which never retains the original items) is attractive.',
          "**The original algorithm**, published by Flajolet, Fusy, Gandouet, and Meunier (2007), formalizes the estimator used by Redis and other systems: hashing items, tracking the maximum count of leading zeros per register, and combining registers via a harmonic mean, with standard error σ ≈ 1.04/√m for m registers.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Redis Docs — HyperLogLog",
            url: "https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/",
            verified: "2026-11-04",
            note: "Up to 12 KB memory, 0.81% standard error, PFADD/PFCOUNT O(1), PFMERGE O(n); unique-visitor/unique-query use cases",
          },
          {
            name: "Wikipedia — HyperLogLog",
            url: "https://en.wikipedia.org/wiki/HyperLogLog",
            verified: "2026-11-04",
            note: "Core algorithm (hashing, leading zeros, harmonic mean), standard error formula σ = 1.04/√m, Flajolet et al. (2007) origin",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `// A simplified HyperLogLog using a small register count for clarity.
// Production implementations (e.g. Redis's) use dense/sparse encoding and
// bias correction; this focuses on the core estimation algorithm.

function hash32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function countLeadingZeros(value: number, bits: number): number {
  if (value === 0) return bits;
  let count = 0;
  for (let i = bits - 1; i >= 0; i--) {
    if ((value >> i) & 1) break;
    count++;
  }
  return count;
}

class HyperLogLog {
  private readonly b: number;
  private readonly m: number;
  private readonly registers: Uint8Array;
  private static readonly ALPHA = 0.7213; // approximation for m >= 128

  constructor(b = 10) {
    this.b = b;
    this.m = 1 << b;
    this.registers = new Uint8Array(this.m);
  }

  add(item: string): void {
    const h = hash32(item);
    const registerIndex = h >>> (32 - this.b);
    const remaining = (h << this.b) >>> this.b;
    const leadingZeros = countLeadingZeros(remaining, 32 - this.b) + 1;
    if (leadingZeros > this.registers[registerIndex]) {
      this.registers[registerIndex] = leadingZeros;
    }
  }

  count(): number {
    let sumInverse = 0;
    for (const r of this.registers) sumInverse += Math.pow(2, -r);
    const rawEstimate = (HyperLogLog.ALPHA * this.m * this.m) / sumInverse;
    return Math.round(rawEstimate);
  }

  merge(other: HyperLogLog): HyperLogLog {
    const result = new HyperLogLog(this.b);
    for (let i = 0; i < this.m; i++) {
      result.registers[i] = Math.max(this.registers[i], other.registers[i]);
    }
    return result;
  }
}

// Usage
const hll = new HyperLogLog(10); // 1024 registers, ~1 KB
for (let i = 0; i < 100000; i++) hll.add(\`user_\${i}\`);
hll.count(); // approximately 100000, within a couple percent`,

  python: `import math


def hash32(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def count_leading_zeros(value: int, bits: int) -> int:
    if value == 0:
        return bits
    count = 0
    for i in range(bits - 1, -1, -1):
        if (value >> i) & 1:
            break
        count += 1
    return count


class HyperLogLog:
    ALPHA = 0.7213  # approximation for m >= 128

    def __init__(self, b: int = 10) -> None:
        self.b = b
        self.m = 1 << b
        self.registers = [0] * self.m

    def add(self, item: str) -> None:
        h = hash32(item)
        register_index = h >> (32 - self.b)
        remaining = (h << self.b) & 0xFFFFFFFF
        leading_zeros = count_leading_zeros(remaining, 32 - self.b) + 1
        if leading_zeros > self.registers[register_index]:
            self.registers[register_index] = leading_zeros

    def count(self) -> int:
        sum_inverse = sum(2.0 ** -r for r in self.registers)
        raw_estimate = (self.ALPHA * self.m * self.m) / sum_inverse
        return round(raw_estimate)

    def merge(self, other: "HyperLogLog") -> "HyperLogLog":
        result = HyperLogLog(self.b)
        result.registers = [max(a, b) for a, b in zip(self.registers, other.registers)]
        return result


# Usage
hll = HyperLogLog(10)  # 1024 registers, ~1 KB
for i in range(100_000):
    hll.add(f"user_{i}")
hll.count()  # approximately 100000, within a couple percent`,

  java: `import java.util.Arrays;

public class HyperLogLog {
    private static final double ALPHA = 0.7213; // approximation for m >= 128

    private final int b;
    private final int m;
    private final int[] registers;

    public HyperLogLog(int b) {
        this.b = b;
        this.m = 1 << b;
        this.registers = new int[m];
    }

    private static int hash32(String s) {
        int h = 0x811c9dc5;
        for (int i = 0; i < s.length(); i++) {
            h ^= s.charAt(i);
            h *= 0x01000193;
        }
        return h;
    }

    private static int countLeadingZeros(int value, int bits) {
        if (value == 0) return bits;
        int count = 0;
        for (int i = bits - 1; i >= 0; i--) {
            if (((value >> i) & 1) != 0) break;
            count++;
        }
        return count;
    }

    public void add(String item) {
        int h = hash32(item);
        int registerIndex = h >>> (32 - b);
        int remaining = (h << b) >>> b;
        int leadingZeros = countLeadingZeros(remaining, 32 - b) + 1;
        if (leadingZeros > registers[registerIndex]) {
            registers[registerIndex] = leadingZeros;
        }
    }

    public long count() {
        double sumInverse = 0;
        for (int r : registers) sumInverse += Math.pow(2, -r);
        double rawEstimate = (ALPHA * m * m) / sumInverse;
        return Math.round(rawEstimate);
    }

    public HyperLogLog merge(HyperLogLog other) {
        HyperLogLog result = new HyperLogLog(this.b);
        for (int i = 0; i < m; i++) {
            result.registers[i] = Math.max(this.registers[i], other.registers[i]);
        }
        return result;
    }
}

// Usage
HyperLogLog hll = new HyperLogLog(10); // 1024 registers, ~1 KB
for (int i = 0; i < 100_000; i++) {
    hll.add("user_" + i);
}
long estimate = hll.count(); // approximately 100000, within a couple percent`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "hyperloglog-conceptual",
    required: true,
    question:
      "You're tracking unique visitors with a HyperLogLog using m = 16,384 registers, and separately with an exact hash set. Your traffic grows from 10,000 to 100 million unique visitors over a year. What happens to each structure's memory usage?",
    options: [
      {
        id: "a",
        text: "Both grow proportionally to the number of unique visitors",
      },
      {
        id: "b",
        text: "The HyperLogLog's memory stays fixed (determined only by m); the hash set's memory grows roughly linearly with the number of unique visitors",
      },
      {
        id: "c",
        text: "The HyperLogLog's memory shrinks as more items are added, since registers get reused",
      },
      {
        id: "d",
        text: "Both stay fixed, since both are designed for high-cardinality counting",
      },
    ],
    correctOptionId: "b",
    explanation:
      "A HyperLogLog's memory is determined entirely by its register count m, fixed at creation time — adding more items only updates existing registers' values (each capped at a small number of bits), never adds new storage. A hash set, by contrast, must remember every distinct item it has seen to avoid double-counting, so its memory grows roughly linearly with the number of unique items — from a few KB at 10,000 visitors to potentially hundreds of MB or more at 100 million. This fixed-vs-linear memory contrast is the entire reason HyperLogLog exists.",
  },
  {
    type: "implementation",
    id: "hyperloglog-implementation",
    required: true,
    title: "Implement HyperLogLog Register Merging",
    description: `Given the core HyperLogLog structure (hashing and register-update logic is provided), implement the two operations that make HyperLogLog useful at scale:

- **count()** — combine all registers into a cardinality estimate using the harmonic-mean-based formula: \`estimate = ALPHA * m * m / sum(2^-registers[i] for all i)\`.
- **merge(other)** — combine two HyperLogLogs representing different streams into one covering their union, by taking the elementwise maximum of their registers.`,
    starterCode: {
      typescript: `class HyperLogLog {
  private readonly m: number;
  private readonly registers: Uint8Array;
  private static readonly ALPHA = 0.7213;

  constructor(m: number) {
    this.m = m;
    this.registers = new Uint8Array(m);
  }

  // Assume add() is already implemented and populates this.registers.

  count(): number {
    // TODO: sum 2^-registers[i] across all registers, then apply
    // ALPHA * m * m / sum to get the cardinality estimate
    return 0;
  }

  merge(other: HyperLogLog): HyperLogLog {
    // TODO: return a new HyperLogLog whose registers are the elementwise
    // maximum of this.registers and other.registers
    return new HyperLogLog(this.m);
  }
}`,
      python: `class HyperLogLog:
    ALPHA = 0.7213

    def __init__(self, m: int) -> None:
        self.m = m
        self.registers = [0] * m

    # Assume add() is already implemented and populates self.registers.

    def count(self) -> int:
        # TODO: sum 2^-registers[i] across all registers, then apply
        # ALPHA * m * m / sum to get the cardinality estimate
        return 0

    def merge(self, other: "HyperLogLog") -> "HyperLogLog":
        # TODO: return a new HyperLogLog whose registers are the elementwise
        # maximum of self.registers and other.registers
        return HyperLogLog(self.m)`,
      java: `public class HyperLogLog {
    private static final double ALPHA = 0.7213;
    private final int m;
    private final int[] registers;

    public HyperLogLog(int m) {
        this.m = m;
        this.registers = new int[m];
    }

    // Assume add() is already implemented and populates registers.

    public long count() {
        // TODO: sum 2^-registers[i] across all registers, then apply
        // ALPHA * m * m / sum to get the cardinality estimate
        return 0;
    }

    public HyperLogLog merge(HyperLogLog other) {
        // TODO: return a new HyperLogLog whose registers are the elementwise
        // maximum of this.registers and other.registers
        return new HyperLogLog(this.m);
    }
}`,
    },
    hints: [
      "count(): loop over every register value r and accumulate Math.pow(2, -r) (or 2.0 ** -r) into a running sum.",
      "count(): the final estimate is (ALPHA * m * m) / sum — don't forget m is squared in the numerator.",
      "merge(): create a new HyperLogLog with the same register count m, then set its registers[i] to the larger of the two inputs' registers[i], for every index.",
      "merge() never needs to re-hash or replay any original items — it only ever looks at the register arrays themselves.",
    ],
    solution: {
      typescript: `class HyperLogLog {
  private readonly m: number;
  private readonly registers: Uint8Array;
  private static readonly ALPHA = 0.7213;

  constructor(m: number) {
    this.m = m;
    this.registers = new Uint8Array(m);
  }

  count(): number {
    let sumInverse = 0;
    for (const r of this.registers) sumInverse += Math.pow(2, -r);
    const rawEstimate = (HyperLogLog.ALPHA * this.m * this.m) / sumInverse;
    return Math.round(rawEstimate);
  }

  merge(other: HyperLogLog): HyperLogLog {
    const result = new HyperLogLog(this.m);
    for (let i = 0; i < this.m; i++) {
      result.registers[i] = Math.max(this.registers[i], other.registers[i]);
    }
    return result;
  }
}`,
      python: `class HyperLogLog:
    ALPHA = 0.7213

    def __init__(self, m: int) -> None:
        self.m = m
        self.registers = [0] * m

    def count(self) -> int:
        sum_inverse = sum(2.0 ** -r for r in self.registers)
        raw_estimate = (self.ALPHA * self.m * self.m) / sum_inverse
        return round(raw_estimate)

    def merge(self, other: "HyperLogLog") -> "HyperLogLog":
        result = HyperLogLog(self.m)
        result.registers = [max(a, b) for a, b in zip(self.registers, other.registers)]
        return result`,
      java: `public class HyperLogLog {
    private static final double ALPHA = 0.7213;
    private final int m;
    private final int[] registers;

    public HyperLogLog(int m) {
        this.m = m;
        this.registers = new int[m];
    }

    public long count() {
        double sumInverse = 0;
        for (int r : registers) sumInverse += Math.pow(2, -r);
        double rawEstimate = (ALPHA * m * m) / sumInverse;
        return Math.round(rawEstimate);
    }

    public HyperLogLog merge(HyperLogLog other) {
        HyperLogLog result = new HyperLogLog(this.m);
        for (int i = 0; i < m; i++) {
            result.registers[i] = Math.max(this.registers[i], other.registers[i]);
        }
        return result;
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "hyperloglog-system-design",
    required: false,
    title: "Designing a Weekly Unique-Visitor Dashboard",
    scenario: `You're building an analytics dashboard for a large website that needs to answer:

- "How many unique visitors did we have today?"
- "How many unique visitors did we have this week?" (not the sum of daily uniques — an actual union, since the same visitor can appear on multiple days)
- The dashboard needs to refresh every few minutes, and the site gets hundreds of millions of page views per day from a privacy-conscious user base (storing raw visitor identifiers long-term is explicitly disallowed by policy).

Design this using HyperLogLog, and discuss how the privacy constraint and the "union across days" requirement specifically shape the design.`,
    hints: [
      "What should each HyperLogLog represent — one per day? One global running total?",
      "How do you answer 'unique visitors this week' without just summing seven daily counts?",
      "What does the privacy constraint rule out, and how does HyperLogLog's design naturally satisfy it?",
      "If a visitor is seen on both Monday and Tuesday, what does summing daily PFCOUNT values get wrong?",
    ],
    discussionPoints: [
      "**One HyperLogLog per day:** Maintain a separate HLL keyed by date (e.g., `visitors:2026-11-04`). Every page view hashes the visitor identifier and calls add() (PFADD in Redis) on that day's HLL — O(1) per event, cheap enough to do inline at hundreds of millions of events/day.",
      "**Daily count is direct:** `count()` (PFCOUNT) on a single day's HLL gives that day's unique-visitor estimate immediately, no scan needed.",
      "**Weekly count requires a union, not a sum:** summing seven daily PFCOUNT values double-counts any visitor active on multiple days, overstating the true weekly unique count. The correct approach is to merge() (PFMERGE) all seven daily HLLs into one combined structure first, then count() the result — this is exactly the 'merging is trivial, no replay needed' property this lesson covers, and it's only correct because HLL union via elementwise-max genuinely represents the set union, unlike naively adding cardinalities.",
      "**Privacy constraint is satisfied by construction:** a HyperLogLog only ever stores small per-register leading-zero counts derived from a hash — never the original visitor identifier. Once an identifier has been hashed and folded into a register, it cannot be recovered from the HLL. This directly matches Redis's own documented caution that storing raw identifiers like IP addresses can itself be a legal/privacy liability, and explains why analytics systems favor HLL-based approaches here rather than retaining raw logs.",
      "**Refresh cadence:** since add() and count() are both effectively O(1)/O(m), recomputing the dashboard every few minutes (re-running count() on the current day's HLL, or merging the last 7 days' HLLs) is cheap regardless of total traffic volume — the fixed-memory, fixed-time nature of HLL is what makes frequent refresh practical at this scale, where re-scanning raw logs every few minutes would not be.",
      "**What this doesn't give you:** if the dashboard later needs an exact, auditable number (e.g., for a billing dispute), HyperLogLog's ~1-2% error makes it unsuitable — that would require falling back to an exact method (a real deduplication pass) for that specific audit, while still using HLL for the frequently-refreshed dashboard view.",
    ],
  },
];
