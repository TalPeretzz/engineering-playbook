import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const heapPriorityQueue: TopicDefinition = {
  id: "heap-priority-queue",
  slug: "heap-priority-queue",
  title: "Heap / Priority Queue",
  summary:
    "A tree-shaped structure that keeps the minimum (or maximum) element accessible in O(1), with O(log n) insert and removal.",
  categories: ["practical-data-structures"],
  tags: ["priority-queue", "scheduling"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: ["trie"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
