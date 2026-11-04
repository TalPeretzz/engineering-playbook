import { describe, it, expect } from "vitest";
import {
  nextAvailableTopicId,
  prevAvailableTopicId,
  topicsById,
} from "@engineering-playbook/content";

describe("nextAvailableTopicId / prevAvailableTopicId", () => {
  it("nextAvailableFrom skips coming-soon topics", () => {
    // consistent-hashing -> trie directly (trie is the next topic in
    // practical-data-structures curriculum order and is now available).
    const nextId = nextAvailableTopicId("consistent-hashing");
    expect(nextId).not.toBeNull();
    expect(topicsById[nextId!].availability).toBe("available");
    expect(nextId).toBe("trie");
  });

  it("prevAvailableFrom skips coming-soon topics", () => {
    const prevId = prevAvailableTopicId("trie");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("consistent-hashing");
  });

  it("skips multiple coming-soon topics across two categories", () => {
    // trie is followed by six coming-soon practical-data-structures topics, then six
    // more coming-soon distributed-systems topics, before the next available one
    // (circuit-breaker).
    expect(nextAvailableTopicId("trie")).toBe("circuit-breaker");
  });

  it("never returns the current topic itself", () => {
    for (const id of [
      "bloom-filter",
      "lru-cache",
      "consistent-hashing",
      "trie",
      "circuit-breaker",
      "retry-exponential-backoff",
      "idempotency",
      "rate-limiter",
      "pub-sub",
      "cache-aside",
      "write-through",
      "write-behind",
      "read-through",
      "strategy",
    ]) {
      expect(nextAvailableTopicId(id)).not.toBe(id);
      expect(prevAvailableTopicId(id)).not.toBe(id);
    }
  });

  it("finds the next available topic across categories", () => {
    // rate-limiter (distributed-systems) -> pub-sub (messaging).
    expect(nextAvailableTopicId("rate-limiter")).toBe("pub-sub");
    // read-through (caching) -> strategy (design-patterns), skipping caching's other
    // four coming-soon topics.
    expect(nextAvailableTopicId("read-through")).toBe("strategy");
  });

  it("finds the next available topic within the same category", () => {
    // cache-aside -> write-through -> write-behind -> read-through, all in "caching".
    expect(nextAvailableTopicId("cache-aside")).toBe("write-through");
    expect(nextAvailableTopicId("write-through")).toBe("write-behind");
    expect(nextAvailableTopicId("write-behind")).toBe("read-through");
  });

  it("returns null when no next available topic exists (last available topic in curriculum order)", () => {
    // strategy (design-patterns, the final category) is the last available topic today.
    expect(nextAvailableTopicId("strategy")).toBeNull();
  });

  it("returns null when no previous available topic exists (first topic in curriculum order)", () => {
    expect(prevAvailableTopicId("bloom-filter")).toBeNull();
  });

  it("returns null for an id that isn't in the curriculum order at all", () => {
    expect(nextAvailableTopicId("not-a-real-topic-id")).toBeNull();
    expect(prevAvailableTopicId("not-a-real-topic-id")).toBeNull();
  });
});
