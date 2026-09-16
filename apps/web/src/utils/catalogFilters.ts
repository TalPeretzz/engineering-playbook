import type {
  TopicDefinition,
  TopicAvailability,
  TopicDepth,
  TopicDifficulty,
} from "@engineering-playbook/content-schema";

export type CatalogFilterState = {
  search: string;
  categoryId: string | null;
  difficulty: TopicDifficulty | null;
  availability: TopicAvailability | null;
  depth: TopicDepth | null;
  tag: string | null;
};

export const DEFAULT_FILTER_STATE: CatalogFilterState = {
  search: "",
  categoryId: null,
  difficulty: null,
  availability: null,
  depth: null,
  tag: null,
};

/** Every tag used by at least one topic, alphabetized — the tag facet's option list. */
export function getAllTags(topics: TopicDefinition[]): string[] {
  return [...new Set(topics.flatMap((t) => t.tags))].sort();
}

/** Pure predicate: does `topic` satisfy every active facet in `state`? Used by both CatalogPage and its tests. */
export function matchesFilters(
  topic: TopicDefinition,
  state: CatalogFilterState,
  categoryTitles: Record<string, string>
): boolean {
  if (state.categoryId && !topic.categories.includes(state.categoryId)) return false;
  if (state.difficulty && topic.difficulty !== state.difficulty) return false;
  if (state.availability && topic.availability !== state.availability) return false;
  if (state.depth && topic.depth !== state.depth) return false;
  if (state.tag && !topic.tags.includes(state.tag)) return false;

  if (state.search.trim() !== "") {
    const q = state.search.toLowerCase();
    const categoryTitleText = topic.categories.map((id) => categoryTitles[id] ?? id).join(" ");
    const haystack =
      `${topic.title} ${topic.summary} ${topic.tags.join(" ")} ${categoryTitleText}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export function filterCatalog(
  topics: TopicDefinition[],
  state: CatalogFilterState,
  categoryTitles: Record<string, string>
): TopicDefinition[] {
  return topics.filter((t) => matchesFilters(t, state, categoryTitles));
}
