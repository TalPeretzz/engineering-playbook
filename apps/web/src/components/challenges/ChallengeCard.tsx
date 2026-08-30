import React from "react";

type ChallengeCardProps = {
  title: string;
  type: "multiple-choice" | "implementation" | "system-design";
  required: boolean;
  isCompleted: boolean;
  children: React.ReactNode;
};

const TYPE_LABELS: Record<ChallengeCardProps["type"], string> = {
  "multiple-choice": "Concept Check",
  implementation: "Implementation",
  "system-design": "System Design",
};

const TYPE_COLORS: Record<ChallengeCardProps["type"], string> = {
  "multiple-choice": "text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-800/40",
  implementation: "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-800/40",
  "system-design": "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-800/40",
};

export function ChallengeCard({
  title,
  type,
  required,
  isCompleted,
  children,
}: ChallengeCardProps) {
  return (
    <div
      className={`border rounded-xl transition-colors ${
        isCompleted
          ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/10"
          : "border-wire bg-surface-raised"
      }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${TYPE_COLORS[type]}`}
            >
              {TYPE_LABELS[type]}
            </span>
            {!required && (
              <span className="text-[11px] text-ink-faint border border-wire px-2 py-0.5 rounded">
                Optional
              </span>
            )}
            {isCompleted && (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">✓ Completed</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-ink leading-snug">{title}</h3>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}
