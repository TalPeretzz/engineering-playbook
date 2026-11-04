import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const readThrough: TopicDefinition = {
  id: "read-through",
  slug: "read-through",
  title: "Read-Through",
  summary:
    "A caching strategy where the cache itself is responsible for loading missing data from the database, transparent to the application.",
  categories: ["caching"],
  tags: ["caching", "read-path"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: ["cache-aside"],
  relatedTopics: ["cache-aside", "write-through"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
