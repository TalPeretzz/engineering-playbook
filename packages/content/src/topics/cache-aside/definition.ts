import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const cacheAside: TopicDefinition = {
  id: "cache-aside",
  slug: "cache-aside",
  title: "Cache-Aside",
  summary:
    "The most common caching pattern: the application checks the cache first, and on a miss, loads from the database and populates the cache.",
  categories: ["caching"],
  tags: ["caching", "read-path"],
  depth: "flagship",
  availability: "coming-soon",
  difficulty: "beginner",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
