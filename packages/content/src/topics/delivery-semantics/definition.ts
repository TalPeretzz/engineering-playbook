import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const deliverySemantics: TopicDefinition = {
  id: "delivery-semantics",
  slug: "delivery-semantics",
  title: "Delivery Semantics",
  summary:
    "The guarantees a messaging system makes about how many times a message is delivered: at-most-once, at-least-once, or exactly-once.",
  categories: ["messaging"],
  tags: ["messaging", "reliability"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
