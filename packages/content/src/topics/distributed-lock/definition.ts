import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const distributedLock: TopicDefinition = {
  id: "distributed-lock",
  slug: "distributed-lock",
  title: "Distributed Lock",
  summary: "A mechanism that ensures only one process across a cluster can hold a resource at a time.",
  categories: ["distributed-systems"],
  tags: ["coordination", "concurrency"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
