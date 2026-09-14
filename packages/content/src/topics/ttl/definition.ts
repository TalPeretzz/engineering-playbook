import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const ttl: TopicDefinition = {
  id: "ttl",
  slug: "ttl",
  title: "TTL (Time-to-Live)",
  summary: "An expiration policy that automatically evicts cached entries after a fixed duration.",
  categories: ["caching"],
  tags: ["caching", "expiration"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "beginner",
  estimatedMinutes: 10,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
