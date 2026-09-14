"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { TopicStatus } from "@engineering-playbook/shared-types";
import { allTopicDefinitions, categories } from "@engineering-playbook/content";
import { getTopicProgress, subscribeToProgress } from "@/store/progressStore";
import {
  filterCatalog,
  DEFAULT_FILTER_STATE,
  type CatalogFilterState,
} from "@/utils/catalogFilters";
import { TopicCard } from "./TopicCard";
import { FilterBar } from "./FilterBar";

const CATEGORY_TITLES: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.id, c.title])
);

export function CatalogPage() {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category");
  const [filters, setFilters] = useState<CatalogFilterState>(DEFAULT_FILTER_STATE);
  const [statuses, setStatuses] = useState<Record<string, TopicStatus>>({});

  // Re-sync whenever the URL's `category` param changes (initial load, back/forward,
  // or a client-side navigation that keeps this component mounted) — not just on mount.
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      categoryId: categoryFromUrl && CATEGORY_TITLES[categoryFromUrl] ? categoryFromUrl : null,
    }));
  }, [categoryFromUrl]);

  useEffect(() => {
    function refreshStatuses() {
      const next: Record<string, TopicStatus> = {};
      for (const topic of allTopicDefinitions) {
        if (topic.availability === "available")
          next[topic.slug] = getTopicProgress(topic.slug).status;
      }
      setStatuses(next);
    }
    refreshStatuses();
    return subscribeToProgress(refreshStatuses);
  }, []);

  const results = useMemo(
    () => filterCatalog(allTopicDefinitions, filters, CATEGORY_TITLES),
    [filters]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink tracking-tight mb-1">All Topics</h1>
        <p className="text-ink-muted text-sm">
          {allTopicDefinitions.length} topics across {categories.length} categories.
        </p>
      </div>

      <FilterBar
        state={filters}
        onChange={setFilters}
        categories={categories}
        resultCount={results.length}
      />

      {results.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-wire rounded-xl">
          <p className="text-ink-muted mb-3">No topics match your filters.</p>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTER_STATE)}
            className="text-sm text-brand-text hover:underline underline-offset-2 cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              categoryTitle={CATEGORY_TITLES[topic.categories[0]] ?? topic.categories[0]}
              status={statuses[topic.slug] ?? "not-started"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
