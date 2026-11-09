import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const cacheInvalidation: TopicDefinition = {
  id: "cache-invalidation",
  slug: "cache-invalidation",
  title: "Cache Invalidation",
  summary:
    "Strategies for removing or updating stale cache entries when the underlying data changes.",
  categories: ["caching"],
  tags: ["caching", "consistency"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("cache-invalidation", lessonSpecs["cache-invalidation"]),
};
