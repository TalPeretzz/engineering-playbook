import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const distributedLock: TopicDefinition = {
  id: "distributed-lock",
  slug: "distributed-lock",
  title: "Distributed Lock",
  summary:
    "A mechanism that ensures only one process across a cluster can hold a resource at a time.",
  categories: ["distributed-systems"],
  tags: ["coordination", "concurrency"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: ["quorum", "leader-election", "lease"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
