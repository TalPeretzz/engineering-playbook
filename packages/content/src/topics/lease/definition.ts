import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const lease: TopicDefinition = {
  id: "lease",
  slug: "lease",
  title: "Lease",
  summary:
    "A time-bound distributed lock that expires automatically, avoiding indefinite blocking if the holder crashes.",
  categories: ["distributed-systems"],
  tags: ["coordination", "fault-tolerance"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: ["distributed-lock"],
  relatedTopics: ["leader-election", "heartbeats", "distributed-lock"],
  learningPaths: [],
  lesson: { sections, implementations, challenges },
};
