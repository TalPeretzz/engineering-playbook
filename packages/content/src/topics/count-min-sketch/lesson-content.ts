import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Tracking how many times each distinct item has appeared in a huge stream — page views per URL, requests per API key, occurrences per word in a massive text corpus — normally means a hash map keyed by item, with memory proportional to the number of *distinct* items. When the universe of possible items is enormous (every URL ever requested, every IP address, every search term), that hash map can grow far larger than you want to keep in memory.",
      },
      {
        type: "p",
        text: "A **Count-Min Sketch** estimates each item's frequency using a small, fixed-size table, regardless of how many distinct items pass through — at the cost of sometimes *overestimating* a count (never underestimating) due to hash collisions. For finding heavy hitters — the handful of items responsible for most of the traffic — that tradeoff is usually a great deal.",
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
          "A Count-Min Sketch is a 2D array (table) of counters with **w columns and d rows**, plus d independent hash functions — one per row.",
          "**Update (increment an item's count)**: for each row j, hash the item with that row's hash function to get a column index, and increment the counter at (row j, that column) by the increment amount.",
          "**Query (estimate an item's count)**: for each row j, hash the item the same way to find its column, read that counter, then return the **minimum** across all d rows — the row least corrupted by collisions with other items.",
          "**Why take the minimum, not the sum or average**: every counter can only be inflated by collisions (two items hashing to the same cell in that row), never deflated — so every row's reading is an overestimate of the true count, and the smallest of several independent overestimates is the closest to the truth.",
          "**Why this never undercounts**: a counter only ever increases, and a query only ever reads cells that the item's own updates touched — so the returned estimate is always ≥ the true count, never less.",
          "**Sizing**: width w and depth d are chosen from two parameters — an error bound ε (epsilon) and a failure probability δ (delta). Wider tables (larger w) reduce how much collisions inflate any single estimate; more rows (larger d) reduce the probability that *all* rows get unluckily corrupted for the same item.",
        ],
      },
      {
        type: "p",
        text: "The formal guarantee: the estimate â for an item's true count a satisfies â ≤ a + εN with probability at least 1 − δ, where N is the total count of all updates seen so far. Width is set as w = ⌈e/ε⌉ and depth as d = ⌈ln(1/δ)⌉ — smaller ε or δ means a larger, more accurate table.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `A width-6, depth-3 sketch; each row has its own hash function:

           col0  col1  col2  col3  col4  col5
  row 0:    0     0     2     0     1     0      <- h0("GET /api/x") -> col 2
  row 1:    1     0     0     3     0     0      <- h1("GET /api/x") -> col 3
  row 2:    0     2     0     0     0     1      <- h2("GET /api/x") -> col 1

query("GET /api/x"):
  row 0, col 2 = 2
  row 1, col 3 = 3   <- inflated: another item collided here too
  row 2, col 1 = 2
  estimate = min(2, 3, 2) = 2   <- closest row wins; never below the true count`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Update (increment an item)",
        time: "O(d)",
        note: "One hash + one counter increment per row; d is fixed, so effectively O(1)",
      },
      {
        operation: "Query (estimate an item's count)",
        time: "O(d)",
        note: "One hash + one counter read per row, then take the minimum",
      },
      {
        operation: "Merge two sketches (same w, d)",
        time: "O(w · d)",
        note: "Elementwise sum of the two tables — valid because counts are additive",
      },
      {
        operation: "Memory",
        time: "O(w · d), fixed",
        note: "Independent of the number of distinct items or total stream length",
      },
      {
        operation: "Error bound",
        time: "â ≤ a + εN with probability ≥ 1 − δ",
        note: "w = ⌈e/ε⌉, d = ⌈ln(1/δ)⌉ — smaller ε or δ means a larger table",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Fixed, tunable memory footprint regardless of how many distinct items appear — unlike a hash map, which grows with distinct-item cardinality",
      "O(1)-ish update and query, with a formal, tunable accuracy guarantee (ε, δ)",
      "Never underestimates a count — a conservative error direction that's safe for many 'is this a heavy hitter' decisions",
      "Mergeable: sketches built independently (e.g., per shard or per time window) can be combined by simply summing their tables",
    ],
    cons: [
      "Can overestimate low-frequency items significantly, especially under high collision pressure — results below a data-dependent threshold should be treated as unreliable, not trusted as-is",
      "Cannot enumerate which items it has seen, only estimate a given item's frequency when asked directly",
      "Poor fit for uniformly-distributed data with no 'heavy hitters' — if every item has similar frequency, the useful signal-to-noise threshold collapses and most results end up looking equally (un)trustworthy",
      "Choosing good ε/δ requires some understanding of the expected total stream volume and distribution shape, not just a single obvious default",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Finding heavy hitters in high-volume streams: most-requested URLs, most-active API keys, trending search terms, top IPs by traffic volume",
      "Approximate per-item frequency counting at a scale where an exact hash map would use too much memory, when occasional overestimates of rare items are acceptable",
      "Combining frequency counts across shards, servers, or time windows by merging sketches, without needing to replay raw events",
      "Rate-limiting or anomaly-detection signals where 'roughly how often has this key been seen recently' is enough to act on",
    ],
    whenNotToUse: [
      "You need an exact count for any individual item — billing, financial, or compliance-sensitive counts",
      "Your data is close to uniformly distributed with no clear heavy hitters — the sketch's error swamps the signal, as Redis's own sizing guidance notes directly",
      "You need to know which items exist at all, not just estimate a given item's count — a sketch can't enumerate its contents",
      "The number of distinct items is small enough that an exact hash map is cheap anyway — the sketch's advantage is at genuine scale",
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
          '**Redis\'s Count-Min Sketch** (`CMS.INITBYPROB`, `CMS.INCRBY`, `CMS.QUERY`, `CMS.MERGE`) is documented as using "sub-linear space at the expense of over-counting some events due to collisions," with update/query both O(n) in the number of items passed per call (O(1) per item). Redis explicitly documents a retail sales-volume use case — one sketch per day, every sale incrementing it — and warns that "results coming from a Count-Min sketch lower than a certain threshold...should be ignored," since the sketch is \'only useful for higher counts.\'',
          "**The original algorithm**, invented by Graham Cormode and S. Muthu Muthukrishnan in 2003 and formally described in their 2005 paper, defines the width/depth table structure and the formal error guarantee â ≤ a + εN with probability ≥ 1 − δ, with w = ⌈e/ε⌉ and d = ⌈ln(1/δ)⌉ — the same parameterization Redis's `CMS.INITBYPROB` exposes directly as `error` and `probability` arguments.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Redis Docs — Count-min sketch",
            url: "https://redis.io/docs/latest/develop/data-types/probabilistic/count-min-sketch/",
            verified: "2026-11-05",
            note: "Sub-linear space via over-counting, O(1)-per-item update/query, sizing via error/probability, low-count threshold warning, retail sales use case",
          },
          {
            name: "Wikipedia — Count–min sketch",
            url: "https://en.wikipedia.org/wiki/Count%E2%80%93min_sketch",
            verified: "2026-11-05",
            note: "Width/depth table structure, update/query procedure, error bound â ≤ a + εN with probability 1−δ, Cormode & Muthukrishnan (2003/2005) origin",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `function hashWithSeed(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

class CountMinSketch {
  private readonly width: number;
  private readonly depth: number;
  private readonly table: Uint32Array;

  constructor(width: number, depth: number) {
    this.width = width;
    this.depth = depth;
    this.table = new Uint32Array(width * depth);
  }

  private columnFor(row: number, item: string): number {
    return hashWithSeed(item, row * 0x9e3779b1) % this.width;
  }

  increment(item: string, count = 1): void {
    for (let row = 0; row < this.depth; row++) {
      const col = this.columnFor(row, item);
      this.table[row * this.width + col] += count;
    }
  }

  estimate(item: string): number {
    let min = Infinity;
    for (let row = 0; row < this.depth; row++) {
      const col = this.columnFor(row, item);
      min = Math.min(min, this.table[row * this.width + col]);
    }
    return min;
  }

  merge(other: CountMinSketch): CountMinSketch {
    const result = new CountMinSketch(this.width, this.depth);
    for (let i = 0; i < this.table.length; i++) {
      result.table[i] = this.table[i] + other.table[i];
    }
    return result;
  }
}

// Usage: counting page requests
const sketch = new CountMinSketch(2000, 7);
sketch.increment("/api/products");
sketch.increment("/api/products", 499); // 500 total requests
sketch.increment("/api/checkout", 12);
sketch.estimate("/api/products"); // >= 500, exact unless collisions occurred
sketch.estimate("/api/rarely-hit-path"); // likely 0, possibly small positive`,

  python: `def hash_with_seed(s: str, seed: int) -> int:
    h = seed
    for ch in s:
        h = ((h ^ ord(ch)) * 2654435761) & 0xFFFFFFFF
        h ^= h >> 15
    return h


class CountMinSketch:
    def __init__(self, width: int, depth: int) -> None:
        self.width = width
        self.depth = depth
        self.table = [[0] * width for _ in range(depth)]

    def _column_for(self, row: int, item: str) -> int:
        return hash_with_seed(item, row * 0x9E3779B1) % self.width

    def increment(self, item: str, count: int = 1) -> None:
        for row in range(self.depth):
            col = self._column_for(row, item)
            self.table[row][col] += count

    def estimate(self, item: str) -> int:
        return min(
            self.table[row][self._column_for(row, item)] for row in range(self.depth)
        )

    def merge(self, other: "CountMinSketch") -> "CountMinSketch":
        result = CountMinSketch(self.width, self.depth)
        result.table = [
            [a + b for a, b in zip(row_a, row_b)]
            for row_a, row_b in zip(self.table, other.table)
        ]
        return result


# Usage: counting page requests
sketch = CountMinSketch(2000, 7)
sketch.increment("/api/products")
sketch.increment("/api/products", 499)  # 500 total requests
sketch.increment("/api/checkout", 12)
sketch.estimate("/api/products")  # >= 500, exact unless collisions occurred
sketch.estimate("/api/rarely-hit-path")  # likely 0, possibly small positive`,

  java: `public class CountMinSketch {
    private final int width;
    private final int depth;
    private final long[][] table;

    public CountMinSketch(int width, int depth) {
        this.width = width;
        this.depth = depth;
        this.table = new long[depth][width];
    }

    private static int hashWithSeed(String s, int seed) {
        int h = seed;
        for (int i = 0; i < s.length(); i++) {
            h = (h ^ s.charAt(i)) * 2654435761;
            h ^= h >>> 15;
        }
        return h >>> 1; // keep non-negative
    }

    private int columnFor(int row, String item) {
        return hashWithSeed(item, row * 0x9e3779b1) % width;
    }

    public void increment(String item, long count) {
        for (int row = 0; row < depth; row++) {
            int col = columnFor(row, item);
            table[row][col] += count;
        }
    }

    public long estimate(String item) {
        long min = Long.MAX_VALUE;
        for (int row = 0; row < depth; row++) {
            int col = columnFor(row, item);
            min = Math.min(min, table[row][col]);
        }
        return min;
    }

    public CountMinSketch merge(CountMinSketch other) {
        CountMinSketch result = new CountMinSketch(this.width, this.depth);
        for (int row = 0; row < depth; row++) {
            for (int col = 0; col < width; col++) {
                result.table[row][col] = this.table[row][col] + other.table[row][col];
            }
        }
        return result;
    }
}

// Usage: counting page requests
CountMinSketch sketch = new CountMinSketch(2000, 7);
sketch.increment("/api/products", 1);
sketch.increment("/api/products", 499); // 500 total requests
sketch.increment("/api/checkout", 12);
sketch.estimate("/api/products"); // >= 500, exact unless collisions occurred
sketch.estimate("/api/rarely-hit-path"); // likely 0, possibly small positive`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "count-min-sketch-conceptual",
    required: true,
    question:
      "A Count-Min Sketch with width 6 and depth 3 reports an estimated count of 2 for item X across all 3 rows (row values: 2, 2, 2 — no collisions happened to inflate any row for this item). A second item, Y, which was never added to the sketch at all, is queried and returns an estimate of 1 rather than 0. What's the best explanation?",
    options: [
      { id: "a", text: "The sketch has a bug — never-added items must always return exactly 0" },
      {
        id: "b",
        text: "Y's hash coincidentally mapped to the same column as some other item in every row, so it 'inherited' a leftover count from a collision — this is expected sketch behavior, not a bug",
      },
      { id: "c", text: "The sketch ran out of memory and silently corrupted its counters" },
      {
        id: "d",
        text: "Count-Min Sketches require an explicit reset between queries or results become unreliable",
      },
    ],
    correctOptionId: "b",
    explanation:
      "A Count-Min Sketch only ever increments counters for items that are actually added — but because each row hashes every item into one of only w columns, two different items can legitimately land in the same cell (a collision). If Y happens to collide with some previously-incremented item in every one of its d rows, querying Y returns the minimum of those collided values, which can be a small positive number even though Y itself was never added. This is the structure's core and expected tradeoff — it can only overestimate, never underestimate — which is exactly why the real-world section's guidance says low estimates below a data-dependent threshold should be treated as noise rather than trusted.",
  },
  {
    type: "implementation",
    id: "count-min-sketch-implementation",
    required: true,
    title: "Implement a Count-Min Sketch",
    description: `Implement a Count-Min Sketch backed by a width x depth table of counters:

- **increment(item, count)** — adds \`count\` (default 1) to the item's estimated frequency.
- **estimate(item)** — returns the estimated frequency: the minimum counter value across all rows.

Assume a helper \`columnFor(row, item)\` is provided that deterministically maps an (row, item) pair to a column index in [0, width).`,
    starterCode: {
      typescript: `class CountMinSketch {
  private readonly width: number;
  private readonly depth: number;
  private readonly table: Uint32Array;

  constructor(width: number, depth: number) {
    this.width = width;
    this.depth = depth;
    this.table = new Uint32Array(width * depth);
  }

  private columnFor(row: number, item: string): number {
    // (provided) deterministic hash-based column selection
    return 0;
  }

  increment(item: string, count = 1): void {
    // TODO: for every row, find its column and add count to that counter
  }

  estimate(item: string): number {
    // TODO: for every row, find its column, and return the minimum counter value
    return 0;
  }
}`,
      python: `class CountMinSketch:
    def __init__(self, width: int, depth: int) -> None:
        self.width = width
        self.depth = depth
        self.table = [[0] * width for _ in range(depth)]

    def _column_for(self, row: int, item: str) -> int:
        # (provided) deterministic hash-based column selection
        return 0

    def increment(self, item: str, count: int = 1) -> None:
        # TODO: for every row, find its column and add count to that counter
        pass

    def estimate(self, item: str) -> int:
        # TODO: for every row, find its column, and return the minimum counter value
        return 0`,
      java: `public class CountMinSketch {
    private final int width;
    private final int depth;
    private final long[][] table;

    public CountMinSketch(int width, int depth) {
        this.width = width;
        this.depth = depth;
        this.table = new long[depth][width];
    }

    private int columnFor(int row, String item) {
        // (provided) deterministic hash-based column selection
        return 0;
    }

    public void increment(String item, long count) {
        // TODO: for every row, find its column and add count to that counter
    }

    public long estimate(String item) {
        // TODO: for every row, find its column, and return the minimum counter value
        return 0;
    }
}`,
    },
    hints: [
      "increment: loop row from 0 to depth-1, call columnFor(row, item) to get that row's column, and add count to table[row][col].",
      "estimate: loop row from 0 to depth-1 the same way, read table[row][col] for each, and track the minimum value seen.",
      "Both methods touch exactly `depth` cells — one per row — never the whole table.",
      "Don't forget to initialize your running minimum to a very large value (e.g. infinity or Long.MAX_VALUE) before the loop in estimate().",
    ],
    solution: {
      typescript: `class CountMinSketch {
  private readonly width: number;
  private readonly depth: number;
  private readonly table: Uint32Array;

  constructor(width: number, depth: number) {
    this.width = width;
    this.depth = depth;
    this.table = new Uint32Array(width * depth);
  }

  private columnFor(row: number, item: string): number {
    return 0; // provided
  }

  increment(item: string, count = 1): void {
    for (let row = 0; row < this.depth; row++) {
      const col = this.columnFor(row, item);
      this.table[row * this.width + col] += count;
    }
  }

  estimate(item: string): number {
    let min = Infinity;
    for (let row = 0; row < this.depth; row++) {
      const col = this.columnFor(row, item);
      min = Math.min(min, this.table[row * this.width + col]);
    }
    return min;
  }
}`,
      python: `class CountMinSketch:
    def __init__(self, width: int, depth: int) -> None:
        self.width = width
        self.depth = depth
        self.table = [[0] * width for _ in range(depth)]

    def _column_for(self, row: int, item: str) -> int:
        return 0  # provided

    def increment(self, item: str, count: int = 1) -> None:
        for row in range(self.depth):
            col = self._column_for(row, item)
            self.table[row][col] += count

    def estimate(self, item: str) -> int:
        return min(
            self.table[row][self._column_for(row, item)] for row in range(self.depth)
        )`,
      java: `public class CountMinSketch {
    private final int width;
    private final int depth;
    private final long[][] table;

    public CountMinSketch(int width, int depth) {
        this.width = width;
        this.depth = depth;
        this.table = new long[depth][width];
    }

    private int columnFor(int row, String item) {
        return 0; // provided
    }

    public void increment(String item, long count) {
        for (int row = 0; row < depth; row++) {
            int col = columnFor(row, item);
            table[row][col] += count;
        }
    }

    public long estimate(String item) {
        long min = Long.MAX_VALUE;
        for (int row = 0; row < depth; row++) {
            int col = columnFor(row, item);
            min = Math.min(min, table[row][col]);
        }
        return min;
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "count-min-sketch-system-design",
    required: false,
    title: "Designing a Top-URLs Traffic Dashboard",
    scenario: `You're building a real-time "top requested URLs" dashboard for a CDN serving tens of billions of requests per day, across millions of distinct URLs (most requested only once or twice — a long tail — with a relatively small set of genuinely hot URLs responsible for most traffic).

The dashboard needs to show, every minute, an approximate list of the current top URLs by request volume. Product has explicitly said they don't need exact counts — "roughly right, refreshed often" is the stated requirement — but they do need the list to be trustworthy (no URL that was barely requested showing up as if it were hot).

Design this using a Count-Min Sketch, and address how you'd avoid the sketch's own limitation (overestimating rare items) from corrupting the "top URLs" list.`,
    hints: [
      "What should width and depth be influenced by, given tens of billions of daily requests?",
      "If you only had the sketch, how would you get a 'top URLs' list out of it at all — a sketch only answers 'how many for this one specific item,' not 'what are the biggest'?",
      "The scenario explicitly warns about overestimated rare items contaminating the list — what does this lesson's real-world section say about low counts relative to a threshold?",
      "Would a single sketch for the whole day work for a 'refreshed every minute' requirement, or does the time dimension need its own design decision?",
    ],
    discussionPoints: [
      "**Sizing for the real volume**: tens of billions of requests/day sets the total count N in the error bound â ≤ a + εN. Choosing a small ε (e.g. Redis's CMS.INITBYPROB-style error parameter) keeps the absolute overestimate bounded even at huge N — this is a case where the 'sizing' tradeoff from this lesson is directly load-bearing, not academic.",
      "**A sketch alone can't produce a 'top-K' list**: it only answers 'what's the estimated count for this specific item I ask about' — it has no way to enumerate its contents or find maxima. The standard pairing is a small fixed-size heap (or similar top-K structure) maintained alongside the sketch: every time an item's estimated count (from the sketch) exceeds the current minimum of the top-K heap, it's considered for inclusion. This combines the sketch's compact frequency estimation with a separate, explicit candidate-tracking structure.",
      "**Guarding against the long tail contaminating the list**: since the vast majority of URLs are requested only once or twice, their sketch estimates are exactly where collision-driven overestimation does the most relative damage (a rare URL inflated from 1 to, say, 4 looks far more different than a hot URL inflated from 500,000 to 500,003). Applying the lesson's own guidance — only trust estimates above a data-dependent threshold (roughly ε × total_count) — before ever admitting a candidate into the top-K heap directly filters out exactly this failure mode.",
      "**Per-minute refresh via time-bucketed sketches**: rather than one sketch for the whole day (which would make 'top URLs right now' impossible to distinguish from 'top URLs all day'), maintain a rolling window of per-minute (or per-few-minutes) sketches, similar to the per-day-bitmap pattern from the bitmaps lesson. The dashboard's 'current' view uses the most recent window's sketch (and top-K list) directly; a longer-window view (e.g. 'top URLs this hour') can merge several windows' sketches together first, since Count-Min Sketch tables are simply summed to merge.",
      "**What this doesn't solve**: if product later asks for an exact count on a specific URL for a billing or SLA dispute, the sketch's approximate nature makes it unsuitable for that one-off need — falling back to an exact per-URL counter (even a simple one maintained only for a small set of contractually-metered URLs) is the right complement, rather than trying to force exactness out of the sketch.",
    ],
  },
];
