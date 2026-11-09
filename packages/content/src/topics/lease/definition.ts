import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const lease: TopicDefinition = {
  id: "lease",
  slug: "lease",
  title: "Lease",
  summary:
    "A time-bound distributed lock that expires automatically, avoiding indefinite blocking if the holder crashes.",
  categories: ["distributed-systems"],
  tags: ["coordination", "fault-tolerance"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("lease", lessonSpecs["lease"]),
};
