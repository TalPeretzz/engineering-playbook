import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const merkleTree: TopicDefinition = {
  id: "merkle-tree",
  slug: "merkle-tree",
  title: "Merkle Tree",
  summary:
    "A tree of hashes that lets two large datasets be compared for differences by exchanging only a handful of hash values.",
  categories: ["practical-data-structures"],
  tags: ["hashing", "data-integrity"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: ["consistent-hashing", "gossip-protocol"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
