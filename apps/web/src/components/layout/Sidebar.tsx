"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TopicDefinition } from "@engineering-playbook/content-schema";
import type { TopicStatus } from "@engineering-playbook/shared-types";
import { allTopicDefinitions, categories, curriculum } from "@engineering-playbook/content";
import { getTopicProgress, getCollapsedCategories, setCollapsedCategories, subscribeToProgress } from "@/store/progressStore";

const DEFINITIONS_BY_ID: Record<string, TopicDefinition> = Object.fromEntries(
  allTopicDefinitions.map((d) => [d.id, d])
);

const CATEGORY_TITLES: Record<string, string> = Object.fromEntries(categories.map((c) => [c.id, c.title]));

const CATEGORY_IDS = curriculum.categoriesInArea["backend-systems"] ?? [];

function StatusIcon({ status }: { status: TopicStatus }) {
  if (status === "completed") return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold" aria-label="Completed">✓</span>;
  if (status === "in-progress") return <span className="text-amber-600 dark:text-amber-400 text-xs" aria-label="In progress">◐</span>;
  return <span className="text-ink-muted text-xs" aria-label="Not started">○</span>;
}

function matchesSearch(topic: TopicDefinition, categoryTitle: string, query: string): boolean {
  const q = query.toLowerCase();
  return (
    topic.title.toLowerCase().includes(q) ||
    topic.summary.toLowerCase().includes(q) ||
    topic.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    categoryTitle.toLowerCase().includes(q)
  );
}

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<Record<string, TopicStatus>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  const activeSlug = pathname?.startsWith("/topics/") ? pathname.slice("/topics/".length) : null;

  // Groups derived from the curriculum registry — every category, in curriculum order,
  // with its topics (multi-category topics appear in every category they belong to).
  const groups = useMemo(
    () =>
      CATEGORY_IDS.map((categoryId) => ({
        id: categoryId,
        title: CATEGORY_TITLES[categoryId] ?? categoryId,
        topics: (curriculum.topicsInCategory[categoryId] ?? [])
          .map((id) => DEFINITIONS_BY_ID[id])
          .filter((t): t is TopicDefinition => Boolean(t)),
      })),
    []
  );

  const activeCategoryId = useMemo(
    () => groups.find((g) => g.topics.some((t) => t.slug === activeSlug))?.id ?? null,
    [groups, activeSlug]
  );

  // Hydrate collapsed-state from storage once on mount. First-ever visit (nothing stored yet)
  // defaults to every category collapsed except the one containing the active topic.
  useEffect(() => {
    const stored = getCollapsedCategories();
    const initial =
      stored.length > 0 ? stored : CATEGORY_IDS.filter((id) => id !== activeCategoryId);
    setCollapsed(new Set(initial));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function refreshStatuses() {
      const next: Record<string, TopicStatus> = {};
      for (const topic of allTopicDefinitions) {
        if (topic.availability === "available") {
          next[topic.slug] = getTopicProgress(topic.slug).status;
        }
      }
      setStatuses(next);
    }
    refreshStatuses();
    return subscribeToProgress(refreshStatuses);
  }, [pathname]);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleCategory(categoryId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      setCollapsedCategories([...next]);
      return next;
    });
  }

  const searching = search.trim() !== "";
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      topics: searching
        ? group.topics.filter((t) => matchesSearch(t, group.title, search))
        : group.topics,
    }))
    .filter((group) => group.topics.length > 0);

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

      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {filteredGroups.map((group) => {
          const isCollapsed = hydrated && !searching && collapsed.has(group.id) && group.id !== activeCategoryId;
          const panelId = `sidebar-group-${group.id}`;
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleCategory(group.id)}
                aria-expanded={!isCollapsed}
                aria-controls={panelId}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-[11px] font-semibold uppercase tracking-widest text-ink-muted hover:text-ink hover:bg-surface-overlay transition-colors cursor-pointer"
              >
                <span className="truncate">{group.title}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-ink-faint normal-case tracking-normal font-normal">
                    {group.topics.filter((t) => t.availability === "available").length}/{group.topics.length}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>

              {!isCollapsed && (
                <ul id={panelId} className="space-y-0.5 mb-2" role="list">
                  {group.topics.map((topic) => {
                    const isActive = activeSlug === topic.slug;
                    const isComingSoon = topic.availability === "coming-soon";
                    const status = statuses[topic.slug] ?? "not-started";
                    return (
                      <li key={topic.id}>
                        <Link
                          href={`/topics/${topic.slug}`}
                          className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 ${
                            isActive
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium"
                              : isComingSoon
                                ? "text-ink-faint hover:bg-surface-overlay hover:text-ink-muted"
                                : "text-ink-muted hover:bg-surface-overlay hover:text-ink"
                          }`}
                        >
                          {isComingSoon ? (
                            <span className="text-ink-faint text-xs" aria-hidden="true">
                              ·
                            </span>
                          ) : (
                            <StatusIcon status={status} />
                          )}
                          <span className="flex-1 truncate">{topic.title}</span>
                          {isComingSoon ? (
                            <span className="text-[10px] text-ink-faint bg-surface-overlay border border-wire rounded px-1.5 py-0.5">
                              Soon
                            </span>
                          ) : (
                            <span className="text-[10px] tabular-nums text-ink-faint group-hover:text-ink-muted transition-colors">
                              {topic.estimatedMinutes}m
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <p className="text-ink-faint text-sm px-2 py-4">No topics match your search.</p>
        )}
      </nav>
    </aside>
  );
}
