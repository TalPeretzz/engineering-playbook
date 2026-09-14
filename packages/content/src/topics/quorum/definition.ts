import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const quorum: TopicDefinition = {
  id: "quorum",
  slug: "quorum",
  title: "Quorum",
  summary: "A voting rule that requires a minimum number of nodes to agree before a read or write is considered successful, trading availability for consistency.",
  categories: ["distributed-systems"],
  tags: ["consensus", "consistency"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
