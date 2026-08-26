"use client";

import React, { useEffect } from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import { useTopicProgress } from "@/hooks/useProgress";
import { setLastVisitedTopic } from "@/store/progressStore";
import { CodeBlock } from "./CodeBlock";
import { ChallengesSection } from "@/components/challenges/ChallengesSection";
import { TopicHeader } from "./TopicHeader";
import { SectionHeading } from "./SectionHeading";
import { TopicSectionRenderer } from "./TopicSectionRenderer";
import Link from "next/link";
import { allTopics } from "@engineering-playbook/content";

type TopicPageProps = {
  topic: Topic;
};

export function TopicPage({ topic }: TopicPageProps) {
  const { progress, markInProgress } = useTopicProgress(topic.slug);

  useEffect(() => {
    setLastVisitedTopic(topic.slug);
    markInProgress();
  }, [topic.slug, markInProgress]);

  const prereqTopics = topic.prerequisites
    .map((slug) => allTopics.find((t) => t.slug === slug))
    .filter(Boolean) as Topic[];

  const nextTopics = topic.nextTopics
    .map((slug) => allTopics.find((t) => t.slug === slug))
    .filter(Boolean) as Topic[];

  const hasImplementations = Object.keys(topic.implementations).length > 0;

  return (
    <article className="space-y-10 pb-24">
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

      {topic.sections.map((section) => (
        <TopicSectionRenderer key={section.id} section={section} />
      ))}

      {hasImplementations && (
        <section id="implementation" className="scroll-mt-20 space-y-4">
          <SectionHeading>Implementation</SectionHeading>
          <CodeBlock implementations={topic.implementations} />
        </section>
      )}

      <section id="challenges" className="scroll-mt-20 space-y-4">
        <SectionHeading>Challenges</SectionHeading>
        <ChallengesSection topic={topic} />
      </section>

      {nextTopics.length > 0 && (
        <section id="next" className="scroll-mt-20 space-y-4">
          <SectionHeading>Recommended next</SectionHeading>
          <div className="flex flex-wrap gap-3">
            {nextTopics.map((t) => (
              <Link
                key={t.slug}
                href={`/topics/${t.slug}`}
                className="bg-surface-overlay hover:bg-zinc-700 border border-zinc-700 rounded-lg px-4 py-3 text-sm transition-colors"
              >
                <p className="font-medium text-zinc-200">{t.title}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {t.estimatedMinutes} min · {t.difficulty}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
