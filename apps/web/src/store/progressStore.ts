import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";
import type { TopicProgress, TopicStatus, UserProgress } from "@engineering-playbook/shared-types";
import {
  allTopicDefinitions,
  curriculum,
  learningPaths,
  derivedTopicOrder,
  topicsById as definitionsById,
} from "@engineering-playbook/content";
import { migrateProgress, createDefaultProgress } from "@/utils/progressMigration";

const STORAGE_KEY = "engineering-playbook:progress";

const SLUG_TO_ID: Record<string, string> = Object.fromEntries(
  allTopicDefinitions.map((definition) => [definition.slug, definition.id])
);
const ID_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_ID).map(([slug, id]) => [id, slug])
);

export type GroupProgress = { completed: number; available: number; percent: number };
export type PathProgress = GroupProgress & { nextRecommendedId: string | null };

/** Shared "no data yet" value — one instance, so every consumer's default is reference-equal. */
export const EMPTY_PATH_PROGRESS: PathProgress = { completed: 0, available: 0, percent: 0, nextRecommendedId: null };

/** Topic ids equal slugs for every topic today; this indirection is what lets a future slug rename keep old progress. */
function resolveId(slug: string): string {
  return SLUG_TO_ID[slug] ?? slug;
}

/**
 * Shape `getProgress()` returns, for consumers (Dashboard.tsx) that read
 * `.topics`/`.lastVisitedTopic` directly instead of going through the
 * slug-based accessor functions below — Dashboard still does this even
 * after its catalog-architecture rewrite. Collapse into the id-keyed
 * `UserProgress` shape if/when that call site is refactored.
 */
type LegacyUserProgress = {
  topics: Record<string, TopicProgress>;
  preferredLanguage: ProgrammingLanguage;
  lastVisitedTopic: string | null;
};

// ---------------------------------------------------------------------------
// Same-tab reactivity. `window`'s `storage` event only fires in *other* tabs,
// so components that read progress once (on mount / pathname change) go
// stale after a write in the same tab (e.g. completing a challenge doesn't
// live-update the sidebar or dashboard until navigation). Every mutating
// method below notifies this store's listeners after a successful save.
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();

/** Subscribe to same-tab progress changes. Returns an unsubscribe function. */
export function subscribeToProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

export type ProgressStore = ReturnType<typeof createProgressStore>;

/** `onChange`, when provided, fires after every successful `save()` — used to wire same-tab reactivity for the app singleton. Test stores omit it. */
export function createProgressStore(storage: Storage, onChange?: () => void) {
  function load(): UserProgress {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultProgress();
      return migrateProgress(JSON.parse(raw));
    } catch {
      return createDefaultProgress();
    }
  }

  function save(progress: UserProgress): void {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    onChange?.();
  }

  return {
    getProgress(): LegacyUserProgress {
      const progress = load();
      const topics: Record<string, TopicProgress> = {};
      for (const [id, topicProgress] of Object.entries(progress.topicsById)) {
        topics[ID_TO_SLUG[id] ?? id] = topicProgress;
      }
      return {
        topics,
        preferredLanguage: progress.preferredLanguage,
        lastVisitedTopic: progress.lastVisitedTopicId
          ? (ID_TO_SLUG[progress.lastVisitedTopicId] ?? progress.lastVisitedTopicId)
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
      return ID_TO_SLUG[progress.lastVisitedTopicId] ?? progress.lastVisitedTopicId;
    },

    getOverallProgress(totalTopics: number): { completed: number; total: number; percent: number } {
      const progress = load();
      const completed = Object.values(progress.topicsById).filter((t) => t.status === "completed").length;
      const percent = totalTopics === 0 ? 0 : Math.round((completed / totalTopics) * 100);
      return { completed, total: totalTopics, percent };
    },

    /** Progress within one category, counting only `available` topics against the denominator. */
    getCategoryProgress(categoryId: string): GroupProgress {
      const progress = load();
      const available = (curriculum.topicsInCategory[categoryId] ?? [])
        .map((id) => definitionsById[id])
        .filter((t) => t?.availability === "available");
      const completed = available.filter((t) => progress.topicsById[t.id]?.status === "completed").length;
      const percent = available.length === 0 ? 0 : Math.round((completed / available.length) * 100);
      return { completed, available: available.length, percent };
    },

    /** Progress within one learning path, plus the first not-completed available topic in path order. */
    getPathProgress(pathId: string): PathProgress {
      const path = learningPaths.find((p) => p.id === pathId);
      if (!path) return EMPTY_PATH_PROGRESS;

      const progress = load();
      const available = path.topicIds.map((id) => definitionsById[id]).filter((t) => t?.availability === "available");
      const completed = available.filter((t) => progress.topicsById[t.id]?.status === "completed").length;
      const percent = available.length === 0 ? 0 : Math.round((completed / available.length) * 100);
      const nextRecommendedId =
        available.find((t) => (progress.topicsById[t.id]?.status ?? "not-started") !== "completed")?.id ?? null;
      return { completed, available: available.length, percent, nextRecommendedId };
    },

    /**
     * First `available`, not-completed topic in curriculum order after `afterId`
     * (or from the very start when `afterId` is null). Skips coming-soon and
     * already-completed topics — unlike `nextAvailableTopicId`, which only skips
     * coming-soon ones and can re-recommend something the user already finished.
     */
    getRecommendedNextTopicId(afterId: string | null): string | null {
      const progress = load();
      let startIndex = -1;
      if (afterId !== null) {
        startIndex = derivedTopicOrder.indexOf(afterId);
        if (startIndex === -1) return null; // afterId isn't a real topic — mirrors nextAvailableFrom's behavior
      }
      for (let j = startIndex + 1; j < derivedTopicOrder.length; j++) {
        const candidate = definitionsById[derivedTopicOrder[j]];
        if (!candidate || candidate.availability !== "available") continue;
        const status = progress.topicsById[candidate.id]?.status ?? "not-started";
        if (status !== "completed") return candidate.id;
      }
      return null;
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
      save(createDefaultProgress());
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

const _store = createProgressStore(getSafeStorage(), notifyListeners);

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
export const getCategoryProgress = _store.getCategoryProgress.bind(_store);
export const getPathProgress = _store.getPathProgress.bind(_store);
export const getRecommendedNextTopicId = _store.getRecommendedNextTopicId.bind(_store);
export const getCollapsedCategories = _store.getCollapsedCategories.bind(_store);
export const setCollapsedCategories = _store.setCollapsedCategories.bind(_store);
export const resetProgress = _store.resetProgress.bind(_store);
