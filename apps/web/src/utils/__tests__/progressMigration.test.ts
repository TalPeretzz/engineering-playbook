import { describe, it, expect } from "vitest";
import { migrateProgress, createDefaultProgress } from "../progressMigration";

describe("migrateProgress", () => {
  it("returns the default v2 shape for null/absent input", () => {
    expect(migrateProgress(null)).toEqual(createDefaultProgress());
    expect(migrateProgress(undefined)).toEqual(createDefaultProgress());
  });

  it("returns an independent object each time — mutating one result never affects another", () => {
    const a = migrateProgress(null);
    a.topicsById["bloom-filter"] = { status: "completed", completedChallenges: [] };
    const b = migrateProgress(null);
    expect(b.topicsById).toEqual({});
  });

  it("passes a well-formed v2 payload through with equivalent values", () => {
    const v2 = {
      version: 2 as const,
      topicsById: {
        "bloom-filter": { status: "completed" as const, completedChallenges: ["ch-1"] },
      },
      collapsedCategories: ["caching"],
      preferredLanguage: "python" as const,
      lastVisitedTopicId: "bloom-filter",
    };
    expect(migrateProgress(v2)).toEqual(v2);
  });

  it("migrates v1 topics (slug-keyed) to v2 topicsById (id-keyed)", () => {
    const v1 = {
      topics: { "bloom-filter": { status: "completed", completedChallenges: ["ch-1"] } },
      preferredLanguage: "java",
      lastVisitedTopic: "bloom-filter",
    };
    const migrated = migrateProgress(v1);
    expect(migrated.version).toBe(2);
    // bloom-filter's id equals its slug today, so this is an identity mapping.
    expect(migrated.topicsById["bloom-filter"]).toEqual({
      status: "completed",
      completedChallenges: ["ch-1"],
    });
    expect(migrated.preferredLanguage).toBe("java");
    expect(migrated.lastVisitedTopicId).toBe("bloom-filter");
  });

  it("drops an unknown slug without crashing, keyed by the raw string", () => {
    const v1 = {
      topics: { "totally-unknown-topic": { status: "in-progress", completedChallenges: [] } },
    };
    const migrated = migrateProgress(v1);
    expect(migrated.topicsById["totally-unknown-topic"]).toEqual({
      status: "in-progress",
      completedChallenges: [],
    });
  });

  it("defaults preferredLanguage and lastVisitedTopicId when absent from v1", () => {
    const migrated = migrateProgress({ topics: {} });
    expect(migrated.preferredLanguage).toBe("typescript");
    expect(migrated.lastVisitedTopicId).toBeNull();
  });

  describe("runtime validation of corrupt data", () => {
    it("falls back to the default for non-object input (string, number, array)", () => {
      expect(migrateProgress("not an object")).toEqual(createDefaultProgress());
      expect(migrateProgress(42)).toEqual(createDefaultProgress());
      expect(migrateProgress([1, 2, 3])).toEqual(createDefaultProgress());
    });

    it("rejects an invalid preferredLanguage in a v2 payload", () => {
      const migrated = migrateProgress({ version: 2, preferredLanguage: "rust" });
      expect(migrated.preferredLanguage).toBe("typescript");
    });

    it("rejects an invalid status inside topicsById without dropping other topics", () => {
      const migrated = migrateProgress({
        version: 2,
        topicsById: {
          "bloom-filter": { status: "definitely-not-a-status", completedChallenges: [] },
          "lru-cache": { status: "completed", completedChallenges: ["ch-1"] },
        },
      });
      expect(migrated.topicsById["bloom-filter"].status).toBe("not-started");
      expect(migrated.topicsById["lru-cache"]).toEqual({
        status: "completed",
        completedChallenges: ["ch-1"],
      });
    });

    it("coerces a non-array completedChallenges to an empty array", () => {
      const migrated = migrateProgress({
        version: 2,
        topicsById: {
          "bloom-filter": { status: "in-progress", completedChallenges: "not-an-array" },
        },
      });
      expect(migrated.topicsById["bloom-filter"].completedChallenges).toEqual([]);
    });

    it("filters non-string entries out of completedChallenges", () => {
      const migrated = migrateProgress({
        version: 2,
        topicsById: {
          "bloom-filter": {
            status: "in-progress",
            completedChallenges: ["ch-1", 42, null, "ch-2"],
          },
        },
      });
      expect(migrated.topicsById["bloom-filter"].completedChallenges).toEqual(["ch-1", "ch-2"]);
    });

    it("coerces a non-object topicsById to an empty record", () => {
      const migrated = migrateProgress({ version: 2, topicsById: "not-an-object" });
      expect(migrated.topicsById).toEqual({});
    });

    it("coerces a non-array collapsedCategories to an empty array", () => {
      const migrated = migrateProgress({ version: 2, collapsedCategories: "caching" });
      expect(migrated.collapsedCategories).toEqual([]);
    });

    it("coerces a non-string lastVisitedTopicId to null", () => {
      const migrated = migrateProgress({ version: 2, lastVisitedTopicId: 123 });
      expect(migrated.lastVisitedTopicId).toBeNull();
    });
  });
});
