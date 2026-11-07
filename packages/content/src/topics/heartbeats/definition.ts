import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const heartbeats: TopicDefinition = {
  id: "heartbeats",
  slug: "heartbeats",
  title: "Heartbeats",
  summary:
    "Periodic signals nodes send to prove they're alive, used to detect failures and trigger failover.",
  categories: ["distributed-systems"],
  tags: ["failure-detection", "availability"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: ["gossip-protocol", "leader-election"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
