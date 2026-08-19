/**
 * Tests for progressStore.
 * Each test gets a fresh in-memory Storage instance — no mocking required.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createProgressStore } from "../progressStore";

function makeStorage(): Storage {
  const mem = new Map<string, string>();
  return {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
    clear: () => { mem.clear(); },
    get length() { return mem.size; },
    key: (i: number) => [...mem.keys()][i] ?? null,
  };
}

let store: ReturnType<typeof createProgressStore>;

beforeEach(() => {
  store = createProgressStore(makeStorage());
});

describe("getTopicProgress", () => {
  it("returns not-started for an unknown topic", () => {
    const p = store.getTopicProgress("unknown");
    expect(p.status).toBe("not-started");
    expect(p.completedChallenges).toEqual([]);
  });
});

describe("setTopicStatus", () => {
  it("sets in-progress", () => {
    store.setTopicStatus("bloom-filter", "in-progress");
    expect(store.getTopicProgress("bloom-filter").status).toBe("in-progress");
  });

  it("sets completed", () => {
    store.setTopicStatus("bloom-filter", "completed");
    expect(store.getTopicProgress("bloom-filter").status).toBe("completed");
  });
});

describe("completeTopic", () => {
  it("marks a topic completed", () => {
    store.completeTopic("lru-cache");
    expect(store.getTopicProgress("lru-cache").status).toBe("completed");
  });

  it("preserves completed challenges", () => {
    store.completeChallenge("lru-cache", "ch-1");
    store.completeTopic("lru-cache");
    const p = store.getTopicProgress("lru-cache");
    expect(p.status).toBe("completed");
    expect(p.completedChallenges).toContain("ch-1");
  });
});

describe("markTopicInProgress", () => {
  it("promotes a not-started topic to in-progress", () => {
    store.markTopicInProgress("bloom-filter");
    expect(store.getTopicProgress("bloom-filter").status).toBe("in-progress");
  });

  it("does not downgrade a completed topic", () => {
    store.completeTopic("bloom-filter");
    store.markTopicInProgress("bloom-filter");
    expect(store.getTopicProgress("bloom-filter").status).toBe("completed");
  });

  it("leaves an in-progress topic unchanged", () => {
    store.setTopicStatus("bloom-filter", "in-progress");
    store.markTopicInProgress("bloom-filter");
    expect(store.getTopicProgress("bloom-filter").status).toBe("in-progress");
  });
});

describe("completeChallenge", () => {
  it("adds the challenge id to completedChallenges", () => {
    store.completeChallenge("bloom-filter", "ch-conceptual");
    expect(store.getTopicProgress("bloom-filter").completedChallenges).toContain("ch-conceptual");
  });

  it("does not add duplicate challenge ids", () => {
    store.completeChallenge("bloom-filter", "ch-conceptual");
    store.completeChallenge("bloom-filter", "ch-conceptual");
    const ids = store.getTopicProgress("bloom-filter").completedChallenges.filter(
      (c) => c === "ch-conceptual"
    );
    expect(ids).toHaveLength(1);
  });

  it("sets topic to in-progress if it was not-started", () => {
    store.completeChallenge("bloom-filter", "ch-conceptual");
    expect(store.getTopicProgress("bloom-filter").status).toBe("in-progress");
  });

  it("does not downgrade a completed topic", () => {
    store.completeTopic("bloom-filter");
    store.completeChallenge("bloom-filter", "ch-impl");
    expect(store.getTopicProgress("bloom-filter").status).toBe("completed");
  });
});

describe("preferred language", () => {
  it("defaults to typescript", () => {
    expect(store.getPreferredLanguage()).toBe("typescript");
  });

  it("persists the selected language", () => {
    store.setPreferredLanguage("python");
    expect(store.getPreferredLanguage()).toBe("python");
  });

  it("can switch between languages", () => {
    store.setPreferredLanguage("java");
    store.setPreferredLanguage("typescript");
    expect(store.getPreferredLanguage()).toBe("typescript");
  });
});

describe("last visited topic", () => {
  it("returns null when nothing visited", () => {
    expect(store.getLastVisitedTopic()).toBeNull();
  });

  it("stores the last visited topic", () => {
    store.setLastVisitedTopic("bloom-filter");
    expect(store.getLastVisitedTopic()).toBe("bloom-filter");
  });

  it("overwrites the previous value", () => {
    store.setLastVisitedTopic("bloom-filter");
    store.setLastVisitedTopic("lru-cache");
    expect(store.getLastVisitedTopic()).toBe("lru-cache");
  });
});

describe("getOverallProgress", () => {
  it("returns 0% with no completed topics", () => {
    const s = store.getOverallProgress(5);
    expect(s.completed).toBe(0);
    expect(s.total).toBe(5);
    expect(s.percent).toBe(0);
  });

  it("calculates 40% for 2 of 5 completed", () => {
    store.completeTopic("bloom-filter");
    store.completeTopic("lru-cache");
    const s = store.getOverallProgress(5);
    expect(s.completed).toBe(2);
    expect(s.percent).toBe(40);
  });

  it("returns 100% when all topics are done", () => {
    store.completeTopic("a");
    store.completeTopic("b");
    store.completeTopic("c");
    expect(store.getOverallProgress(3).percent).toBe(100);
  });

  it("handles 0 total topics without dividing by zero", () => {
    expect(store.getOverallProgress(0).percent).toBe(0);
  });
});

describe("resetProgress", () => {
  it("resets all state to defaults", () => {
    store.completeTopic("bloom-filter");
    store.setPreferredLanguage("java");
    store.setLastVisitedTopic("lru-cache");
    store.resetProgress();
    expect(store.getTopicProgress("bloom-filter").status).toBe("not-started");
    expect(store.getPreferredLanguage()).toBe("typescript");
    expect(store.getLastVisitedTopic()).toBeNull();
  });
});

describe("persistence", () => {
  it("persists state across load() calls on the same store", () => {
    store.completeTopic("bloom-filter");
    store.setPreferredLanguage("python");
    const p = store.getProgress();
    expect(p.topics["bloom-filter"]?.status).toBe("completed");
    expect(p.preferredLanguage).toBe("python");
  });
});
