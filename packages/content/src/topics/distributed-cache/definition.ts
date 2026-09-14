import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const distributedCache: TopicDefinition = {
  id: "distributed-cache",
  slug: "distributed-cache",
  title: "Distributed Cache",
  summary: "A cache shared across multiple application instances, typically backed by a system like Redis or Memcached.",
  categories: ["caching"],
  tags: ["caching", "scalability"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
