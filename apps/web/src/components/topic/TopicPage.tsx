"use client";

import React, { useEffect, useCallback, useMemo } from "react";
import type { Topic } from "@engineering-playbook/content-schema";
import { useTopicProgress } from "@/hooks/useProgress";
import { useActiveSection } from "@/hooks/useActiveSection";
import { setLastVisitedTopic } from "@/store/progressStore";
import { CodeBlock } from "./CodeBlock";
import { LessonCTA } from "./LessonCTA";
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

const PHASE_LABELS: Record<string, string> = {
  understand: "Understand",
  "deep-dive": "Deep Dive",
  apply: "Apply",
};

export function TopicPage({ topic }: TopicPageProps) {
  const { progress, completeChallenge, completeTopic, markInProgress } =
    useTopicProgress(topic.slug);

  useEffect(() => {
    setLastVisitedTopic(topic.slug);
    // markInProgress is NOT called here — only on meaningful user actions
  }, [topic.slug]);

  const handleChallengeComplete = useCallback(
    (challengeId: string) => {
      // Fire markInProgress as fallback for users who jump straight to challenges
      markInProgress();
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
    [markInProgress, completeChallenge, completeTopic, progress, topic.challenges]
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
  const hasPhases = topic.sections.some((s) => s.phase);

  const tocGroups = useMemo(
    () => buildTocGroups(topic.sections, hasImplementations, hasPhases),
    // Static content — stable reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const sectionIds = useMemo(
    () => tocGroups.flatMap((g) => g.entries.map((e) => e.id)),
    [tocGroups]
  );

  const activeId = useActiveSection(sectionIds);

  return (
    <div className="xl:flex xl:gap-14">
      {/* Main content */}
      <article className="min-w-0 flex-1 pb-24 space-y-12">
        <TopicHeader topic={topic} progress={progress} />

        {prereqTopics.length > 0 && (
          <div className="bg-surface-raised border border-wire rounded-lg p-4 text-sm text-ink-muted">
            <span className="font-medium text-ink">Recommended before this topic: </span>
            {prereqTopics.map((t, i) => (
              <span key={t.slug}>
                {i > 0 && ", "}
                <Link
                  href={`/topics/${t.slug}`}
                  className="text-brand-text hover:underline underline-offset-2"
                >
                  {t.title}
                </Link>
              </span>
            ))}
          </div>
        )}

        <LessonCTA
          status={progress.status}
          challenges={topic.challenges}
          completedChallenges={progress.completedChallenges}
          onStart={markInProgress}
        />

        <SectionList
          sections={topic.sections}
          hasPhases={hasPhases}
          onFirstInteraction={markInProgress}
        />

        {hasImplementations && (
          <>
            {hasPhases ? (
              <PhaseHeader phase="apply" label="Implementation" />
            ) : (
              <hr className="border-wire" />
            )}
            <section id="implementation" className="scroll-mt-20 space-y-4">
              <SectionHeading>Implementation</SectionHeading>
              <p className="text-ink-muted text-sm">
                A complete implementation focused on clarity and learning. Switch languages to see
                the same concept expressed idiomatically.
              </p>
              <CodeBlock implementations={topic.implementations} />
            </section>
          </>
        )}

        <hr className="border-wire" />

        <section id="challenges" className="scroll-mt-20 space-y-4">
          <ChallengesSection
            topic={topic}
            progress={progress}
            onChallengeComplete={handleChallengeComplete}
            nextTopic={nextTopic ?? undefined}
          />
        </section>

        {/* Prev / Next navigation */}
        {(prevTopic || nextTopic) && (
          <nav
            aria-label="Topic navigation"
            className="flex items-stretch gap-3 pt-4 border-t border-wire"
          >
            {prevTopic ? (
              <Link
                href={`/topics/${prevTopic.slug}`}
                className="flex-1 group flex flex-col gap-1 px-4 py-3 rounded-lg border border-wire hover:border-wire-strong hover:bg-surface-overlay transition-colors"
              >
                <span className="text-xs text-ink-faint group-hover:text-ink-muted transition-colors">
                  ← Previous
                </span>
                <span className="text-sm font-medium text-ink-muted group-hover:text-ink transition-colors">
                  {prevTopic.title}
                </span>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextTopic && (
              <Link
                href={`/topics/${nextTopic.slug}`}
                className="flex-1 group flex flex-col gap-1 px-4 py-3 rounded-lg border border-wire hover:border-wire-strong hover:bg-surface-overlay transition-colors text-right"
              >
                <span className="text-xs text-ink-faint group-hover:text-ink-muted transition-colors">
                  Next →
                </span>
                <span className="text-sm font-medium text-ink-muted group-hover:text-ink transition-colors">
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
          <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-3">
            On this page
          </p>
          {tocGroups.map((group) => (
            <div key={group.phase ?? "default"}>
              {group.phase && (
                <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest mt-4 mb-1 first:mt-0">
                  {PHASE_LABELS[group.phase] ?? group.phase}
                </p>
              )}
              {group.entries.map((entry) => (
                <a
                  key={entry.id}
                  href={`#${entry.id}`}
                  className={`block text-sm py-0.5 leading-snug transition-colors ${
                    activeId === entry.id
                      ? "text-brand-text font-medium"
                      : "text-ink-faint hover:text-ink-muted"
                  }`}
                >
                  {entry.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function SectionList({
  sections,
  hasPhases,
  onFirstInteraction,
}: {
  sections: Topic["sections"];
  hasPhases: boolean;
  onFirstInteraction?: () => void;
}) {
  let lastPhase: string | undefined;

  return (
    <>
      {sections.map((section, i) => {
        const phaseChanged = hasPhases && section.phase && section.phase !== lastPhase;
        if (section.phase) lastPhase = section.phase;

        return (
          <React.Fragment key={section.id}>
            {phaseChanged ? (
              <PhaseHeader phase={section.phase!} />
            ) : (
              i > 0 && <hr className="border-wire" />
            )}
            <TopicSectionRenderer section={section} onFirstInteraction={onFirstInteraction} />
          </React.Fragment>
        );
      })}
    </>
  );
}

function PhaseHeader({ phase, label }: { phase: string; label?: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex-1 h-px bg-wire" />
      <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-widest px-1">
        {label ?? PHASE_LABELS[phase] ?? phase}
      </span>
      <div className="flex-1 h-px bg-wire" />
    </div>
  );
}

type TocGroup = { phase?: string; entries: { id: string; label: string }[] };

function buildTocGroups(
  sections: Topic["sections"],
  hasImplementations: boolean,
  hasPhases: boolean
): TocGroup[] {
  if (!hasPhases) {
    return [
      {
        entries: [
          ...sections.map((s) => ({ id: s.id, label: s.heading })),
          ...(hasImplementations ? [{ id: "implementation", label: "Implementation" }] : []),
          { id: "challenges", label: "Challenges" },
        ],
      },
    ];
  }

  const groups: TocGroup[] = [];
  const phaseMap = new Map<string, TocGroup>();

  for (const section of sections) {
    const key = section.phase ?? "__default__";
    if (!phaseMap.has(key)) {
      const group: TocGroup = { phase: section.phase, entries: [] };
      phaseMap.set(key, group);
      groups.push(group);
    }
    phaseMap.get(key)!.entries.push({ id: section.id, label: section.heading });
  }

  const applyGroup = phaseMap.get("apply");
  const implAndChallenges = [
    ...(hasImplementations ? [{ id: "implementation", label: "Implementation" }] : []),
    { id: "challenges", label: "Challenges" },
  ];

  if (applyGroup) {
    applyGroup.entries.push(...implAndChallenges);
  } else {
    groups.push({ phase: "apply", entries: implAndChallenges });
  }

  return groups;
}
