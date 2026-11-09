import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const gossipProtocol: TopicDefinition = {
  id: "gossip-protocol",
  slug: "gossip-protocol",
  title: "Gossip Protocol",
  summary:
    "A peer-to-peer method for spreading state through a cluster by having nodes periodically exchange information with random peers.",
  categories: ["distributed-systems"],
  tags: ["coordination", "decentralized"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: ["heartbeats", "quorum"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
