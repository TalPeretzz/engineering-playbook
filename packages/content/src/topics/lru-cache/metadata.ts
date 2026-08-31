import type { TopicDifficulty, TopicCategory } from "@engineering-playbook/content-schema";

export const metadata = {
  slug: "lru-cache",
  title: "LRU Cache",
  description:
    "A cache eviction policy that removes the Least Recently Used item when the cache reaches capacity — keeping hot data in memory using a hash map and doubly linked list for O(1) operations.",
  category: "data-structures" as TopicCategory,
  difficulty: "intermediate" as TopicDifficulty,
  estimatedMinutes: 25,
  prerequisites: ["bloom-filter"],
  nextTopics: ["consistent-hashing"],
};
