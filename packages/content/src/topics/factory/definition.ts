import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const factory: TopicDefinition = {
  id: "factory",
  slug: "factory",
  title: "Factory Pattern",
  summary:
    "A pattern that centralizes object creation logic so callers don't need to know which concrete class to instantiate.",
  categories: ["design-patterns"],
  tags: ["design-pattern", "creational"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("factory", lessonSpecs["factory"]),
};
