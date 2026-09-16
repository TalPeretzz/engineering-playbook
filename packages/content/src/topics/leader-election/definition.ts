import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const leaderElection: TopicDefinition = {
  id: "leader-election",
  slug: "leader-election",
  title: "Leader Election",
  summary:
    "A protocol that lets a cluster of nodes agree on a single coordinator, so exactly one node makes cluster-wide decisions at a time.",
  categories: ["distributed-systems"],
  tags: ["consensus", "coordination"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
