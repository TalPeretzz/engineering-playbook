import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const hyperloglog: TopicDefinition = {
  id: "hyperloglog",
  slug: "hyperloglog",
  title: "HyperLogLog",
  summary:
    "A probabilistic algorithm that estimates the number of distinct elements in a massive stream using a fixed, tiny amount of memory.",
  categories: ["practical-data-structures"],
  tags: ["probabilistic", "cardinality-estimation"],
  depth: "flagship",
  availability: "available",
  difficulty: "advanced",
  estimatedMinutes: 25,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("hyperloglog", lessonSpecs.hyperloglog),
};
