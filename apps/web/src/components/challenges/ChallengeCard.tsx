import React from "react";

type ChallengeCardProps = {
  title: string;
  type: "multiple-choice" | "implementation" | "system-design";
  isCompleted: boolean;
  children: React.ReactNode;
};

const TYPE_LABELS: Record<ChallengeCardProps["type"], string> = {
  "multiple-choice": "Conceptual",
  implementation: "Implementation",
  "system-design": "System Design",
};

const TYPE_COLORS: Record<ChallengeCardProps["type"], string> = {
  "multiple-choice": "text-sky-400 bg-sky-900/20 border-sky-800/40",
  implementation: "text-purple-400 bg-purple-900/20 border-purple-800/40",
  "system-design": "text-amber-400 bg-amber-900/20 border-amber-800/40",
};

export function ChallengeCard({ title, type, isCompleted, children }: ChallengeCardProps) {
  return (
    <div className={`border rounded-xl p-5 transition-colors ${
      isCompleted
        ? "border-emerald-800/50 bg-emerald-950/10"
        : "border-zinc-800 bg-surface-raised"
    }`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${TYPE_COLORS[type]}`}>
              {TYPE_LABELS[type]}
            </span>
            {isCompleted && (
              <span className="text-[11px] text-emerald-400 font-medium">✓ Completed</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
        </div>
      </div>
      {children}
    </div>
  );
}
