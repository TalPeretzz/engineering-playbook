import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const gossipProtocol: TopicDefinition = {
  id: "gossip-protocol",
  slug: "gossip-protocol",
  title: "Gossip Protocol",
  summary: "A peer-to-peer method for spreading state through a cluster by having nodes periodically exchange information with random peers.",
  categories: ["distributed-systems"],
  tags: ["coordination", "decentralized"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
