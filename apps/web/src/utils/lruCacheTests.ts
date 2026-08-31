import type { TestCase } from "./testRunner";

export const lruCacheTests: TestCase[] = [
  {
    name: "Basic insertion and retrieval",
    run: (LRUCache) => {
      const cache = new LRUCache(2);
      cache.put(1, 10);
      cache.put(2, 20);
      return cache.get(1) === 10 && cache.get(2) === 20;
    },
  },
  {
    name: "Cache miss returns -1",
    run: (LRUCache) => {
      const cache = new LRUCache(2);
      return cache.get(42) === -1 && cache.get(0) === -1;
    },
  },
  {
    name: "LRU eviction — least recently used is removed",
    run: (LRUCache) => {
      const cache = new LRUCache(2);
      cache.put(1, 1);
      cache.put(2, 2);
      cache.put(3, 3); // evicts key 1 (LRU)
      return cache.get(1) === -1 && cache.get(2) === 2 && cache.get(3) === 3;
    },
  },
  {
    name: "get() updates recency — promoted key is not evicted next",
    run: (LRUCache) => {
      const cache = new LRUCache(2);
      cache.put(1, 1);
      cache.put(2, 2);
      cache.get(1);    // key 1 becomes MRU; key 2 becomes LRU
      cache.put(3, 3); // evicts key 2 (LRU)
      return cache.get(1) === 1 && cache.get(2) === -1 && cache.get(3) === 3;
    },
  },
  {
    name: "put() on an existing key updates its value",
    run: (LRUCache) => {
      const cache = new LRUCache(2);
      cache.put(1, 1);
      cache.put(1, 100); // overwrite key 1
      return cache.get(1) === 100;
    },
  },
  {
    name: "put() on an existing key promotes it to MRU",
    run: (LRUCache) => {
      const cache = new LRUCache(2);
      cache.put(1, 1);
      cache.put(2, 2);
      cache.put(1, 100); // update key 1 → becomes MRU; key 2 becomes LRU
      cache.put(3, 3);   // evicts key 2 (LRU)
      return cache.get(1) === 100 && cache.get(2) === -1 && cache.get(3) === 3;
    },
  },
  {
    name: "Capacity of 1 — every put evicts the previous entry",
    run: (LRUCache) => {
      const cache = new LRUCache(1);
      cache.put(1, 1);
      cache.put(2, 2);
      return cache.get(1) === -1 && cache.get(2) === 2;
    },
  },
  {
    name: "Multiple sequential evictions",
    run: (LRUCache) => {
      const cache = new LRUCache(3);
      cache.put(1, 1);
      cache.put(2, 2);
      cache.put(3, 3);
      cache.put(4, 4); // evicts 1
      cache.put(5, 5); // evicts 2
      return (
        cache.get(1) === -1 &&
        cache.get(2) === -1 &&
        cache.get(3) === 3 &&
        cache.get(4) === 4 &&
        cache.get(5) === 5
      );
    },
  },
  {
    name: "Cache size never exceeds capacity",
    run: (LRUCache) => {
      const cache = new LRUCache(3);
      for (let i = 0; i < 10; i++) cache.put(i, i * 10);
      let hits = 0;
      for (let i = 0; i < 10; i++) {
        if (cache.get(i) !== -1) hits++;
      }
      return hits <= 3;
    },
  },
  {
    name: "Constructor rejects capacity ≤ 0",
    run: (LRUCache) => {
      let threw0 = false;
      let threwNeg = false;
      try { new LRUCache(0); } catch (e) { threw0 = true; }
      try { new LRUCache(-1); } catch (e) { threwNeg = true; }
      return threw0 && threwNeg;
    },
  },
];
