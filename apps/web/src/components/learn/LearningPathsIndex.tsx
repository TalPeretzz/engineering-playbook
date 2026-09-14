"use client";

import { useEffect, useState } from "react";
import { learningPaths } from "@engineering-playbook/content";
import {
  getPathProgress,
  subscribeToProgress,
  EMPTY_PATH_PROGRESS,
  type PathProgress,
} from "@/store/progressStore";
import { LearningPathCard } from "./LearningPathCard";

export function LearningPathsIndex() {
  const [progressByPath, setProgressByPath] = useState<Record<string, PathProgress>>({});

  useEffect(() => {
    function refresh() {
      const next: Record<string, PathProgress> = {};
      for (const path of learningPaths) next[path.id] = getPathProgress(path.id);
      setProgressByPath(next);
    }
    refresh();
    return subscribeToProgress(refresh);
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink tracking-tight mb-1">Learning Paths</h1>
        <p className="text-ink-muted text-sm">Curated, ordered routes through the catalog.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {learningPaths.map((path) => (
          <LearningPathCard
            key={path.id}
            path={path}
            progress={progressByPath[path.id] ?? EMPTY_PATH_PROGRESS}
          />
        ))}
      </div>
    </div>
  );
}
