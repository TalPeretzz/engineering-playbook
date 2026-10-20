import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const decorator: TopicDefinition = {
  id: "decorator",
  slug: "decorator",
  title: "Decorator Pattern",
  summary:
    "A pattern that attaches new behavior to an object dynamically by wrapping it, without modifying its class.",
  categories: ["design-patterns"],
  tags: ["design-pattern", "structural"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("decorator", lessonSpecs["decorator"]),
};
