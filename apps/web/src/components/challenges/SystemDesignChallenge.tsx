"use client";

import React, { useState } from "react";
import type { SystemDesignChallenge as SDChallenge } from "@engineering-playbook/content-schema";
import { ChallengeCard } from "./ChallengeCard";

type Props = {
  challenge: SDChallenge;
  isCompleted: boolean;
  onComplete: () => void;
};

export function SystemDesignChallenge({ challenge, isCompleted, onComplete }: Props) {
  const [showHints, setShowHints] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);

  const revealNextHint = () => {
    if (revealedHints < challenge.hints.length) {
      setRevealedHints((n) => n + 1);
    }
  };

  return (
    <ChallengeCard title={challenge.title} type="system-design" required={challenge.required} isCompleted={isCompleted}>
      <div className="space-y-4">
        <div className="bg-surface-overlay border border-wire rounded-lg p-4">
          <p className="text-ink-muted text-sm leading-relaxed whitespace-pre-line">
            {challenge.scenario}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowHints(!showHints); if (!showHints && revealedHints === 0) setRevealedHints(1); }}
            className="text-xs px-3 py-1.5 rounded border border-wire text-ink-muted hover:text-ink hover:border-wire-strong transition-colors cursor-pointer"
          >
            {showHints ? "Hide hints" : "Reveal hints"}
          </button>

          <button
            onClick={() => setShowDiscussion(true)}
            className="text-xs px-3 py-1.5 rounded border border-wire text-ink-muted hover:text-ink hover:border-wire-strong transition-colors cursor-pointer"
          >
            Reveal discussion points
          </button>

          {!isCompleted && (
            <button
              onClick={onComplete}
              className="text-xs px-3 py-1.5 rounded bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 transition-colors font-medium cursor-pointer"
            >
              I completed this challenge
            </button>
          )}
        </div>

        {showHints && revealedHints > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 space-y-2">
            <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">Hints</p>
            {challenge.hints.slice(0, revealedHints).map((hint, i) => (
              <p key={i} className="text-ink-muted text-sm leading-relaxed">
                <span className="text-amber-600 dark:text-amber-500 mr-2">{i + 1}.</span>{hint}
              </p>
            ))}
            {revealedHints < challenge.hints.length && (
              <button
                onClick={revealNextHint}
                className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 mt-1 cursor-pointer"
              >
                Next hint ({revealedHints}/{challenge.hints.length}) →
              </button>
            )}
          </div>
        )}

        {showDiscussion && (
          <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/30 rounded-lg p-4">
            <p className="text-sky-700 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3">Discussion Points</p>
            <ul className="space-y-3">
              {challenge.discussionPoints.map((point, i) => (
                <li key={i} className="text-ink-muted text-sm leading-relaxed">
                  <InlineBold text={point} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ChallengeCard>
  );
}

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="text-ink font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
