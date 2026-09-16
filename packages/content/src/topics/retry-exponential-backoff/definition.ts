import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const retryExponentialBackoff: TopicDefinition = {
  id: "retry-exponential-backoff",
  slug: "retry-exponential-backoff",
  title: "Retry & Exponential Backoff",
  summary:
    "A retry strategy that waits progressively longer between attempts, reducing load on a struggling downstream service.",
  categories: ["distributed-systems"],
  tags: ["resilience", "retries"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: ["circuit-breaker", "idempotency"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
