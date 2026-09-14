"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { TopicDefinition } from "@engineering-playbook/content-schema";
import {
  allTopics,
  allTopicDefinitions,
  categories,
  learningPaths,
  derivedTopicOrder,
  topicsById,
  nextAvailableTopicId,
} from "@engineering-playbook/content";
import {
  getProgress,
  getOverallProgress,
  getCategoryProgress,
  getPathProgress,
  type GroupProgress,
  type PathProgress,
} from "@/store/progressStore";
import { LearningPathCard } from "@/components/learn/LearningPathCard";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-700 dark:text-emerald-400",
  intermediate: "text-amber-700 dark:text-amber-400",
  advanced: "text-red-700 dark:text-red-400",
};

const FEATURED_FLAGSHIPS: TopicDefinition[] = derivedTopicOrder
  .map((id) => topicsById[id])
  .filter((t): t is TopicDefinition => Boolean(t) && t.depth === "flagship")
  .slice(0, 3);

const FEATURED_PATHS = learningPaths.slice(0, 3);

const EMPTY_PATH_PROGRESS: PathProgress = { completed: 0, available: 0, percent: 0, nextRecommendedId: null };
const EMPTY_CATEGORY_PROGRESS: GroupProgress = { completed: 0, available: 0, percent: 0 };

export function Dashboard() {
  const [lastVisited, setLastVisited] = useState<string | null>(null);
  const [stats, setStats] = useState({ completed: 0, total: allTopics.length, percent: 0 });
  const [categoryProgress, setCategoryProgress] = useState<Record<string, GroupProgress>>({});
  const [pathProgress, setPathProgress] = useState<Record<string, PathProgress>>({});

  useEffect(() => {
    const progress = getProgress();
    setLastVisited(progress.lastVisitedTopic);
    setStats(getOverallProgress(allTopics.length));

    const catProgress: Record<string, GroupProgress> = {};
    for (const category of categories) catProgress[category.id] = getCategoryProgress(category.id);
    setCategoryProgress(catProgress);

    const pProgress: Record<string, PathProgress> = {};
    for (const path of FEATURED_PATHS) pProgress[path.id] = getPathProgress(path.id);
    setPathProgress(pProgress);
  }, []);

  const lastVisitedTopic = lastVisited ? allTopics.find((t) => t.slug === lastVisited) : null;

  const recommendedNextId = lastVisited
    ? nextAvailableTopicId(lastVisited)
    : (derivedTopicOrder.map((id) => topicsById[id]).find((t) => t?.availability === "available")?.id ?? null);
  const recommendedNext = recommendedNextId ? topicsById[recommendedNextId] : null;

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
        <p className="text-ink-muted text-xs mt-2">
          {stats.percent}% complete
          <span className="text-ink-faint"> · out of {allTopicDefinitions.length} planned topics</span>
        </p>
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

      {/* Recommended Next */}
      {recommendedNext && recommendedNext.slug !== lastVisitedTopic?.slug && (
        <div>
          <h2 className="text-base font-semibold text-ink mb-3">Recommended Next</h2>
          <Link
            href={`/topics/${recommendedNext.slug}`}
            className="flex items-center justify-between bg-surface-raised border border-wire hover:border-wire-strong hover:bg-surface-overlay rounded-xl p-4 transition-colors group cursor-pointer"
          >
            <div>
              <p className="font-semibold text-ink">{recommendedNext.title}</p>
              <p className="text-ink-muted text-sm mt-0.5">
                {recommendedNext.estimatedMinutes} min · {recommendedNext.difficulty}
              </p>
            </div>
            <span className="text-brand-text text-lg" aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      {/* Featured flagship topics */}
      <div>
        <h2 className="text-base font-semibold text-ink mb-3">Featured Topics</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {FEATURED_FLAGSHIPS.map((topic) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.slug}`}
              className="group border rounded-xl p-4 transition-colors cursor-pointer bg-surface-raised hover:bg-surface-overlay border-wire hover:border-wire-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <p className="font-medium text-ink">{topic.title}</p>
              <p className="text-ink-muted text-xs mt-1.5 leading-relaxed line-clamp-2">{topic.summary}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className={`text-xs font-medium ${DIFFICULTY_COLORS[topic.difficulty]}`}>
                  {topic.difficulty}
                </span>
                <span className="text-ink-muted text-xs">{topic.estimatedMinutes} min</span>
                {topic.availability === "coming-soon" && (
                  <span className="text-ink-faint text-xs">Coming soon</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Learning Paths */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-ink">Learning Paths</h2>
          <Link href="/learn" className="text-sm text-brand-text hover:underline underline-offset-2">
            View all →
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {FEATURED_PATHS.map((path) => (
            <LearningPathCard key={path.id} path={path} progress={pathProgress[path.id] ?? EMPTY_PATH_PROGRESS} />
          ))}
        </div>
      </div>

      {/* Category overview */}
      <div>
        <h2 className="text-base font-semibold text-ink mb-3">Browse by Category</h2>
        <div className="space-y-1.5">
          {categories.map((category) => {
            const progress = categoryProgress[category.id] ?? EMPTY_CATEGORY_PROGRESS;
            return (
              <Link
                key={category.id}
                href={`/topics?category=${category.id}`}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-wire hover:border-wire-strong hover:bg-surface-overlay transition-colors group"
              >
                <span className="text-sm font-medium text-ink group-hover:text-ink">{category.title}</span>
                <span className="text-xs text-ink-muted tabular-nums">
                  {progress.completed}/{progress.available} completed
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Browse all CTA */}
      <div className="text-center pt-2">
        <Link
          href="/topics"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:underline underline-offset-2"
        >
          Browse all {allTopicDefinitions.length} topics →
        </Link>
      </div>
    </div>
  );
}
