import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const countMinSketch: TopicDefinition = {
  id: "count-min-sketch",
  slug: "count-min-sketch",
  title: "Count-Min Sketch",
  summary:
    "A probabilistic structure that estimates the frequency of items in a stream in sub-linear space, trading accuracy for memory.",
  categories: ["practical-data-structures"],
  tags: ["probabilistic", "streaming"],
  depth: "standard",
  availability: "available",
  difficulty: "advanced",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("count-min-sketch", lessonSpecs["count-min-sketch"]),
};
