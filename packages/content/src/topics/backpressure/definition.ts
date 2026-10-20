import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const backpressure: TopicDefinition = {
  id: "backpressure",
  slug: "backpressure",
  title: "Backpressure",
  summary:
    "A signal from a slow consumer back to a fast producer to reduce send rate, preventing overload and unbounded queue growth.",
  categories: ["messaging"],
  tags: ["messaging", "flow-control"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("backpressure", lessonSpecs["backpressure"]),
};
