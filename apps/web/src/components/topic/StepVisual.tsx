"use client";

import React, { useState } from "react";
import type { VisualStep } from "@engineering-playbook/content-schema";

const RESULT_STYLES = {
  "in-set": "bg-emerald-950/40 border-emerald-800/50 text-emerald-300",
  "not-in-set": "bg-zinc-800/80 border-zinc-700 text-zinc-200",
  "false-positive": "bg-amber-950/40 border-amber-800/50 text-amber-300",
};

export function StepVisual({ steps }: { steps: VisualStep[] }) {
  const [stepIndex, setStepIndex] = useState(0);
  const current = steps[stepIndex];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-950/50">
        <span className="font-mono text-sm text-emerald-400 font-medium truncate pr-4">
          {current.label}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-zinc-600">
            {stepIndex + 1} / {steps.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              aria-label="Previous step"
              className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={stepIndex === steps.length - 1}
              aria-label="Next step"
              className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Description */}
        <p className="text-zinc-400 text-sm leading-relaxed">{current.description}</p>

        {/* Hash outputs */}
        {current.hashOutputs && current.hashOutputs.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider mb-2">
              Hash functions
            </p>
            {current.hashOutputs.map((h, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-sm">
                <span className="text-zinc-400">{h.fn}</span>
                <span className="text-zinc-600">→</span>
                <span className="text-emerald-400 font-semibold">{h.output}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bit array */}
        <div>
          <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider mb-2">
            Bit array
          </p>
          {/* Index row */}
          <div className="flex gap-1 mb-1 overflow-x-auto pb-1">
            {current.bitArray.map((_, i) => (
              <div
                key={i}
                className="w-8 shrink-0 text-center text-[10px] text-zinc-600 font-mono"
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
                cls += "bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-1 ring-offset-zinc-900";
              } else if (isActive && bit === 0) {
                cls += "bg-red-900/60 text-red-400 ring-2 ring-red-500 ring-offset-1 ring-offset-zinc-900";
              } else if (bit === 1) {
                cls += "bg-zinc-600 text-zinc-200";
              } else {
                cls += "bg-zinc-800 text-zinc-600";
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
        <div className="flex items-start gap-3 px-4 py-3 bg-zinc-800/40 border border-zinc-700/50 rounded-lg text-xs text-zinc-400 leading-relaxed">
          <span className="text-zinc-500 shrink-0 mt-0.5">ℹ</span>
          <span>
            A Bloom Filter only answers{" "}
            <strong className="text-zinc-200">&ldquo;Definitely not present&rdquo;</strong>{" "}
            or{" "}
            <strong className="text-zinc-200">&ldquo;Probably present&rdquo;</strong>.
            {" "}It never gives a definitive yes.
          </span>
        </div>

        {/* Step dots */}
        <div className="flex gap-2 pt-1">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStepIndex(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === stepIndex
                  ? "bg-emerald-400 w-5"
                  : "bg-zinc-700 hover:bg-zinc-500 w-1.5"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
