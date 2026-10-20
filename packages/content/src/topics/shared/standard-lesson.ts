import type { Challenge, LessonContent, Section } from "@engineering-playbook/content-schema";

export type StandardLessonSpec = {
  title: string;
  problem: string;
  mechanics: string[];
  visual: string;
  complexity: { operation: string; time: string; space?: string; note?: string }[];
  pros: string[];
  cons: string[];
  useWhen: string[];
  avoidWhen: string[];
  examples: string[];
  keyInsight: string;
  misconception: string;
  designScenario: string;
  designPoints: string[];
};

/**
 * Builds the consistent lesson shape used by standard/reference catalog topics.
 * Content remains topic-specific in each spec; this helper only removes repeated
 * section and challenge plumbing.
 */
export function createStandardLesson(id: string, spec: StandardLessonSpec): LessonContent {
  const sections: Section[] = [
    {
      type: "text",
      id: "problem",
      heading: "What problem does it solve?",
      phase: "understand",
      body: [{ type: "p", text: spec.problem }],
    },
    {
      type: "text",
      id: "how-it-works",
      heading: "How does it work?",
      phase: "understand",
      body: [
        { type: "list", items: spec.mechanics },
        { type: "p", text: `**Key idea:** ${spec.keyInsight}` },
      ],
    },
    {
      type: "visual",
      id: "visual",
      heading: "Mental model",
      phase: "understand",
      content: spec.visual,
    },
    {
      type: "complexity",
      id: "complexity",
      heading: "Complexity and cost",
      phase: "deep-dive",
      entries: spec.complexity,
    },
    {
      type: "tradeoffs",
      id: "tradeoffs",
      heading: "Tradeoffs",
      phase: "deep-dive",
      pros: spec.pros,
      cons: spec.cons,
    },
    {
      type: "use-cases",
      id: "use-cases",
      heading: "When to use / when not to use",
      phase: "apply",
      whenToUse: spec.useWhen,
      whenNotToUse: spec.avoidWhen,
    },
    {
      type: "text",
      id: "real-world",
      heading: "Real-world examples",
      phase: "apply",
      body: [{ type: "list", items: spec.examples }],
    },
  ];

  const challenges: Challenge[] = [
    {
      type: "multiple-choice",
      id: `${id}-conceptual`,
      required: true,
      question: `Which statement best captures the central idea behind ${spec.title}?`,
      options: [
        { id: "a", text: spec.keyInsight },
        { id: "b", text: spec.misconception },
        {
          id: "c",
          text: "It removes every failure mode and consistency tradeoff from the system.",
        },
        {
          id: "d",
          text: "It is primarily a user-interface optimization with no backend implications.",
        },
      ],
      correctOptionId: "a",
      explanation: `${spec.keyInsight} The other choices either describe a common misconception or promise guarantees the technique cannot provide.`,
    },
    {
      type: "system-design",
      id: `${id}-system-design`,
      required: true,
      title: `Apply ${spec.title}`,
      scenario: spec.designScenario,
      hints: [
        "State the guarantees and failure modes before choosing an implementation.",
        "Explain what happens during overload, partial failure, and recovery.",
        "Name the metrics and alerts you would use to verify the design in production.",
      ],
      discussionPoints: spec.designPoints,
    },
  ];

  return { sections, challenges };
}
