import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const eventSourcing: TopicDefinition = {
  id: "event-sourcing",
  slug: "event-sourcing",
  title: "Event Sourcing",
  summary:
    "Storing every state change as an immutable event and deriving current state by replaying them, instead of storing only the latest state.",
  categories: ["distributed-systems"],
  tags: ["architecture", "audit-trail"],
  depth: "standard",
  availability: "available",
  difficulty: "advanced",
  estimatedMinutes: 25,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("event-sourcing", lessonSpecs["event-sourcing"]),
};
