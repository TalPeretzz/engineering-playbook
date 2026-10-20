import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const sharding: TopicDefinition = {
  id: "sharding",
  slug: "sharding",
  title: "Sharding",
  summary:
    "Splitting a dataset across multiple nodes so no single node has to hold or serve all of it.",
  categories: ["distributed-systems"],
  tags: ["scalability", "partitioning"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("sharding", lessonSpecs["sharding"]),
};
