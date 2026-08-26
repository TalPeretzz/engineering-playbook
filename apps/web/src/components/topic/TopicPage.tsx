"use client";

import React, { useEffect, useCallback } from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import { useTopicProgress } from "@/hooks/useProgress";
import { setLastVisitedTopic } from "@/store/progressStore";
import { CodeBlock } from "./CodeBlock";
import { ChallengesSection } from "@/components/challenges/ChallengesSection";
import { TopicHeader } from "./TopicHeader";
import { SectionHeading } from "./SectionHeading";
import { TopicSectionRenderer } from "./TopicSectionRenderer";
import { allRequiredCompleted } from "@/utils/challengeCompletion";
import Link from "next/link";
import { allTopics } from "@engineering-playbook/content";

type TopicPageProps = {
  topic: Topic;
};

export function TopicPage({ topic }: TopicPageProps) {
  const { progress, completeChallenge, completeTopic, markInProgress } =
    useTopicProgress(topic.slug);

  useEffect(() => {
    setLastVisitedTopic(topic.slug);
    markInProgress();
  }, [topic.slug, markInProgress]);

  const handleChallengeComplete = useCallback(
    (challengeId: string) => {
      completeChallenge(challengeId);
      const updatedCompleted = progress.completedChallenges.includes(challengeId)
        ? progress.completedChallenges
        : [...progress.completedChallenges, challengeId];
      if (
        allRequiredCompleted(topic.challenges, updatedCompleted) &&
        progress.status !== "completed"
      ) {
        completeTopic();
      }
    },
    [completeChallenge, completeTopic, progress, topic.challenges]
  );

  const currentIndex = allTopics.findIndex((t) => t.slug === topic.slug);
  const prevTopic = currentIndex > 0 ? allTopics[currentIndex - 1] : null;
  const nextTopicSlug = topic.nextTopics[0];
  const nextTopic =
    (nextTopicSlug ? allTopics.find((t) => t.slug === nextTopicSlug) : null) ??
    (currentIndex < allTopics.length - 1 ? allTopics[currentIndex + 1] : null);

  const prereqTopics = topic.prerequisites
    .map((slug) => allTopics.find((t) => t.slug === slug))
    .filter(Boolean) as Topic[];

  const hasImplementations = Object.keys(topic.implementations).length > 0;

  // Build TOC entries from section data — keep it generic
  const tocEntries = [
    ...topic.sections.map((s) => ({ id: s.id, label: s.heading })),
    ...(hasImplementations ? [{ id: "implementation", label: "Implementation" }] : []),
    { id: "challenges", label: "Challenges" },
  ];

  return (
    <div className="xl:flex xl:gap-14">
      {/* Main content */}
      <article className="min-w-0 flex-1 pb-24 space-y-12">
        <TopicHeader topic={topic} progress={progress} />

        {prereqTopics.length > 0 && (
          <div className="bg-surface-raised border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
            <span className="font-medium text-zinc-300">Recommended before this topic: </span>
            {prereqTopics.map((t, i) => (
              <span key={t.slug}>
                {i > 0 && ", "}
                <Link
                  href={`/topics/${t.slug}`}
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                >
                  {t.title}
                </Link>
              </span>
            ))}
          </div>
        )}

        {topic.sections.map((section, i) => (
          <React.Fragment key={section.id}>
            {i > 0 && <hr className="border-zinc-800/60" />}
            <TopicSectionRenderer section={section} />
          </React.Fragment>
        ))}

        {hasImplementations && (
          <>
            <hr className="border-zinc-800/60" />
            <section id="implementation" className="scroll-mt-20 space-y-4">
              <SectionHeading>Implementation</SectionHeading>
              <p className="text-zinc-500 text-sm">
                A complete implementation focused on clarity and learning. Switch languages to see
                the same concept expressed idiomatically.
              </p>
              <CodeBlock implementations={topic.implementations} />
            </section>
          </>
        )}

        <hr className="border-zinc-800/60" />

        <section id="challenges" className="scroll-mt-20 space-y-4">
          <ChallengesSection
            topic={topic}
            progress={progress}
            onChallengeComplete={handleChallengeComplete}
          />
        </section>

        {/* Prev / Next navigation */}
        {(prevTopic || nextTopic) && (
          <nav
            aria-label="Topic navigation"
            className="flex items-stretch gap-3 pt-4 border-t border-zinc-800"
          >
            {prevTopic ? (
              <Link
                href={`/topics/${prevTopic.slug}`}
                className="flex-1 group flex flex-col gap-1 px-4 py-3 rounded-lg border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/40 transition-colors"
              >
                <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  ← Previous
                </span>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                  {prevTopic.title}
                </span>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextTopic && (
              <Link
                href={`/topics/${nextTopic.slug}`}
                className="flex-1 group flex flex-col gap-1 px-4 py-3 rounded-lg border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/40 transition-colors text-right"
              >
                <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  Next →
                </span>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                  {nextTopic.title}
                </span>
              </Link>
            )}
          </nav>
        )}
      </article>

      {/* Sticky sidebar TOC — desktop only */}
      <aside className="hidden xl:block shrink-0 w-44" aria-label="Table of contents">
        <div className="sticky top-8 space-y-1">
          <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">
            On this page
          </p>
          {tocEntries.map((entry) => (
            <a
              key={entry.id}
              href={`#${entry.id}`}
              className="block text-sm text-zinc-500 hover:text-zinc-200 py-0.5 leading-snug transition-colors"
            >
              {entry.label}
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}
