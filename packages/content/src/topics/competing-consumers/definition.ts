import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const competingConsumers: TopicDefinition = {
  id: "competing-consumers",
  slug: "competing-consumers",
  title: "Competing Consumers",
  summary:
    "A pattern where multiple consumer instances read from the same queue so each message is processed by exactly one of them.",
  categories: ["messaging"],
  tags: ["messaging", "scalability"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("competing-consumers", lessonSpecs["competing-consumers"]),
};
