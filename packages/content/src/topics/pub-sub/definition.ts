import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const pubSub: TopicDefinition = {
  id: "pub-sub",
  slug: "pub-sub",
  title: "Pub/Sub",
  summary:
    "A messaging pattern where publishers emit events without knowing which subscribers, if any, will consume them.",
  categories: ["messaging"],
  tags: ["messaging", "decoupling"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: ["consumer-groups", "competing-consumers"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
