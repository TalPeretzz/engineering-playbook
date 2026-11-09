import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const sagaPattern: TopicDefinition = {
  id: "saga-pattern",
  slug: "saga-pattern",
  title: "Saga Pattern",
  summary:
    "A way to coordinate a multi-step transaction across services using a sequence of local transactions and compensating actions.",
  categories: ["distributed-systems"],
  tags: ["distributed-transactions", "microservices"],
  depth: "flagship",
  availability: "available",
  difficulty: "advanced",
  estimatedMinutes: 25,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("saga-pattern", lessonSpecs["saga-pattern"]),
};
