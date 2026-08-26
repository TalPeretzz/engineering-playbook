"use client";

import React, { useState } from "react";
import type { ImplementationChallenge as ImplChallenge } from "@engineering-playbook/content-schema";
import { ChallengeCard } from "./ChallengeCard";
import { CodeBlock } from "@/components/topic/CodeBlock";
import { useLanguage } from "@/hooks/useLanguage";
import { buildDraftRecord } from "@/utils/challengeCompletion";

type Props = {
  challenge: ImplChallenge;
  isCompleted: boolean;
  onComplete: () => void;
};

const LANG_LABELS = { typescript: "TypeScript", python: "Python", java: "Java" } as const;

export function ImplementationChallenge({ challenge, isCompleted, onComplete }: Props) {
  const { language } = useLanguage();

  // One draft slot per language — switching languages never loses prior edits.
  const [drafts, setDrafts] = useState(() => buildDraftRecord(challenge.starterCode));
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);

  const userCode = drafts[language] ?? "";
  const solutionCode = challenge.solution[language] ?? challenge.solution.typescript ?? "";

  const setUserCode = (code: string) =>
    setDrafts((prev) => ({ ...prev, [language]: code }));

  const handleReset = () =>
    setDrafts((prev) => ({
      ...prev,
      [language]: challenge.starterCode[language] ?? challenge.starterCode.typescript ?? "",
    }));

  return (
    <ChallengeCard title={challenge.title} type="implementation" required={challenge.required} isCompleted={isCompleted}>
      <div className="space-y-4">
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
          {challenge.description}
        </p>

        {/* Editor */}
        <div className="rounded-lg border border-zinc-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-700">
            <span className="text-xs font-medium text-zinc-400">{LANG_LABELS[language] ?? language}</span>
            <button
              onClick={handleReset}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
          <textarea
            value={userCode}
            onChange={(e) => setUserCode(e.target.value)}
            spellCheck={false}
            className="w-full bg-[#0d1117] text-zinc-300 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
            style={{ minHeight: "280px", tabSize: 2 }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const el = e.currentTarget;
                const start = el.selectionStart;
                const end = el.selectionEnd;
                setUserCode(userCode.slice(0, start) + "  " + userCode.slice(end));
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = start + 2;
                });
              }
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHints(!showHints)}
            className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            {showHints ? "Hide hints" : "Show hints"}
          </button>

          {/* Revealing the solution does NOT complete the challenge. */}
          <button
            onClick={() => setShowSolution(true)}
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
                onClick={() => setCurrentHint((h) => h + 1)}
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
