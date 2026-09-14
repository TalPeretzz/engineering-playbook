"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LearningPath, TopicDefinition } from "@engineering-playbook/content-schema";
import type { TopicStatus } from "@engineering-playbook/shared-types";
import { topicsById as definitionsById } from "@engineering-playbook/content";
import { getTopicProgress, getPathProgress, type PathProgress } from "@/store/progressStore";

function StatusDot({ status }: { status: TopicStatus }) {
  if (status === "completed") return <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold" aria-label="Completed">✓</span>;
  if (status === "in-progress") return <span className="text-amber-600 dark:text-amber-400 text-sm" aria-label="In progress">◐</span>;
  return <span className="text-ink-faint text-sm" aria-label="Not started">○</span>;
}

export function LearningPathPage({ path, topics }: { path: LearningPath; topics: TopicDefinition[] }) {
  const [statuses, setStatuses] = useState<Record<string, TopicStatus>>({});
  const [progress, setProgress] = useState<PathProgress>({ completed: 0, available: 0, percent: 0, nextRecommendedId: null });

  useEffect(() => {
    const next: Record<string, TopicStatus> = {};
    for (const topic of topics) {
      if (topic.availability === "available") next[topic.id] = getTopicProgress(topic.slug).status;
    }
    setStatuses(next);
    setProgress(getPathProgress(path.id));
  }, [path.id, topics]);

  const topicIdSet = new Set(path.topicIds);

  return (
    <div className="max-w-2xl">
      <Link href="/learn" className="text-sm text-ink-muted hover:text-ink mb-4 inline-block">
        ← All learning paths
      </Link>

      <h1 className="text-2xl font-bold text-ink tracking-tight mb-1">{path.title}</h1>
      {path.audience && <p className="text-xs text-ink-faint mb-2">{path.audience}</p>}
      <p className="text-ink-muted text-sm leading-relaxed mb-5">{path.summary}</p>

      <div className="bg-surface-raised border border-wire rounded-xl p-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-ink">Path progress</p>
          <p className="text-sm text-ink-muted tabular-nums">
            {progress.completed}/{progress.available} complete
          </p>
        </div>
        <div className="w-full h-2 bg-surface-overlay rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <ol className="space-y-1.5">
        {topics.map((topic, i) => {
          const isComingSoon = topic.availability === "coming-soon";
          const status = statuses[topic.id] ?? "not-started";
          const isRecommended = progress.nextRecommendedId === topic.id;
          const divergentPrereqs = topic.prerequisites
            .filter((prereqId) => {
              if (!definitionsById[prereqId]) return false; // unknown/placeholder prereq id — nothing to link to
              if (!topicIdSet.has(prereqId)) return true;
              const prereqIndex = path.topicIds.indexOf(prereqId);
              return prereqIndex === -1 || prereqIndex > i;
            })
            .map((id) => definitionsById[id]);

          return (
            <li key={topic.id}>
              <Link
                href={`/topics/${topic.slug}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                  isRecommended
                    ? "border-brand bg-brand/5"
                    : "border-wire hover:border-wire-strong hover:bg-surface-overlay"
                }`}
              >
                <span className="text-ink-faint text-xs tabular-nums w-5 shrink-0">{i + 1}.</span>
                {isComingSoon ? (
                  <span className="text-ink-faint text-xs" aria-hidden="true">·</span>
                ) : (
                  <StatusDot status={status} />
                )}
                <span className={`flex-1 text-sm ${isComingSoon ? "text-ink-faint" : "text-ink"}`}>{topic.title}</span>
                {isRecommended && (
                  <span className="text-[10px] text-brand-text font-medium uppercase tracking-wide">Up next</span>
                )}
                {isComingSoon && (
                  <span className="text-[10px] text-ink-faint bg-surface-overlay border border-wire rounded px-1.5 py-0.5">
                    Soon
                  </span>
                )}
              </Link>
              {divergentPrereqs.length > 0 && (
                <p className="text-xs text-ink-faint pl-11 mt-0.5">
                  Recommended before this:{" "}
                  {divergentPrereqs.map((prereq, idx) => (
                    <span key={prereq.id}>
                      {idx > 0 && ", "}
                      {prereq.title}
                    </span>
                  ))}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
