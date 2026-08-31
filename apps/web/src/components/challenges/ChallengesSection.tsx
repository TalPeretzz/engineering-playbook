"use client";

import React from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import type { TopicProgress } from "@engineering-playbook/shared-types";
import Link from "next/link";
import { MultipleChoiceChallenge } from "./MultipleChoiceChallenge";
import { ImplementationChallenge } from "./ImplementationChallenge";
import { SystemDesignChallenge } from "./SystemDesignChallenge";
import type { TestCase } from "@/utils/testRunner";
import { bloomFilterTests } from "@/utils/bloomFilterTests";
import { lruCacheTests } from "@/utils/lruCacheTests";

type TestSuite = { tests: TestCase[]; className: string };

const IMPLEMENTATION_TESTS: Record<string, TestSuite> = {
  "bloom-filter-implementation": { tests: bloomFilterTests, className: "BloomFilter" },
  "lru-cache-implementation": { tests: lruCacheTests, className: "LRUCache" },
};

type ChallengesSectionProps = {
  topic: Topic;
  progress: TopicProgress;
  onChallengeComplete: (challengeId: string) => void;
  nextTopic?: { slug: string; title: string };
};

export function ChallengesSection({
  topic,
  progress,
  onChallengeComplete,
  nextTopic,
}: ChallengesSectionProps) {
  const req = topic.challenges.filter((c) => c.required).length;
  const doneReq = topic.challenges.filter(
    (c) => c.required && progress.completedChallenges.includes(c.id)
  ).length;
  const isTopicComplete = progress.status === "completed";

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-xl font-semibold text-ink mb-1">Ready to apply it?</h2>
        <p className="text-sm text-ink-muted">
          {isTopicComplete ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">All required challenges completed.</span>
          ) : (
            <>
              <span className="text-ink font-medium">{doneReq}</span>
              {" / "}
              <span className="text-ink font-medium">{req}</span>
              {" required challenges completed"}
              {topic.challenges.some((c) => !c.required) && (
                <span className="text-ink-faint ml-1.5">· optional not counted</span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Completion banner */}
      {isTopicComplete && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700/50 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-emerald-700 dark:text-emerald-400 text-sm" aria-hidden="true">✓</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-emerald-800 dark:text-emerald-300 font-medium text-sm">{topic.title} completed</p>
              <p className="text-ink-muted text-xs mt-0.5">
                You&apos;ve worked through all required challenges. The optional challenges below
                are still available.
              </p>
              {nextTopic && (
                <Link
                  href={`/topics/${nextTopic.slug}`}
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-brand-text hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 rounded"
                >
                  Up next: {nextTopic.title} →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Challenge list */}
      <div className="space-y-4">
        {topic.challenges.map((challenge) => {
          const isCompleted = progress.completedChallenges.includes(challenge.id);
          const onComplete = () => onChallengeComplete(challenge.id);

          if (challenge.type === "multiple-choice") {
            return (
              <MultipleChoiceChallenge
                key={challenge.id}
                challenge={challenge}
                isCompleted={isCompleted}
                onComplete={onComplete}
              />
            );
          }
          if (challenge.type === "implementation") {
            const suite = IMPLEMENTATION_TESTS[challenge.id];
            return (
              <ImplementationChallenge
                key={challenge.id}
                challenge={challenge}
                isCompleted={isCompleted}
                onComplete={onComplete}
                testCases={suite?.tests}
                testClassName={suite?.className}
              />
            );
          }
          if (challenge.type === "system-design") {
            return (
              <SystemDesignChallenge
                key={challenge.id}
                challenge={challenge}
                isCompleted={isCompleted}
                onComplete={onComplete}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
