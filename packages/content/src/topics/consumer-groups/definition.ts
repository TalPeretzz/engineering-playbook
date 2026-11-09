import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const consumerGroups: TopicDefinition = {
  id: "consumer-groups",
  slug: "consumer-groups",
  title: "Consumer Groups",
  summary:
    "A mechanism that lets multiple consumer instances share the work of processing a message stream in parallel.",
  categories: ["messaging"],
  tags: ["messaging", "scalability"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: ["pub-sub"],
  relatedTopics: ["pub-sub", "competing-consumers"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
