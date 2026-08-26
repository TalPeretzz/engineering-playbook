"use client";

import React from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import { MultipleChoiceChallenge } from "./MultipleChoiceChallenge";
import { ImplementationChallenge } from "./ImplementationChallenge";
import { SystemDesignChallenge } from "./SystemDesignChallenge";
import { useTopicProgress } from "@/hooks/useProgress";
import { allRequiredCompleted } from "@/utils/challengeCompletion";

type ChallengesSectionProps = {
  topic: Topic;
};

export function ChallengesSection({ topic }: ChallengesSectionProps) {
  const { progress, completeChallenge, completeTopic } = useTopicProgress(topic.slug);

  const handleComplete = (challengeId: string) => {
    completeChallenge(challengeId);
    // Compute updated list locally — progress hasn't refreshed yet after completeChallenge.
    const updatedCompleted = progress.completedChallenges.includes(challengeId)
      ? progress.completedChallenges
      : [...progress.completedChallenges, challengeId];
    if (allRequiredCompleted(topic.challenges, updatedCompleted) && progress.status !== "completed") {
      completeTopic();
    }
  };

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
        const onComplete = () => handleComplete(challenge.id);

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
