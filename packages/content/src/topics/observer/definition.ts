import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const observer: TopicDefinition = {
  id: "observer",
  slug: "observer",
  title: "Observer Pattern",
  summary:
    "A pattern where subscribers register to be notified whenever a subject's state changes.",
  categories: ["design-patterns"],
  tags: ["design-pattern", "behavioral"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("observer", lessonSpecs["observer"]),
};
