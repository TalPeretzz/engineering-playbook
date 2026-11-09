import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const cqrs: TopicDefinition = {
  id: "cqrs",
  slug: "cqrs",
  title: "CQRS",
  summary:
    "Command Query Responsibility Segregation — separating the models used to write data from the models used to read it.",
  categories: ["distributed-systems"],
  tags: ["architecture", "scalability"],
  depth: "standard",
  availability: "available",
  difficulty: "advanced",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("cqrs", lessonSpecs["cqrs"]),
};
