import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const deliverySemantics: TopicDefinition = {
  id: "delivery-semantics",
  slug: "delivery-semantics",
  title: "Delivery Semantics",
  summary:
    "The guarantees a messaging system makes about how many times a message is delivered: at-most-once, at-least-once, or exactly-once.",
  categories: ["messaging"],
  tags: ["messaging", "reliability"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("delivery-semantics", lessonSpecs["delivery-semantics"]),
};
