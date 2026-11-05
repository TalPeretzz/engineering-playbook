import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { sections, implementations, challenges } from "./lesson-content";

export const countMinSketch: TopicDefinition = {
  id: "count-min-sketch",
  slug: "count-min-sketch",
  title: "Count-Min Sketch",
  summary:
    "A probabilistic structure that estimates the frequency of items in a stream in sub-linear space, trading accuracy for memory.",
  categories: ["practical-data-structures"],
  tags: ["probabilistic", "streaming"],
  depth: "standard",
  availability: "available",
  difficulty: "advanced",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: ["hyperloglog", "bitmaps-bitsets"],
  learningPaths: [],
  lesson: {
    sections,
    implementations,
    challenges,
  },
};
