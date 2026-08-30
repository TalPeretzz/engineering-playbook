"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { allTopics } from "@engineering-playbook/content";
import type { Topic, TopicCategory, Challenge } from "@engineering-playbook/content-schema";
import type { TopicStatus } from "@engineering-playbook/shared-types";
import { getProgress, getOverallProgress } from "@/store/progressStore";

const CATEGORY_LABELS: Record<TopicCategory, string> = {
  fundamentals: "Fundamentals",
  "data-structures": "Data Structures",
  "distributed-systems": "Distributed Systems",
  resilience: "Resilience",
  messaging: "Messaging",
  caching: "Caching",
  "backend-patterns": "Backend / API",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-700 dark:text-emerald-400",
  intermediate: "text-amber-700 dark:text-amber-400",
  advanced: "text-red-700 dark:text-red-400",
};

function formatChallengeCount(challenges: Challenge[]): string {
  const req = challenges.filter((c) => c.required).length;
  const opt = challenges.filter((c) => !c.required).length;
  if (opt === 0) return `${req} challenge${req !== 1 ? "s" : ""}`;
  return `${req} required · ${opt} optional`;
}

function StatusPill({ status }: { status: TopicStatus }) {
  if (status === "completed")
    return <span className="text-emerald-700 dark:text-emerald-400 text-xs font-medium">✓ Completed</span>;
  if (status === "in-progress")
    return <span className="text-amber-700 dark:text-amber-400 text-xs font-medium">◐ In Progress</span>;
  return <span className="text-ink-faint text-xs">Not started</span>;
}

export function Dashboard() {
  const [topicStatuses, setTopicStatuses] = useState<Record<string, TopicStatus>>({});
  const [lastVisited, setLastVisited] = useState<string | null>(null);
  const [stats, setStats] = useState({ completed: 0, total: allTopics.length, percent: 0 });

  useEffect(() => {
    const progress = getProgress();
    const statuses: Record<string, TopicStatus> = {};
    for (const topic of allTopics) {
      statuses[topic.slug] = progress.topics[topic.slug]?.status ?? "not-started";
    }
    setTopicStatuses(statuses);
    setLastVisited(progress.lastVisitedTopic);
    setStats(getOverallProgress(allTopics.length));
  }, []);

  const lastVisitedTopic = lastVisited ? allTopics.find((t) => t.slug === lastVisited) : null;

  const byCategory = allTopics.reduce<Partial<Record<TopicCategory, Topic[]>>>((acc, topic) => {
    if (!acc[topic.category]) acc[topic.category] = [];
    acc[topic.category]!.push(topic);
    return acc;
  }, {});

  return (
    <div className="space-y-10 pb-16">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-ink mb-2">Engineering Playbook</h1>
        <p className="text-ink-muted text-lg">
          Learn software engineering patterns through interactive lessons and challenges.
        </p>
      </div>

      {/* Overall Progress */}
      <div className="bg-surface-raised border border-wire rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-ink">Overall Progress</p>
          <p className="text-sm text-ink-muted tabular-nums">
            {stats.completed} / {stats.total} topics completed
          </p>
        </div>
        <div className="w-full h-2 bg-surface-overlay rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-700"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        <p className="text-ink-faint text-xs mt-2">{stats.percent}% complete</p>
      </div>

      {/* Continue Learning */}
      {lastVisitedTopic && (
        <div>
          <h2 className="text-base font-semibold text-ink mb-3">Continue Learning</h2>
          <Link
            href={`/topics/${lastVisitedTopic.slug}`}
            className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-400 dark:hover:border-emerald-700/60 rounded-xl p-4 transition-colors group cursor-pointer"
          >
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-200 group-hover:text-emerald-900 dark:group-hover:text-emerald-100">
                {lastVisitedTopic.title}
              </p>
              <p className="text-ink-muted text-sm mt-0.5">
                {lastVisitedTopic.estimatedMinutes} min · {lastVisitedTopic.difficulty}
              </p>
            </div>
            <span className="text-brand-text text-lg" aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      {/* Topics by Category */}
      <div className="space-y-8">
        <h2 className="text-base font-semibold text-ink">All Topics</h2>
        {(Object.keys(byCategory) as TopicCategory[]).map((category) => (
          <div key={category}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-faint mb-3">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {byCategory[category]!.map((topic) => {
                const status = topicStatuses[topic.slug] ?? "not-started";
                return (
                  <Link
                    key={topic.slug}
                    href={`/topics/${topic.slug}`}
                    className="group bg-surface-raised hover:bg-surface-overlay border border-wire hover:border-wire-strong rounded-xl p-4 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-ink group-hover:text-ink">
                        {topic.title}
                      </p>
                      <StatusPill status={status} />
                    </div>
                    <p className="text-ink-muted text-xs mt-1.5 leading-relaxed line-clamp-2">
                      {topic.description}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className={`text-xs ${DIFFICULTY_COLORS[topic.difficulty]}`}>
                        {topic.difficulty}
                      </span>
                      <span className="text-ink-faint text-xs">{topic.estimatedMinutes} min</span>
                      <span className="text-ink-faint text-xs">{formatChallengeCount(topic.challenges)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
