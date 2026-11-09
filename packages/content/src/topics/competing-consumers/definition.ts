import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const competingConsumers: TopicDefinition = {
  id: "competing-consumers",
  slug: "competing-consumers",
  title: "Competing Consumers",
  summary:
    "A pattern where multiple consumer instances read from the same queue so each message is processed by exactly one of them.",
  categories: ["messaging"],
  tags: ["messaging", "scalability"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: ["consumer-groups", "pub-sub"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
