import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";
import type { TopicProgress, UserProgress } from "@engineering-playbook/shared-types";
import { allTopicDefinitions } from "@engineering-playbook/content";

export const DEFAULT_PROGRESS_V2: UserProgress = {
  version: 2,
  topicsById: {},
  collapsedCategories: [],
  preferredLanguage: "typescript",
  lastVisitedTopicId: null,
};

type V1Progress = {
  topics?: Record<string, TopicProgress>;
  preferredLanguage?: ProgrammingLanguage;
  lastVisitedTopic?: string | null;
};

function isV2(raw: unknown): raw is UserProgress {
  return typeof raw === "object" && raw !== null && (raw as { version?: unknown }).version === 2;
}

function buildSlugToIdMap(): Record<string, string> {
  return Object.fromEntries(allTopicDefinitions.map((definition) => [definition.slug, definition.id]));
}

/** Transparent v1 (slug-keyed) -> v2 (id-keyed) migration, run on every load. */
export function migrateProgress(raw: unknown): UserProgress {
  if (isV2(raw)) return raw;
  if (!raw || typeof raw !== "object") return DEFAULT_PROGRESS_V2;

  const v1 = raw as V1Progress;
  const slugToId = buildSlugToIdMap();

  const topicsById: Record<string, TopicProgress> = {};
  for (const [oldKey, progress] of Object.entries(v1.topics ?? {})) {
    const id = slugToId[oldKey] ?? oldKey;
    topicsById[id] = progress;
  }

  return {
    version: 2,
    topicsById,
    collapsedCategories: [],
    preferredLanguage: v1.preferredLanguage ?? "typescript",
    lastVisitedTopicId: v1.lastVisitedTopic ? (slugToId[v1.lastVisitedTopic] ?? v1.lastVisitedTopic) : null,
  };
}
