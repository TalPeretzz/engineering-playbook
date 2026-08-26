import type { TopicDifficulty, TopicCategory } from "@engineering-playbook/content-schema";

export const metadata = {
  slug: "bloom-filter",
  title: "Bloom Filter",
  description:
    "A space-efficient probabilistic data structure that tests set membership — with a tunable chance of false positives but never false negatives.",
  category: "data-structures" as TopicCategory,
  difficulty: "intermediate" as TopicDifficulty,
  estimatedMinutes: 20,
  prerequisites: ["hashing"],
  nextTopics: ["lru-cache", "consistent-hashing"],
};
