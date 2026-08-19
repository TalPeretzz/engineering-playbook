import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";
import type { UserProgress, TopicProgress, TopicStatus } from "@engineering-playbook/shared-types";

const STORAGE_KEY = "engineering-playbook:progress";

export const DEFAULT_PROGRESS: UserProgress = {
  topics: {},
  preferredLanguage: "typescript",
  lastVisitedTopic: null,
};

// ---------------------------------------------------------------------------
// Testable factory — creates a store bound to a given Storage implementation.
// The app uses createProgressStore(localStorage); tests use an in-memory map.
// ---------------------------------------------------------------------------

export type ProgressStore = ReturnType<typeof createProgressStore>;

export function createProgressStore(storage: Storage) {
  function load(): UserProgress {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PROGRESS, topics: {} };
      return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PROGRESS, topics: {} };
    }
  }

  function save(progress: UserProgress): void {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  return {
    getProgress(): UserProgress {
      return load();
    },

    getTopicProgress(slug: string): TopicProgress {
      const progress = load();
      return progress.topics[slug] ?? { status: "not-started", completedChallenges: [] };
    },

    setTopicStatus(slug: string, status: TopicStatus): void {
      const progress = load();
      const existing = progress.topics[slug] ?? { status: "not-started", completedChallenges: [] };
      progress.topics[slug] = { ...existing, status };
      save(progress);
    },

    completeTopic(slug: string): void {
      this.setTopicStatus(slug, "completed");
    },

    markTopicInProgress(slug: string): void {
      const current = this.getTopicProgress(slug);
      if (current.status === "not-started") {
        this.setTopicStatus(slug, "in-progress");
      }
    },

    completeChallenge(topicSlug: string, challengeId: string): void {
      const progress = load();
      const existing = progress.topics[topicSlug] ?? { status: "not-started", completedChallenges: [] };
      if (!existing.completedChallenges.includes(challengeId)) {
        existing.completedChallenges = [...existing.completedChallenges, challengeId];
      }
      if (existing.status === "not-started") {
        existing.status = "in-progress";
      }
      progress.topics[topicSlug] = existing;
      save(progress);
    },

    setPreferredLanguage(language: ProgrammingLanguage): void {
      const progress = load();
      progress.preferredLanguage = language;
      save(progress);
    },

    getPreferredLanguage(): ProgrammingLanguage {
      return load().preferredLanguage;
    },

    setLastVisitedTopic(slug: string): void {
      const progress = load();
      progress.lastVisitedTopic = slug;
      save(progress);
    },

    getLastVisitedTopic(): string | null {
      return load().lastVisitedTopic;
    },

    getOverallProgress(totalTopics: number): { completed: number; total: number; percent: number } {
      const progress = load();
      const completed = Object.values(progress.topics).filter((t) => t.status === "completed").length;
      const percent = totalTopics === 0 ? 0 : Math.round((completed / totalTopics) * 100);
      return { completed, total: totalTopics, percent };
    },

    resetProgress(): void {
      save({ ...DEFAULT_PROGRESS, topics: {} });
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton bound to window.localStorage for app use.
// Safe to import in SSR contexts — functions are no-ops when window is absent.
// ---------------------------------------------------------------------------

function getSafeStorage(): Storage {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  // SSR / test fallback: in-memory storage
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => { mem.set(k, v); },
    removeItem: (k) => { mem.delete(k); },
    clear: () => { mem.clear(); },
    get length() { return mem.size; },
    key: (i) => [...mem.keys()][i] ?? null,
  };
}

const _store = createProgressStore(getSafeStorage());

export const getProgress = _store.getProgress.bind(_store);
export const getTopicProgress = _store.getTopicProgress.bind(_store);
export const setTopicStatus = _store.setTopicStatus.bind(_store);
export const completeTopic = _store.completeTopic.bind(_store);
export const markTopicInProgress = _store.markTopicInProgress.bind(_store);
export const completeChallenge = _store.completeChallenge.bind(_store);
export const setPreferredLanguage = _store.setPreferredLanguage.bind(_store);
export const getPreferredLanguage = _store.getPreferredLanguage.bind(_store);
export const setLastVisitedTopic = _store.setLastVisitedTopic.bind(_store);
export const getLastVisitedTopic = _store.getLastVisitedTopic.bind(_store);
export const getOverallProgress = _store.getOverallProgress.bind(_store);
export const resetProgress = _store.resetProgress.bind(_store);
