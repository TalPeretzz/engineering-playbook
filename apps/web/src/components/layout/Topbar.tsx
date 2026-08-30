"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { useOverallProgress } from "@/hooks/useProgress";
import type { ProgrammingLanguage } from "@engineering-playbook/content-schema";
import { ThemeToggle } from "./ThemeToggle";

const LANGUAGES: { value: ProgrammingLanguage; label: string }[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
];

type TopbarProps = {
  totalTopics: number;
  onSidebarToggle: () => void;
};

export function Topbar({ totalTopics, onSidebarToggle }: TopbarProps) {
  const { language, setLanguage } = useLanguage();
  const { completed, total, percent } = useOverallProgress(totalTopics);

  return (
    <header className="h-14 border-b border-wire bg-surface-raised flex items-center px-4 gap-3 shrink-0 z-40">
      {/* Hamburger — mobile only */}
      <button
        onClick={onSidebarToggle}
        aria-label="Open navigation"
        className="lg:hidden flex items-center justify-center w-8 h-8 rounded text-ink-muted hover:text-ink hover:bg-surface-overlay transition-colors cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <Link href="/" className="flex items-center gap-2">
        <span className="text-brand-text font-bold text-base tracking-tight">
          Engineering Playbook
        </span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {/* Progress bar — sm and up */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-24 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-xs text-ink-muted tabular-nums">
            {completed}/{total}
          </span>
        </div>

        <ThemeToggle />

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
          className="bg-surface-overlay border border-wire text-ink text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
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
