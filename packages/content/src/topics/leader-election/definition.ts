import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { createStandardLesson } from "../shared/standard-lesson";
import { lessonSpecs } from "../shared/lesson-specs";

export const leaderElection: TopicDefinition = {
  id: "leader-election",
  slug: "leader-election",
  title: "Leader Election",
  summary:
    "A protocol that lets a cluster of nodes agree on a single coordinator, so exactly one node makes cluster-wide decisions at a time.",
  categories: ["distributed-systems"],
  tags: ["consensus", "coordination"],
  depth: "standard",
  availability: "available",
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
  lesson: createStandardLesson("leader-election", lessonSpecs["leader-election"]),
};
