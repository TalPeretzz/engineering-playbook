import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const adapter: TopicDefinition = {
  id: "adapter",
  slug: "adapter",
  title: "Adapter Pattern",
  summary:
    "A pattern that converts the interface of one class into another interface a caller expects, letting incompatible types work together.",
  categories: ["design-patterns"],
  tags: ["design-pattern", "structural"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("adapter", lessonSpecs["adapter"]),
};
