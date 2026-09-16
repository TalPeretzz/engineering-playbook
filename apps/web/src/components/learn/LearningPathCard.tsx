import Link from "next/link";
import type { LearningPath } from "@engineering-playbook/content-schema";
import type { PathProgress } from "@/store/progressStore";

export function LearningPathCard({
  path,
  progress,
}: {
  path: LearningPath;
  progress: PathProgress;
}) {
  return (
    <Link
      href={`/learn/${path.slug}`}
      className="group flex flex-col gap-2.5 rounded-xl border border-wire hover:border-wire-strong hover:bg-surface-overlay transition-colors p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      <div>
        <h3 className="font-medium text-ink">{path.title}</h3>
        {path.audience && <p className="text-xs text-ink-faint mt-0.5">{path.audience}</p>}
      </div>
      <p className="text-sm text-ink-muted leading-relaxed line-clamp-2">{path.summary}</p>
      <div className="mt-auto pt-1">
        <div className="w-full h-1.5 bg-surface-overlay rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="text-ink-faint text-xs mt-1.5 tabular-nums">
          {progress.completed}/{progress.available} complete
        </p>
      </div>
    </Link>
  );
}
