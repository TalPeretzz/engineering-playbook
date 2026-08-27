import type { MultipleChoiceChallenge } from "@engineering-playbook/content-schema";

export const conceptualChallenge: MultipleChoiceChallenge = {
  type: "multiple-choice",
  id: "bloom-filter-conceptual",
  required: true,
  question:
    "You query a Bloom Filter for a key and it returns true. What can you conclude?",
  options: [
    {
      id: "a",
      text: "The key is definitely in the set — the filter never lies about presence.",
    },
    {
      id: "b",
      text: "The key is probably in the set, but may be a false positive.",
    },
    {
      id: "c",
      text: "The key is definitely not in the set — a positive result is always accurate.",
    },
    {
      id: "d",
      text: "The filter has overflowed and results are unreliable.",
    },
  ],
  correctOptionId: "b",
  explanation:
    "A Bloom Filter can only answer 'definitely not present' (when any checked bit is 0) or 'probably present' (when all checked bits are 1). A true result means all hash-function bit positions are set — but those bits may have been set by previously inserted values, not by this key. This is a false positive: the filter says 'probably present' but the key was never inserted. False negatives are impossible because insertion only ever sets bits, never clears them.",
};
