import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { metadata } from "./metadata";
import { sections } from "./lesson";
import { typescriptImpl } from "./implementations/typescript";
import { pythonImpl } from "./implementations/python";
import { javaImpl } from "./implementations/java";
import { conceptualChallenge } from "./challenges/conceptual";
import { implementationChallenge } from "./challenges/implementation";
import { systemDesignChallenge } from "./challenges/system-design";

export const lruCache: TopicDefinition = {
  id: metadata.slug,
  slug: metadata.slug,
  title: metadata.title,
  summary: metadata.description,
  categories: ["practical-data-structures", "caching"],
  tags: ["eviction-policy", "hash-map", "linked-list"],
  depth: "flagship",
  availability: "available",
  difficulty: metadata.difficulty,
  estimatedMinutes: metadata.estimatedMinutes,
  prerequisites: metadata.prerequisites,
  relatedTopics: [],
  learningPaths: [],
  lesson: {
    sections,
    implementations: {
      typescript: typescriptImpl,
      python: pythonImpl,
      java: javaImpl,
    },
    challenges: [conceptualChallenge, implementationChallenge, systemDesignChallenge],
  },
};
