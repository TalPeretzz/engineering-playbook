import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const factory: TopicDefinition = {
  id: "factory",
  slug: "factory",
  title: "Factory Pattern",
  summary: "A pattern that centralizes object creation logic so callers don't need to know which concrete class to instantiate.",
  categories: ["design-patterns"],
  tags: ["design-pattern", "creational"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
