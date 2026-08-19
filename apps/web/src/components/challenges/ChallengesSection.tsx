"use client";

import React, { useState } from "react";
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

export function ChallengesSection({ topic }: ChallengesSectionProps) {
  const { progress, completeChallenge } = useTopicProgress(topic.slug);

  return (
    <div className="space-y-6">
      <p className="text-zinc-400 text-sm">
        {progress.completedChallenges.length} / {topic.challenges.length} challenges completed
      </p>
      {topic.challenges.map((challenge) => {
        const isCompleted = progress.completedChallenges.includes(challenge.id);
        const onComplete = () => completeChallenge(challenge.id);

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
