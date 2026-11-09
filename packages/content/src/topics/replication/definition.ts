import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const replication: TopicDefinition = {
  id: "replication",
  slug: "replication",
  title: "Replication",
  summary:
    "Keeping copies of the same data on multiple nodes to survive failures and serve reads closer to users.",
  categories: ["distributed-systems"],
  tags: ["availability", "consistency"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: ["leader-election", "quorum", "sharding"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
