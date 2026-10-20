import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const ttl: TopicDefinition = {
  id: "ttl",
  slug: "ttl",
  title: "TTL (Time-to-Live)",
  summary: "An expiration policy that automatically evicts cached entries after a fixed duration.",
  categories: ["caching"],
  tags: ["caching", "expiration"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 10,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("ttl", lessonSpecs["ttl"]),
};
