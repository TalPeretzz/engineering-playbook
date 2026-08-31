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
  testClassName?: string;
};

const LANG_LABELS = { typescript: "TypeScript", python: "Python", java: "Java" } as const;

// Error kind labels shown in test results UI
const ERROR_KIND_LABEL: Record<string, string> = {
  compile: "Syntax error",
  runtime: "Runtime error",
};

export function ImplementationChallenge({ challenge, isCompleted, onComplete, testCases, testClassName }: Props) {
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
    setTimeout(() => {
      const results = runTests(userCode, testCases, testClassName);
      setTestResults(results);
      setIsRunning(false);
      const allPassed = results.every((r) => r.passed);
      // Only auto-complete on all-pass; revealing solution does NOT complete
      if (allPassed && !isCompleted && !hasAutoCompleted.current) {
        hasAutoCompleted.current = true;
        onComplete();
      }
    }, 0);
  };

  const allTestsPassed = testResults?.every((r) => r.passed) ?? false;

  // Required challenges with test cases must be validated — no manual bypass
  const canCompleteManually = !challenge.required || !testCases;

  return (
    <ChallengeCard title={challenge.title} type="implementation" required={challenge.required} isCompleted={isCompleted}>
      <div className="space-y-4">
        <p className="text-ink-muted text-sm leading-relaxed whitespace-pre-line">
          {challenge.description}
        </p>

        {/* Editor */}
        <div className="rounded-lg border border-wire-strong overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-surface-raised border-b border-wire">
            <span className="text-xs font-medium text-ink-muted">{LANG_LABELS[language] ?? language}</span>
            <button
              onClick={handleReset}
              className="text-xs text-ink-faint hover:text-ink-muted transition-colors px-2 py-1 rounded hover:bg-surface-overlay cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Reset
            </button>
          </div>
          <textarea
            value={userCode}
            onChange={(e) => setUserCode(e.target.value)}
            spellCheck={false}
            className="w-full bg-surface-code text-ink-muted font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
            style={{ minHeight: "280px", tabSize: 2 }}
            aria-label="Implementation editor"
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

        {/* Action row */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHints(!showHints)}
            className="text-xs px-3 py-1.5 rounded border border-wire text-ink-muted hover:text-ink hover:border-wire-strong transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {showHints ? "Hide hints" : "Show hints"}
          </button>

          <button
            onClick={() => setShowSolution(true)}
            className="text-xs px-3 py-1.5 rounded border border-wire text-ink-muted hover:text-ink hover:border-wire-strong transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Reveal solution
          </button>

          {testCases && language === "typescript" && (
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="text-xs px-3 py-1.5 rounded bg-surface-overlay border border-wire-strong text-ink hover:bg-wire disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {isRunning ? "Running…" : "Run tests"}
            </button>
          )}

          {/* Manual completion: only for optional challenges or those without tests */}
          {!isCompleted && !allTestsPassed && canCompleteManually && (
            <button
              onClick={onComplete}
              className="text-xs px-3 py-1.5 rounded bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 transition-colors font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              I completed this challenge
            </button>
          )}
        </div>

        {showHints && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 space-y-2">
            <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">Hints</p>
            {challenge.hints.slice(0, currentHint + 1).map((hint, i) => (
              <p key={i} className="text-ink-muted text-sm leading-relaxed">
                <span className="text-amber-600 dark:text-amber-500 mr-2">{i + 1}.</span>{hint}
              </p>
            ))}
            {currentHint < challenge.hints.length - 1 && (
              <button
                onClick={() => setCurrentHint((h) => h + 1)}
                className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 mt-2 cursor-pointer"
              >
                Next hint →
              </button>
            )}
          </div>
        )}

        {showSolution && (
          <div>
            <p className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2">Solution</p>
            <CodeBlock code={solutionCode} language={language} label="Solution" />
          </div>
        )}

        {/* Test results */}
        {testResults && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Test results — {testResults.filter((r) => r.passed).length} / {testResults.length} passed
            </p>
            {testResults.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 text-sm rounded-lg px-4 py-3 border ${
                  r.passed
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30"
                }`}
              >
                <span
                  className={`shrink-0 font-bold mt-0.5 ${r.passed ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
                  aria-hidden="true"
                >
                  {r.passed ? "✓" : "✗"}
                </span>
                <div className="min-w-0">
                  <p className={`font-medium ${r.passed ? "text-emerald-800 dark:text-emerald-200" : "text-red-800 dark:text-red-200"}`}>
                    {r.name}
                  </p>
                  {r.error && (
                    <div className="mt-1.5 space-y-1">
                      {r.errorKind && (
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40">
                          {ERROR_KIND_LABEL[r.errorKind] ?? r.errorKind}
                        </span>
                      )}
                      <p className="text-red-600 dark:text-red-400 text-xs font-mono break-all leading-relaxed">
                        {r.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {allTestsPassed && (
              <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium pt-1">
                All tests passed — challenge completed!
              </p>
            )}
          </div>
        )}
      </div>
    </ChallengeCard>
  );
}
