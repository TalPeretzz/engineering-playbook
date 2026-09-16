"use client";

import React from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import type { TopicProgress } from "@engineering-playbook/shared-types";
import { categories } from "@engineering-playbook/content";

const CATEGORY_TITLES: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.id, c.title])
);

type TopicHeaderProps = {
  topic: Topic;
  progress: TopicProgress;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:
    "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50",
  intermediate:
    "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50",
  advanced:
    "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50",
};

export function TopicHeader({ topic, progress }: TopicHeaderProps) {
  const isCompleted = progress.status === "completed";
  const categoryTitle = CATEGORY_TITLES[topic.categories[0]] ?? topic.categories[0];

  const requiredChallenges = topic.challenges.filter((c) => c.required);
  const doneRequired = requiredChallenges.filter((c) =>
    progress.completedChallenges.includes(c.id)
  ).length;

  return (
    <header id="top" className="scroll-mt-20">
      {/* Category + status row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-ink-muted bg-surface-overlay px-2 py-0.5 rounded border border-wire">
          {categoryTitle}
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
      <h1 className="text-3xl font-bold text-ink mb-2 tracking-tight">{topic.title}</h1>
      <p className="text-ink-muted text-base leading-relaxed max-w-xl mb-5">{topic.description}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-5">
        <span
          className={`text-xs px-2 py-0.5 rounded border font-medium ${DIFFICULTY_COLORS[topic.difficulty]}`}
        >
          {topic.difficulty}
        </span>
        <span className="text-ink-muted text-sm">~{topic.estimatedMinutes} min</span>
        <span className="text-ink-faint" aria-hidden="true">
          ·
        </span>
        <span className="text-ink-muted text-sm">{categoryTitle}</span>
      </div>

      {/* Challenge progress — hollow vs filled dots + screen reader progress */}
      {requiredChallenges.length > 0 && (
        <div
          className="flex items-center gap-3"
          role="progressbar"
          aria-valuenow={doneRequired}
          aria-valuemin={0}
          aria-valuemax={requiredChallenges.length}
          aria-label={`${doneRequired} of ${requiredChallenges.length} required challenges completed`}
        >
          <div className="flex gap-1.5" aria-hidden="true">
            {requiredChallenges.map((c, i) => {
              const isDone = progress.completedChallenges.includes(c.id);
              return (
                <div
                  key={c.id}
                  title={`Challenge ${i + 1}: ${isDone ? "completed" : "not completed"}`}
                  className={`w-3 h-3 rounded-full border-2 transition-all ${
                    isDone ? "bg-brand border-brand" : "bg-transparent border-wire-strong"
                  }`}
                />
              );
            })}
          </div>
          <span className="text-xs text-ink-muted">
            {doneRequired} / {requiredChallenges.length} required challenges
            {isCompleted && <span className="text-brand-text ml-1.5 font-medium">— all done</span>}
          </span>
        </div>
      )}
    </header>
  );
}
