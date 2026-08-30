"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Topic, TopicCategory } from "@engineering-playbook/content-schema";
import type { TopicStatus } from "@engineering-playbook/shared-types";
import { getTopicProgress } from "@/store/progressStore";

const CATEGORY_LABELS: Record<TopicCategory, string> = {
  fundamentals: "Fundamentals",
  "data-structures": "Data Structures",
  "distributed-systems": "Distributed Systems",
  resilience: "Resilience",
  messaging: "Messaging",
  caching: "Caching",
  "backend-patterns": "Backend / API",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: "text-emerald-600 dark:text-emerald-400",
  intermediate: "text-amber-600 dark:text-amber-400",
  advanced: "text-red-600 dark:text-red-400",
};

function StatusIcon({ status }: { status: TopicStatus }) {
  if (status === "completed") return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold" aria-label="Completed">✓</span>;
  if (status === "in-progress") return <span className="text-amber-600 dark:text-amber-400 text-xs" aria-label="In progress">◐</span>;
  return <span className="text-ink-muted text-xs" aria-label="Not started">○</span>;
}

type SidebarProps = {
  topics: Topic[];
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ topics, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<Record<string, TopicStatus>>({});

  useEffect(() => {
    const next: Record<string, TopicStatus> = {};
    for (const topic of topics) {
      next[topic.slug] = getTopicProgress(topic.slug).status;
    }
    setStatuses(next);
  }, [topics, pathname]);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const filtered = topics.filter(
    (t) =>
      search === "" ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  const byCategory = filtered.reduce<Partial<Record<TopicCategory, Topic[]>>>((acc, topic) => {
    if (!acc[topic.category]) acc[topic.category] = [];
    acc[topic.category]!.push(topic);
    return acc;
  }, {});

  const categories = Object.keys(byCategory) as TopicCategory[];

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex flex-col w-[280px] shrink-0
        bg-surface-raised border-r border-wire overflow-hidden
        transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      aria-label="Navigation"
    >
      {/* Search */}
      <div className="p-3 border-b border-wire">
        <input
          type="text"
          placeholder="Search topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface-overlay border border-wire-strong rounded px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {categories.map((category) => (
          <div key={category}>
            <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
              {CATEGORY_LABELS[category]}
            </p>
            <ul className="space-y-0.5" role="list">
              {byCategory[category]!.map((topic) => {
                const isActive = pathname === `/topics/${topic.slug}`;
                const status = statuses[topic.slug] ?? "not-started";
                return (
                  <li key={topic.slug}>
                    <Link
                      href={`/topics/${topic.slug}`}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 ${
                        isActive
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium"
                          : "text-ink-muted hover:bg-surface-overlay hover:text-ink"
                      }`}
                    >
                      <StatusIcon status={status} />
                      <span className="flex-1 truncate">{topic.title}</span>
                      <span className="text-[10px] tabular-nums text-ink-faint group-hover:text-ink-muted transition-colors">
                        {topic.estimatedMinutes}m
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-ink-faint text-sm px-2 py-4">No topics match your search.</p>
        )}
      </nav>
    </aside>
  );
}
