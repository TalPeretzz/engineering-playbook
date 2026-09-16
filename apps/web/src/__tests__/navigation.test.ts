import { describe, it, expect } from "vitest";
import {
  nextAvailableTopicId,
  prevAvailableTopicId,
  topicsById,
} from "@engineering-playbook/content";

describe("nextAvailableTopicId / prevAvailableTopicId", () => {
  it("nextAvailableFrom skips coming-soon topics", () => {
    // consistent-hashing is followed by seven coming-soon practical-data-structures topics,
    // then six more coming-soon distributed-systems topics, before the next available one
    // (circuit-breaker).
    const nextId = nextAvailableTopicId("consistent-hashing");
    expect(nextId).not.toBeNull();
    expect(topicsById[nextId!].availability).toBe("available");
    expect(nextId).toBe("circuit-breaker");
  });

  it("prevAvailableFrom skips coming-soon topics", () => {
    const prevId = prevAvailableTopicId("circuit-breaker");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("consistent-hashing");
  });

  it("never returns the current topic itself", () => {
    for (const id of [
      "bloom-filter",
      "lru-cache",
      "consistent-hashing",
      "circuit-breaker",
      "retry-exponential-backoff",
      "idempotency",
      "rate-limiter",
      "pub-sub",
      "cache-aside",
      "strategy",
    ]) {
      expect(nextAvailableTopicId(id)).not.toBe(id);
      expect(prevAvailableTopicId(id)).not.toBe(id);
    }
  });

  it("finds the next available topic across categories", () => {
    // rate-limiter (distributed-systems) -> pub-sub (messaging).
    expect(nextAvailableTopicId("rate-limiter")).toBe("pub-sub");
    // cache-aside (caching) -> strategy (design-patterns), skipping caching's other
    // seven coming-soon topics.
    expect(nextAvailableTopicId("cache-aside")).toBe("strategy");
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
