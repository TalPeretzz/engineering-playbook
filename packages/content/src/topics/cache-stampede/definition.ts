import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const cacheStampede: TopicDefinition = {
  id: "cache-stampede",
  slug: "cache-stampede",
  title: "Cache Stampede",
  summary:
    "The failure mode where many requests miss the cache at the same time and hammer the database simultaneously, and the techniques used to prevent it.",
  categories: ["caching"],
  tags: ["caching", "reliability"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
