import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const readThrough: TopicDefinition = {
  id: "read-through",
  slug: "read-through",
  title: "Read-Through",
  summary:
    "A caching strategy where the cache itself is responsible for loading missing data from the database, transparent to the application.",
  categories: ["caching"],
  tags: ["caching", "read-path"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
