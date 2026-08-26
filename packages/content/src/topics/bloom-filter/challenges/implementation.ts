import type { ImplementationChallenge } from "@engineering-playbook/content-schema";

export const implementationChallenge: ImplementationChallenge = {
  type: "implementation",
  id: "bloom-filter-implementation",
  required: true,
  title: "Implement a Basic Bloom Filter",
  description: `Implement a BloomFilter class with two methods:

- **add(value)** — inserts a value into the filter
- **has(value)** — returns true if the value *might* be in the filter, false if it is *definitely not*

Requirements:
- Use a fixed-size bit array (a simple boolean array is fine for this exercise)
- Use at least two hash functions
- has() must correctly return false for elements that were never added (aside from the rare false positive)

You do not need to calculate optimal m and k — a fixed size is fine here.`,
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
    // TODO: return false if any hash position is unset
    return false;
  }

  private hash1(value: string): number {
    // TODO: implement a hash function
    return 0;
  }

  private hash2(value: string): number {
    // TODO: implement a second, different hash function
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
        # TODO: return False if any hash position is unset
        return False

    def _hash1(self, value: str) -> int:
        # TODO: implement a hash function
        return 0

    def _hash2(self, value: str) -> int:
        # TODO: implement a second, different hash function
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
        // TODO: return false if any hash position is unset
        return false;
    }

    private int hash1(String value) {
        // TODO: implement a hash function
        return 0;
    }

    private int hash2(String value) {
        // TODO: implement a second, different hash function
        return 0;
    }
}`,
  },
  hints: [
    "Use two different starting constants in your hash function to produce two independent positions",
    "For hash1: try FNV-1a (h = 2166136261, then for each char: h ^= charCode, h *= 16777619)",
    "For hash2: use a different seed (e.g. h = 0x811c9dc5 ^ 0x1234, same multiplier)",
    "Take Math.abs(result) % size to keep positions within bounds",
    "add() sets both bit positions to true; has() returns true only if both positions are already true",
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
};
