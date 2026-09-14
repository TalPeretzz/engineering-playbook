import { describe, it, expect } from "vitest";
import { nextAvailableTopicId, prevAvailableTopicId, topicsById } from "@engineering-playbook/content";

describe("nextAvailableTopicId / prevAvailableTopicId", () => {
  it("nextAvailableFrom skips coming-soon topics", () => {
    // consistent-hashing is followed by seven coming-soon practical-data-structures topics
    // before the next available one (idempotency, in distributed-systems).
    const nextId = nextAvailableTopicId("consistent-hashing");
    expect(nextId).not.toBeNull();
    expect(topicsById[nextId!].availability).toBe("available");
    expect(nextId).toBe("idempotency");
  });

  it("prevAvailableFrom skips coming-soon topics", () => {
    const prevId = prevAvailableTopicId("idempotency");
    expect(prevId).not.toBeNull();
    expect(topicsById[prevId!].availability).toBe("available");
    expect(prevId).toBe("consistent-hashing");
  });

  it("never returns the current topic itself", () => {
    for (const id of ["bloom-filter", "lru-cache", "consistent-hashing", "idempotency", "rate-limiter"]) {
      expect(nextAvailableTopicId(id)).not.toBe(id);
      expect(prevAvailableTopicId(id)).not.toBe(id);
    }
  });

  it("returns null when no next available topic exists (last available topic in curriculum order)", () => {
    // rate-limiter is the last available topic; everything after it is coming-soon.
    expect(nextAvailableTopicId("rate-limiter")).toBeNull();
  });

  it("returns null when no previous available topic exists (first topic in curriculum order)", () => {
    expect(prevAvailableTopicId("bloom-filter")).toBeNull();
  });

  it("returns null for an id that isn't in the curriculum order at all", () => {
    expect(nextAvailableTopicId("not-a-real-topic-id")).toBeNull();
    expect(prevAvailableTopicId("not-a-real-topic-id")).toBeNull();
  });
});
