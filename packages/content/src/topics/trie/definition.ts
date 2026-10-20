import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

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
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("trie", lessonSpecs.trie),
};
