import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const cacheInvalidation: TopicDefinition = {
  id: "cache-invalidation",
  slug: "cache-invalidation",
  title: "Cache Invalidation",
  summary:
    "Strategies for removing or updating stale cache entries when the underlying data changes.",
  categories: ["caching"],
  tags: ["caching", "consistency"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
