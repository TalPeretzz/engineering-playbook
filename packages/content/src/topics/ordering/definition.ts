import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const ordering: TopicDefinition = {
  id: "ordering",
  slug: "ordering",
  title: "Ordering",
  summary: "Techniques for preserving the sequence in which events were produced when they're processed across partitions or consumers.",
  categories: ["messaging"],
  tags: ["messaging", "consistency"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
