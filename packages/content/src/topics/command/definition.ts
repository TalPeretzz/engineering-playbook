import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const command: TopicDefinition = {
  id: "command",
  slug: "command",
  title: "Command Pattern",
  summary:
    "A pattern that encapsulates a request as an object, enabling queuing, logging, and undo of operations.",
  categories: ["design-patterns"],
  tags: ["design-pattern", "behavioral"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("command", lessonSpecs["command"]),
};
