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

  return (
    <div className="space-y-6">
      <p className="text-zinc-400 text-sm">
        {doneReq} / {req} required challenges completed
        {topic.challenges.some((c) => !c.required) && (
          <span className="text-zinc-600 ml-2">· optional challenges not counted</span>
        )}
      </p>
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
  );
}
