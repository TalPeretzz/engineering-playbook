"use client";

import React from "react";
import type { TopicStatus } from "@engineering-playbook/shared-types";
import type { Challenge } from "@engineering-playbook/content-schema";

type Props = {
  status: TopicStatus;
  challenges: Challenge[];
  completedChallenges: string[];
  onStart: () => void;
};

export function LessonCTA({ status, challenges, completedChallenges, onStart }: Props) {
  const scroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleStart = () => {
    onStart();
    setTimeout(() => {
      const firstSection = document.querySelector<HTMLElement>("article section[id]");
      firstSection?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleContinue = () => {
    const firstIncomplete = challenges.find(
      (c) => c.required && !completedChallenges.includes(c.id)
    );
    scroll(firstIncomplete ? firstIncomplete.id : "challenges");
  };

  if (status === "not-started") {
    return (
      <button
        onClick={handleStart}
        className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer"
      >
        Start lesson →
      </button>
    );
  }

  if (status === "in-progress") {
    return (
      <button
        onClick={handleContinue}
        className="px-5 py-2.5 rounded-lg bg-surface-overlay hover:bg-wire border border-wire text-ink font-semibold text-sm transition-colors cursor-pointer"
      >
        Continue to challenges →
      </button>
    );
  }

  return (
    <button
      onClick={() => scroll("challenges")}
      className="px-5 py-2.5 rounded-lg bg-surface-overlay hover:bg-wire border border-wire text-ink-muted font-semibold text-sm transition-colors cursor-pointer"
    >
      Review challenges ✓
    </button>
  );
}
