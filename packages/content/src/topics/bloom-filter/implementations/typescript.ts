export const typescriptImpl = `class BloomFilter {
  private readonly bits: Uint8Array;
  private readonly m: number; // bit array size
  private readonly k: number; // number of hash functions

  constructor(expectedItems: number, falsePositiveRate = 0.01) {
    // Optimal m: -n * ln(p) / (ln 2)^2
    this.m = Math.ceil(
      (-expectedItems * Math.log(falsePositiveRate)) / (Math.LN2 * Math.LN2)
    );
    // Optimal k: (m / n) * ln 2
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

  // FNV-1a seeded by index to produce k independent positions
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
const filter = new BloomFilter(1_000, 0.01); // 1 000 items, 1% false-positive rate
filter.add("apple");
filter.add("banana");

console.log(filter.has("apple"));  // true  — added
console.log(filter.has("mango"));  // false — definitely not in set
console.log(filter.has("peach"));  // false (or rarely true — a false positive)`;
