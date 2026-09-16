import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const eventSourcing: TopicDefinition = {
  id: "event-sourcing",
  slug: "event-sourcing",
  title: "Event Sourcing",
  summary:
    "Storing every state change as an immutable event and deriving current state by replaying them, instead of storing only the latest state.",
  categories: ["distributed-systems"],
  tags: ["architecture", "audit-trail"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "advanced",
  estimatedMinutes: 25,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
