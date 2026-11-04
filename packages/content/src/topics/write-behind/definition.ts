import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const writeBehind: TopicDefinition = {
  id: "write-behind",
  slug: "write-behind",
  title: "Write-Behind",
  summary:
    "A caching strategy that writes to the cache immediately and to the database asynchronously, trading durability risk for write speed.",
  categories: ["caching"],
  tags: ["caching", "write-path"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: ["write-through"],
  relatedTopics: ["write-through", "cache-aside"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
