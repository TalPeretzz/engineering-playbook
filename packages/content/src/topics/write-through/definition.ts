import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const writeThrough: TopicDefinition = {
  id: "write-through",
  slug: "write-through",
  title: "Write-Through",
  summary:
    "A caching strategy that writes to the cache and the database synchronously, keeping them always in sync at the cost of write latency.",
  categories: ["caching"],
  tags: ["caching", "write-path"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: ["cache-aside"],
  relatedTopics: ["cache-aside", "write-behind", "read-through"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
