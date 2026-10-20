import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const readThrough: TopicDefinition = {
  id: "read-through",
  slug: "read-through",
  title: "Read-Through",
  summary:
    "A caching strategy where the cache itself is responsible for loading missing data from the database, transparent to the application.",
  categories: ["caching"],
  tags: ["caching", "read-path"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("read-through", lessonSpecs["read-through"]),
};
