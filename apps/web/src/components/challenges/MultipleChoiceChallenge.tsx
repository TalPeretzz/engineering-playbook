"use client";

import React, { useState } from "react";
import type { MultipleChoiceChallenge as MCChallenge } from "@engineering-playbook/content-schema";
import { ChallengeCard } from "./ChallengeCard";

type Props = {
  challenge: MCChallenge;
  isCompleted: boolean;
  onComplete: () => void;
};

export function MultipleChoiceChallenge({ challenge, isCompleted, onComplete }: Props) {
  // revealed: true once the correct answer has been given (or was already completed)
  const [revealed, setRevealed] = useState(isCompleted);
  // wrongOptionId: the last incorrectly-selected option — cleared on next attempt
  const [wrongOptionId, setWrongOptionId] = useState<string | null>(null);

  const handleSelect = (optionId: string) => {
    if (revealed) return;
    setWrongOptionId(null);
    if (optionId === challenge.correctOptionId) {
      setRevealed(true);
      onComplete();
    } else {
      setWrongOptionId(optionId);
    }
  };

  return (
    <ChallengeCard
      title={challenge.question}
      type="multiple-choice"
      required={challenge.required}
      isCompleted={isCompleted}
    >
      <div className="space-y-2">
        {challenge.options.map((option) => {
          const isCorrectOption = option.id === challenge.correctOptionId;
          const isWrong = option.id === wrongOptionId;

          let optionStyle: string;
          let indicatorStyle: string;

          if (revealed) {
            if (isCorrectOption) {
              optionStyle = "border-emerald-600 bg-emerald-950/40 cursor-default";
              indicatorStyle = "border-emerald-500 text-emerald-400 bg-emerald-900/40";
            } else {
              optionStyle = "border-zinc-800 bg-surface-overlay opacity-40 cursor-default";
              indicatorStyle = "border-zinc-600 text-zinc-500";
            }
          } else if (isWrong) {
            optionStyle = "border-red-700 bg-red-950/20 cursor-pointer";
            indicatorStyle = "border-red-500 text-red-400";
          } else {
            optionStyle = "border-zinc-700 bg-surface-overlay hover:border-zinc-600 hover:bg-zinc-700/50 cursor-pointer";
            indicatorStyle = "border-zinc-600 text-zinc-500";
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${optionStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${indicatorStyle}`}>
                  {revealed && isCorrectOption ? "✓" : revealed ? option.id.toUpperCase() : isWrong ? "✗" : option.id.toUpperCase()}
                </span>
                <span className={revealed && isCorrectOption ? "text-emerald-200" : "text-zinc-300"}>
                  {option.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {wrongOptionId && !revealed && (
        <div className="mt-4 p-4 rounded-lg border bg-red-950/30 border-red-800/40 text-sm">
          <p className="flex items-center gap-2 font-medium text-red-300">
            <span aria-hidden="true">✗</span>
            Incorrect — try a different answer.
          </p>
        </div>
      )}

      {revealed && (
        <div className="mt-4 p-4 rounded-lg border bg-emerald-950/30 border-emerald-800/40 text-sm">
          <p className="flex items-center gap-2 font-medium text-emerald-300 mb-2">
            <span aria-hidden="true">✓</span>
            Correct!
          </p>
          <p className="text-zinc-300 leading-relaxed">{challenge.explanation}</p>
        </div>
      )}
    </ChallengeCard>
  );
}
