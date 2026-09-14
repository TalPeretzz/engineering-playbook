import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";
import type { TopicProgress, TopicStatus, UserProgress } from "@engineering-playbook/shared-types";
import { allTopicDefinitions } from "@engineering-playbook/content";

/** Always returns a fresh object — never share/export a single mutable default instance. */
export function createDefaultProgress(): UserProgress {
  return {
    version: 2,
    topicsById: {},
    collapsedCategories: [],
    preferredLanguage: "typescript",
    lastVisitedTopicId: null,
  };
}

const VALID_LANGUAGES: ProgrammingLanguage[] = ["typescript", "python", "java"];
const VALID_STATUSES: TopicStatus[] = ["not-started", "in-progress", "completed"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeLanguage(value: unknown): ProgrammingLanguage {
  return VALID_LANGUAGES.includes(value as ProgrammingLanguage)
    ? (value as ProgrammingLanguage)
    : "typescript";
}

/** Malformed shape falls back to a safe default rather than throwing or invalidating the rest of the record. */
function sanitizeTopicProgress(value: unknown): TopicProgress {
  const raw = isPlainObject(value) ? value : {};
  const status = VALID_STATUSES.includes(raw.status as TopicStatus)
    ? (raw.status as TopicStatus)
    : "not-started";
  const completedChallenges = Array.isArray(raw.completedChallenges)
    ? raw.completedChallenges.filter((id): id is string => typeof id === "string")
    : [];
  return { status, completedChallenges };
}

/** Each entry is sanitized independently — one corrupt topic doesn't drop the rest. */
function sanitizeTopicsById(value: unknown): Record<string, TopicProgress> {
  if (!isPlainObject(value)) return {};
  const result: Record<string, TopicProgress> = {};
  for (const [id, topicProgress] of Object.entries(value)) {
    if (typeof id !== "string" || id === "") continue;
    result[id] = sanitizeTopicProgress(topicProgress);
  }
  return result;
}

function sanitizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Validates and normalizes a v2-shaped payload field by field — never trusts it just because `version === 2`. */
function sanitizeV2(raw: Record<string, unknown>): UserProgress {
  return {
    version: 2,
    topicsById: sanitizeTopicsById(raw.topicsById),
    collapsedCategories: sanitizeStringArray(raw.collapsedCategories),
    preferredLanguage: sanitizeLanguage(raw.preferredLanguage),
    lastVisitedTopicId: typeof raw.lastVisitedTopicId === "string" ? raw.lastVisitedTopicId : null,
  };
}

type V1Progress = {
  topics?: Record<string, TopicProgress>;
  preferredLanguage?: ProgrammingLanguage;
  lastVisitedTopic?: string | null;
};

function buildSlugToIdMap(): Record<string, string> {
  return Object.fromEntries(
    allTopicDefinitions.map((definition) => [definition.slug, definition.id])
  );
}

/** Transparent v1 (slug-keyed) -> v2 (id-keyed) migration, run on every load. Validates and normalizes in both directions. */
export function migrateProgress(raw: unknown): UserProgress {
  if (!isPlainObject(raw)) return createDefaultProgress();

  if (raw.version === 2) return sanitizeV2(raw);

  const v1 = raw as V1Progress;
  const slugToId = buildSlugToIdMap();

  const topicsById: Record<string, TopicProgress> = {};
  for (const [oldKey, progress] of Object.entries(sanitizeTopicsById(v1.topics))) {
    const id = slugToId[oldKey] ?? oldKey;
    topicsById[id] = progress;
  }

  const lastVisitedTopic = typeof v1.lastVisitedTopic === "string" ? v1.lastVisitedTopic : null;

  return {
    version: 2,
    topicsById,
    collapsedCategories: [],
    preferredLanguage: sanitizeLanguage(v1.preferredLanguage),
    lastVisitedTopicId: lastVisitedTopic ? (slugToId[lastVisitedTopic] ?? lastVisitedTopic) : null,
  };
}
