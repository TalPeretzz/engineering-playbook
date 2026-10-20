import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const writeBehind: TopicDefinition = {
  id: "write-behind",
  slug: "write-behind",
  title: "Write-Behind",
  summary:
    "A caching strategy that writes to the cache immediately and to the database asynchronously, trading durability risk for write speed.",
  categories: ["caching"],
  tags: ["caching", "write-path"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("write-behind", lessonSpecs["write-behind"]),
};
