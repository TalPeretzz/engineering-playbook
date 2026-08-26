"use client";

import React from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import type { TopicProgress } from "@engineering-playbook/shared-types";

type TopicHeaderProps = {
  topic: Topic;
  progress: TopicProgress;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-400 bg-emerald-900/30 border-emerald-800/50",
  intermediate: "text-amber-400 bg-amber-900/30 border-amber-800/50",
  advanced: "text-red-400 bg-red-900/30 border-red-800/50",
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
    <header id="top" className="scroll-mt-20 pb-8 border-b border-zinc-800">
      {/* Category tag */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500 bg-surface-overlay px-2 py-0.5 rounded border border-zinc-800">
          {CATEGORY_LABELS[topic.category] ?? topic.category}
        </span>
        {progress.status !== "not-started" && (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isCompleted
                ? "text-emerald-300 bg-emerald-900/40 border border-emerald-800/50"
                : "text-amber-300 bg-amber-900/30 border border-amber-800/40"
            }`}
          >
            {isCompleted ? "✓ Completed" : "◐ In Progress"}
          </span>
        )}
      </div>

      {/* Title + tagline */}
      <h1 className="text-3xl font-bold text-zinc-50 mb-2 tracking-tight">
        {topic.title}
      </h1>
      <p className="text-zinc-400 text-base leading-relaxed max-w-xl mb-5">
        {topic.description}
      </p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-4">
        <span
          className={`text-xs px-2 py-0.5 rounded border font-medium ${
            DIFFICULTY_COLORS[topic.difficulty]
          }`}
        >
          {topic.difficulty}
        </span>
        <span className="text-zinc-500">~{topic.estimatedMinutes} min</span>
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-500">{CATEGORY_LABELS[topic.category] ?? topic.category}</span>
      </div>

      {/* Challenge progress */}
      {requiredChallenges.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {requiredChallenges.map((c, i) => (
              <div
                key={c.id}
                title={`Challenge ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  progress.completedChallenges.includes(c.id)
                    ? "bg-emerald-400"
                    : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-zinc-500">
            {doneRequired} / {requiredChallenges.length} required challenges
            {isCompleted && (
              <span className="text-emerald-400 ml-1.5 font-medium">— all done</span>
            )}
          </span>
        </div>
      )}
    </header>
  );
}
