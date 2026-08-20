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
// Challenges
// ---------------------------------------------------------------------------

export type MultipleChoiceOption = {
  id: string;
  text: string;
};

export type MultipleChoiceChallenge = {
  type: "multiple-choice";
  id: string;
  question: string;
  options: MultipleChoiceOption[];
  correctOptionId: string;
  explanation: string;
};

export type TestCase = {
  id: string;
  description: string;
  // JavaScript/TypeScript code run after the user's class definition.
  // Must return the value to compare against `expected`.
  code: string;
  expected: unknown;
};

export type ImplementationChallenge = {
  type: "implementation";
  id: string;
  title: string;
  description: string;
  starterCode: Record<ProgrammingLanguage, string>;
  hints: string[];
  solution: Record<ProgrammingLanguage, string>;
  testCases?: TestCase[];
};

export type SystemDesignChallenge = {
  type: "system-design";
  id: string;
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
// Complexity
// ---------------------------------------------------------------------------

export type ComplexityEntry = {
  operation: string;
  time: string;
  space?: string;
  note?: string;
};

// ---------------------------------------------------------------------------
// Topic
// ---------------------------------------------------------------------------

export type TopicSection = {
  problemStatement: string;
  howItWorks: string;
  visualExplanation: string;
  complexity: ComplexityEntry[];
  tradeoffs: { pros: string[]; cons: string[] };
  whenToUse: string[];
  whenNotToUse: string[];
  realWorldExamples: string[];
};

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
  content: TopicSection;
  challenges: Challenge[];
};
