export type TopicDifficulty = "beginner" | "intermediate" | "advanced";

export type TopicCategory =
  | "fundamentals"
  | "data-structures"
  | "distributed-systems"
  | "resilience"
  | "messaging"
  | "caching"
  | "backend-patterns";

export type ProgrammingLanguage = "typescript" | "python" | "java";

// ---------------------------------------------------------------------------
// Rich text — typed content nodes for lesson body text
// Inline text fields may use **bold** markers rendered by InlineBold.
// ---------------------------------------------------------------------------

export type RichParagraph =
  | { type: "p"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; items: string[] };

export type RichText = RichParagraph[];

// ---------------------------------------------------------------------------
// Section types — discriminated union
// TopicPage renders sections by dispatching on `section.type`.
// Future section types can be added here without touching existing topics.
// ---------------------------------------------------------------------------

export type ComplexityEntry = {
  operation: string;
  time: string;
  space?: string;
  note?: string;
};

export type ComparisonRow = Record<string, string>;

export type TextSection = {
  type: "text";
  id: string;
  heading: string;
  body: RichText;
};

export type VisualSection = {
  type: "visual";
  id: string;
  heading: string;
  content: string;
};

export type ComplexitySection = {
  type: "complexity";
  id: string;
  heading: string;
  entries: ComplexityEntry[];
};

export type TradeoffsSection = {
  type: "tradeoffs";
  id: string;
  heading: string;
  pros: string[];
  cons: string[];
};

export type UseCasesSection = {
  type: "use-cases";
  id: string;
  heading: string;
  whenToUse: string[];
  whenNotToUse: string[];
};

export type ComparisonSection = {
  type: "comparison";
  id: string;
  heading: string;
  columns: string[];
  rows: ComparisonRow[];
};

export type Section =
  | TextSection
  | VisualSection
  | ComplexitySection
  | TradeoffsSection
  | UseCasesSection
  | ComparisonSection;

// ---------------------------------------------------------------------------
// Challenges — discriminated union
//
// required: true  → completing this challenge counts toward topic completion.
// required: false → optional (e.g. open-ended system-design discussions).
//
// Code execution (testCases, new Function) is intentionally absent.
// It belongs in a sandboxed runner service, not in the browser.
// ---------------------------------------------------------------------------

export type MultipleChoiceOption = {
  id: string;
  text: string;
};

export type MultipleChoiceChallenge = {
  type: "multiple-choice";
  id: string;
  required: boolean;
  question: string;
  options: MultipleChoiceOption[];
  correctOptionId: string;
  explanation: string;
};

export type ImplementationChallenge = {
  type: "implementation";
  id: string;
  required: boolean;
  title: string;
  description: string;
  starterCode: Record<ProgrammingLanguage, string>;
  hints: string[];
  solution: Record<ProgrammingLanguage, string>;
};

export type SystemDesignChallenge = {
  type: "system-design";
  id: string;
  required: boolean;
  title: string;
  scenario: string;
  hints: string[];
  discussionPoints: string[];
};

export type Challenge =
  | MultipleChoiceChallenge
  | ImplementationChallenge
  | SystemDesignChallenge;

// ---------------------------------------------------------------------------
// Topic
// ---------------------------------------------------------------------------

export type Topic = {
  slug: string;
  title: string;
  description: string;
  category: TopicCategory;
  difficulty: TopicDifficulty;
  estimatedMinutes: number;
  prerequisites: string[];
  nextTopics: string[];
  implementations: Partial<Record<ProgrammingLanguage, string>>;
  sections: Section[];
  challenges: Challenge[];
};
