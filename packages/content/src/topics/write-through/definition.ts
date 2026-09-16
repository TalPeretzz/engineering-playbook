import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const writeThrough: TopicDefinition = {
  id: "write-through",
  slug: "write-through",
  title: "Write-Through",
  summary:
    "A caching strategy that writes to the cache and the database synchronously, keeping them always in sync at the cost of write latency.",
  categories: ["caching"],
  tags: ["caching", "write-path"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
