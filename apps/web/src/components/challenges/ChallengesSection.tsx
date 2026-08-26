"use client";

import React from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import type { TopicProgress } from "@engineering-playbook/shared-types";
import { MultipleChoiceChallenge } from "./MultipleChoiceChallenge";
import { ImplementationChallenge } from "./ImplementationChallenge";
import { SystemDesignChallenge } from "./SystemDesignChallenge";

type ChallengesSectionProps = {
  topic: Topic;
  progress: TopicProgress;
  onChallengeComplete: (challengeId: string) => void;
};

export function ChallengesSection({ topic, progress, onChallengeComplete }: ChallengesSectionProps) {
  const req = topic.challenges.filter((c) => c.required).length;
  const doneReq = topic.challenges.filter(
    (c) => c.required && progress.completedChallenges.includes(c.id)
  ).length;
  const isTopicComplete = progress.status === "completed";

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-1">
            Ready to practice?
          </h2>
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
      </div>

      {/* Completion banner */}
      {isTopicComplete && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg">
          <span className="text-emerald-400 text-base shrink-0">✓</span>
          <div>
            <p className="text-emerald-300 text-sm font-medium">{topic.title} completed</p>
            <p className="text-zinc-500 text-xs">
              Move on to the next topic or revisit the challenges below.
            </p>
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
