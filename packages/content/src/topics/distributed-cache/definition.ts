import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const distributedCache: TopicDefinition = {
  id: "distributed-cache",
  slug: "distributed-cache",
  title: "Distributed Cache",
  summary:
    "A cache shared across multiple application instances, typically backed by a system like Redis or Memcached.",
  categories: ["caching"],
  tags: ["caching", "scalability"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("distributed-cache", lessonSpecs["distributed-cache"]),
};
