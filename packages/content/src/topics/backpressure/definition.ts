import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const backpressure: TopicDefinition = {
  id: "backpressure",
  slug: "backpressure",
  title: "Backpressure",
  summary:
    "A signal from a slow consumer back to a fast producer to reduce send rate, preventing overload and unbounded queue growth.",
  categories: ["messaging"],
  tags: ["messaging", "flow-control"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
