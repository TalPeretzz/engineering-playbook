import { describe, it, expect } from "vitest";
import {
  nextAvailableTopicId,
  prevAvailableTopicId,
  derivedTopicOrder,
  topicsById,
} from "@engineering-playbook/content";

describe("nextAvailableTopicId / prevAvailableTopicId", () => {
  it("returns the next available topic in curriculum order", () => {
    const nextId = nextAvailableTopicId("consistent-hashing");
    expect(nextId).not.toBeNull();
    expect(topicsById[nextId!].availability).toBe("available");
    expect(nextId).toBe("trie");
  });

  it("returns the previous available topic in curriculum order", () => {
    const prevId = prevAvailableTopicId("circuit-breaker");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("heartbeats");
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
    expect(nextAvailableTopicId("distributed-cache")).toBe("strategy");
  });

  it("returns null when no next available topic exists (last available topic in curriculum order)", () => {
    const lastId = derivedTopicOrder.at(-1)!;
    expect(nextAvailableTopicId(lastId)).toBeNull();
  });

  it("returns null when no previous available topic exists (first topic in curriculum order)", () => {
    expect(prevAvailableTopicId("bloom-filter")).toBeNull();
  });

  it("returns null for an id that isn't in the curriculum order at all", () => {
    expect(nextAvailableTopicId("not-a-real-topic-id")).toBeNull();
    expect(prevAvailableTopicId("not-a-real-topic-id")).toBeNull();
  });
});
