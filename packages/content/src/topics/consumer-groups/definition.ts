import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const consumerGroups: TopicDefinition = {
  id: "consumer-groups",
  slug: "consumer-groups",
  title: "Consumer Groups",
  summary:
    "A mechanism that lets multiple consumer instances share the work of processing a message stream in parallel.",
  categories: ["messaging"],
  tags: ["messaging", "scalability"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("consumer-groups", lessonSpecs["consumer-groups"]),
};
