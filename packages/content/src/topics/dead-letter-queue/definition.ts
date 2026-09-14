import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const deadLetterQueue: TopicDefinition = {
  id: "dead-letter-queue",
  slug: "dead-letter-queue",
  title: "Dead Letter Queue",
  summary: "A holding queue for messages that repeatedly fail processing, so they don't block the main stream and can be inspected later.",
  categories: ["messaging"],
  tags: ["messaging", "reliability"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
