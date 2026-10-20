import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const quorum: TopicDefinition = {
  id: "quorum",
  slug: "quorum",
  title: "Quorum",
  summary:
    "A voting rule that requires a minimum number of nodes to agree before a read or write is considered successful, trading availability for consistency.",
  categories: ["distributed-systems"],
  tags: ["consensus", "consistency"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("quorum", lessonSpecs["quorum"]),
};
