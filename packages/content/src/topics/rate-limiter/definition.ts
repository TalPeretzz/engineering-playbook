import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { rateLimiter as legacy } from "./lesson-content";

export const rateLimiter: TopicDefinition = {
  id: legacy.slug,
  slug: legacy.slug,
  title: legacy.title,
  summary: legacy.description,
  categories: ["distributed-systems"],
  tags: ["throttling", "api-design", "reliability"],
  depth: "standard",
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
