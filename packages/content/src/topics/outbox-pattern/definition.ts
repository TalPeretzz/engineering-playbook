import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const outboxPattern: TopicDefinition = {
  id: "outbox-pattern",
  slug: "outbox-pattern",
  title: "Outbox Pattern",
  summary:
    "A pattern that atomically persists a state change and the event describing it, avoiding dual-write inconsistency between a database and a message broker.",
  categories: ["distributed-systems"],
  tags: ["messaging", "consistency"],
  depth: "flagship",
  availability: "coming-soon",
  difficulty: "advanced",
  estimatedMinutes: 25,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
