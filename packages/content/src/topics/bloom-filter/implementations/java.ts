export const javaImpl = `import java.nio.charset.StandardCharsets;

public class BloomFilter {
    private final byte[] bits;
    private final int m; // bit array size
    private final int k; // number of hash functions

    public BloomFilter(int expectedItems, double falsePositiveRate) {
        // Optimal m: -n * ln(p) / (ln 2)^2
        this.m = (int) Math.ceil(
            (-expectedItems * Math.log(falsePositiveRate)) / (Math.log(2) * Math.log(2))
        );
        // Optimal k: (m / n) * ln 2
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

    // FNV-1a seeded by index to produce k independent positions
    private int hash(String value, int seed) {
        int h = (int) 2166136261L ^ seed;
        for (byte b : value.getBytes(StandardCharsets.UTF_8)) {
            h ^= b;
            h *= 16777619;
        }
        return h;
    }

    public static void main(String[] args) {
        BloomFilter filter = new BloomFilter(1_000, 0.01);
        filter.add("apple");
        filter.add("banana");

        System.out.println(filter.has("apple"));  // true  — added
        System.out.println(filter.has("mango"));  // false — definitely not in set
        System.out.println(filter.has("peach"));  // false (or rarely true — a false positive)
    }
}`;
