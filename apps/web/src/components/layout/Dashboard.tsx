"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { allTopics } from "@engineering-playbook/content";
import type { Topic, TopicCategory } from "@engineering-playbook/content-schema";
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
  beginner: "text-emerald-400",
  intermediate: "text-amber-400",
  advanced: "text-red-400",
};

function StatusPill({ status }: { status: TopicStatus }) {
  if (status === "completed") return <span className="text-emerald-400 text-xs">✓ Completed</span>;
  if (status === "in-progress") return <span className="text-amber-400 text-xs">◐ In Progress</span>;
  return <span className="text-zinc-600 text-xs">○ Not started</span>;
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
        <h1 className="text-3xl font-bold text-zinc-50 mb-2">Engineering Playbook</h1>
        <p className="text-zinc-400 text-lg">
          Learn software engineering patterns through interactive lessons and challenges.
        </p>
      </div>

      {/* Overall Progress */}
      <div className="bg-surface-raised border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-zinc-300">Overall Progress</p>
          <p className="text-sm text-zinc-400 tabular-nums">
            {stats.completed} / {stats.total} topics completed
          </p>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        <p className="text-zinc-500 text-xs mt-2">{stats.percent}% complete</p>
      </div>

      {/* Continue Learning */}
      {lastVisitedTopic && (
        <div>
          <h2 className="text-base font-semibold text-zinc-300 mb-3">Continue Learning</h2>
          <Link
            href={`/topics/${lastVisitedTopic.slug}`}
            className="flex items-center justify-between bg-emerald-950/30 border border-emerald-800/40 hover:border-emerald-700/60 rounded-xl p-4 transition-colors group"
          >
            <div>
              <p className="font-semibold text-emerald-200 group-hover:text-emerald-100">
                {lastVisitedTopic.title}
              </p>
              <p className="text-zinc-500 text-sm mt-0.5">
                {lastVisitedTopic.estimatedMinutes} min · {lastVisitedTopic.difficulty}
              </p>
            </div>
            <span className="text-emerald-500 text-lg">→</span>
          </Link>
        </div>
      )}

      {/* Topics by Category */}
      <div className="space-y-8">
        <h2 className="text-base font-semibold text-zinc-300">All Topics</h2>
        {(Object.keys(byCategory) as TopicCategory[]).map((category) => (
          <div key={category}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {byCategory[category]!.map((topic) => {
                const status = topicStatuses[topic.slug] ?? "not-started";
                return (
                  <Link
                    key={topic.slug}
                    href={`/topics/${topic.slug}`}
                    className="group bg-surface-raised hover:bg-surface-overlay border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-zinc-200 group-hover:text-zinc-100">
                        {topic.title}
                      </p>
                      <StatusPill status={status} />
                    </div>
                    <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed line-clamp-2">
                      {topic.description}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className={`text-xs ${DIFFICULTY_COLORS[topic.difficulty]}`}>
                        {topic.difficulty}
                      </span>
                      <span className="text-zinc-600 text-xs">{topic.estimatedMinutes} min</span>
                      <span className="text-zinc-600 text-xs">{topic.challenges.length} challenges</span>
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
