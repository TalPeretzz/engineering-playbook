import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Two systems — two replicas of a database, two peers in a file-sharing network, a light client and a full blockchain node — often need to check whether their copies of a large dataset match, or whether one specific piece of data is really part of a larger dataset, without transferring or re-hashing the whole thing every time. Comparing byte-for-byte (or even hashing the whole dataset and comparing one hash) tells you *that* something differs, but not *what* or *where* — and proving a single item belongs to a huge dataset would otherwise mean sending (or re-hashing) the entire dataset to verify it.",
      },
      {
        type: "p",
        text: "A **Merkle tree** hashes data in a binary tree, so that comparing two datasets — or proving one item belongs to a dataset — only requires exchanging a small, logarithmic number of hashes, not the whole dataset.",
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
          "**Leaves**: hash each data block individually — these become the tree's leaf nodes.",
          "**Internal nodes**: each parent node's hash is computed from the concatenation of its two children's hashes (e.g., SHA-256 of child1_hash + child2_hash). If a level has an odd number of nodes, the common convention (used by Bitcoin) is to duplicate the last node and pair it with itself.",
          "**Root**: repeat pairing-and-hashing up the tree until a single hash remains — the **Merkle root**. This one hash is a fingerprint of the entire dataset: changing a single leaf anywhere in the tree changes every hash on the path from that leaf to the root, and therefore changes the root itself.",
          "**Comparing two datasets**: if both sides' Merkle roots match, the datasets are (almost certainly) identical — no further comparison needed. If the roots differ, compare the next level down on both sides; only recurse into subtrees whose hashes differ, which quickly narrows down exactly which leaf (which piece of data) differs, without re-transmitting or re-hashing the parts that already match.",
          "**Proving a single leaf belongs to the tree (a Merkle proof / inclusion proof)**: given a leaf, provide just the sibling hash at each level from that leaf up to the root (not the whole tree). The verifier recomputes the path's hashes using those siblings and checks the result equals the known root — this takes only O(log n) hashes and O(log n) time, for a tree of n leaves, instead of needing the full dataset.",
        ],
      },
      {
        type: "p",
        text: "This is the core payoff: verifying one item's membership, or finding exactly which items differ between two datasets, costs O(log n) work instead of O(n) — a direct consequence of the tree's shape.",
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Merkle tree over 4 data blocks:

                    root = H(H12 + H34)
                   /                  \\
            H12 = H(H1+H2)       H34 = H(H3+H4)
             /         \\          /         \\
          H1=H(D1)   H2=H(D2)  H3=H(D3)   H4=H(D4)
            |           |         |          |
           D1          D2        D3         D4

Proving D3 belongs to the tree (Merkle proof for D3):
  given: H3's sibling H4, and H12 (the sibling one level up)
  verifier computes: H34' = H(H3 + H4), then root' = H(H12 + H34')
  if root' == known root  ->  D3 is proven to be in the tree
  (only 2 hashes needed, not all 4 data blocks)`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      {
        operation: "Build tree from n leaves",
        time: "O(n)",
        note: "Each of the n-1 internal nodes is one hash of its two children",
      },
      {
        operation: "Compute / verify a Merkle proof for one leaf",
        time: "O(log n)",
        note: "One sibling hash per level, tree height is log n",
      },
      {
        operation: "Find which leaves differ between two trees",
        time: "O(d log n)",
        note: "d = number of differing leaves; only diverging subtrees are recursed into",
      },
      {
        operation: "Compare two whole datasets (root hashes only)",
        time: "O(1)",
        note: "A single hash comparison tells you whether the datasets match at all",
      },
      {
        operation: "Update one leaf and recompute the root",
        time: "O(log n)",
        note: "Only the path from that leaf to the root needs rehashing",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Proving membership of one item costs O(log n) hashes, not the full dataset — this is the structure's entire reason for existing",
      "Comparing two datasets for equality is O(1) (just compare roots); finding exactly where they differ is proportional to the number of actual differences, not the dataset size",
      "Tamper-evident by construction: changing any leaf changes the root, so the root hash alone is a compact integrity fingerprint for an entire dataset",
      "Composable with untrusted peers: a prover can hand over a small proof instead of the whole dataset, and the verifier only needs to trust the root hash it already has",
    ],
    cons: [
      "Only detects *that* and *where* data differs or whether an item is a member — it doesn't transmit or reconstruct the actual differing data itself",
      "Updating a leaf requires rehashing the path to the root, which touches O(log n) nodes — more work than a flat hash of each item independently, though still far cheaper than rehashing everything",
      "The root hash is only as trustworthy as however it was obtained in the first place — a Merkle proof proves consistency with a given root, not that the root itself is authentic",
      "Building and maintaining a balanced tree (handling non-power-of-two leaf counts) adds implementation complexity compared to a flat list of per-item hashes",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Blockchain transaction verification — proving a transaction is included in a block using a short Merkle proof instead of downloading the whole block",
      "Distributed databases and peer-to-peer systems (e.g., anti-entropy repair in Cassandra-style systems) comparing replicas to find exactly which keys diverged, without transferring entire datasets",
      "Version control systems that need to detect which files/objects changed between two large trees of content quickly (conceptually similar to how Git structures commits/trees)",
      "File integrity and deduplication systems verifying large files or filesystem state against a known-good root hash, catching corruption without rereading everything",
    ],
    whenNotToUse: [
      "You only ever need a single flat integrity check of one blob of data — a plain hash of the whole thing is simpler and sufficient",
      "The dataset is small enough that comparing or re-hashing it in full is already cheap — the logarithmic advantage only matters at scale",
      "You need to transmit the actual differing data, not just detect/prove where differences are — a Merkle tree tells you *where*, but you still need another mechanism to sync the content itself",
      "You need authentication of the root hash's origin, not just consistency with it — that requires a separate mechanism (e.g., a signature) layered on top",
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
          '**Bitcoin** builds a Merkle root from every transaction\'s TXID in a block: "Each pair is concatenated together as 64 raw bytes and SHA256(SHA256()) hashed to form a second row of hashes," repeating up to a single root, with the convention that "the last TXID is concatenated with a copy of itself and hashed" when a level has an odd count — this is the documented canonical handling of the odd-node case referenced in this lesson\'s how-it-works section.',
          '**Merkle proofs (inclusion proofs)** are documented as requiring "a number of hashes proportional to the logarithm of the number of leaf nodes in the tree," versus a flat hash list where verification cost is "proportional to the number of leaf nodes itself" — the direct source of the O(log n) vs O(n) distinction this lesson covers. Beyond Bitcoin and Ethereum, Merkle trees are documented in production use across Apache Cassandra (distributed replica comparison), Git and Mercurial (version control), Certificate Transparency, IPFS and BitTorrent, and ZFS/OpenZFS (filesystem integrity).',
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Bitcoin Developer Reference — Block Chain (Merkle Trees)",
            url: "https://developer.bitcoin.org/reference/block_chain.html",
            verified: "2026-11-05",
            note: "Merkle root construction: double-SHA256 pairing, odd-leaf duplication convention",
          },
          {
            name: "Wikipedia — Merkle tree",
            url: "https://en.wikipedia.org/wiki/Merkle_tree",
            verified: "2026-11-05",
            note: "O(log n) inclusion-proof cost vs. O(n) for a flat hash list; production use in Cassandra, Git, Certificate Transparency, IPFS, ZFS, and more",
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `import { createHash } from "crypto";

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

class MerkleTree {
  readonly leaves: string[];
  readonly layers: string[][];

  constructor(dataBlocks: string[]) {
    this.leaves = dataBlocks.map(sha256);
    this.layers = [this.leaves];
    let current = this.leaves;
    while (current.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = i + 1 < current.length ? current[i + 1] : current[i]; // duplicate last if odd
        next.push(sha256(left + right));
      }
      this.layers.push(next);
      current = next;
    }
  }

  get root(): string {
    return this.layers[this.layers.length - 1][0];
  }

  // Returns the sibling hash at each level needed to prove leafIndex is in the tree.
  getProof(leafIndex: number): string[] {
    const proof: string[] = [];
    let index = leafIndex;
    for (let level = 0; level < this.layers.length - 1; level++) {
      const layer = this.layers[level];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;
      const sibling = siblingIndex < layer.length ? layer[siblingIndex] : layer[index];
      proof.push(sibling);
      index = Math.floor(index / 2);
    }
    return proof;
  }

  static verifyProof(leafHash: string, leafIndex: number, proof: string[], root: string): boolean {
    let hash = leafHash;
    let index = leafIndex;
    for (const sibling of proof) {
      hash = index % 2 === 0 ? sha256(hash + sibling) : sha256(sibling + hash);
      index = Math.floor(index / 2);
    }
    return hash === root;
  }
}

// Usage
const tree = new MerkleTree(["tx1", "tx2", "tx3", "tx4"]);
const proof = tree.getProof(2); // prove "tx3" is in the tree
MerkleTree.verifyProof(sha256("tx3"), 2, proof, tree.root); // true`,

  python: `import hashlib


def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


class MerkleTree:
    def __init__(self, data_blocks: list[str]) -> None:
        self.leaves = [sha256(block) for block in data_blocks]
        self.layers = [self.leaves]
        current = self.leaves
        while len(current) > 1:
            next_layer = []
            for i in range(0, len(current), 2):
                left = current[i]
                right = current[i + 1] if i + 1 < len(current) else current[i]
                next_layer.append(sha256(left + right))
            self.layers.append(next_layer)
            current = next_layer

    @property
    def root(self) -> str:
        return self.layers[-1][0]

    def get_proof(self, leaf_index: int) -> list[str]:
        proof = []
        index = leaf_index
        for level in range(len(self.layers) - 1):
            layer = self.layers[level]
            is_right_node = index % 2 == 1
            sibling_index = index - 1 if is_right_node else index + 1
            sibling = layer[sibling_index] if sibling_index < len(layer) else layer[index]
            proof.append(sibling)
            index //= 2
        return proof

    @staticmethod
    def verify_proof(leaf_hash: str, leaf_index: int, proof: list[str], root: str) -> bool:
        current_hash = leaf_hash
        index = leaf_index
        for sibling in proof:
            if index % 2 == 0:
                current_hash = sha256(current_hash + sibling)
            else:
                current_hash = sha256(sibling + current_hash)
            index //= 2
        return current_hash == root


# Usage
tree = MerkleTree(["tx1", "tx2", "tx3", "tx4"])
proof = tree.get_proof(2)  # prove "tx3" is in the tree
MerkleTree.verify_proof(sha256("tx3"), 2, proof, tree.root)  # True`,

  java: `import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

public class MerkleTree {
    private final List<List<String>> layers = new ArrayList<>();

    public MerkleTree(List<String> dataBlocks) {
        List<String> leaves = new ArrayList<>();
        for (String block : dataBlocks) leaves.add(sha256(block));
        layers.add(leaves);

        List<String> current = leaves;
        while (current.size() > 1) {
            List<String> next = new ArrayList<>();
            for (int i = 0; i < current.size(); i += 2) {
                String left = current.get(i);
                String right = (i + 1 < current.size()) ? current.get(i + 1) : current.get(i);
                next.add(sha256(left + right));
            }
            layers.add(next);
            current = next;
        }
    }

    public String getRoot() {
        List<String> topLayer = layers.get(layers.size() - 1);
        return topLayer.get(0);
    }

    public List<String> getProof(int leafIndex) {
        List<String> proof = new ArrayList<>();
        int index = leafIndex;
        for (int level = 0; level < layers.size() - 1; level++) {
            List<String> layer = layers.get(level);
            boolean isRightNode = index % 2 == 1;
            int siblingIndex = isRightNode ? index - 1 : index + 1;
            String sibling = siblingIndex < layer.size() ? layer.get(siblingIndex) : layer.get(index);
            proof.add(sibling);
            index /= 2;
        }
        return proof;
    }

    public static boolean verifyProof(String leafHash, int leafIndex, List<String> proof, String root) {
        String hash = leafHash;
        int index = leafIndex;
        for (String sibling : proof) {
            hash = (index % 2 == 0) ? sha256(hash + sibling) : sha256(sibling + hash);
            index /= 2;
        }
        return hash.equals(root);
    }

    static String sha256(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(data.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}

// Usage
MerkleTree tree = new MerkleTree(List.of("tx1", "tx2", "tx3", "tx4"));
List<String> proof = tree.getProof(2); // prove "tx3" is in the tree
MerkleTree.verifyProof(MerkleTree.sha256("tx3"), 2, proof, tree.getRoot()); // true`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "merkle-tree-conceptual",
    required: true,
    question:
      "A Merkle tree is built over 1 million data blocks. A verifier wants to confirm that one specific block belongs to this dataset, and already knows the correct Merkle root. Roughly how many hashes does the verifier need to check this, using a Merkle proof?",
    options: [
      { id: "a", text: "1 million — it must hash every block to be sure" },
      { id: "b", text: "About 20 — proportional to log2(1,000,000)" },
      { id: "c", text: "1 — a single hash comparison always suffices" },
      { id: "d", text: "500,000 — half the dataset, since Merkle trees are binary" },
    ],
    correctOptionId: "b",
    explanation:
      "A Merkle proof only needs the sibling hash at each level from the target leaf up to the root — one hash per level. For 1 million leaves, the tree height is about log2(1,000,000) ≈ 20 levels, so the verifier needs roughly 20 sibling hashes (and 20 hash computations) to recompute the path to the root and compare it against the known root — not the million individual blocks. This O(log n) cost, versus O(n) for hashing everything, is exactly why Merkle proofs are practical at scale (e.g., Bitcoin light clients verifying a single transaction without downloading a whole block).",
  },
  {
    type: "implementation",
    id: "merkle-tree-implementation",
    required: true,
    title: "Implement Merkle Proof Generation and Verification",
    description: `Given a MerkleTree that has already built its layers (leaves at layer 0, root at the top layer), implement:

- **getProof(leafIndex)** — returns the list of sibling hashes needed to prove the leaf at \`leafIndex\` belongs to the tree, one sibling per level from the leaf up to (but not including) the root.
- **verifyProof(leafHash, leafIndex, proof, root)** (static) — recomputes the path from \`leafHash\` up to a root using the proof's sibling hashes, and returns whether it matches the given \`root\`.`,
    starterCode: {
      typescript: `class MerkleTree {
  readonly layers: string[][]; // layers[0] = leaf hashes, layers[last][0] = root

  // ... constructor omitted (already builds this.layers) ...

  getProof(leafIndex: number): string[] {
    // TODO: for each level except the top, find the sibling of the current
    // node (duplicate self if there's no sibling), add it to the proof,
    // then move to the parent's index at the next level up
    return [];
  }

  static verifyProof(leafHash: string, leafIndex: number, proof: string[], root: string): boolean {
    // TODO: starting from leafHash, combine with each proof sibling in order
    // (left+right depends on whether the current index is even or odd),
    // moving up one level each time, and compare the final hash to root
    return false;
  }
}`,
      python: `class MerkleTree:
    # ... constructor omitted (already builds self.layers) ...
    # self.layers[0] = leaf hashes, self.layers[-1][0] = root

    def get_proof(self, leaf_index: int) -> list[str]:
        # TODO: for each level except the top, find the sibling of the
        # current node (duplicate self if there's no sibling), add it to
        # the proof, then move to the parent's index at the next level up
        return []

    @staticmethod
    def verify_proof(leaf_hash: str, leaf_index: int, proof: list[str], root: str) -> bool:
        # TODO: starting from leaf_hash, combine with each proof sibling in
        # order (left+right depends on whether the current index is even or
        # odd), moving up one level each time, and compare the final hash to root
        return False`,
      java: `public class MerkleTree {
    // layers.get(0) = leaf hashes, layers.get(last).get(0) = root
    // ... constructor omitted (already builds layers) ...

    public List<String> getProof(int leafIndex) {
        // TODO: for each level except the top, find the sibling of the
        // current node (duplicate self if there's no sibling), add it to
        // the proof, then move to the parent's index at the next level up
        return new ArrayList<>();
    }

    public static boolean verifyProof(String leafHash, int leafIndex, List<String> proof, String root) {
        // TODO: starting from leafHash, combine with each proof sibling in
        // order (left+right depends on whether the current index is even or
        // odd), moving up one level each time, and compare the final hash to root
        return false;
    }
}`,
    },
    hints: [
      "getProof: at each level, if the current index is odd (a right child), its sibling is at index-1; if even (a left child), its sibling is at index+1 — unless that would go out of bounds, in which case duplicate the node itself (the odd-leaf convention from this lesson).",
      "getProof: after recording a level's sibling, the next level's index is the current index divided by 2 (integer division) — that's the parent's position.",
      "verifyProof: order matters when combining hashes — if the current index is even, the current node was the left child, so compute hash(current + sibling); if odd, the current node was the right child, so compute hash(sibling + current).",
      "verifyProof: after each combination, divide the index by 2 to move up a level, just like in getProof — after processing every sibling in the proof, compare the final combined hash to the given root.",
    ],
    solution: {
      typescript: `class MerkleTree {
  readonly layers: string[][];

  getProof(leafIndex: number): string[] {
    const proof: string[] = [];
    let index = leafIndex;
    for (let level = 0; level < this.layers.length - 1; level++) {
      const layer = this.layers[level];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;
      const sibling = siblingIndex < layer.length ? layer[siblingIndex] : layer[index];
      proof.push(sibling);
      index = Math.floor(index / 2);
    }
    return proof;
  }

  static verifyProof(leafHash: string, leafIndex: number, proof: string[], root: string): boolean {
    let hash = leafHash;
    let index = leafIndex;
    for (const sibling of proof) {
      hash = index % 2 === 0 ? sha256(hash + sibling) : sha256(sibling + hash);
      index = Math.floor(index / 2);
    }
    return hash === root;
  }
}`,
      python: `class MerkleTree:
    def get_proof(self, leaf_index: int) -> list[str]:
        proof = []
        index = leaf_index
        for level in range(len(self.layers) - 1):
            layer = self.layers[level]
            is_right_node = index % 2 == 1
            sibling_index = index - 1 if is_right_node else index + 1
            sibling = layer[sibling_index] if sibling_index < len(layer) else layer[index]
            proof.append(sibling)
            index //= 2
        return proof

    @staticmethod
    def verify_proof(leaf_hash: str, leaf_index: int, proof: list[str], root: str) -> bool:
        current_hash = leaf_hash
        index = leaf_index
        for sibling in proof:
            if index % 2 == 0:
                current_hash = sha256(current_hash + sibling)
            else:
                current_hash = sha256(sibling + current_hash)
            index //= 2
        return current_hash == root`,
      java: `public class MerkleTree {
    public List<String> getProof(int leafIndex) {
        List<String> proof = new ArrayList<>();
        int index = leafIndex;
        for (int level = 0; level < layers.size() - 1; level++) {
            List<String> layer = layers.get(level);
            boolean isRightNode = index % 2 == 1;
            int siblingIndex = isRightNode ? index - 1 : index + 1;
            String sibling = siblingIndex < layer.size() ? layer.get(siblingIndex) : layer.get(index);
            proof.add(sibling);
            index /= 2;
        }
        return proof;
    }

    public static boolean verifyProof(String leafHash, int leafIndex, List<String> proof, String root) {
        String hash = leafHash;
        int index = leafIndex;
        for (String sibling : proof) {
            hash = (index % 2 == 0) ? sha256(hash + sibling) : sha256(sibling + hash);
            index /= 2;
        }
        return hash.equals(root);
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "merkle-tree-system-design",
    required: false,
    title: "Designing Anti-Entropy Repair for a Replicated Key-Value Store",
    scenario: `You're operating a distributed key-value store with multiple replicas of the same data across different nodes. Occasionally, replicas drift out of sync (a write was missed during a network partition, a node was down briefly). You need a background "anti-entropy" process that two replicas run periodically to detect and repair any keys that have diverged — without transferring the entire dataset (which could be hundreds of GB) every time they compare.

Design this using Merkle trees, and discuss what happens when the two replicas have different numbers of keys (not just different values for the same keys).`,
    hints: [
      "What should each leaf of the Merkle tree represent in a key-value store?",
      "If two replicas' root hashes match, what do you know, and do you need to do anything else?",
      "If the roots differ, how do you narrow down *which* keys actually diverged, without comparing every key?",
      "What happens to tree structure/indexing when one replica has a key the other doesn't?",
    ],
    discussionPoints: [
      "**One leaf per key (or per key range/bucket)**: each replica independently builds a Merkle tree where each leaf is a hash of a key-value pair (or a hash of a contiguous range of keys, for very large keyspaces, to bound tree size). Replicas periodically exchange only their root hash first — if the roots match, the datasets are consistent and no further work is needed, which is the common case and should be cheap, exactly as this lesson's O(1) root-comparison property promises.",
      "**Recursive divergence narrowing when roots differ**: instead of transferring the whole dataset, the two replicas compare one level down from the root — only recursing into child subtrees whose hashes differ, and treating any subtree whose hash matches as confirmed in-sync without inspecting it further. This repeats down to the leaf level, so the total comparison work is proportional to the number of actually-diverged leaves (times tree height), not the total dataset size — directly the 'O(d log n)' entry in this lesson's complexity table.",
      "**Repair once diverged keys are found**: for each leaf found to differ, the replicas exchange the actual key-value data for just those keys (using, e.g., a last-write-wins timestamp or vector clock to decide which value wins) — the Merkle tree only ever tells you *which* keys diverged, consistent with this lesson's tradeoffs section; the actual data sync is a separate step layered on top.",
      "**Differing key counts between replicas**: if one replica has a key the other lacks, naively that shifts every subsequent leaf's position and could make otherwise-identical keys appear to be in completely different tree positions, causing a cascade of false mismatches. Real systems (e.g., Cassandra-style anti-entropy, as cited in this lesson's real-world section) avoid this either by keying leaves by a stable hash of the key itself (so each key always lands in the same tree position regardless of what other keys exist) rather than by sequential index, or by comparing bucketed key ranges where an extra key just means that one bucket's hash differs — avoiding the 'leaf index' fragility this lesson's own index-based implementation exhibits.",
      "**Operational cadence**: since root comparison is O(1) and full-mismatch comparison degrades gracefully to O(d log n), this anti-entropy check can run frequently (e.g., every few minutes) as a lightweight background process, only paying higher cost on the rare occasions real divergence is found — rather than needing a slow, infrequent full-dataset reconciliation sweep.",
    ],
  },
];
