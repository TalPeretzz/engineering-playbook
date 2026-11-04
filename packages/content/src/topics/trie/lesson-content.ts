import type { Section, Challenge } from "@engineering-playbook/content-schema";

export const sections: Section[] = [
  {
    type: "text",
    id: "problem",
    heading: "What problem does it solve?",
    body: [
      {
        type: "p",
        text: "Searching a large collection of strings for everything that starts with a given prefix — autocomplete suggestions, a dictionary lookup, matching an IP address against routing table entries — is awkward with a hash set or a sorted array. A hash set gives fast exact lookups but no way to efficiently ask 'everything starting with this prefix' at all. A sorted array supports prefix queries via binary search but costs O(log n) just to find the range, plus the cost of scanning every match.",
      },
      {
        type: "p",
        text: 'A **trie** (pronounced "try" — the name comes from the middle syllable of re**trie**val, coined by Edward Fredkin) is a tree built specifically for prefix-based lookups: searching for a key of length m costs O(m), completely independent of how many other keys are stored.',
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
          "Each node represents one character position. The root represents the empty prefix.",
          "An edge from a node is labeled with a single character. Following edges from the root spells out a prefix; nodes along a shared prefix are shared between all keys that start with it.",
          "Each node that corresponds to the end of a stored key is marked as **terminal** (a complete word), distinct from a node that's merely part of a longer key's path.",
          "**Insert** a key by walking from the root, creating any edges/nodes that don't already exist for each character, and marking the final node terminal.",
          "**Exact lookup** walks the same path and checks whether the final node is terminal.",
          "**Prefix search** (autocomplete) walks to the node matching the prefix, then traverses every descendant to collect all complete words below it.",
        ],
      },
      {
        type: "p",
        text: 'The key insight is prefix sharing: "cat" and "car" share the path c→a, splitting only at the third character. The more keys share prefixes, the more memory a trie saves relative to storing each string independently — and the more that prefix-matching work is reused instead of repeated per key.',
      },
    ],
  },
  {
    type: "visual",
    id: "visual",
    heading: "Visual",
    content: `Inserting: cat, car, card, dog

             (root)
            /      \\
           c        d
           |        |
           a        o
          / \\       |
         t   r      g*
         *   |
             (branch)
            /    \\
         (end)    d
           *       *
      "car"     "card"

* = terminal node (a complete word ends here)

Lookup "car":   root → c → a → r  → terminal? yes  → found
Lookup "ca":    root → c → a       → terminal? no   → "ca" isn't a stored word
Prefix "ca":    root → c → a  → collect all terminal descendants: cat, car, card`,
  },
  {
    type: "complexity",
    id: "complexity",
    heading: "Complexity",
    entries: [
      { operation: "Insert", time: "O(m)", note: "m = length of the key being inserted" },
      {
        operation: "Exact lookup",
        time: "O(m)",
        note: "Independent of how many other keys are stored",
      },
      {
        operation: "Prefix search",
        time: "O(p + k)",
        note: "p = prefix length to find the branch point, k = number of matching results to collect",
      },
      {
        operation: "Space",
        time: "—",
        space: "O(ALPHABET_SIZE × N) worst case",
        note: "N = total nodes; a plain trie allocates a slot per possible character at every node, which is where most of its memory cost comes from",
      },
    ],
  },
  {
    type: "tradeoffs",
    id: "tradeoffs",
    heading: "Tradeoffs",
    pros: [
      "Lookup and insert cost depends only on key length, not on how many keys are stored — no degradation as the dataset grows",
      "Prefix queries (autocomplete, 'starts with') are a natural, efficient operation, unlike hash sets which don't support them at all",
      "Shared prefixes between keys are stored once, saving space when keys overlap heavily",
      "Naturally produces results in lexicographic order with an in-order traversal, with no separate sort step needed",
    ],
    cons: [
      "A plain trie with a fixed-size array per node (one slot per possible character) can use significantly more memory than the strings it stores, especially for large alphabets like Unicode",
      "Poor fit when keys share very few prefixes with each other — the prefix-sharing benefit that justifies the structure doesn't materialize",
      "Deletion requires care: removing a key means unmarking its terminal node and only pruning nodes upward while they have no other children and aren't terminal for another key",
      "Case sensitivity, Unicode normalization, and other string-encoding details need to be handled deliberately before keys reach the trie",
    ],
  },
  {
    type: "use-cases",
    id: "use-cases",
    heading: "When to use / when not to use",
    whenToUse: [
      "Autocomplete and typeahead search",
      "Dictionary and spell-check lookups",
      "Longest-prefix matching, such as IP routing tables matching an address against the most specific matching network prefix",
      "Datasets where keys share substantial common prefixes, maximizing the structure's space-saving advantage",
    ],
    whenNotToUse: [
      "Only exact-match membership testing is needed and prefix queries are never used — a hash set is simpler and typically more memory-efficient",
      "Memory is tight and the keys don't share meaningful prefixes with each other",
      "The dataset is small enough and static enough that a sorted array with binary search performs acceptably without the added structural complexity",
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
          "**Elasticsearch's Completion Suggester** implements autocomplete using in-memory data structures specifically chosen for fast prefix lookups — costly to build, but built once and queried repeatedly, trading build time for consistently fast suggestion latency.",
          "**IP routers** use trie-like structures (tries over the binary representation of an IP address) to perform longest-prefix matching — finding the most specific routing rule that matches a destination address.",
          "**Predictive text input (T9-style)** and dictionary/spell-check tools use tries to look up and suggest words sharing a typed prefix without scanning the entire word list.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            name: "Elastic Docs — Search Suggesters (Completion Suggester)",
            url: "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-suggesters.html",
            verified: "2026-11-04",
            note: "In-memory data structures built for fast lookup, costly to build — the completion suggester's design tradeoff",
          },
          {
            name: "Wikipedia — Trie",
            url: "https://en.wikipedia.org/wiki/Trie",
            verified: "2026-11-04",
            note: 'Etymology (Fredkin, from "retrieval"), O(m) lookup complexity, and real-world applications (autocomplete, IP routing, bioinformatics)',
          },
        ],
      },
    ],
  },
];

export const implementations = {
  typescript: `class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false;
}

class Trie {
  private root = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) node.children.set(char, new TrieNode());
      node = node.children.get(char)!;
    }
    node.isWord = true;
  }

  search(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isWord;
  }

  startsWith(prefix: string): string[] {
    const node = this.findNode(prefix);
    if (!node) return [];
    const results: string[] = [];
    this.collectWords(node, prefix, results);
    return results;
  }

  private findNode(prefix: string): TrieNode | null {
    let node = this.root;
    for (const char of prefix) {
      const next = node.children.get(char);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  private collectWords(node: TrieNode, prefix: string, results: string[]): void {
    if (node.isWord) results.push(prefix);
    for (const [char, child] of node.children) {
      this.collectWords(child, prefix + char, results);
    }
  }
}

// Usage
const trie = new Trie();
for (const word of ["cat", "car", "card", "dog"]) trie.insert(word);

trie.search("car"); // true
trie.search("ca"); // false — "ca" was never inserted as a complete word
trie.startsWith("ca"); // ["cat", "car", "card"]`,

  python: `class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_word = True

    def search(self, word: str) -> bool:
        node = self._find_node(word)
        return node is not None and node.is_word

    def starts_with(self, prefix: str) -> list[str]:
        node = self._find_node(prefix)
        if node is None:
            return []
        results: list[str] = []
        self._collect_words(node, prefix, results)
        return results

    def _find_node(self, prefix: str) -> TrieNode | None:
        node = self.root
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        return node

    def _collect_words(self, node: TrieNode, prefix: str, results: list[str]) -> None:
        if node.is_word:
            results.append(prefix)
        for char, child in node.children.items():
            self._collect_words(child, prefix + char, results)


# Usage
trie = Trie()
for word in ["cat", "car", "card", "dog"]:
    trie.insert(word)

trie.search("car")  # True
trie.search("ca")  # False — "ca" was never inserted as a complete word
trie.starts_with("ca")  # ["cat", "car", "card"]`,

  java: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Trie {
    private static class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        boolean isWord = false;
    }

    private final TrieNode root = new TrieNode();

    public void insert(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            node = node.children.computeIfAbsent(c, k -> new TrieNode());
        }
        node.isWord = true;
    }

    public boolean search(String word) {
        TrieNode node = findNode(word);
        return node != null && node.isWord;
    }

    public List<String> startsWith(String prefix) {
        TrieNode node = findNode(prefix);
        List<String> results = new ArrayList<>();
        if (node == null) return results;
        collectWords(node, prefix, results);
        return results;
    }

    private TrieNode findNode(String prefix) {
        TrieNode node = root;
        for (char c : prefix.toCharArray()) {
            node = node.children.get(c);
            if (node == null) return null;
        }
        return node;
    }

    private void collectWords(TrieNode node, String prefix, List<String> results) {
        if (node.isWord) results.add(prefix);
        for (Map.Entry<Character, TrieNode> entry : node.children.entrySet()) {
            collectWords(entry.getValue(), prefix + entry.getKey(), results);
        }
    }
}

// Usage
Trie trie = new Trie();
for (String word : new String[]{"cat", "car", "card", "dog"}) trie.insert(word);

trie.search("car"); // true
trie.search("ca"); // false — "ca" was never inserted as a complete word
trie.startsWith("ca"); // [cat, car, card]`,
};

export const challenges: Challenge[] = [
  {
    type: "multiple-choice",
    id: "trie-conceptual",
    required: true,
    question:
      'A trie has "car" and "card" inserted, but "ca" was never inserted. What does trie.search("ca") return, and why?',
    options: [
      { id: "a", text: 'true, because "ca" is a prefix of both stored words' },
      {
        id: "b",
        text: "false, because the node for \"ca\" exists (as part of car/card's path) but isn't marked terminal",
      },
      { id: "c", text: 'An error, because "ca" was never explicitly inserted' },
      { id: "d", text: "true, because tries treat every prefix as an implicit member of the set" },
    ],
    correctOptionId: "b",
    explanation:
      'A node existing in the trie (because it\'s on the path to a longer stored word) is not the same as that node representing a complete, inserted word. search() must check both that the path exists AND that the final node is marked terminal (isWord). The node for "ca" exists — it\'s shared by both "car" and "card" — but it\'s never been marked terminal, so search() correctly returns false. This distinction between "on the path" and "is a stored word" is the most common source of trie implementation bugs.',
  },
  {
    type: "implementation",
    id: "trie-implementation",
    required: true,
    title: "Implement a Trie",
    description: `Implement a trie with:

- **insert(word)** — adds a word to the trie.
- **search(word)** — returns true only if \`word\` was previously inserted as a complete word.
- **startsWith(prefix)** — returns all previously inserted words that start with \`prefix\`, in any order.`,
    starterCode: {
      typescript: `class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false;
}

class Trie {
  private root = new TrieNode();

  insert(word: string): void {
    // TODO: walk/create a path for each character, mark the final node as a word
  }

  search(word: string): boolean {
    // TODO: walk the path for word; return true only if it exists AND is marked as a word
    return false;
  }

  startsWith(prefix: string): string[] {
    // TODO: walk to the node for prefix, then collect every complete word below it
    return [];
  }
}`,
      python: `class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        # TODO: walk/create a path for each character, mark the final node as a word
        pass

    def search(self, word: str) -> bool:
        # TODO: walk the path for word; return True only if it exists AND is marked as a word
        return False

    def starts_with(self, prefix: str) -> list[str]:
        # TODO: walk to the node for prefix, then collect every complete word below it
        return []`,
      java: `import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class Trie {
    private static class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        boolean isWord = false;
    }

    private final TrieNode root = new TrieNode();

    public void insert(String word) {
        // TODO: walk/create a path for each character, mark the final node as a word
    }

    public boolean search(String word) {
        // TODO: walk the path for word; return true only if it exists AND is marked as a word
        return false;
    }

    public List<String> startsWith(String prefix) {
        // TODO: walk to the node for prefix, then collect every complete word below it
        return new ArrayList<>();
    }
}`,
    },
    hints: [
      "insert: start at the root; for each character, create a child node if it doesn't exist, then move into it; mark the final node as a word",
      "search: reuse the same path-walking logic as insert, but don't create missing nodes — return false immediately if a character's edge doesn't exist",
      "startsWith: first walk to the node matching the prefix exactly (same logic as search, but don't check isWord yet); then recursively visit every descendant, collecting the accumulated string whenever you hit a node marked as a word",
      "Remember the key distinction the conceptual challenge tests: a node existing on a path is not the same as that node being a complete stored word",
    ],
    solution: {
      typescript: `class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false;
}

class Trie {
  private root = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) node.children.set(char, new TrieNode());
      node = node.children.get(char)!;
    }
    node.isWord = true;
  }

  search(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isWord;
  }

  startsWith(prefix: string): string[] {
    const node = this.findNode(prefix);
    if (!node) return [];
    const results: string[] = [];
    this.collectWords(node, prefix, results);
    return results;
  }

  private findNode(prefix: string): TrieNode | null {
    let node = this.root;
    for (const char of prefix) {
      const next = node.children.get(char);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  private collectWords(node: TrieNode, prefix: string, results: string[]): void {
    if (node.isWord) results.push(prefix);
    for (const [char, child] of node.children) {
      this.collectWords(child, prefix + char, results);
    }
  }
}`,
      python: `class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_word = True

    def search(self, word: str) -> bool:
        node = self._find_node(word)
        return node is not None and node.is_word

    def starts_with(self, prefix: str) -> list[str]:
        node = self._find_node(prefix)
        if node is None:
            return []
        results: list[str] = []
        self._collect_words(node, prefix, results)
        return results

    def _find_node(self, prefix: str) -> TrieNode | None:
        node = self.root
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        return node

    def _collect_words(self, node: TrieNode, prefix: str, results: list[str]) -> None:
        if node.is_word:
            results.append(prefix)
        for char, child in node.children.items():
            self._collect_words(child, prefix + char, results)`,
      java: `import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class Trie {
    private static class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        boolean isWord = false;
    }

    private final TrieNode root = new TrieNode();

    public void insert(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            node = node.children.computeIfAbsent(c, k -> new TrieNode());
        }
        node.isWord = true;
    }

    public boolean search(String word) {
        TrieNode node = findNode(word);
        return node != null && node.isWord;
    }

    public List<String> startsWith(String prefix) {
        TrieNode node = findNode(prefix);
        List<String> results = new ArrayList<>();
        if (node == null) return results;
        collectWords(node, prefix, results);
        return results;
    }

    private TrieNode findNode(String prefix) {
        TrieNode node = root;
        for (char c : prefix.toCharArray()) {
            node = node.children.get(c);
            if (node == null) return null;
        }
        return node;
    }

    private void collectWords(TrieNode node, String prefix, List<String> results) {
        if (node.isWord) results.add(prefix);
        for (Map.Entry<Character, TrieNode> entry : node.children.entrySet()) {
            collectWords(entry.getValue(), prefix + entry.getKey(), results);
        }
    }
}`,
    },
  },
  {
    type: "system-design",
    id: "trie-system-design",
    required: false,
    title: "Scaling Autocomplete for a 50-Million-Product Catalog",
    scenario: `You're building search-box autocomplete for an e-commerce platform with 50 million product titles. A naive in-memory trie over every product title, one node per character with a HashMap<Character, TrieNode> at each node, is using far more memory than the raw product title data itself — several times more, and it's becoming a real cost and scaling concern.

Diagnose why a plain trie uses so much memory for this dataset, and propose at least one concrete change to reduce it while keeping fast prefix lookups.`,
    hints: [
      "Where does a plain trie's memory overhead actually come from — is it the strings themselves, or something else per node?",
      "What happens to the overhead ratio for a long chain of single-child nodes (e.g. a product title with a long common prefix shared by few other products)?",
      "Does every single character of every product title need to be an individually addressable node for the autocomplete use case, specifically?",
      "Is an in-memory trie over all 50 million titles the only architecture that supports fast prefix queries at this point, or are there alternatives worth considering for this scale?",
    ],
    discussionPoints: [
      "**Root cause:** Each TrieNode carries its own HashMap (or similar), which has real per-instance overhead (bucket array, entry objects, hash codes) far larger than a single character. For long chains of single-child nodes — common whenever a long prefix is shared by only one or two products — that per-node overhead is paid repeatedly for very little informational content.",
      "**Radix tree / PATRICIA compression:** Collapse chains of single-child nodes into one edge labeled with a multi-character string instead of one edge per character. This directly addresses the long-single-child-chain case, often cutting node count (and therefore overhead) dramatically, at the cost of slightly more complex insert/split logic when a new key diverges partway through a compressed edge.",
      "**Smaller per-node structure:** Replace a HashMap per node with a more compact representation — a sorted array of (character, child) pairs for nodes with few children, reserving a full lookup table only for nodes that are actually densely branching (common near the root, rare deeper in).",
      "**Rethink what needs to be in-memory at full scale:** For 50M titles, consider whether the full trie needs to live in one process's memory at all — an FST-based structure (as Elasticsearch's Completion Suggester uses) trades mutability for a much smaller memory footprint by also sharing suffixes, not just prefixes, which is a different structure from a trie but solves the same prefix-query problem at lower memory cost for static or batch-rebuilt datasets.",
      "**Don't over-rotate:** If query latency is already acceptable and the memory cost, while high, is within budget, the 'textbook-correct' optimization isn't automatically worth the implementation complexity — this is a real tradeoff discussion, not a mandate to always use the fanciest structure.",
    ],
  },
];
