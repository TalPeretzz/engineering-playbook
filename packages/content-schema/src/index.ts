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

export type Source = {
  name: string;
  url: string;
  /** Date the citation was verified (ISO 8601, e.g. "2026-08-31"). */
  verified: string;
  /** Optional short qualifier displayed after the link. */
  note?: string;
};

export type RichParagraph =
  | { type: "p"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; language: string; code: string }
  | { type: "sources"; items: Source[] };

export type RichText = RichParagraph[];

// ---------------------------------------------------------------------------
// Section types — discriminated union
// TopicPage renders sections by dispatching on `section.type`.
// `phase` groups sections visually (e.g. "understand" | "deep-dive" | "apply").
// `collapsible` renders the section behind a toggle, collapsed by default.
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
  phase?: string;
  collapsible?: boolean;
};

export type VisualStep = {
  label: string;
  description: string;
  bitArray: (0 | 1)[];
  activeIndices?: number[];
  hashOutputs?: { fn: string; output: number }[];
  result?: {
    type: "in-set" | "not-in-set" | "false-positive";
    text: string;
  };
};

export type VisualSection = {
  type: "visual";
  id: string;
  heading: string;
  /** Static ASCII diagram — rendered as a <pre> block. */
  content?: string;
  /** Step-by-step interactive walkthrough — takes precedence over content. */
  steps?: VisualStep[];
  phase?: string;
  collapsible?: boolean;
};

export type ComplexitySection = {
  type: "complexity";
  id: string;
  heading: string;
  entries: ComplexityEntry[];
  phase?: string;
  collapsible?: boolean;
};

export type TradeoffsSection = {
  type: "tradeoffs";
  id: string;
  heading: string;
  pros: string[];
  cons: string[];
  phase?: string;
  collapsible?: boolean;
};

export type UseCasesSection = {
  type: "use-cases";
  id: string;
  heading: string;
  whenToUse: string[];
  whenNotToUse: string[];
  phase?: string;
  collapsible?: boolean;
};

export type ComparisonSection = {
  type: "comparison";
  id: string;
  heading: string;
  columns: string[];
  rows: ComparisonRow[];
  phase?: string;
  collapsible?: boolean;
};

export type LruVisualSection = {
  type: "lru-visual";
  id: string;
  heading: string;
  phase?: string;
  collapsible?: boolean;
};

export type Section =
  | TextSection
  | VisualSection
  | ComplexitySection
  | TradeoffsSection
  | UseCasesSection
  | ComparisonSection
  | LruVisualSection;

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

// ---------------------------------------------------------------------------
// Catalog — data-driven content areas, categories, and topic definitions.
//
// This is additive: `Topic`/`TopicCategory` above are untouched so existing
// consumers (Sidebar, Dashboard, TopicPage) keep working unmodified.
// `TopicDefinition` is the new source of truth; `buildTopic()` (in
// packages/content) derives a `Topic` from it for those consumers.
// See docs/architecture/catalog-refactor-plan.md.
// ---------------------------------------------------------------------------

export type TopicDepth = "flagship" | "standard" | "reference";

export type TopicAvailability = "available" | "coming-soon";

/** Bare string, validated by tests against the `CategoryDefinition[]` registry — not the compiler. */
export type TopicCategoryId = string;

export type ContentArea = {
  id: string;
  title: string;
  summary: string;
  order: number;
  icon?: string;
};

export type CategoryDefinition = {
  id: string;
  contentAreaId: string;
  title: string;
  summary?: string;
  order: number;
};

export type VisualizationSlot =
  | { kind: "component"; component: "lru-cache" | "bloom-filter"; heading: string; id: string; phase?: string }
  | { kind: "steps"; heading: string; id: string; phase?: string; steps: VisualStep[] }
  | { kind: "ascii"; heading: string; id: string; phase?: string; content: string };

export type LessonContent = {
  /** Optional structured slots — renderers pick these up in order when present. */
  problem?: TextSection;
  intuition?: TextSection;
  visualization?: VisualizationSlot;
  howItWorks?: TextSection;
  complexity?: ComplexitySection;
  comparisons?: ComparisonSection[];
  tradeoffs?: TradeoffsSection;
  useCases?: UseCasesSection;
  production?: TextSection;
  realWorldUsage?: TextSection;
  recap?: ComparisonSection;

  /** Legacy escape hatch — flagship lessons (Bloom Filter, LRU Cache, ...) stay on this. */
  sections?: Section[];

  implementations?: Partial<Record<ProgrammingLanguage, string>>;
  challenges?: Challenge[];
};

export type TopicDefinition = {
  id: string;
  slug: string;
  title: string;
  shortTitle?: string;
  summary: string;

  categories: TopicCategoryId[];
  primaryCategoryId?: TopicCategoryId;
  tags: string[];

  depth: TopicDepth;
  availability: TopicAvailability;
  contentType?: "lesson";

  difficulty: TopicDifficulty;
  estimatedMinutes: number;

  prerequisites: string[];
  relatedTopics: string[];
  learningPaths: string[];

  whyItMatters?: string;

  /** Full lesson. Absent for coming-soon topics. */
  lesson?: LessonContent;
};

export type LearningPath = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  audience?: string;
  topicIds: string[];
};

export type Curriculum = {
  /** Order in which content areas render. */
  areaOrder: string[];

  /** Ordered category ids inside each area. */
  categoriesInArea: Record<string, TopicCategoryId[]>;

  /** Ordered topic ids inside each category (multi-category topics may appear in more than one). */
  topicsInCategory: Record<TopicCategoryId, string[]>;

  /** Optional hand-authored global order that trumps the derived one. Rarely needed. */
  topicOrderOverride?: string[];
};
