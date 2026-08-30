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

// Shorten long headings for the TOC without changing lesson content
const TOC_SHORT_LABELS: Record<string, string> = {
  "Understanding false positives": "False positives",
  "Production considerations": "Production",
  "What should you remember?": "Key takeaways",
  "Simple implementation first": "Simple impl",
};

function tocLabel(heading: string): string {
  return TOC_SHORT_LABELS[heading] ?? heading;
}

export function TopicPage({ topic }: TopicPageProps) {
  const { progress, completeChallenge, completeTopic, markInProgress } =
    useTopicProgress(topic.slug);

  useEffect(() => {
    setLastVisitedTopic(topic.slug);
  }, [topic.slug]);

  const handleChallengeComplete = useCallback(
    (challengeId: string) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const sectionIds = useMemo(
    () => tocGroups.flatMap((g) => g.entries.map((e) => e.id)),
    [tocGroups]
  );

  const activeId = useActiveSection(sectionIds);

  return (
    <div className="xl:flex xl:gap-12">
      {/* Main content */}
      <article className="min-w-0 flex-1 pb-24">

        {/* Header cluster: header + prereqs + CTA grouped tightly */}
        <div className="space-y-4 pb-8 mb-8 border-b border-wire">
          <TopicHeader topic={topic} progress={progress} />

          {prereqTopics.length > 0 && (
            <div className="bg-surface-raised border border-wire rounded-lg p-4 text-sm text-ink-muted">
              <span className="font-medium text-ink">Recommended before this topic: </span>
              {prereqTopics.map((t, i) => (
                <span key={t.slug}>
                  {i > 0 && ", "}
                  <Link
                    href={`/topics/${t.slug}`}
                    className="text-brand-text hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
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
        </div>

        {/* Lesson content */}
        <div className="space-y-10">
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
                  className="flex-1 group flex flex-col gap-1 px-4 py-3 rounded-lg border border-wire hover:border-wire-strong hover:bg-surface-overlay transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
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
                  className="flex-1 group flex flex-col gap-1 px-4 py-3 rounded-lg border border-wire hover:border-wire-strong hover:bg-surface-overlay transition-colors text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
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
        </div>
      </article>

      {/* Sticky sidebar TOC — xl and up only */}
      <aside className="hidden xl:block shrink-0 w-48" aria-label="Table of contents">
        <div className="sticky top-8">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-3 pl-3">
            On this page
          </p>
          <nav aria-label="Page sections">
            {tocGroups.map((group) => (
              <div key={group.phase ?? "default"} className="mb-2">
                {group.phase && (
                  <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mt-4 mb-1 first:mt-0 pl-3">
                    {PHASE_LABELS[group.phase] ?? group.phase}
                  </p>
                )}
                {group.entries.map((entry) => (
                  <a
                    key={entry.id}
                    href={`#${entry.id}`}
                    className={`block text-sm py-1 pl-3 leading-snug transition-colors border-l-2 rounded-r focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 ${
                      activeId === entry.id
                        ? "border-brand text-brand-text font-medium"
                        : "border-transparent text-ink-muted hover:text-ink hover:border-wire-strong"
                    }`}
                  >
                    {tocLabel(entry.label)}
                  </a>
                ))}
              </div>
            ))}
          </nav>
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
      <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest px-1">
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
