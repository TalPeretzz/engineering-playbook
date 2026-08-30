"use client";

import React, { useState, useRef } from "react";
import type { VisualStep } from "@engineering-playbook/content-schema";

const RESULT_STYLES = {
  "in-set": "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300",
  "not-in-set": "bg-surface-overlay border-wire text-ink-muted",
  "false-positive": "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300",
};

export function StepVisual({ steps, onFirstStep }: { steps: VisualStep[]; onFirstStep?: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const current = steps[stepIndex];
  const hasCalledFirstStep = useRef(false);

  const advance = () => {
    if (stepIndex === 0 && !hasCalledFirstStep.current) {
      hasCalledFirstStep.current = true;
      onFirstStep?.();
    }
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  };

  return (
    <div className="bg-surface-raised border border-wire rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-wire bg-surface-overlay/50">
        <span className="font-mono text-sm text-brand-text font-medium truncate pr-4">
          {current.label}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-ink-faint">
            {stepIndex + 1} / {steps.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              aria-label="Previous step"
              className="w-7 h-7 rounded flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ←
            </button>
            <button
              onClick={advance}
              disabled={stepIndex === steps.length - 1}
              aria-label="Next step"
              className="w-7 h-7 rounded flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Description */}
        <p className="text-ink-muted text-sm leading-relaxed">{current.description}</p>

        {/* Hash outputs */}
        {current.hashOutputs && current.hashOutputs.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wider mb-2">
              Hash functions
            </p>
            {current.hashOutputs.map((h, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-sm">
                <span className="text-ink-muted">{h.fn}</span>
                <span className="text-ink-faint">→</span>
                <span className="text-brand-text font-semibold">{h.output}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bit array */}
        <div>
          <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wider mb-2">
            Bit array
          </p>
          {/* Index row */}
          <div className="flex gap-1 mb-1 overflow-x-auto pb-1">
            {current.bitArray.map((_, i) => (
              <div
                key={i}
                className="w-8 shrink-0 text-center text-[10px] text-ink-faint font-mono"
              >
                {i}
              </div>
            ))}
          </div>
          {/* Bit row */}
          <div className="flex gap-1 overflow-x-auto">
            {current.bitArray.map((bit, i) => {
              const isActive = current.activeIndices?.includes(i);
              let cls =
                "w-8 h-8 shrink-0 flex items-center justify-center rounded text-sm font-mono font-bold transition-all duration-200 ";
              if (isActive && bit === 1) {
                cls += "bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-1 ring-offset-surface-raised";
              } else if (isActive && bit === 0) {
                cls += "bg-red-900/60 text-red-400 ring-2 ring-red-500 ring-offset-1 ring-offset-surface-raised";
              } else if (bit === 1) {
                cls += "bg-surface-overlay text-ink-muted";
              } else {
                cls += "bg-surface-overlay/50 text-ink-faint";
              }
              return (
                <div key={i} className={cls}>
                  {bit}
                </div>
              );
            })}
          </div>
        </div>

        {/* Result */}
        {current.result && (
          <div
            className={`px-4 py-3 rounded-lg border text-sm font-medium ${
              RESULT_STYLES[current.result.type]
            }`}
          >
            {current.result.text}
          </div>
        )}

        {/* Invariant callout */}
        <div className="flex items-start gap-3 px-4 py-3 bg-surface-overlay border border-wire rounded-lg text-xs text-ink-muted leading-relaxed">
          <span className="text-ink-faint shrink-0 mt-0.5" aria-hidden="true">ℹ</span>
          <span>
            A Bloom Filter only answers{" "}
            <strong className="text-ink">&ldquo;Definitely not present&rdquo;</strong>{" "}
            or{" "}
            <strong className="text-ink">&ldquo;Probably present&rdquo;</strong>.
            {" "}It never gives a definitive yes.
          </span>
        </div>

        {/* Step dots */}
        <div className="flex gap-2 pt-1">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i > stepIndex && stepIndex === 0 && !hasCalledFirstStep.current) {
                  hasCalledFirstStep.current = true;
                  onFirstStep?.();
                }
                setStepIndex(i);
              }}
              aria-label={`Go to step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                i === stepIndex
                  ? "bg-brand w-5"
                  : "bg-wire-strong hover:bg-ink-faint w-1.5"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
