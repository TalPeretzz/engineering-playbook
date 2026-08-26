export const pythonImpl = `import math


class BloomFilter:
    def __init__(self, expected_items: int, false_positive_rate: float = 0.01):
        # Optimal m: -n * ln(p) / (ln 2)^2
        self.m = math.ceil(
            (-expected_items * math.log(false_positive_rate)) / (math.log(2) ** 2)
        )
        # Optimal k: (m / n) * ln 2
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
        """FNV-1a seeded by index to produce k independent positions."""
        h = 2166136261 ^ seed
        for byte in value.encode("utf-8"):
            h ^= byte
            h = (h * 16777619) & 0xFFFFFFFF
        return h


# Usage
bloom = BloomFilter(expected_items=1_000, false_positive_rate=0.01)
bloom.add("apple")
bloom.add("banana")

print(bloom.has("apple"))  # True  — added
print(bloom.has("mango"))  # False — definitely not in set
print(bloom.has("peach"))  # False (or rarely True — a false positive)`;
