import Link from "next/link";
import type { TopicDefinition } from "@engineering-playbook/content-schema";
import { definitionsBySlug, categories } from "@engineering-playbook/content";

const CATEGORY_TITLES: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.id, c.title])
);

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:
    "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50",
  intermediate:
    "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50",
  advanced:
    "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50",
};

function linkedTopics(ids: string[]): TopicDefinition[] {
  return ids.map((id) => definitionsBySlug[id]).filter((t): t is TopicDefinition => Boolean(t));
}

export function TopicPageComingSoon({ topic }: { topic: TopicDefinition }) {
  const prereqTopics = linkedTopics(topic.prerequisites);
  const relatedTopics = linkedTopics(topic.relatedTopics);
  const categoryTitle = CATEGORY_TITLES[topic.categories[0]] ?? topic.categories[0];

  return (
    <article className="max-w-2xl">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-ink-muted bg-surface-overlay px-2 py-0.5 rounded border border-wire">
          {categoryTitle}
        </span>
        <span className="text-xs px-2 py-0.5 rounded font-medium text-ink-muted bg-surface-overlay border border-wire">
          Coming soon
        </span>
      </div>

      <h1 className="text-3xl font-bold text-ink mb-2 tracking-tight">{topic.title}</h1>
      <p className="text-ink-muted text-base leading-relaxed mb-5">{topic.summary}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-8">
        <span
          className={`text-xs px-2 py-0.5 rounded border font-medium ${DIFFICULTY_COLORS[topic.difficulty]}`}
        >
          {topic.difficulty}
        </span>
        <span className="text-ink-muted text-sm">~{topic.estimatedMinutes} min</span>
        <span className="text-ink-faint" aria-hidden="true">
          ·
        </span>
        <span className="text-ink-muted text-sm">{categoryTitle}</span>
      </div>

      {topic.whyItMatters && (
        <p className="text-ink-muted text-sm leading-relaxed mb-8 border-l-2 border-wire pl-4">
          {topic.whyItMatters}
        </p>
      )}

      {prereqTopics.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-2">
            Recommended before this topic
          </p>
          <ul className="space-y-1">
            {prereqTopics.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/topics/${t.slug}`}
                  className="text-sm text-brand-text hover:underline underline-offset-2"
                >
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {relatedTopics.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-2">
            Related topics
          </p>
          <ul className="space-y-1">
            {relatedTopics.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/topics/${t.slug}`}
                  className="text-sm text-brand-text hover:underline underline-offset-2"
                >
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-surface-raised border border-wire rounded-lg p-5">
        <p className="text-sm text-ink mb-3">
          The full lesson for <strong>{topic.title}</strong> hasn&apos;t been written yet.
        </p>
        <Link
          href="/topics"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:underline underline-offset-2"
        >
          ← Browse all topics
        </Link>
      </div>
    </article>
  );
}
