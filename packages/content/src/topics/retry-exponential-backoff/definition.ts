import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const retryExponentialBackoff: TopicDefinition = {
  id: "retry-exponential-backoff",
  slug: "retry-exponential-backoff",
  title: "Retry & Exponential Backoff",
  summary: "A retry strategy that waits progressively longer between attempts, reducing load on a struggling downstream service.",
  categories: ["distributed-systems"],
  tags: ["resilience", "retries"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
