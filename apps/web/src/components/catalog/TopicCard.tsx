import Link from "next/link";
import type { TopicDefinition } from "@engineering-playbook/content-schema";
import type { TopicStatus } from "@engineering-playbook/shared-types";
import { ComingSoonBadge } from "./ComingSoonBadge";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50",
  intermediate: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50",
  advanced: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50",
};

type TopicCardProps = {
  topic: TopicDefinition;
  categoryTitle: string;
  status: TopicStatus;
};

export function TopicCard({ topic, categoryTitle, status }: TopicCardProps) {
  const isComingSoon = topic.availability === "coming-soon";

  return (
    <Link
      href={`/topics/${topic.slug}`}
      className={`group flex flex-col gap-2.5 rounded-xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        isComingSoon
          ? "border-wire bg-surface-raised/60 hover:border-wire-strong"
          : status === "completed"
            ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700"
            : "border-wire hover:border-wire-strong hover:bg-surface-overlay"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-medium leading-snug ${isComingSoon ? "text-ink-muted" : "text-ink"}`}>{topic.title}</h3>
        {isComingSoon ? (
          <ComingSoonBadge />
        ) : (
          status !== "not-started" && (
            <span
              className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                status === "completed"
                  ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40"
                  : "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30"
              }`}
            >
              {status === "completed" ? "✓ Done" : "In progress"}
            </span>
          )
        )}
      </div>

      <p className="text-sm text-ink-muted leading-relaxed line-clamp-2">{topic.summary}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-1 text-xs">
        <span className={`px-1.5 py-0.5 rounded border font-medium ${DIFFICULTY_COLORS[topic.difficulty]}`}>
          {topic.difficulty}
        </span>
        <span className="text-ink-faint">~{topic.estimatedMinutes}m</span>
        <span className="text-ink-faint truncate">{categoryTitle}</span>
      </div>
    </Link>
  );
}
