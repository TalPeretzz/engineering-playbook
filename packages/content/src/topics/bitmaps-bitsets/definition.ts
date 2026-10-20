import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const bitmapsBitsets: TopicDefinition = {
  id: "bitmaps-bitsets",
  slug: "bitmaps-bitsets",
  title: "Bitmaps & Bitsets",
  summary:
    "Compact arrays of bits used to represent large sets, flags, or presence checks with minimal memory.",
  categories: ["practical-data-structures"],
  tags: ["space-efficient", "flags"],
  depth: "standard",
  availability: "available",
  difficulty: "beginner",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("bitmaps-bitsets", lessonSpecs["bitmaps-bitsets"]),
};
