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
        <div className="bg-surface-overlay border border-zinc-700 rounded-lg p-4">
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
            {challenge.scenario}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowHints(!showHints); if (!showHints && revealedHints === 0) setRevealedHints(1); }}
            className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            {showHints ? "Hide hints" : "Reveal hints"}
          </button>

          {/* Revealing discussion points does NOT complete the challenge. */}
          <button
            onClick={() => setShowDiscussion(true)}
            className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            Reveal discussion points
          </button>

          {!isCompleted && (
            <button
              onClick={onComplete}
              className="text-xs px-3 py-1.5 rounded bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/70 transition-colors font-medium"
            >
              I completed this challenge
            </button>
          )}
        </div>

        {showHints && revealedHints > 0 && (
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4 space-y-2">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Hints</p>
            {challenge.hints.slice(0, revealedHints).map((hint, i) => (
              <p key={i} className="text-zinc-300 text-sm leading-relaxed">
                <span className="text-amber-500 mr-2">{i + 1}.</span>{hint}
              </p>
            ))}
            {revealedHints < challenge.hints.length && (
              <button
                onClick={revealNextHint}
                className="text-xs text-amber-400 hover:text-amber-300 mt-1"
              >
                Next hint ({revealedHints}/{challenge.hints.length}) →
              </button>
            )}
          </div>
        )}

        {showDiscussion && (
          <div className="bg-sky-950/20 border border-sky-900/30 rounded-lg p-4">
            <p className="text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3">Discussion Points</p>
            <ul className="space-y-3">
              {challenge.discussionPoints.map((point, i) => (
                <li key={i} className="text-zinc-300 text-sm leading-relaxed">
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
          return <strong key={i} className="text-zinc-100 font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
