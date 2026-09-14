import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";

export type ChallengeStatus = "not-started" | "completed";

export type TopicStatus = "not-started" | "in-progress" | "completed";

export type TopicProgress = {
  status: TopicStatus;
  completedChallenges: string[];
};

/**
 * v2: keyed by topic id (stable) rather than slug (may change with a
 * redirect). See docs/architecture/catalog-refactor-plan.md §6.3.
 */
export type UserProgress = {
  version: 2;
  topicsById: Record<string, TopicProgress>;
  collapsedCategories: string[];
  preferredLanguage: ProgrammingLanguage;
  lastVisitedTopicId: string | null;
};
