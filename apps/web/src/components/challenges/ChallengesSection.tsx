"use client";

import React from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import type { TopicProgress } from "@engineering-playbook/shared-types";
import { MultipleChoiceChallenge } from "./MultipleChoiceChallenge";
import { ImplementationChallenge } from "./ImplementationChallenge";
import { SystemDesignChallenge } from "./SystemDesignChallenge";
import { useTopicProgress } from "@/hooks/useProgress";

type ChallengesSectionProps = {
  topic: Topic;
  progress: TopicProgress;
};

function requiredCount(topic: Topic) {
  return topic.challenges.filter((c) => c.required).length;
}

function completedRequiredCount(topic: Topic, progress: TopicProgress) {
  return topic.challenges.filter((c) => c.required && progress.completedChallenges.includes(c.id)).length;
}

export function ChallengesSection({ topic }: ChallengesSectionProps) {
  const { progress, completeChallenge, completeTopic } = useTopicProgress(topic.slug);

  const handleComplete = (challengeId: string) => {
    completeChallenge(challengeId);
    // Derive topic completion from required challenges
    const updatedCompleted = progress.completedChallenges.includes(challengeId)
      ? progress.completedChallenges
      : [...progress.completedChallenges, challengeId];
    const allRequiredDone = topic.challenges
      .filter((c) => c.required)
      .every((c) => updatedCompleted.includes(c.id));
    if (allRequiredDone && progress.status !== "completed") {
      completeTopic();
    }
  };

  const req = requiredCount(topic);
  const doneReq = completedRequiredCount(topic, progress);

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
