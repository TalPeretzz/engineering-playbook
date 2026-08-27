"use client";

import React, { useState, useRef } from "react";
import type { ImplementationChallenge as ImplChallenge } from "@engineering-playbook/content-schema";
import { ChallengeCard } from "./ChallengeCard";
import { CodeBlock } from "@/components/topic/CodeBlock";
import { useLanguage } from "@/hooks/useLanguage";
import { buildDraftRecord } from "@/utils/challengeCompletion";
import { runTests, type TestCase, type TestResult } from "@/utils/testRunner";

type Props = {
  challenge: ImplChallenge;
  isCompleted: boolean;
  onComplete: () => void;
  testCases?: TestCase[];
};

const LANG_LABELS = { typescript: "TypeScript", python: "Python", java: "Java" } as const;

export function ImplementationChallenge({ challenge, isCompleted, onComplete, testCases }: Props) {
  const { language } = useLanguage();

  const [drafts, setDrafts] = useState(() => buildDraftRecord(challenge.starterCode));
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const hasAutoCompleted = useRef(false);

  const userCode = drafts[language] ?? "";
  const solutionCode = challenge.solution[language] ?? challenge.solution.typescript ?? "";

  const setUserCode = (code: string) =>
    setDrafts((prev) => ({ ...prev, [language]: code }));

  const handleReset = () => {
    setDrafts((prev) => ({
      ...prev,
      [language]: challenge.starterCode[language] ?? challenge.starterCode.typescript ?? "",
    }));
    setTestResults(null);
  };

  const handleRunTests = () => {
    if (!testCases) return;
    setIsRunning(true);
    setTestResults(null);
    // Defer to allow the loading state to paint
    setTimeout(() => {
      const results = runTests(userCode, testCases);
      setTestResults(results);
      setIsRunning(false);
      const allPassed = results.every((r) => r.passed);
      if (allPassed && !isCompleted && !hasAutoCompleted.current) {
        hasAutoCompleted.current = true;
        onComplete();
      }
    }, 0);
  };

  const allTestsPassed = testResults?.every((r) => r.passed) ?? false;

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

          <button
            onClick={() => setShowSolution(true)}
            className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            Reveal solution
          </button>

          {testCases && language === "typescript" && (
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="text-xs px-3 py-1.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isRunning ? "Running…" : "Run tests"}
            </button>
          )}

          {!isCompleted && !allTestsPassed && (
            <button
              onClick={onComplete}
              className="text-xs px-3 py-1.5 rounded bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/70 transition-colors font-medium"
            >
              I completed this challenge
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

        {/* Test results */}
        {testResults && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Test results
            </p>
            {testResults.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 text-sm rounded-lg px-4 py-3 border ${
                  r.passed
                    ? "bg-emerald-950/20 border-emerald-900/30"
                    : "bg-red-950/20 border-red-900/30"
                }`}
              >
                <span
                  className={`shrink-0 font-bold ${r.passed ? "text-emerald-400" : "text-red-400"}`}
                  aria-hidden="true"
                >
                  {r.passed ? "✓" : "✗"}
                </span>
                <div>
                  <p className={r.passed ? "text-emerald-200" : "text-red-200"}>{r.name}</p>
                  {r.error && (
                    <p className="text-red-400 text-xs mt-1 font-mono break-all">{r.error}</p>
                  )}
                </div>
              </div>
            ))}
            {allTestsPassed && (
              <p className="text-emerald-400 text-sm font-medium pt-1">
                All tests passed — challenge completed!
              </p>
            )}
          </div>
        )}
      </div>
    </ChallengeCard>
  );
}
