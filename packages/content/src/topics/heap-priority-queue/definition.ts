import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

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
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("heap-priority-queue", lessonSpecs["heap-priority-queue"]),
};
