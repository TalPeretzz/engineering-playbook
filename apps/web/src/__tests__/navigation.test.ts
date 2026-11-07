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

  it("prevAvailableFrom skips skip-list (coming-soon) to reach trie", () => {
    const prevId = prevAvailableTopicId("heap-priority-queue");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("trie");
  });

  it("prevAvailableFrom bitmaps-bitsets reaches heap-priority-queue directly", () => {
    const prevId = prevAvailableTopicId("bitmaps-bitsets");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("heap-priority-queue");
  });

  it("prevAvailableFrom hyperloglog reaches bitmaps-bitsets directly", () => {
    const prevId = prevAvailableTopicId("hyperloglog");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("bitmaps-bitsets");
  });

  it("prevAvailableFrom count-min-sketch reaches hyperloglog directly", () => {
    const prevId = prevAvailableTopicId("count-min-sketch");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("hyperloglog");
  });

  it("prevAvailableFrom merkle-tree reaches count-min-sketch directly", () => {
    const prevId = prevAvailableTopicId("merkle-tree");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("count-min-sketch");
  });

  it("prevAvailableFrom leader-election reaches merkle-tree directly", () => {
    const prevId = prevAvailableTopicId("leader-election");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("merkle-tree");
  });

  it("prevAvailableFrom replication reaches leader-election directly", () => {
    const prevId = prevAvailableTopicId("replication");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("leader-election");
  });

  it("prevAvailableFrom sharding reaches replication directly", () => {
    const prevId = prevAvailableTopicId("sharding");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("replication");
  });

  it("prevAvailableFrom quorum reaches sharding directly", () => {
    const prevId = prevAvailableTopicId("quorum");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("sharding");
  });

  it("skips a single coming-soon topic (skip-list) to reach heap-priority-queue", () => {
    // trie -> skip-list (coming-soon, reference-depth, stays metadata-only) ->
    // heap-priority-queue (now available).
    expect(nextAvailableTopicId("trie")).toBe("heap-priority-queue");
  });

  it("finds the next available topic directly after heap-priority-queue (bitmaps-bitsets)", () => {
    expect(nextAvailableTopicId("heap-priority-queue")).toBe("bitmaps-bitsets");
  });

  it("finds the next available topic directly after bitmaps-bitsets (hyperloglog)", () => {
    expect(nextAvailableTopicId("bitmaps-bitsets")).toBe("hyperloglog");
  });

  it("finds the next available topic directly after hyperloglog (count-min-sketch)", () => {
    expect(nextAvailableTopicId("hyperloglog")).toBe("count-min-sketch");
  });

  it("finds the next available topic directly after count-min-sketch (merkle-tree)", () => {
    expect(nextAvailableTopicId("count-min-sketch")).toBe("merkle-tree");
  });

  it("finds the next available topic directly after merkle-tree (leader-election)", () => {
    // merkle-tree (last practical-data-structures topic) -> leader-election
    // (first topic in distributed-systems that isn't a dedup of
    // consistent-hashing, now available).
    expect(nextAvailableTopicId("merkle-tree")).toBe("leader-election");
  });

  it("finds the next available topic directly after leader-election (replication)", () => {
    expect(nextAvailableTopicId("leader-election")).toBe("replication");
  });

  it("finds the next available topic directly after replication (sharding)", () => {
    expect(nextAvailableTopicId("replication")).toBe("sharding");
  });

  it("finds the next available topic directly after sharding (quorum)", () => {
    expect(nextAvailableTopicId("sharding")).toBe("quorum");
  });

  it("skips multiple coming-soon topics across two categories", () => {
    // quorum is followed by two coming-soon distributed-systems topics
    // (gossip-protocol, heartbeats), before the next available one
    // (circuit-breaker).
    expect(nextAvailableTopicId("quorum")).toBe("circuit-breaker");
  });

  it("never returns the current topic itself", () => {
    for (const id of [
      "bloom-filter",
      "lru-cache",
      "consistent-hashing",
      "trie",
      "heap-priority-queue",
      "bitmaps-bitsets",
      "hyperloglog",
      "count-min-sketch",
      "merkle-tree",
      "leader-election",
      "replication",
      "sharding",
      "quorum",
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
