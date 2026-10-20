import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const dependencyInjection: TopicDefinition = {
  id: "dependency-injection",
  slug: "dependency-injection",
  title: "Dependency Injection",
  summary:
    "A pattern where an object's dependencies are provided from the outside rather than constructed internally, improving testability and decoupling.",
  categories: ["design-patterns"],
  tags: ["design-pattern", "architecture"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("dependency-injection", lessonSpecs["dependency-injection"]),
};
