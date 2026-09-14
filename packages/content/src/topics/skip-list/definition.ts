import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const skipList: TopicDefinition = {
  id: "skip-list",
  slug: "skip-list",
  title: "Skip List",
  summary: "A layered linked-list structure that gives O(log n) search and insertion without the rebalancing logic of a tree.",
  categories: ["practical-data-structures"],
  tags: ["ordered-data", "probabilistic"],
  depth: "reference",
  availability: "coming-soon",
  difficulty: "advanced",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
