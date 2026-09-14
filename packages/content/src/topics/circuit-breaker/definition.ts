import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const circuitBreaker: TopicDefinition = {
  id: "circuit-breaker",
  slug: "circuit-breaker",
  title: "Circuit Breaker",
  summary: "A pattern that stops calling a failing downstream service for a cooldown period, preventing cascading failures.",
  categories: ["distributed-systems"],
  tags: ["resilience", "fault-tolerance"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
