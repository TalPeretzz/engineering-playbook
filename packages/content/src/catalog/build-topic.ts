import type { Topic, TopicCategory, TopicDefinition } from "@engineering-playbook/content-schema";

/**
 * Transitional compat shim. `Topic.category` is a single value and
 * `Topic.nextTopics` is authored, not curriculum-derived — both properties
 * predate this catalog and are still what Sidebar/Dashboard/TopicPage read.
 * Remove this map (and switch those components to `categories[]` /
 * curriculum-based prev-next) when TopicPage adopts the catalog for
 * navigation — see docs/architecture/catalog-refactor-plan.md §4.5, §11.
 */
const LEGACY_TOPIC_OVERRIDES: Record<string, { category: TopicCategory; nextTopics: string[] }> = {
  "bloom-filter": { category: "data-structures", nextTopics: ["lru-cache", "consistent-hashing"] },
  "lru-cache": { category: "data-structures", nextTopics: ["consistent-hashing"] },
  "consistent-hashing": {
    category: "distributed-systems",
    nextTopics: ["replication", "rate-limiter"],
  },
  idempotency: {
    category: "backend-patterns",
    nextTopics: ["outbox-pattern", "saga-pattern", "rate-limiter"],
  },
  "rate-limiter": { category: "backend-patterns", nextTopics: ["idempotency", "circuit-breaker"] },
};

/** Builds the legacy `Topic` view model consumed by existing components from a `TopicDefinition`. */
export function buildTopic(definition: TopicDefinition): Topic {
  const override = LEGACY_TOPIC_OVERRIDES[definition.id];
  const lesson = definition.lesson;

  return {
    slug: definition.slug,
    title: definition.title,
    description: definition.summary,
    category: override?.category ?? (definition.categories[0] as TopicCategory),
    difficulty: definition.difficulty,
    estimatedMinutes: definition.estimatedMinutes,
    prerequisites: definition.prerequisites,
    nextTopics: override?.nextTopics ?? [],
    implementations: lesson?.implementations ?? {},
    sections: lesson?.sections ?? [],
    challenges: lesson?.challenges ?? [],
  };
}
