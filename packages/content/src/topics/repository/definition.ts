import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const repository: TopicDefinition = {
  id: "repository",
  slug: "repository",
  title: "Repository Pattern",
  summary:
    "A pattern that abstracts data access behind a collection-like interface, decoupling business logic from storage details.",
  categories: ["design-patterns"],
  tags: ["design-pattern", "data-access"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("repository", lessonSpecs["repository"]),
};
