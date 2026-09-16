import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const strategy: TopicDefinition = {
  id: "strategy",
  slug: "strategy",
  title: "Strategy Pattern",
  summary:
    "A pattern that defines a family of interchangeable algorithms and lets the caller select one at runtime.",
  categories: ["design-patterns"],
  tags: ["design-pattern", "behavioral"],
  depth: "flagship",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: ["dependency-injection", "factory"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
