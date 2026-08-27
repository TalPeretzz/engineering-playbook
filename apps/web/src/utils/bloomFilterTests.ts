import type { TestCase } from "./testRunner";

export const bloomFilterTests: TestCase[] = [
  {
    name: "Empty filter: has() returns false for uninserted elements",
    run: (BF) => {
      const f = new BF(100);
      return f.has("apple") === false && f.has("grape") === false && f.has("xyz") === false;
    },
  },
  {
    name: "has() returns true immediately after add()",
    run: (BF) => {
      const f = new BF(100);
      f.add("hello");
      return f.has("hello") === true;
    },
  },
  {
    name: "No false negatives — all inserted values remain detectable",
    run: (BF) => {
      const f = new BF(2000);
      const words = ["cat", "dog", "fish", "bird", "tree", "cloud", "river", "stone"];
      words.forEach((w) => f.add(w));
      return words.every((w) => f.has(w) === true);
    },
  },
  {
    name: "Multiple items coexist — adding one value does not hide another",
    run: (BF) => {
      const f = new BF(500);
      f.add("one");
      f.add("two");
      f.add("three");
      return f.has("one") === true && f.has("two") === true && f.has("three") === true;
    },
  },
];
