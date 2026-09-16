import type { Topic } from "@engineering-playbook/content-schema";
import { allTopicDefinitions } from "./topics";
import {
  buildTopic,
  contentAreas,
  categories,
  curriculum,
  learningPaths,
  deriveTopicOrder,
  nextAvailableFrom,
  prevAvailableFrom,
} from "./catalog";

export { contentAreas, categories, curriculum, learningPaths };
export { allTopicDefinitions };

export const derivedTopicOrder: string[] = deriveTopicOrder(curriculum);

export const topicsById: Record<string, (typeof allTopicDefinitions)[number]> = Object.fromEntries(
  allTopicDefinitions.map((definition) => [definition.id, definition])
);

/** Every topic (available or coming-soon) by slug — for route dispatch. `topicsBySlug` below is available-only. */
export const definitionsBySlug: Record<string, (typeof allTopicDefinitions)[number]> =
  Object.fromEntries(allTopicDefinitions.map((definition) => [definition.slug, definition]));

/** Next/previous `available` topic id in curriculum order, skipping coming-soon topics. */
export function nextAvailableTopicId(currentId: string): string | null {
  return nextAvailableFrom(currentId, derivedTopicOrder, topicsById);
}

export function prevAvailableTopicId(currentId: string): string | null {
  return prevAvailableFrom(currentId, derivedTopicOrder, topicsById);
}

/** Legacy view: only `available` topics, in the shape existing components expect. */
export const allTopics: Topic[] = allTopicDefinitions
  .filter((definition) => definition.availability === "available")
  .map(buildTopic);

export const topicsBySlug: Record<string, Topic> = Object.fromEntries(
  allTopics.map((t) => [t.slug, t])
);

// Named re-exports preserved for direct imports elsewhere in the app.
export const bloomFilter = topicsBySlug["bloom-filter"];
export const lruCache = topicsBySlug["lru-cache"];
export const consistentHashing = topicsBySlug["consistent-hashing"];
export const rateLimiter = topicsBySlug["rate-limiter"];
export const idempotency = topicsBySlug["idempotency"];
