import type { MultipleChoiceChallenge } from "@engineering-playbook/content-schema";

export const conceptualChallenge: MultipleChoiceChallenge = {
  type: "multiple-choice",
  id: "lru-cache-conceptual",
  required: true,
  question:
    "An LRU Cache with capacity 3 contains entries in this order — MRU → A, B, C → LRU. The application calls get(C), then put(D, 4). Which key is evicted?",
  options: [
    {
      id: "a",
      text: "A — it was inserted first and has been in the cache the longest.",
    },
    {
      id: "b",
      text: "B — it becomes the least recently used after get(C) promotes C.",
    },
    {
      id: "c",
      text: "C — it was just accessed, so it must be the hottest entry and gets cleared to make room.",
    },
    {
      id: "d",
      text: "D — the new item is immediately evicted because the cache was already full.",
    },
  ],
  correctOptionId: "b",
  explanation:
    "get(C) moves C to the MRU position. The new order from MRU to LRU is: C, A, B. When put(D, 4) is called the cache has 4 entries but capacity is 3, so the current LRU — B — is evicted. D is then the MRU entry. A is not evicted because it still has C and B in front of it in the LRU ordering. D is not evicted because the eviction happens before the new entry is confirmed, and it removes the LRU, not the new arrival.",
};
