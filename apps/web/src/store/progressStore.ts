import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";
import type { TopicProgress, TopicStatus, UserProgress } from "@engineering-playbook/shared-types";
import { allTopicDefinitions } from "@engineering-playbook/content";
import { migrateProgress, DEFAULT_PROGRESS_V2 } from "@/utils/progressMigration";

const STORAGE_KEY = "engineering-playbook:progress";

const SLUG_TO_ID: Record<string, string> = Object.fromEntries(
  allTopicDefinitions.map((definition) => [definition.slug, definition.id])
);

/** Topic ids equal slugs for every topic today; this indirection is what lets a future slug rename keep old progress. */
function resolveId(slug: string): string {
  return SLUG_TO_ID[slug] ?? slug;
}

/**
 * Shape `getProgress()` returns, for consumers (Dashboard.tsx) still reading
 * `.topics`/`.lastVisitedTopic` directly instead of going through the
 * slug-based accessor functions below. Remove once Dashboard is rewritten
 * (docs/architecture/catalog-refactor-plan.md §10, step 10).
 */
type LegacyUserProgress = {
  topics: Record<string, TopicProgress>;
  preferredLanguage: ProgrammingLanguage;
  lastVisitedTopic: string | null;
};

export type ProgressStore = ReturnType<typeof createProgressStore>;

export function createProgressStore(storage: Storage) {
  function load(): UserProgress {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PROGRESS_V2, topicsById: {} };
      return migrateProgress(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_PROGRESS_V2, topicsById: {} };
    }
  }

  function save(progress: UserProgress): void {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  return {
    getProgress(): LegacyUserProgress {
      const progress = load();
      const idToSlug = Object.fromEntries(Object.entries(SLUG_TO_ID).map(([slug, id]) => [id, slug]));
      const topics: Record<string, TopicProgress> = {};
      for (const [id, topicProgress] of Object.entries(progress.topicsById)) {
        topics[idToSlug[id] ?? id] = topicProgress;
      }
      return {
        topics,
        preferredLanguage: progress.preferredLanguage,
        lastVisitedTopic: progress.lastVisitedTopicId
          ? (idToSlug[progress.lastVisitedTopicId] ?? progress.lastVisitedTopicId)
          : null,
      };
    },

    getTopicProgress(slug: string): TopicProgress {
      const progress = load();
      return progress.topicsById[resolveId(slug)] ?? { status: "not-started", completedChallenges: [] };
    },

    setTopicStatus(slug: string, status: TopicStatus): void {
      const progress = load();
      const id = resolveId(slug);
      const existing = progress.topicsById[id] ?? { status: "not-started", completedChallenges: [] };
      progress.topicsById[id] = { ...existing, status };
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
      const id = resolveId(topicSlug);
      const existing = progress.topicsById[id] ?? { status: "not-started", completedChallenges: [] };
      if (!existing.completedChallenges.includes(challengeId)) {
        existing.completedChallenges = [...existing.completedChallenges, challengeId];
      }
      if (existing.status === "not-started") {
        existing.status = "in-progress";
      }
      progress.topicsById[id] = existing;
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
      progress.lastVisitedTopicId = resolveId(slug);
      save(progress);
    },

    getLastVisitedTopic(): string | null {
      const progress = load();
      if (!progress.lastVisitedTopicId) return null;
      const idToSlug = Object.fromEntries(Object.entries(SLUG_TO_ID).map(([slug, id]) => [id, slug]));
      return idToSlug[progress.lastVisitedTopicId] ?? progress.lastVisitedTopicId;
    },

    getOverallProgress(totalTopics: number): { completed: number; total: number; percent: number } {
      const progress = load();
      const completed = Object.values(progress.topicsById).filter((t) => t.status === "completed").length;
      const percent = totalTopics === 0 ? 0 : Math.round((completed / totalTopics) * 100);
      return { completed, total: totalTopics, percent };
    },

    getCollapsedCategories(): string[] {
      return load().collapsedCategories;
    },

    setCollapsedCategories(categoryIds: string[]): void {
      const progress = load();
      progress.collapsedCategories = categoryIds;
      save(progress);
    },

    resetProgress(): void {
      save({ ...DEFAULT_PROGRESS_V2, topicsById: {} });
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
export const getCollapsedCategories = _store.getCollapsedCategories.bind(_store);
export const setCollapsedCategories = _store.setCollapsedCategories.bind(_store);
export const resetProgress = _store.resetProgress.bind(_store);
