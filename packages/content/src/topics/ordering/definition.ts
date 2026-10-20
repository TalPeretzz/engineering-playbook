import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const ordering: TopicDefinition = {
  id: "ordering",
  slug: "ordering",
  title: "Ordering",
  summary:
    "Techniques for preserving the sequence in which events were produced when they're processed across partitions or consumers.",
  categories: ["messaging"],
  tags: ["messaging", "consistency"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("ordering", lessonSpecs["ordering"]),
};
