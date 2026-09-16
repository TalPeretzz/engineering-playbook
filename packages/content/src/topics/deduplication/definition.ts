import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const deduplication: TopicDefinition = {
  id: "deduplication",
  slug: "deduplication",
  title: "Deduplication",
  summary:
    "Detecting and discarding duplicate messages or requests, typically using an idempotency key or a seen-set.",
  categories: ["messaging"],
  tags: ["messaging", "reliability"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
