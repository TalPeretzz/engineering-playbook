import type { Topic } from "@engineering-playbook/content-schema";
import { allTopicDefinitions } from "./topics";
import { buildTopic, contentAreas, categories, curriculum, learningPaths, deriveTopicOrder } from "./catalog";

export { contentAreas, categories, curriculum, learningPaths };
export { allTopicDefinitions };

export const derivedTopicOrder: string[] = deriveTopicOrder(curriculum);

export const topicsById: Record<string, (typeof allTopicDefinitions)[number]> = Object.fromEntries(
  allTopicDefinitions.map((definition) => [definition.id, definition])
);

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
