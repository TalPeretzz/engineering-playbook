import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const replication: TopicDefinition = {
  id: "replication",
  slug: "replication",
  title: "Replication",
  summary:
    "Keeping copies of the same data on multiple nodes to survive failures and serve reads closer to users.",
  categories: ["distributed-systems"],
  tags: ["availability", "consistency"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("replication", lessonSpecs["replication"]),
};
