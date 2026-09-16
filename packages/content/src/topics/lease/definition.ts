import type { TopicDefinition } from "@engineering-playbook/content-schema";

export const lease: TopicDefinition = {
  id: "lease",
  slug: "lease",
  title: "Lease",
  summary:
    "A time-bound distributed lock that expires automatically, avoiding indefinite blocking if the holder crashes.",
  categories: ["distributed-systems"],
  tags: ["coordination", "fault-tolerance"],
  depth: "standard",
  availability: "coming-soon",
  difficulty: "intermediate",
  estimatedMinutes: 15,
  prerequisites: [],
  relatedTopics: [],
  learningPaths: [],
};
