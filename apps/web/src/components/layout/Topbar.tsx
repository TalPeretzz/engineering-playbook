"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { useOverallProgress } from "@/hooks/useProgress";
import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";

const LANGUAGES: { value: ProgrammingLanguage; label: string }[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
];

type TopbarProps = {
  totalTopics: number;
};

export function Topbar({ totalTopics }: TopbarProps) {
  const { language, setLanguage } = useLanguage();
  const { completed, total, percent } = useOverallProgress(totalTopics);

  return (
    <header className="h-14 border-b border-zinc-800 bg-surface-raised flex items-center px-4 gap-4 shrink-0 z-10">
      <Link href="/" className="flex items-center gap-2 mr-4">
        <span className="text-emerald-400 font-bold text-base tracking-tight">
          Engineering Playbook
        </span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-24 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 tabular-nums">
            {completed}/{total} topics
          </span>
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
          className="bg-surface-overlay border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          aria-label="Select programming language"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
