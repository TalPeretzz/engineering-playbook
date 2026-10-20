import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const writeThrough: TopicDefinition = {
  id: "write-through",
  slug: "write-through",
  title: "Write-Through",
  summary:
    "A caching strategy that writes to the cache and the database synchronously, keeping them always in sync at the cost of write latency.",
  categories: ["caching"],
  tags: ["caching", "write-path"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("write-through", lessonSpecs["write-through"]),
};
