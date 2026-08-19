import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";

export type ChallengeStatus = "not-started" | "completed";

export type TopicStatus = "not-started" | "in-progress" | "completed";

export type TopicProgress = {
  status: TopicStatus;
  completedChallenges: string[];
};

export type UserProgress = {
  topics: Record<string, TopicProgress>;
  preferredLanguage: ProgrammingLanguage;
  lastVisitedTopic: string | null;
};
