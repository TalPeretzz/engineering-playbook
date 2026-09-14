import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { idempotency as legacy } from "./lesson-content";

export const idempotency: TopicDefinition = {
  id: legacy.slug,
  slug: legacy.slug,
  title: legacy.title,
  summary: legacy.description,
  categories: ["distributed-systems"],
  tags: ["retries", "reliability", "api-design"],
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
