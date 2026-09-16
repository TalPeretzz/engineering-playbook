import type {
  CategoryDefinition,
  TopicDepth,
  TopicDifficulty,
} from "@engineering-playbook/content-schema";
import { DEFAULT_FILTER_STATE, type CatalogFilterState } from "@/utils/catalogFilters";

const DIFFICULTIES: TopicDifficulty[] = ["beginner", "intermediate", "advanced"];
const DEPTHS: TopicDepth[] = ["flagship", "standard", "reference"];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
        active
          ? "bg-brand text-white border-brand"
          : "text-ink-muted border-wire hover:border-wire-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

type FilterBarProps = {
  state: CatalogFilterState;
  onChange: (state: CatalogFilterState) => void;
  categories: CategoryDefinition[];
  tags: string[];
  resultCount: number;
};

export function FilterBar({ state, onChange, categories, tags, resultCount }: FilterBarProps) {
  const hasActiveFilters =
    state.search !== "" ||
    state.categoryId ||
    state.difficulty ||
    state.availability ||
    state.depth ||
    state.tag;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search topics, tags, categories…"
          value={state.search}
          onChange={(e) => onChange({ ...state, search: e.target.value })}
          className="flex-1 bg-surface-overlay border border-wire-strong rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <select
          value={state.tag ?? ""}
          onChange={(e) =>
            onChange({ ...state, tag: e.target.value === "" ? null : e.target.value })
          }
          aria-label="Filter by tag"
          className="bg-surface-overlay border border-wire-strong text-ink text-sm rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
        >
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <span className="text-sm text-ink-muted whitespace-nowrap">
          {resultCount} topic{resultCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip
          active={state.categoryId === null}
          onClick={() => onChange({ ...state, categoryId: null })}
        >
          All categories
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.id}
            active={state.categoryId === c.id}
            onClick={() =>
              onChange({ ...state, categoryId: state.categoryId === c.id ? null : c.id })
            }
          >
            {c.title}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {DIFFICULTIES.map((d) => (
          <Chip
            key={d}
            active={state.difficulty === d}
            onClick={() => onChange({ ...state, difficulty: state.difficulty === d ? null : d })}
          >
            {d}
          </Chip>
        ))}
        <span className="w-px h-4 bg-wire mx-1" aria-hidden="true" />
        {DEPTHS.map((d) => (
          <Chip
            key={d}
            active={state.depth === d}
            onClick={() => onChange({ ...state, depth: state.depth === d ? null : d })}
          >
            {d}
          </Chip>
        ))}
        <span className="w-px h-4 bg-wire mx-1" aria-hidden="true" />
        <Chip
          active={state.availability === "available"}
          onClick={() =>
            onChange({
              ...state,
              availability: state.availability === "available" ? null : "available",
            })
          }
        >
          Available
        </Chip>
        <Chip
          active={state.availability === "coming-soon"}
          onClick={() =>
            onChange({
              ...state,
              availability: state.availability === "coming-soon" ? null : "coming-soon",
            })
          }
        >
          Coming soon
        </Chip>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTER_STATE)}
            className="text-xs text-ink-faint hover:text-ink underline underline-offset-2 ml-1 cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
