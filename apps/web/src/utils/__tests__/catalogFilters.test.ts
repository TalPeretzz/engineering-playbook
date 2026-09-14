import { describe, it, expect } from "vitest";
import { allTopicDefinitions, categories } from "@engineering-playbook/content";
import { filterCatalog, matchesFilters, DEFAULT_FILTER_STATE } from "../catalogFilters";

const CATEGORY_TITLES: Record<string, string> = Object.fromEntries(categories.map((c) => [c.id, c.title]));

describe("filterCatalog / matchesFilters", () => {
  it("search matches title case-insensitively", () => {
    const results = filterCatalog(allTopicDefinitions, { ...DEFAULT_FILTER_STATE, search: "BLOOM filter" }, CATEGORY_TITLES);
    expect(results.map((t) => t.id)).toContain("bloom-filter");
  });

  it("search matches summary case-insensitively", () => {
    // lru-cache's summary contains "Least Recently Used"
    const results = filterCatalog(allTopicDefinitions, { ...DEFAULT_FILTER_STATE, search: "least recently used" }, CATEGORY_TITLES);
    expect(results.map((t) => t.id)).toContain("lru-cache");
  });

  it("search matches tags case-insensitively", () => {
    // hyperloglog is tagged "cardinality-estimation"
    const results = filterCatalog(allTopicDefinitions, { ...DEFAULT_FILTER_STATE, search: "CARDINALITY" }, CATEGORY_TITLES);
    expect(results.map((t) => t.id)).toContain("hyperloglog");
  });

  it("search matches category title case-insensitively", () => {
    const results = filterCatalog(allTopicDefinitions, { ...DEFAULT_FILTER_STATE, search: "MESSAGING" }, CATEGORY_TITLES);
    expect(results.map((t) => t.id)).toContain("pub-sub");
  });

  it("a multi-category topic appears exactly once, regardless of which of its categories is filtered on", () => {
    // lru-cache belongs to both practical-data-structures and caching.
    const byPds = filterCatalog(allTopicDefinitions, { ...DEFAULT_FILTER_STATE, categoryId: "practical-data-structures" }, CATEGORY_TITLES);
    const byCaching = filterCatalog(allTopicDefinitions, { ...DEFAULT_FILTER_STATE, categoryId: "caching" }, CATEGORY_TITLES);
    expect(byPds.filter((t) => t.id === "lru-cache")).toHaveLength(1);
    expect(byCaching.filter((t) => t.id === "lru-cache")).toHaveLength(1);
  });

  it("never returns duplicate ids for any filter combination", () => {
    const results = filterCatalog(allTopicDefinitions, DEFAULT_FILTER_STATE, CATEGORY_TITLES);
    const ids = results.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("combines difficulty + depth + availability filters as an intersection", () => {
    const results = filterCatalog(
      allTopicDefinitions,
      { ...DEFAULT_FILTER_STATE, difficulty: "advanced", depth: "flagship", availability: "coming-soon" },
      CATEGORY_TITLES
    );
    expect(results.map((t) => t.id).sort()).toEqual(["hyperloglog", "outbox-pattern", "saga-pattern"]);
  });

  it("returns false when only some facets match", () => {
    const bloomFilter = allTopicDefinitions.find((t) => t.id === "bloom-filter")!;
    // bloom-filter is intermediate/flagship/available — asking for advanced excludes it.
    expect(matchesFilters(bloomFilter, { ...DEFAULT_FILTER_STATE, difficulty: "advanced" }, CATEGORY_TITLES)).toBe(false);
  });

  it("an empty search matches everything (no facets active)", () => {
    const results = filterCatalog(allTopicDefinitions, DEFAULT_FILTER_STATE, CATEGORY_TITLES);
    expect(results.length).toBe(allTopicDefinitions.length);
  });
});
