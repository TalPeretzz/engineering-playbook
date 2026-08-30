"use client";

import React from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import type { TopicProgress } from "@engineering-playbook/shared-types";

type TopicHeaderProps = {
  topic: Topic;
  progress: TopicProgress;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50",
  intermediate: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50",
  advanced: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50",
};

const CATEGORY_LABELS: Record<string, string> = {
  fundamentals: "Fundamentals",
  "data-structures": "Data Structures",
  "distributed-systems": "Distributed Systems",
  resilience: "Resilience",
  messaging: "Messaging",
  caching: "Caching",
  "backend-patterns": "Backend / API",
};

export function TopicHeader({ topic, progress }: TopicHeaderProps) {
  const isCompleted = progress.status === "completed";

  const requiredChallenges = topic.challenges.filter((c) => c.required);
  const doneRequired = requiredChallenges.filter((c) =>
    progress.completedChallenges.includes(c.id)
  ).length;

  return (
    <header id="top" className="scroll-mt-20 pb-8 border-b border-wire">
      {/* Category + status tags */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-ink-muted bg-surface-overlay px-2 py-0.5 rounded border border-wire">
          {CATEGORY_LABELS[topic.category] ?? topic.category}
        </span>
        {progress.status !== "not-started" && (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isCompleted
                ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50"
                : "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40"
            }`}
          >
            {isCompleted ? "✓ Completed" : "◐ In Progress"}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-ink mb-2 tracking-tight">
        {topic.title}
      </h1>
      <p className="text-ink-muted text-base leading-relaxed max-w-xl mb-5">
        {topic.description}
      </p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-4">
        <span
          className={`text-xs px-2 py-0.5 rounded border font-medium ${DIFFICULTY_COLORS[topic.difficulty]}`}
        >
          {topic.difficulty}
        </span>
        <span className="text-ink-muted">~{topic.estimatedMinutes} min</span>
        <span className="text-ink-faint">·</span>
        <span className="text-ink-muted">{CATEGORY_LABELS[topic.category] ?? topic.category}</span>
      </div>

      {/* Challenge progress dots */}
      {requiredChallenges.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex gap-1" role="list" aria-label="Challenge progress">
            {requiredChallenges.map((c, i) => (
              <div
                key={c.id}
                role="listitem"
                title={`Challenge ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  progress.completedChallenges.includes(c.id)
                    ? "bg-brand"
                    : "bg-surface-overlay"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-ink-muted">
            {doneRequired} / {requiredChallenges.length} required challenges
            {isCompleted && (
              <span className="text-brand-text ml-1.5 font-medium">— all done</span>
            )}
          </span>
        </div>
      )}
    </header>
  );
}
