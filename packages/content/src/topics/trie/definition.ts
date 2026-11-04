import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const trie: TopicDefinition = {
  id: "trie",
  slug: "trie",
  title: "Trie",
  summary:
    "A tree structure that stores strings by shared prefixes, enabling fast prefix search, autocomplete, and dictionary lookups.",
  categories: ["practical-data-structures"],
  tags: ["strings", "search", "autocomplete"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: ["skip-list"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
