"use client";

import React from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import type { TopicProgress } from "@engineering-playbook/shared-types";
import { completeTopic } from "@/store/progressStore";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const isCompleted = progress.status === "completed";

  const handleComplete = () => {
    completeTopic(topic.slug);
    router.refresh();
  };

  return (
    <header className="border-b border-zinc-800 pb-8">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500 bg-surface-overlay px-2 py-1 rounded border border-zinc-800">
          {CATEGORY_LABELS[topic.category] ?? topic.category}
        </span>
        <span
          className={`text-xs px-2 py-1 rounded border ${DIFFICULTY_COLORS[topic.difficulty]}`}
        >
          {topic.difficulty}
        </span>
        <span className="text-xs text-zinc-500">~{topic.estimatedMinutes} min read</span>
        {progress.status !== "not-started" && (
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
            isCompleted
              ? "text-emerald-300 bg-emerald-900/40"
              : "text-amber-300 bg-amber-900/40"
          }`}>
            {isCompleted ? "✓ Completed" : "◐ In Progress"}
          </span>
        )}
      </div>

      <h1 className="text-3xl font-bold text-zinc-50 mb-3">{topic.title}</h1>
      <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">{topic.description}</p>

      {!isCompleted && progress.status === "in-progress" && (
        <div className="mt-6">
          <button
            onClick={handleComplete}
            className="text-sm px-4 py-2 rounded-lg bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-700/50 text-emerald-300 transition-colors font-medium"
          >
            Mark as completed
          </button>
        </div>
      )}
    </header>
  );
}
