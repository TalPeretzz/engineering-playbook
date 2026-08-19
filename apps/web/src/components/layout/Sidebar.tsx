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
  beginner: "text-emerald-400",
  intermediate: "text-amber-400",
  advanced: "text-red-400",
};

function StatusIcon({ status }: { status: TopicStatus }) {
  if (status === "completed") return <span className="text-emerald-400 text-xs font-bold">✓</span>;
  if (status === "in-progress") return <span className="text-amber-400 text-xs">◐</span>;
  return <span className="text-zinc-600 text-xs">○</span>;
}

type SidebarProps = {
  topics: Topic[];
};

export function Sidebar({ topics }: SidebarProps) {
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
    <aside className="w-[280px] shrink-0 border-r border-zinc-800 bg-surface-raised flex flex-col overflow-hidden">
      <div className="p-3 border-b border-zinc-800">
        <input
          type="text"
          placeholder="Search topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface-overlay border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {categories.map((category) => (
          <div key={category}>
            <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              {CATEGORY_LABELS[category]}
            </p>
            <ul className="space-y-0.5">
              {byCategory[category]!.map((topic) => {
                const isActive = pathname === `/topics/${topic.slug}`;
                const status = statuses[topic.slug] ?? "not-started";
                return (
                  <li key={topic.slug}>
                    <Link
                      href={`/topics/${topic.slug}`}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors group ${
                        isActive
                          ? "bg-emerald-950/60 text-emerald-300"
                          : "text-zinc-400 hover:bg-surface-overlay hover:text-zinc-200"
                      }`}
                    >
                      <StatusIcon status={status} />
                      <span className="flex-1 truncate">{topic.title}</span>
                      <span
                        className={`text-[10px] tabular-nums ${DIFFICULTY_COLOR[topic.difficulty]} opacity-70 group-hover:opacity-100`}
                      >
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
          <p className="text-zinc-600 text-sm px-2 py-4">No topics match your search.</p>
        )}
      </nav>
    </aside>
  );
}
