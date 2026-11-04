import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Lots of real systems need to track a yes/no fact for every member of a huge, densely-numbered population: has this user opted into the newsletter, did this sensor report in the last hour, is this page number already crawled. Storing each as a boolean in a hash map or array of objects wastes enormous amounts of memory — a JavaScript boolean, a Python bool, or a Java `Boolean` object each costs many bytes of overhead per entry, when the actual information is a single bit.",
      },
      {
        type: "p",
        text: 'A **bitmap** (or bitset) stores one bit per item instead of one object per item — 1 million flags fit in about 125 KB, not megabytes. It also turns set operations like "which users are in group A AND group B" into a handful of fast word-at-a-time bitwise instructions instead of looping through collections.',
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
          "A bitmap is just a contiguous block of bits, indexed from 0. To represent N items (e.g., user IDs 0 to N-1), allocate ⌈N / 8⌉ bytes.",
          "**Set a bit**: compute which byte it falls in (`index / 8`) and which position within that byte (`index % 8`), then OR in a 1 at that position.",
          "**Clear a bit**: same addressing, but AND with everything except that position (a mask with a 0 in that spot, 1s elsewhere).",
          "**Test a bit**: same addressing, AND with a mask that has a 1 only at that position — the result is nonzero if the bit was set.",
          "**Set operations become bitwise operations**: AND two bitmaps to get the intersection (members in both sets), OR for the union, XOR for the symmetric difference (in exactly one), NOT to invert. A CPU processes a full machine word (32 or 64 bits) per instruction, so these run roughly word-size-times faster than checking one item at a time.",
          '**Population count (how many bits are set)**: modern CPUs have a dedicated instruction for this (`popcount`), making "how many users are both active and opted-in" an AND followed by a popcount — extremely fast even over millions of bits.',
        ],
      },
      {
        type: "p",
        text: "When the set being represented is sparse (most bits are 0, scattered over a huge range), a plain bitmap wastes space holding long runs of zeros. Compressed bitmap formats like Roaring Bitmaps solve this by adaptively choosing, for each chunk of the address space, whether to store it as a plain bitmap, a list of set positions, or a run-length encoding — whichever is smallest — without the caller needing to decide manually.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `User IDs 0-15 (2 bytes, 16 bits):

  ID:   0  1  2  3  4  5  6  7 | 8  9 10 11 12 13 14 15
  bit:  0  0  1  0  1  0  0  1 | 0  0  0  1  0  0  1  0
        \\_____byte 0______/   \\_____byte 1______/

setBit(11): byte=11/8=1, pos=11%8=3 -> OR byte 1, 00001000
testBit(6): byte=6/8=0,  pos=6%8=6  -> byte 0 AND 01000000 != 0

AND (intersection), byte-at-a-time:
  set A:  01001001    set B:  01101000
  A & B:  01001000   <- members in BOTH, 1 CPU instruction`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Set / clear / test a single bit",
        time: "O(1)",
        note: "Direct index arithmetic, no traversal",
      },
      {
        operation: "AND / OR / XOR / NOT two bitmaps",
        time: "O(n / w)",
        note: "n = number of bits, w = machine word size (e.g. 64) — one instruction covers w bits at once",
      },
      {
        operation: "Population count (count set bits)",
        time: "O(n / w)",
        note: "Hardware popcount instruction processes a full word per operation",
      },
      {
        operation: "Memory for n items",
        time: "n / 8 bytes",
        note: "1 bit per item, vs. several bytes per item for a hash set or boolean array of objects",
      },
      {
        operation: "Sparse-set operations (compressed, e.g. Roaring)",
        time: "O(n / w) amortized, better in practice",
        note: "Adaptive per-chunk encoding skips long runs of zero bits entirely",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Extreme memory density — 1 bit per item instead of multiple bytes, which matters enormously at scale (billions of items)",
      "Set operations (AND/OR/XOR/NOT) run at hardware speed, word-at-a-time, instead of per-item loops",
      "Simple, predictable O(1) single-bit access with no pointers, hashing, or tree traversal",
      "Compressed variants (Roaring Bitmaps) keep this density and speed even for sparse sets with huge, scattered ranges",
    ],
    cons: [
      "Only works well when items map to dense, bounded, non-negative integer indices — arbitrary keys (strings, UUIDs) need a separate ID mapping layer first",
      "A plain (uncompressed) bitmap over a huge but sparse range wastes space on runs of zero bits — this is exactly what compressed formats like Roaring address",
      'Doesn\'t store any value beyond presence/absence — if you need to associate data with each item, a bitmap only answers "which," not "what"',
      "Resizing a plain bitmap to accommodate a larger maximum index means reallocating and copying the whole backing array",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Feature flags, permission bits, or opt-in/opt-out settings tracked per densely-numbered user or object ID",
      'Real-time analytics: "how many users were active today AND yesterday" via AND + population count across daily bitmaps',
      "Search engine and analytics-database inverted indexes, where a bitmap per term/value marks which documents/rows contain it, and query execution ANDs/ORs these together",
      "Space-bounded presence tracking for sensor/device check-ins, crawled-URL tracking, or deduplication keyed by small integer IDs",
    ],
    whenNotToUse: [
      "Your keys aren't small dense integers — hashing arbitrary keys into bitmap positions just to use a bitmap usually isn't worth the complexity; a hash set is simpler",
      "You need to store a value per item, not just presence — use a map/array of values instead",
      "The maximum possible ID is enormous and genuinely unbounded with no reasonable compression structure available — consider a different index structure or external ID remapping",
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
          '**Redis bitmaps** are bit-oriented operations (`SETBIT`, `GETBIT`, `BITCOUNT`, `BITOP`) built directly on top of the String type, documented to let you "remember a single bit of information (for example, knowing whether a user wants to receive a newsletter) of 4 billion users using just 512 MB of memory" — a concrete illustration of bitmap memory density at scale. `SETBIT` and `GETBIT` are O(1); `BITOP` is O(n) in the length of the longest string involved.',
          '**Roaring Bitmaps**, a compressed-bitmap format, power bitmap indexing inside Apache Lucene, Apache Spark, Druid, ClickHouse, and Elasticsearch, among many others — documented as combining "the speed of uncompressed bitsets with the memory efficiency of compression" via adaptive per-chunk storage (array, bitmap, or run-length container, whichever is smallest for that chunk).',
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Redis Docs — Bitmaps",
            url: "https://redis.io/docs/latest/develop/data-types/strings/bitmaps/",
            verified: "2026-11-04",
            note: "SETBIT/GETBIT O(1), BITOP O(n); 4-billion-user newsletter-flag example in 512 MB",
          },
          {
            name: "RoaringBitmap.org",
            url: "https://roaringbitmap.org/",
            verified: "2026-11-04",
            note: "Compressed bitmap format; adaptive array/bitmap/run containers; used in Lucene, Spark, Druid, ClickHouse, Elasticsearch",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `class Bitmap {
  private bits: Uint8Array;

  constructor(size: number) {
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  setBit(index: number): void {
    const byte = index >> 3;
    const position = index & 7;
    this.bits[byte] |= 1 << position;
  }

  clearBit(index: number): void {
    const byte = index >> 3;
    const position = index & 7;
    this.bits[byte] &= ~(1 << position);
  }

  testBit(index: number): boolean {
    const byte = index >> 3;
    const position = index & 7;
    return (this.bits[byte] & (1 << position)) !== 0;
  }

  and(other: Bitmap): Bitmap {
    const result = new Bitmap(this.bits.length * 8);
    for (let i = 0; i < this.bits.length; i++) {
      result.bits[i] = this.bits[i] & other.bits[i];
    }
    return result;
  }

  popcount(): number {
    let count = 0;
    for (const byte of this.bits) {
      let b = byte;
      while (b) {
        count += b & 1;
        b >>= 1;
      }
    }
    return count;
  }
}

// Usage: which user IDs (0-23) opted into the newsletter AND were active today
const optedIn = new Bitmap(24);
[2, 4, 7, 11, 14, 16, 22].forEach((id) => optedIn.setBit(id));

const activeToday = new Bitmap(24);
[2, 4, 7, 9, 16, 20].forEach((id) => activeToday.setBit(id));

const both = optedIn.and(activeToday);
both.popcount(); // 4 — users 2, 4, 7, and 16 match`,

  python: `class Bitmap:
    def __init__(self, size: int) -> None:
        self.bits = bytearray((size + 7) // 8)

    def set_bit(self, index: int) -> None:
        byte, position = divmod(index, 8)
        self.bits[byte] |= 1 << position

    def clear_bit(self, index: int) -> None:
        byte, position = divmod(index, 8)
        self.bits[byte] &= ~(1 << position) & 0xFF

    def test_bit(self, index: int) -> bool:
        byte, position = divmod(index, 8)
        return (self.bits[byte] & (1 << position)) != 0

    def __and__(self, other: "Bitmap") -> "Bitmap":
        result = Bitmap(len(self.bits) * 8)
        result.bits = bytearray(a & b for a, b in zip(self.bits, other.bits))
        return result

    def popcount(self) -> int:
        return sum(bin(byte).count("1") for byte in self.bits)


# Usage: which user IDs (0-23) opted into the newsletter AND were active today
opted_in = Bitmap(24)
for user_id in [2, 4, 7, 11, 14, 16, 22]:
    opted_in.set_bit(user_id)

active_today = Bitmap(24)
for user_id in [2, 4, 7, 9, 16, 20]:
    active_today.set_bit(user_id)

both = opted_in & active_today
both.popcount()  # users 2, 4, 7, and 16 match`,

  java: `import java.util.BitSet;

public class BitmapExample {
    // java.util.BitSet already implements a dynamically-sized bitmap with
    // set/clear/get, and(), or(), xor(), and cardinality() (population count).

    public static void main(String[] args) {
        BitSet optedIn = new BitSet(24);
        for (int id : new int[]{2, 4, 7, 11, 14, 16, 22}) {
            optedIn.set(id);
        }

        BitSet activeToday = new BitSet(24);
        for (int id : new int[]{2, 4, 7, 9, 16, 20}) {
            activeToday.set(id);
        }

        BitSet both = (BitSet) optedIn.clone();
        both.and(activeToday);

        int matchCount = both.cardinality(); // users 2, 4, 7, and 16 match
        boolean userFourMatches = both.get(4);
    }
}

// A manual byte-array implementation, for understanding what BitSet does internally:
class Bitmap {
    private final byte[] bits;

    Bitmap(int size) {
        this.bits = new byte[(size + 7) / 8];
    }

    void setBit(int index) {
        int byteIndex = index >> 3;
        int position = index & 7;
        bits[byteIndex] |= (1 << position);
    }

    void clearBit(int index) {
        int byteIndex = index >> 3;
        int position = index & 7;
        bits[byteIndex] &= ~(1 << position);
    }

    boolean testBit(int index) {
        int byteIndex = index >> 3;
        int position = index & 7;
        return (bits[byteIndex] & (1 << position)) != 0;
    }

    Bitmap and(Bitmap other) {
        Bitmap result = new Bitmap(bits.length * 8);
        for (int i = 0; i < bits.length; i++) {
            result.bits[i] = (byte) (bits[i] & other.bits[i]);
        }
        return result;
    }

    int popcount() {
        int count = 0;
        for (byte b : bits) {
            count += Integer.bitCount(b & 0xFF);
        }
        return count;
    }
}`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "bitmaps-bitsets-conceptual",
    required: true,
    question:
      "You need to track whether each of 2 billion user IDs (0 to ~2 billion) has opted into a newsletter, as a single yes/no flag. Roughly how much memory does a plain bitmap need, compared to a hash set storing each opted-in user ID as a 4-byte integer?",
    options: [
      {
        id: "a",
        text: "About the same either way — both store one entry per user",
      },
      {
        id: "b",
        text: "The bitmap needs about 250 MB total (1 bit per user) regardless of how many opted in; the hash set needs memory proportional only to how many users actually opted in, but with much higher per-entry overhead",
      },
      {
        id: "c",
        text: "The bitmap needs more memory than the hash set in every case, because it must allocate space for all 2 billion users up front",
      },
      {
        id: "d",
        text: "Hash sets are always more memory-efficient than bitmaps for boolean flags",
      },
    ],
    correctOptionId: "b",
    explanation:
      "A bitmap over 2 billion possible IDs costs 2,000,000,000 / 8 ≈ 250 MB, fixed, no matter how many users actually opted in — this is the 'dense, bounded range' case bitmaps are built for. A hash set only stores entries for users who actually opted in, but each entry costs far more than 1 bit (hash table overhead, pointers, boxed integers) — so if only a small fraction of users opted in, a hash set can use less total memory than a full bitmap over the whole range, while if a large fraction opted in, the bitmap wins decisively. This is exactly the dense-vs-sparse tradeoff that compressed bitmap formats like Roaring are designed to automatically navigate.",
  },
  {
    type: "implementation",
    id: "bitmaps-bitsets-implementation",
    required: true,
    title: "Implement a Bitmap",
    description: `Implement a fixed-size bitmap backed by a byte array:

- **setBit(index)** — sets the bit at the given index to 1.
- **clearBit(index)** — sets the bit at the given index to 0.
- **testBit(index)** — returns whether the bit at the given index is set.
- **popcount()** — returns the total number of set bits.`,
    starterCode: {
      typescript: `class Bitmap {
  private bits: Uint8Array;

  constructor(size: number) {
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  setBit(index: number): void {
    // TODO: find the byte and bit position, OR in a 1
  }

  clearBit(index: number): void {
    // TODO: find the byte and bit position, AND with an inverted mask
  }

  testBit(index: number): boolean {
    // TODO: find the byte and bit position, check if that bit is set
    return false;
  }

  popcount(): number {
    // TODO: count all set bits across the whole bitmap
    return 0;
  }
}`,
      python: `class Bitmap:
    def __init__(self, size: int) -> None:
        self.bits = bytearray((size + 7) // 8)

    def set_bit(self, index: int) -> None:
        # TODO: find the byte and bit position, OR in a 1
        pass

    def clear_bit(self, index: int) -> None:
        # TODO: find the byte and bit position, AND with an inverted mask
        pass

    def test_bit(self, index: int) -> bool:
        # TODO: find the byte and bit position, check if that bit is set
        return False

    def popcount(self) -> int:
        # TODO: count all set bits across the whole bitmap
        return 0`,
      java: `public class Bitmap {
    private final byte[] bits;

    public Bitmap(int size) {
        this.bits = new byte[(size + 7) / 8];
    }

    public void setBit(int index) {
        // TODO: find the byte and bit position, OR in a 1
    }

    public void clearBit(int index) {
        // TODO: find the byte and bit position, AND with an inverted mask
    }

    public boolean testBit(int index) {
        // TODO: find the byte and bit position, check if that bit is set
        return false;
    }

    public int popcount() {
        // TODO: count all set bits across the whole bitmap
        return 0;
    }
}`,
    },
    hints: [
      "The byte holding bit `index` is at `index / 8` (or `index >> 3`); the position within that byte is `index % 8` (or `index & 7`).",
      "setBit: OR the byte with `1 << position` to turn that bit on without disturbing the others.",
      "clearBit: AND the byte with the bitwise NOT of `1 << position` to turn that bit off without disturbing the others.",
      "testBit: AND the byte with `1 << position` — the result is nonzero exactly when that bit is set.",
      "popcount: either loop bit-by-bit per byte, or use a built-in population-count helper (`Integer.bitCount` in Java) per byte.",
    ],
    solution: {
      typescript: `class Bitmap {
  private bits: Uint8Array;

  constructor(size: number) {
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  setBit(index: number): void {
    const byte = index >> 3;
    const position = index & 7;
    this.bits[byte] |= 1 << position;
  }

  clearBit(index: number): void {
    const byte = index >> 3;
    const position = index & 7;
    this.bits[byte] &= ~(1 << position);
  }

  testBit(index: number): boolean {
    const byte = index >> 3;
    const position = index & 7;
    return (this.bits[byte] & (1 << position)) !== 0;
  }

  popcount(): number {
    let count = 0;
    for (const byte of this.bits) {
      let b = byte;
      while (b) {
        count += b & 1;
        b >>= 1;
      }
    }
    return count;
  }
}`,
      python: `class Bitmap:
    def __init__(self, size: int) -> None:
        self.bits = bytearray((size + 7) // 8)

    def set_bit(self, index: int) -> None:
        byte, position = divmod(index, 8)
        self.bits[byte] |= 1 << position

    def clear_bit(self, index: int) -> None:
        byte, position = divmod(index, 8)
        self.bits[byte] &= ~(1 << position) & 0xFF

    def test_bit(self, index: int) -> bool:
        byte, position = divmod(index, 8)
        return (self.bits[byte] & (1 << position)) != 0

    def popcount(self) -> int:
        return sum(bin(byte).count("1") for byte in self.bits)`,
      java: `public class Bitmap {
    private final byte[] bits;

    public Bitmap(int size) {
        this.bits = new byte[(size + 7) / 8];
    }

    public void setBit(int index) {
        int byteIndex = index >> 3;
        int position = index & 7;
        bits[byteIndex] |= (1 << position);
    }

    public void clearBit(int index) {
        int byteIndex = index >> 3;
        int position = index & 7;
        bits[byteIndex] &= ~(1 << position);
    }

    public boolean testBit(int index) {
        int byteIndex = index >> 3;
        int position = index & 7;
        return (bits[byteIndex] & (1 << position)) != 0;
    }

    public int popcount() {
        int count = 0;
        for (byte b : bits) {
            count += Integer.bitCount(b & 0xFF);
        }
        return count;
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "bitmaps-bitsets-system-design",
    required: false,
    title: "Designing a Daily Active Users Tracker",
    scenario: `You're building an analytics feature for a product with 500 million registered users (densely-numbered user IDs from 0 to ~500 million). Product wants to answer questions like:

- "How many users were active today?"
- "How many users were active both today AND yesterday?" (day-over-day retention)
- "How many users were active on at least one day in the last 7 days?"

Activity events stream in continuously throughout the day from many servers. The dashboard needs these numbers refreshed every few minutes, not computed from scratch via a slow database scan each time.

Design a bitmap-based approach for this, and discuss how it scales as more days need to be compared.`,
    hints: [
      "What should each bitmap represent — one bitmap per day, or one global bitmap?",
      "How does a user ID map to a position in a given day's bitmap?",
      "Which bitwise operation answers 'active both today AND yesterday'? Which answers 'active on at least one of the last 7 days'?",
      "What does population count (popcount) give you once you have the combined bitmap?",
      "500 million users is a dense, bounded range — does that favor a plain bitmap or a compressed one, and does the answer change for older, rarely-queried days?",
    ],
    discussionPoints: [
      "**One bitmap per day, user ID as the bit position:** Maintain a separate bitmap keyed by date (e.g., `active:2026-11-04`), where bit `i` represents whether user `i` was active that day. An incoming activity event just calls `setBit(userId)` on today's bitmap — O(1), cheap enough to do inline as events arrive.",
      "**Today's count:** a single `popcount()` on today's bitmap gives 'how many users were active today' directly, no scan or GROUP BY needed.",
      "**Day-over-day retention:** AND today's bitmap with yesterday's, then popcount the result — users active on both days. This is the same AND+popcount pattern used for 'opted-in AND active' in this lesson's real-world section.",
      "**'Active on at least one of the last 7 days':** OR all seven daily bitmaps together, then popcount the result — a user's bit is 1 in the union if they were active on any of the seven days.",
      "**Memory at this scale:** 500 million users is 500,000,000 / 8 ≈ 62.5 MB per daily bitmap, plain and uncompressed — perfectly reasonable to keep the last several days fully in memory (e.g., in Redis, using exactly the SETBIT/BITOP/BITCOUNT operations cited in this lesson's real-world section) for fast dashboard refreshes.",
      "**Scaling to many historical days:** keeping 365 daily bitmaps in memory costs roughly 365 × 62.5 MB ≈ 22.8 GB — still viable but worth reconsidering. Since most users are inactive on any given historical day, older bitmaps are comparatively sparse; switching older/colder bitmaps to a compressed format like Roaring Bitmaps (as used by Druid and ClickHouse for exactly this kind of time-bucketed analytics) keeps long date ranges affordable while keeping the hot, recent days as plain uncompressed bitmaps for maximum speed.",
    ],
  },
];
