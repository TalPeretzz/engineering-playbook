import { describe, it, expect } from "vitest";
import { migrateProgress, DEFAULT_PROGRESS_V2 } from "../progressMigration";

describe("migrateProgress", () => {
  it("returns the default v2 shape for null/absent input", () => {
    expect(migrateProgress(null)).toEqual(DEFAULT_PROGRESS_V2);
    expect(migrateProgress(undefined)).toEqual(DEFAULT_PROGRESS_V2);
  });

  it("passes a v2 payload through unchanged", () => {
    const v2 = {
      version: 2 as const,
      topicsById: { "bloom-filter": { status: "completed" as const, completedChallenges: ["ch-1"] } },
      collapsedCategories: ["caching"],
      preferredLanguage: "python" as const,
      lastVisitedTopicId: "bloom-filter",
    };
    expect(migrateProgress(v2)).toBe(v2);
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
    expect(migrated.topicsById["bloom-filter"]).toEqual({ status: "completed", completedChallenges: ["ch-1"] });
    expect(migrated.preferredLanguage).toBe("java");
    expect(migrated.lastVisitedTopicId).toBe("bloom-filter");
  });

  it("drops an unknown slug without crashing, keyed by the raw string", () => {
    const v1 = { topics: { "totally-unknown-topic": { status: "in-progress", completedChallenges: [] } } };
    const migrated = migrateProgress(v1);
    expect(migrated.topicsById["totally-unknown-topic"]).toEqual({ status: "in-progress", completedChallenges: [] });
  });

  it("defaults preferredLanguage and lastVisitedTopicId when absent from v1", () => {
    const migrated = migrateProgress({ topics: {} });
    expect(migrated.preferredLanguage).toBe("typescript");
    expect(migrated.lastVisitedTopicId).toBeNull();
  });
});
