import type { Topic } from "@engineering-playbook/content-schema";
import { metadata } from "./metadata";
import { sections } from "./lesson";
import { typescriptImpl } from "./implementations/typescript";
import { pythonImpl } from "./implementations/python";
import { javaImpl } from "./implementations/java";
import { conceptualChallenge } from "./challenges/conceptual";
import { implementationChallenge } from "./challenges/implementation";
import { systemDesignChallenge } from "./challenges/system-design";

export const lruCache: Topic = {
  ...metadata,
  implementations: {
    typescript: typescriptImpl,
    python: pythonImpl,
    java: javaImpl,
  },
  sections,
  challenges: [conceptualChallenge, implementationChallenge, systemDesignChallenge],
};
