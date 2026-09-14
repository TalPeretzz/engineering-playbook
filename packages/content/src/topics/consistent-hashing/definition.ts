import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { consistentHashing as legacy } from "./lesson-content";

export const consistentHashing: TopicDefinition = {
  id: legacy.slug,
  slug: legacy.slug,
  title: legacy.title,
  summary: legacy.description,
  categories: ["practical-data-structures", "distributed-systems"],
  tags: ["hashing", "sharding", "distributed-cache"],
  depth: "flagship",
  availability: "available",
  difficulty: legacy.difficulty,
  estimatedMinutes: legacy.estimatedMinutes,
  prerequisites: legacy.prerequisites,
  relatedTopics: [],
  learningPaths: [],
  lesson: {
    sections: legacy.sections,
    implementations: legacy.implementations,
    challenges: legacy.challenges,
  },
};
