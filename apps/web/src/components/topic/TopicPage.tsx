"use client";

import React, { useEffect } from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import { useTopicProgress } from "@/hooks/useProgress";
import { setLastVisitedTopic } from "@/store/progressStore";
import { CodeBlock } from "./CodeBlock";
import { ComplexityTable } from "./ComplexityTable";
import { TradeoffList } from "./TradeoffList";
import { ChallengesSection } from "@/components/challenges/ChallengesSection";
import { TopicHeader } from "./TopicHeader";
import { SectionHeading } from "./SectionHeading";
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

  return (
    <article className="space-y-10 pb-24">
      <TopicHeader topic={topic} progress={progress} />

      {prereqTopics.length > 0 && (
        <div className="bg-surface-raised border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
          <span className="font-medium text-zinc-300">Recommended before this topic: </span>
          {prereqTopics.map((t, i) => (
            <span key={t.slug}>
              {i > 0 && ", "}
              <Link href={`/topics/${t.slug}`} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                {t.title}
              </Link>
            </span>
          ))}
        </div>
      )}

      <Section id="problem">
        <SectionHeading>What problem does it solve?</SectionHeading>
        <div className="prose-content">
          <ContentText text={topic.content.problemStatement} />
        </div>
      </Section>

      <Section id="how-it-works">
        <SectionHeading>How does it work?</SectionHeading>
        <div className="prose-content">
          <ContentText text={topic.content.howItWorks} />
        </div>
      </Section>

      <Section id="visual">
        <SectionHeading>Visual explanation</SectionHeading>
        <pre className="bg-surface-overlay border border-zinc-800 rounded-lg p-4 text-zinc-300 text-sm overflow-x-auto leading-relaxed font-mono">
          {topic.content.visualExplanation}
        </pre>
      </Section>

      <Section id="complexity">
        <SectionHeading>Complexity</SectionHeading>
        <ComplexityTable entries={topic.content.complexity} />
      </Section>

      <Section id="tradeoffs">
        <SectionHeading>Tradeoffs</SectionHeading>
        <TradeoffList tradeoffs={topic.content.tradeoffs} />
      </Section>

      <Section id="when-to-use">
        <SectionHeading>When should I use it?</SectionHeading>
        <ul className="space-y-2">
          {topic.content.whenToUse.map((point, i) => (
            <li key={i} className="flex gap-2 text-zinc-300 text-sm">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="when-not-to-use">
        <SectionHeading>When should I NOT use it?</SectionHeading>
        <ul className="space-y-2">
          {topic.content.whenNotToUse.map((point, i) => (
            <li key={i} className="flex gap-2 text-zinc-300 text-sm">
              <span className="text-red-400 mt-0.5 shrink-0">✗</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="examples">
        <SectionHeading>Real-world examples</SectionHeading>
        <ul className="space-y-2">
          {topic.content.realWorldExamples.map((example, i) => (
            <li key={i} className="text-zinc-300 text-sm leading-6">
              <InlineMarkdown text={example} />
            </li>
          ))}
        </ul>
      </Section>

      {Object.keys(topic.implementations).length > 0 && (
        <Section id="implementation">
          <SectionHeading>Implementation</SectionHeading>
          <CodeBlock implementations={topic.implementations} />
        </Section>
      )}

      <Section id="challenges">
        <SectionHeading>Challenges</SectionHeading>
        <ChallengesSection topic={topic} progress={progress} />
      </Section>

      {nextTopics.length > 0 && (
        <Section id="next">
          <SectionHeading>Recommended next</SectionHeading>
          <div className="flex flex-wrap gap-3">
            {nextTopics.map((t) => (
              <Link
                key={t.slug}
                href={`/topics/${t.slug}`}
                className="bg-surface-overlay hover:bg-zinc-700 border border-zinc-700 rounded-lg px-4 py-3 text-sm transition-colors"
              >
                <p className="font-medium text-zinc-200">{t.title}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{t.estimatedMinutes} min · {t.difficulty}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      {children}
    </section>
  );
}

function ContentText({ text }: { text: string }) {
  const paragraphs = text.split("\n\n");
  return (
    <>
      {paragraphs.map((para, i) => {
        const trimmed = para.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("**") && trimmed.includes("**\n")) {
          const boldEnd = trimmed.indexOf("**", 2);
          const bold = trimmed.slice(2, boldEnd);
          const rest = trimmed.slice(boldEnd + 2).trim();
          return (
            <div key={i} className="mb-4">
              <h3 className="text-base font-semibold text-zinc-200 mb-1">{bold}</h3>
              {rest && <p className="text-zinc-300 leading-7">{rest}</p>}
            </div>
          );
        }
        return (
          <p key={i} className="text-zinc-300 leading-7 mb-4">
            <InlineMarkdown text={trimmed} />
          </p>
        );
      })}
    </>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="text-zinc-100 font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
