import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

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
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("distributed-lock", lessonSpecs["distributed-lock"]),
};
