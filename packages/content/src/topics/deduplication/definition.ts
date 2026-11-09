import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const deduplication: TopicDefinition = {
  id: "deduplication",
  slug: "deduplication",
  title: "Deduplication",
  summary:
    "Detecting and discarding duplicate messages or requests, typically using an idempotency key or a seen-set.",
  categories: ["messaging"],
  tags: ["messaging", "reliability"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("deduplication", lessonSpecs["deduplication"]),
};
