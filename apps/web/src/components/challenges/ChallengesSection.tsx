"use client";

import React from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import type { TopicProgress } from "@engineering-playbook/shared-types";
import Link from "next/link";
import { MultipleChoiceChallenge } from "./MultipleChoiceChallenge";
import { ImplementationChallenge } from "./ImplementationChallenge";
import { SystemDesignChallenge } from "./SystemDesignChallenge";

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
        <h2 className="text-xl font-semibold text-zinc-100 mb-1">Ready to apply it?</h2>
        <p className="text-sm text-zinc-500">
          {isTopicComplete ? (
            <span className="text-emerald-400 font-medium">All required challenges completed.</span>
          ) : (
            <>
              <span className="text-zinc-300 font-medium">{doneReq}</span>
              {" / "}
              <span className="text-zinc-300 font-medium">{req}</span>
              {" required challenges completed"}
              {topic.challenges.some((c) => !c.required) && (
                <span className="text-zinc-600 ml-1.5">· optional not counted</span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Completion state */}
      {isTopicComplete && (
        <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-emerald-400 text-sm">✓</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-emerald-300 font-medium text-sm">{topic.title} completed</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                You&apos;ve worked through all required challenges. The optional challenges below
                are still available.
              </p>
              {nextTopic && (
                <Link
                  href={`/topics/${nextTopic.slug}`}
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
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
            return (
              <ImplementationChallenge
                key={challenge.id}
                challenge={challenge}
                isCompleted={isCompleted}
                onComplete={onComplete}
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
