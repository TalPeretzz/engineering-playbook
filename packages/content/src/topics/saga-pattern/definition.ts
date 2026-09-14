import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const sagaPattern: TopicDefinition = {
  id: "saga-pattern",
  slug: "saga-pattern",
  title: "Saga Pattern",
  summary: "A way to coordinate a multi-step transaction across services using a sequence of local transactions and compensating actions.",
  categories: ["distributed-systems"],
  tags: ["distributed-transactions", "microservices"],
  depth: "flagship",
  availability: "coming-soon",
  difficulty: "advanced",
  estimatedMinutes: 25,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
