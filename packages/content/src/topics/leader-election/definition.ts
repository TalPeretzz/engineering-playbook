import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const leaderElection: TopicDefinition = {
  id: "leader-election",
  slug: "leader-election",
  title: "Leader Election",
  summary:
    "A protocol that lets a cluster of nodes agree on a single coordinator, so exactly one node makes cluster-wide decisions at a time.",
  categories: ["distributed-systems"],
  tags: ["consensus", "coordination"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: ["heartbeats", "distributed-lock"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
