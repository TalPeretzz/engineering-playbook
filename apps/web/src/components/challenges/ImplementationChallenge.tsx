"use client";

import React, { useState, useCallback } from "react";
import type { ImplementationChallenge as ImplChallenge, TestCase } from "@engineering-playbook/content-schema";
import { ChallengeCard } from "./ChallengeCard";
import { CodeBlock } from "@/components/topic/CodeBlock";
import { useLanguage } from "@/hooks/useLanguage";

type Props = {
  challenge: ImplChallenge;
  isCompleted: boolean;
  onComplete: () => void;
};

type TestResult = {
  id: string;
  description: string;
  passed: boolean;
  error?: string;
};

function runTests(userCode: string, testCases: TestCase[]): TestResult[] {
  return testCases.map((tc) => {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(`${userCode}\n${tc.code}`);
      const result = fn();
      const passed = JSON.stringify(result) === JSON.stringify(tc.expected);
      return { id: tc.id, description: tc.description, passed, error: passed ? undefined : `Expected ${JSON.stringify(tc.expected)}, got ${JSON.stringify(result)}` };
    } catch (e) {
      return { id: tc.id, description: tc.description, passed: false, error: String(e) };
    }
  });
}

const LANG_LABELS = { typescript: "TypeScript", python: "Python", java: "Java" } as const;

export function ImplementationChallenge({ challenge, isCompleted, onComplete }: Props) {
  const { language } = useLanguage();
  const starterCode = challenge.starterCode[language] ?? challenge.starterCode.typescript ?? "";
  const solutionCode = challenge.solution[language] ?? challenge.solution.typescript ?? "";

  const [userCode, setUserCode] = useState(starterCode);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);

  // Reset editor when language changes
  const [prevLang, setPrevLang] = useState(language);
  if (language !== prevLang) {
    setPrevLang(language);
    setUserCode(challenge.starterCode[language] ?? challenge.starterCode.typescript ?? "");
    setTestResults(null);
  }

  const handleRunTests = useCallback(() => {
    if (!challenge.testCases?.length) return;
    const results = runTests(userCode, challenge.testCases);
    setTestResults(results);
    if (results.every((r) => r.passed)) {
      onComplete();
    }
  }, [userCode, challenge.testCases, onComplete]);

  const handleReset = () => {
    setUserCode(challenge.starterCode[language] ?? challenge.starterCode.typescript ?? "");
    setTestResults(null);
  };

  const allPassed = testResults !== null && testResults.every((r) => r.passed);
  const hasTests = (challenge.testCases?.length ?? 0) > 0;
  const isJsRunnable = hasTests && (language === "typescript");

  return (
    <ChallengeCard title={challenge.title} type="implementation" isCompleted={isCompleted}>
      <div className="space-y-4">
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
          {challenge.description}
        </p>

        {/* IDE Editor */}
        <div className="rounded-lg border border-zinc-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-700">
            <span className="text-xs font-medium text-zinc-400">{LANG_LABELS[language] ?? language}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
              >
                Reset
              </button>
              {isJsRunnable && (
                <button
                  onClick={handleRunTests}
                  className="text-xs px-3 py-1 rounded bg-emerald-900/50 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/80 transition-colors font-medium"
                >
                  Run Tests
                </button>
              )}
            </div>
          </div>
          <textarea
            value={userCode}
            onChange={(e) => { setUserCode(e.target.value); setTestResults(null); }}
            spellCheck={false}
            className="w-full bg-[#0d1117] text-zinc-300 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
            style={{ minHeight: "280px", tabSize: 2 }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const el = e.currentTarget;
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const next = userCode.slice(0, start) + "  " + userCode.slice(end);
                setUserCode(next);
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = start + 2;
                });
              }
            }}
          />
        </div>

        {/* Test results */}
        {testResults !== null && (
          <div className={`rounded-lg border p-4 space-y-2 ${allPassed ? "border-emerald-800/50 bg-emerald-950/20" : "border-red-900/40 bg-red-950/10"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${allPassed ? "text-emerald-400" : "text-red-400"}`}>
              {allPassed ? "All tests passed!" : `${testResults.filter((r) => r.passed).length}/${testResults.length} tests passing`}
            </p>
            {testResults.map((result) => (
              <div key={result.id} className="flex flex-col gap-0.5">
                <div className="flex items-start gap-2 text-sm">
                  <span className={result.passed ? "text-emerald-400" : "text-red-400"}>{result.passed ? "✓" : "✗"}</span>
                  <span className={result.passed ? "text-zinc-300" : "text-zinc-400"}>{result.description}</span>
                </div>
                {result.error && (
                  <p className="ml-5 text-xs text-red-400 font-mono">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Non-runnable note */}
        {hasTests && !isJsRunnable && (
          <p className="text-xs text-zinc-500 italic">
            In-browser test execution is only available for TypeScript. Switch the language to run tests.
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHints(!showHints)}
            className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            {showHints ? "Hide hints" : "Show hints"}
          </button>

          <button
            onClick={() => { setShowSolution(true); onComplete(); }}
            className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            Reveal solution
          </button>

          {!isCompleted && !hasTests && (
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
