"use client";

import React, { useState } from "react";
import type { ImplementationChallenge as ImplChallenge } from "@engineering-playbook/content-schema";
import { ChallengeCard } from "./ChallengeCard";
import { CodeBlock } from "@/components/topic/CodeBlock";
import { useLanguage } from "@/hooks/useLanguage";

type Props = {
  challenge: ImplChallenge;
  isCompleted: boolean;
  onComplete: () => void;
};

export function ImplementationChallenge({ challenge, isCompleted, onComplete }: Props) {
  const { language } = useLanguage();
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);

  const starterCode = challenge.starterCode[language] ?? challenge.starterCode.typescript;
  const solutionCode = challenge.solution[language] ?? challenge.solution.typescript;

  const handleShowNextHint = () => {
    if (currentHint < challenge.hints.length - 1) {
      setCurrentHint((h) => h + 1);
    }
  };

  return (
    <ChallengeCard title={challenge.title} type="implementation" isCompleted={isCompleted}>
      <div className="space-y-4">
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
          {challenge.description}
        </p>

        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Starter Code</p>
          <CodeBlock code={starterCode} language={language} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHints(!showHints)}
            className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            {showHints ? "Hide hints" : "Show hints"}
          </button>

          <button
            onClick={() => {
              setShowSolution(true);
              onComplete();
            }}
            className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            Reveal solution
          </button>

          {!isCompleted && (
            <button
              onClick={onComplete}
              className="text-xs px-3 py-1.5 rounded bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/70 transition-colors font-medium"
            >
              Mark as completed
            </button>
          )}
        </div>

        {showHints && (
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4 space-y-2">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Hints</p>
            {challenge.hints.slice(0, currentHint + 1).map((hint, i) => (
              <p key={i} className="text-zinc-300 text-sm leading-relaxed">
                <span className="text-amber-500 mr-2">{i + 1}.</span>{hint}
              </p>
            ))}
            {currentHint < challenge.hints.length - 1 && (
              <button
                onClick={handleShowNextHint}
                className="text-xs text-amber-400 hover:text-amber-300 mt-2"
              >
                Next hint →
              </button>
            )}
          </div>
        )}

        {showSolution && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Solution</p>
            <CodeBlock code={solutionCode} language={language} label="Solution" />
          </div>
        )}
      </div>
    </ChallengeCard>
  );
}
