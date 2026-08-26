import type { MultipleChoiceChallenge } from "@engineering-playbook/content-schema";

export const conceptualChallenge: MultipleChoiceChallenge = {
  type: "multiple-choice",
  id: "bloom-filter-conceptual",
  required: true,
  question: "Which statement about Bloom Filters is true?",
  options: [
    {
      id: "a",
      text: "They can produce false negatives — reporting an element as absent when it was actually added.",
    },
    {
      id: "b",
      text: "They can produce false positives — reporting an element as present when it was never added.",
    },
    {
      id: "c",
      text: "They store the original values that were inserted.",
    },
    {
      id: "d",
      text: "Removing an element is as simple as resetting its hash-function bit positions.",
    },
  ],
  correctOptionId: "b",
  explanation:
    "Bloom Filters can produce false positives: bits set by previously inserted elements can accidentally satisfy a query for an element that was never inserted. They never produce false negatives — bits are only ever set, never cleared, so a 'definitely not in set' answer is always correct. They store no original values (only bit positions), and deletion is unsafe because bits are shared between elements.",
};
