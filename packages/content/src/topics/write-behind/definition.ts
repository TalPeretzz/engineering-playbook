import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const writeBehind: TopicDefinition = {
  id: "write-behind",
  slug: "write-behind",
  title: "Write-Behind",
  summary:
    "A caching strategy that writes to the cache immediately and to the database asynchronously, trading durability risk for write speed.",
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
