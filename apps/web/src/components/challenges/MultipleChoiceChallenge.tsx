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
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(isCompleted);

  const isCorrect = selected === challenge.correctOptionId;

  const handleSelect = (optionId: string) => {
    if (revealed) return;
    setSelected(optionId);
    setRevealed(true);
    if (optionId === challenge.correctOptionId) {
      onComplete();
    }
  };

  return (
    <ChallengeCard title={challenge.question} type="multiple-choice" isCompleted={isCompleted}>
      <div className="space-y-2">
        {challenge.options.map((option) => {
          const isSelected = selected === option.id;
          const isCorrectOption = option.id === challenge.correctOptionId;

          let optionStyle = "border-zinc-700 bg-surface-overlay hover:border-zinc-600 hover:bg-zinc-700/50 cursor-pointer";
          if (revealed) {
            if (isCorrectOption) {
              optionStyle = "border-emerald-600 bg-emerald-950/40 cursor-default";
            } else if (isSelected && !isCorrectOption) {
              optionStyle = "border-red-700 bg-red-950/40 cursor-default";
            } else {
              optionStyle = "border-zinc-800 bg-surface-overlay opacity-50 cursor-default";
            }
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${optionStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                  revealed && isCorrectOption
                    ? "border-emerald-500 text-emerald-400 bg-emerald-900/40"
                    : revealed && isSelected && !isCorrectOption
                    ? "border-red-500 text-red-400"
                    : "border-zinc-600 text-zinc-500"
                }`}>
                  {option.id.toUpperCase()}
                </span>
                <span className={revealed && isCorrectOption ? "text-emerald-200" : "text-zinc-300"}>
                  {option.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className={`mt-4 p-4 rounded-lg border text-sm ${
          isCorrect || isCompleted
            ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-200"
            : "bg-red-950/30 border-red-800/40 text-red-200"
        }`}>
          <p className="font-medium mb-1">
            {isCorrect || isCompleted ? "Correct!" : "Not quite."}
          </p>
          <p className="text-zinc-300 leading-relaxed">{challenge.explanation}</p>
        </div>
      )}
    </ChallengeCard>
  );
}
