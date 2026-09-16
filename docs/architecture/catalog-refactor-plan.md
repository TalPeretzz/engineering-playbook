# Catalog Architecture Refactor — Design Doc

**Status:** Plan (not yet executed)
**Author drafted:** 2026-08-31
**Target branch (when executed):** `feature/catalog-architecture`
**Scope:** Architecture, catalog data, navigation, homepage, learning paths, progress model, tests, docs. No new lesson content.

---

## 1. Goal and non-goals

**Goal:** Move Engineering Playbook from a hand-rolled 5-topic site to a data-driven catalog that starts at ~50 topics in a single "Backend & Systems" area and grows without a rewrite to 200+ topics across multiple content areas (Frontend Foundations, Database Foundations, System Design, Networking, and future areas).

Preserve Bloom Filter and LRU Cache exactly. Let future lessons be added as **data** — a per-topic definition file plus an optional `LessonContent` — rather than by writing new components. Let future _content areas_ be added by dropping in one entry to a registry.

**Non-goals (deferred):**

- Writing full lesson content for the ~48 new topics.
- Custom interactive visualizations beyond the two that already exist.
- Auth, backend, DB, deployment changes.
- Visual identity changes.
- Any change that would rewrite `LruCacheVisual`, `StepVisual`, or the existing `TopicSectionRenderer` cases.

**Contract:** After this refactor the app looks the same for a user who only visits Bloom Filter or LRU Cache. Everything else is additive.

---

## 2. Current state (2026-08-31)

- Monorepo: `apps/web` (Next.js 14 App Router), `packages/content` (topic data), `packages/content-schema` (types), `packages/shared-types` (progress types), `packages/ui`.
- Each topic is either a **flat file** (`packages/content/src/topics/consistent-hashing.ts`) or a **directory** (`packages/content/src/topics/lru-cache/{metadata,lesson,implementations,challenges,index}.ts`).
- `Topic` is a single flat shape (schema + content merged). `allTopics` is a hand-maintained array in `packages/content/src/index.ts`.
- `Sidebar`, `Dashboard`, `TopicPage`, and `AppShell` all iterate `allTopics` directly and derive categories inline.
- Categories are a single-value field (`category: TopicCategory`). Consistent Hashing cannot appear in two groups.
- Progress is stored under `engineering-playbook:progress`, keyed by `topic.slug`. No migration layer.
- Prev/next: `TopicPage` uses `topic.nextTopics[0]`, falling back to `allTopics[currentIndex ± 1]`. No canonical curriculum order.
- Sidebar is always expanded, no collapsible groups, no filters, no persistence.
- Homepage renders all topics × categories as an equal-weight grid.

**Assets to preserve verbatim:**

- `packages/content/src/topics/bloom-filter/` directory (all files, all exports).
- `packages/content/src/topics/lru-cache/` directory (all files, all exports).
- `apps/web/src/components/topic/LruCacheVisual.tsx` and `StepVisual.tsx`.
- `apps/web/src/utils/{bloomFilterTests,lruCacheTests,testRunner}.ts`.
- All rendered section types (`text`, `visual`, `complexity`, `tradeoffs`, `use-cases`, `comparison`, `lru-visual`) and their renderers in `TopicSectionRenderer.tsx`.
- `useProgress`, `progressStore` public surface.

---

## 3. Target architecture

### 3.1 Module boundaries

```
packages/content-schema     types only (Topic, Section, LessonContent, TopicDefinition, ...)
packages/content            data: catalog + per-topic lesson files
apps/web                    rendering, routing, progress, navigation
```

### 3.2 Data flow (single source of truth)

```
                     ┌──────────────────────────────┐
                     │  packages/content/catalog/    │
                     │    definitions.ts             │  ← metadata for ALL ~50 topics
                     │    curriculum.ts              │  ← global order + categories order
                     │    learning-paths.ts          │  ← path definitions
                     │  packages/content/topics/*    │  ← lesson content for available topics
                     └──────────────┬───────────────┘
                                    │
                     ┌──────────────▼───────────────┐
                     │  packages/content/src/index   │  builds:
                     │    - topicDefinitions[]       │
                     │    - topicsById               │
                     │    - topicsBySlug             │
                     │    - categoriesOrdered        │
                     │    - learningPaths            │
                     │    - curriculumOrder          │
                     └──────────────┬───────────────┘
                                    │
       ┌────────────────────────────┼─────────────────────────────┐
       │                            │                             │
  ┌────▼────┐               ┌───────▼──────┐              ┌───────▼───────┐
  │ Sidebar │               │ Homepage     │              │ /topics       │
  │ (nav)   │               │ (Dashboard)  │              │ (catalog)     │
  └────┬────┘               └───────┬──────┘              └───────┬───────┘
       │                            │                             │
       │                    ┌───────▼──────┐                      │
       │                    │ /topics/[slug]│                      │
       │                    │  ↳ available: │                      │
       │                    │    TopicPage  │                      │
       │                    │  ↳ coming-soon│                      │
       │                    │    ComingSoon │                      │
       │                    │    TopicPage  │                      │
       │                    └──────────────┘                      │
       │                                                          │
       │                    ┌──────────────┐                      │
       └───────────────────►│ progressStore│◄─────────────────────┘
                            │ (localStorage│
                            │  keyed by id)│
                            └──────────────┘
```

**Rule:** Sidebar, Homepage, `/topics`, `/learn/[path]`, TopicPage, search, filters, prev/next — **all** derive from the same in-memory catalog objects. Nothing renders a hardcoded topic list.

### 3.3 Scalability principles

The catalog is designed to grow along four axes: topic count, category count, content-area count, and content-type count. Each axis has an explicit strategy so growth doesn't force a rewrite.

| Growth axis         | Small (today)           | Medium (~200 topics)                     | Large (500+) | Mechanism                                                                     |
| ------------------- | ----------------------- | ---------------------------------------- | ------------ | ----------------------------------------------------------------------------- |
| Topics per category | 5–10                    | 10–20                                    | 20+          | Per-category ordering; sidebar list                                           |
| Categories per area | 5                       | 8–12 per area                            | 12+          | Data-driven `CategoryDefinition[]`                                            |
| Content areas       | 1 ("Backend & Systems") | 3–5 (add Frontend, Data, Systems Design) | 6–10         | Data-driven `ContentArea[]`; sidebar accordion switches to area-tabbed layout |
| Content types       | 1 (`lesson`)            | Optionally add cheatsheets, case-studies | Multiple     | `TopicDefinition.contentType?: string` (deferred; add only when needed)       |

**Composition, not centralization.** No file lists all topics inline. Instead:

- Each topic has its own `definition.ts` file.
- A registry file (`packages/content/topics/index.ts`) explicitly imports each definition — grep-friendly, tree-shakeable, git-conflict-tolerant.
- Categories, content areas, learning paths, and curriculum order each live in their own small files.

**Data over enums.** `TopicCategory` becomes a `string` validated at test time against a `CategoryDefinition[]` registry. Adding a new category is one entry, not a schema change. Adding a new content area is one entry. Adding a new topic is one file plus one line.

**Progressive disclosure.** UI patterns are designed to degrade gracefully as the catalog grows: sidebar collapses categories, homepage never renders more than ~12 cards, catalog page filters aggressively, area selector appears only when there are ≥2 areas.

---

## 4. Schema additions

All new types go into `packages/content-schema/src/index.ts`. Existing exports stay; new exports are added.

### 4.1 New enums

```ts
export type TopicDepth = "flagship" | "standard" | "reference";
export type TopicStatus = "available" | "coming-soon";
```

Note: `TopicStatus` (catalog) is distinct from the existing `TopicStatus` in `shared-types` (progress: `not-started` | `in-progress` | `completed`). To avoid confusion, rename:

- **Catalog:** `TopicAvailability = "available" | "coming-soon"` (in content-schema).
- **Progress:** keep existing `TopicStatus` from `shared-types`.

### 4.2 Content areas and categories (data-driven)

Categories move from a hardcoded TS enum to a **data-driven registry**. Above categories, we introduce **content areas** — a top-level bucket that lets the catalog grow into new domains (Frontend, Databases, System Design, …) without touching the schema.

```ts
export type ContentArea = {
  id: string; // "backend-systems", "frontend-foundations", "data", ...
  title: string; // "Backend & Systems"
  summary: string; // one line
  order: number; // display order
  icon?: string; // optional icon name (lucide identifier)
};

export type CategoryDefinition = {
  id: string; // "distributed-systems"
  contentAreaId: string; // references ContentArea.id
  title: string; // "Distributed Systems"
  summary?: string;
  order: number; // display order within the area
};

// TopicCategory becomes a bare string; validity is enforced by tests, not the compiler.
// This is a deliberate trade: less compile-time safety, unbounded extensibility.
export type TopicCategoryId = string;
```

**At ship time** the catalog contains **one content area** and **five categories** — enough for the 49 planned topics.

```
ContentArea "backend-systems" ("Backend & Systems")
├── practical-data-structures
├── distributed-systems
├── messaging
├── caching
└── design-patterns
```

**When the catalog grows** (no schema change required), we simply add entries:

```
ContentArea "frontend-foundations" ("Frontend Foundations")
├── rendering
├── state-management
├── performance
└── accessibility

ContentArea "data-foundations" ("Database & Data")
├── relational-modeling
├── nosql-patterns
├── indexing
└── transactions

ContentArea "system-design" ("System Design")
├── design-fundamentals
├── scale-patterns
└── case-studies
```

**Old category migration** (from the current codebase to the new registry):

| Old key (current code) | New category id             | Content area    |
| ---------------------- | --------------------------- | --------------- |
| `data-structures`      | `practical-data-structures` | backend-systems |
| `distributed-systems`  | `distributed-systems`       | backend-systems |
| `resilience`           | `distributed-systems`       | backend-systems |
| `messaging`            | `messaging`                 | backend-systems |
| `caching`              | `caching`                   | backend-systems |
| `backend-patterns`     | `design-patterns`           | backend-systems |
| `fundamentals`         | (dropped — unused)          | —               |

Existing 5 topic files use the old string keys. Migration is a mechanical string replace in each `metadata.ts` / flat file.

### 4.3 `TopicDefinition` — the new source of truth

```ts
export type TopicDefinition = {
  id: string; // stable slug-like ID; MAY equal slug
  slug: string; // URL segment; unique across all topics
  title: string;
  shortTitle?: string; // sidebar/breadcrumb; falls back to title
  summary: string; // 1–2 sentences, shown everywhere

  categories: TopicCategoryId[]; // one or more; first is canonical
  primaryCategoryId?: TopicCategoryId; // optional override; defaults to categories[0]
  tags: string[]; // free-form for filters/search — the escape hatch for future cross-cutting facets

  depth: TopicDepth; // flagship | standard | reference
  availability: TopicAvailability; // available | coming-soon
  contentType?: "lesson"; // default "lesson"; reserved for future ("cheatsheet", "case-study", "interview-question"). Deferred until needed.

  difficulty: TopicDifficulty;
  estimatedMinutes: number;

  prerequisites: string[]; // topic IDs
  relatedTopics: string[]; // topic IDs
  learningPaths: string[]; // learning path IDs

  whyItMatters?: string; // shown on reference/coming-soon pages

  /** Full lesson. Absent for coming-soon topics. */
  lesson?: LessonContent;
};
```

Rules:

- `id` is stable. Once assigned, never changes even if `slug` or `title` changes. Progress storage keys on `id`.
- `slug` may change (with a redirect); `id` is the immutable handle.
- `categories` is always ≥ 1. Multi-category is allowed and tested for. The first entry (or `primaryCategoryId` if set) determines canonical position in the curriculum.
- `contentType` defaults to `"lesson"`. Reserved for future non-lesson content (cheatsheets, case studies, interview questions). No runtime behavior today.
- `availability: "coming-soon"` implies `lesson` is absent and `depth` may be `reference` or higher.
- A `flagship` or `standard` topic can be marked `coming-soon` until content lands (planned but not written).

### 4.4 `LessonContent` schema

The current `Topic.sections: Section[]` shape works well for Bloom Filter and LRU. We keep it and add optional structured sections on top so **standard** lessons can be authored by filling in a form rather than composing an arbitrary section list.

```ts
export type LessonContent = {
  /** Optional structured slots — renderers pick these up in order when present. */
  problem?: TextSection;
  intuition?: TextSection;
  visualization?: VisualizationSlot;
  howItWorks?: TextSection;
  complexity?: ComplexitySection;
  comparisons?: ComparisonSection[];
  tradeoffs?: TradeoffsSection;
  useCases?: UseCasesSection;
  production?: TextSection;
  realWorldUsage?: TextSection; // uses new `sources` rich node
  recap?: ComparisonSection;

  /** Legacy escape hatch — flagship lessons stay on this. */
  sections?: Section[];

  implementations?: Partial<Record<ProgrammingLanguage, string>>;
  challenges?: Challenge[];
};

export type VisualizationSlot =
  | {
      kind: "component";
      component: "lru-cache" | "bloom-filter";
      heading: string;
      id: string;
      phase?: string;
    }
  | { kind: "steps"; heading: string; id: string; phase?: string; steps: VisualStep[] }
  | { kind: "ascii"; heading: string; id: string; phase?: string; content: string };
```

Rendering rule: `TopicPage` composes sections in this order when `LessonContent` is present:

1. `problem`
2. `intuition`
3. `visualization`
4. `howItWorks`
5. `complexity`
6. `comparisons[]`
7. `tradeoffs`
8. `useCases`
9. `production`
10. `realWorldUsage`
11. `recap`

Then any additional `sections[]` are appended (this is how Bloom Filter and LRU Cache continue to work — their content stays in `sections`, `LessonContent.sections` field).

Every section carries `id` (used for anchors and TOC). If `id` is omitted for structured slots, we synthesize one (`problem`, `intuition`, ...). Stable IDs = stable anchor URLs.

### 4.5 `Topic` (rendering-time shape)

The rendering pipeline still uses a `Topic` shape close to today's — but now derived from `TopicDefinition`:

```ts
// Existing exported Topic keeps working for TopicPage.
export type Topic = {
  id: string;
  slug: string;
  title: string;
  description: string;
  categories: TopicCategory[]; // <- was `category`
  difficulty: TopicDifficulty;
  estimatedMinutes: number;
  prerequisites: string[];
  nextTopics: string[]; // computed from curriculum, not authored
  relatedTopics: string[];
  implementations: Partial<Record<ProgrammingLanguage, string>>;
  sections: Section[]; // flattened from LessonContent (§4.4)
  challenges: Challenge[];
};
```

`Topic` is a **view model** built by `buildTopic(definition, curriculum)`. Component code stays largely unchanged; only its source changes. `TopicPage.tsx` needs a small edit: `topic.category` → `topic.categories[0]` (for display), and prev/next now uses `curriculumOrder`.

**Backwards-compat during migration:** `Topic` exposes a deprecated `category` getter that returns `categories[0]`. Any component that still reads `topic.category` keeps working. The getter is removed at the end of step 5 once all call sites have moved to `categories[]`.

### 4.6 Learning paths

```ts
export type LearningPath = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  audience?: string; // e.g., "Backend engineers"
  topicIds: string[]; // ordered
};
```

Six paths (§9 of user spec): backend-engineer, distributed-systems, messaging, caching, probabilistic, design-patterns.

### 4.7 Curriculum order (composable, per-category)

At 50 topics a single flat `topicOrder: string[]` is manageable. At 200+ it's a merge-conflict magnet and hard to reason about. The curriculum uses **nested per-scope ordering** that composes into a global order:

```ts
export type Curriculum = {
  /** Order in which content areas render. */
  areaOrder: string[]; // ["backend-systems", "frontend-foundations", ...]

  /** Ordered category ids inside each area. */
  categoriesInArea: Record<string, TopicCategoryId[]>; // areaId → ordered categories

  /** Ordered topic ids inside each category. */
  topicsInCategory: Record<TopicCategoryId, string[]>; // categoryId → ordered topics

  /**
   * Optional explicit override — a hand-authored global linear reading order
   * that trumps the derived order (used only when we want to weave topics
   * across categories for pedagogical flow). Rarely needed.
   */
  topicOrderOverride?: string[];
};
```

The derived global order is built at load time by walking areas → categories → topics. Multi-category topics appear only once, in their **primary** category. Test `catalog.test.ts` verifies that every non-coming-soon topic id appears exactly once in the derived order.

Canonical prev/next uses the derived order (or the override when set), skipping `coming-soon` topics unless the current topic itself is coming-soon.

**Why this scales:** adding a new topic touches one entry in `topicsInCategory[cat]`. Adding a new category touches one entry in `categoriesInArea[area]` and one in the category registry. Adding a content area touches `areaOrder` and the area registry. No file grows without bound.

---

## 5. File layout after refactor

```
packages/content-schema/src/
  index.ts                                    # types (extended, backwards-compatible re-exports)

packages/content/src/
  index.ts                                    # exports: topicsById, topicsBySlug, allTopicDefinitions,
                                              #          contentAreas, categories, learningPaths,
                                              #          curriculum, derivedTopicOrder, buildTopic()

  catalog/
    areas.ts                                  # ContentArea[] — top-level buckets
    categories.ts                             # CategoryDefinition[] — data-driven categories
    learning-paths.ts                         # LearningPath[]
    curriculum.ts                             # areaOrder + categoriesInArea + topicsInCategory
    build-topic.ts                            # buildTopic(definition, curriculum) → Topic
    derive-order.ts                           # walk area → cat → topic; returns global order
    index.ts                                  # re-exports the above

  topics/
    index.ts                                  # REGISTRY — imports each topic's definition, exports allTopicDefinitions
    bloom-filter/
      definition.ts                           # TopicDefinition (metadata + { lesson: bloomFilterLesson })
      lesson.ts implementations/ challenges/  # unchanged content
    lru-cache/
      definition.ts                           # TopicDefinition
      lesson.ts implementations/ challenges/  # unchanged
    consistent-hashing/
      definition.ts lesson.ts implementations/ challenges/
    idempotency/
      definition.ts lesson.ts implementations/ challenges/
    rate-limiter/
      definition.ts lesson.ts implementations/ challenges/
    <coming-soon-slug>/
      definition.ts                           # metadata only, no lesson.ts

apps/web/src/
  app/
    page.tsx                                  # unchanged import, but Dashboard rewritten
    topics/[slug]/page.tsx                    # unchanged
    topics/page.tsx                           # NEW — catalog page
    learn/[slug]/page.tsx                     # NEW — learning path page
    learn/page.tsx                            # NEW — list of paths

  components/
    catalog/
      CatalogPage.tsx                         # NEW — client component with filters + search
      TopicCard.tsx                           # NEW — one card
      FilterBar.tsx                           # NEW — search + facet chips
      ComingSoonBadge.tsx                     # NEW
    layout/
      Sidebar.tsx                             # REWRITTEN — collapsible groups + search + filters
      AppShell.tsx                            # unchanged public surface; passes new props
      Topbar.tsx                              # small change: total-count now = available count
    homepage/
      Dashboard.tsx                           # REWRITTEN — continue learning, featured, paths, categories
    learn/
      LearningPathPage.tsx                    # NEW
      LearningPathCard.tsx                    # NEW
    topic/
      TopicPage.tsx                           # SMALL edit — categories[]; prev/next via curriculum
      TopicPageComingSoon.tsx                 # NEW — reference / coming-soon variant
      TopicSectionRenderer.tsx                # unchanged (already supports `sources`)
      # everything else unchanged
    challenges/                               # unchanged

  utils/
    catalogFilters.ts                         # NEW — pure filter/sort helpers (tested)
    navigationPersist.ts                      # NEW — localStorage for expanded/collapsed groups
    progressMigration.ts                      # NEW — one-shot v1→v2 progress migration

  store/
    progressStore.ts                          # extended: keyed by id (via alias table); migration hook

docs/
  architecture/
    catalog-refactor-plan.md                  # this doc
    content-production.md                     # NEW — author workflow (§13 of spec)
```

---

## 6. Migration strategy

### 6.1 Preserving Bloom Filter and LRU

The two flagship lessons keep every file they have today. What changes:

- `packages/content/src/topics/bloom-filter/index.ts` currently exports `Topic`. Change it to export a `TopicDefinition` (metadata + `lesson: { sections, implementations, challenges }`). The rendered shape is unchanged.
- `apps/web/src/components/topic/TopicPage.tsx` receives a `Topic` (view model), same as today. `buildTopic()` composes it from the definition.
- `LruCacheVisual` continues to be triggered by the `lru-visual` section type (kept). The section is placed in `lesson.sections` exactly as today, so rendering order is identical.
- Section IDs unchanged → anchor URLs unchanged → TOC unchanged.

**Verification:** After migration, load `/topics/bloom-filter` and `/topics/lru-cache`. Diff the rendered DOM against pre-refactor snapshots. Any difference = migration bug, not a refactor decision.

### 6.2 Migrating the three existing partial topics

`consistent-hashing.ts`, `idempotency.ts`, `rate-limiter.ts` are currently flat files with `Section[]` content. Migration path:

1. Move each to a directory with the standard layout (see file layout above).
2. Split flat file into `metadata.ts`, `lesson.ts`, `implementations/*`, `challenges/*`.
3. Update `catalog/definitions.ts` to import each `TopicDefinition`.

Content is preserved verbatim in the split. No rewriting.

### 6.3 Progress migration (v1 → v2)

**Existing storage format (v1):**

```json
{
  "topics": { "bloom-filter": { "status": "completed", "completedChallenges": [...] } },
  "preferredLanguage": "typescript",
  "lastVisitedTopic": "bloom-filter"
}
```

**New format (v2):** same shape, but keyed by canonical topic **id** and versioned.

```json
{
  "version": 2,
  "topicsById": { "bloom-filter": { "status": "completed", "completedChallenges": [...] } },
  "collapsedCategories": ["messaging", "design-patterns"],
  "preferredLanguage": "typescript",
  "lastVisitedTopicId": "bloom-filter"
}
```

**Migration function** in `progressMigration.ts`, invoked once on first load:

```ts
export function migrateProgress(raw: unknown): UserProgress {
  if (isV2(raw)) return raw as UserProgress;

  const v1 = raw as V1Progress | null;
  if (!v1) return DEFAULT_PROGRESS_V2;

  const slugToId = buildSlugToIdMap(); // from catalog
  const topicsById: Record<string, TopicProgress> = {};
  for (const [oldKey, prog] of Object.entries(v1.topics ?? {})) {
    const id = slugToId[oldKey] ?? oldKey; // slug == id today, so identity for Bloom/LRU
    topicsById[id] = prog;
  }

  return {
    version: 2,
    topicsById,
    collapsedCategories: [],
    preferredLanguage: v1.preferredLanguage ?? "typescript",
    lastVisitedTopicId: v1.lastVisitedTopic ? (slugToId[v1.lastVisitedTopic] ?? null) : null,
  };
}
```

For all currently-shipped topics, slug == id, so the migration is functionally a rename. No data loss.

The `progressStore` public functions (`getTopicProgress`, `completeTopic`, `completeChallenge`, ...) keep their signatures. Internally they route slug → id via the alias table. Callers that pass slugs continue to work.

### 6.4 Coming-soon topics cannot progress

`markInProgress`, `completeChallenge`, `setTopicStatus` all check the definition:

```ts
if (definition.availability === "coming-soon") return; // no-op
```

Reference topics render `TopicPageComingSoon` which does not import `useProgress`.

---

## 7. Navigation redesign (Sidebar)

### 7.1 Behavior

- Categories from `curriculum.categoriesInArea`, each collapsible via a button + `aria-expanded` + `aria-controls`. Category header shows: name, count of available topics, optional icon.
- Search across title, tags, summary, category label.
- Filter chips: difficulty (3), availability, depth, completion.
- Persist collapsed set to `localStorage` (`collapsedCategories` field in progress record — shared with catalog page).
- Status icons include text alternative (`aria-label="Completed"` etc.).
- Mobile: drawer with focus-trap. Focus returned to the toggle on close. Overlay dismisses.
- No page-level horizontal scroll — nav is fixed 280px on desktop, full width in the drawer.

### 7.2 Rendering budget

- Default state: all groups collapsed except the group containing the currently active topic (via pathname match).
- Coming-soon topics render dimmed with a small "Soon" chip.
- 50 topics × 5 categories ≈ 10 topics per group. When collapsed, the sidebar shows ~5 rows — one per category — which fits any viewport height.

### 7.3 Growing beyond one content area

At ship time, only one `ContentArea` exists ("Backend & Systems"), so its title is hidden and categories render at the top level. When a second area is added:

- The sidebar grows a lightweight **area tab strip** above the categories — either a horizontal chip row for ≤4 areas or a select for ≥5.
- Each area's categories render in the panel below; switching areas swaps the category list.
- The tab strip mounts automatically when `contentAreas.length ≥ 2`. Until then it's a no-op — visually the sidebar looks exactly like §7.1 above.
- Category collapsed-state persistence is per-area (namespaced by `areaId`) so users don't lose scroll context when switching.
- On mobile the area strip becomes a small select at the top of the drawer.

The trigger `contentAreas.length ≥ 2` is evaluated at render time from the catalog. Adding an area = zero UI code, one data entry.

### 7.3 Component sketch

```tsx
<Sidebar>
  <SearchInput />
  <FilterChips />
  {categoriesOrdered.map((cat) => (
    <CategoryGroup id={cat} defaultOpen={isActive(cat) || !isCollapsed(cat)}>
      <CategoryHeader count={availableCount(cat)} total={totalCount(cat)} />
      <TopicList topics={topicsInCategory(cat, filterState)} />
    </CategoryGroup>
  ))}
</Sidebar>
```

`CategoryGroup` uses a `<button aria-expanded aria-controls>` + `<ul id>` pattern (native `<details>` doesn't animate cleanly across browsers with our styles).

---

## 8. `/topics` catalog page

Client component. Reads catalog and progress. URL query params (`?area=backend-systems&difficulty=intermediate&depth=flagship`) reflect current filter state (bookmarkable/shareable).

- Header: title + result count.
- FilterBar facets: search input, content area, category, difficulty, availability, depth, learning path, completion, **tag**. "Clear all" button when any filter is active.
- Tag facet is generated dynamically from the union of all `TopicDefinition.tags[]`. This is the extensibility escape hatch: when the catalog develops cross-cutting themes (e.g., "async", "distributed", "networking") that don't fit the category taxonomy, tags surface them without a schema change.
- Content-area facet is hidden while `contentAreas.length === 1`.
- Grid of `TopicCard`s (2–3 columns depending on breakpoint). At 200+ results, list becomes windowed (react-window or CSS `content-visibility: auto`) to keep scroll performance sane.
- Empty state when no topics match. Clear-all-filters CTA.

Coming-soon cards use a muted background, a "Coming Soon" chip in the top-right, and no progress pill. Card is still a link — it routes to `TopicPageComingSoon`.

---

## 9. `TopicPageComingSoon`

A reduced variant of `TopicPage`. Shows:

- `TopicHeader` with a "Coming soon" banner replacing the CTA.
- Summary and why-it-matters paragraph.
- Difficulty, estimated time, categories.
- Prerequisites list (linked).
- Related topics list (linked).
- "Full lesson coming soon" panel with:
  - A link back to `/topics`.
  - Optionally: link to next available topic on the same learning path.
- No implementations, no challenges, no TOC.
- Cannot call `useTopicProgress` — the hook is not mounted, so no "in-progress" mutation is possible.

---

## 10. Homepage redesign (`Dashboard`)

Replace the "all topics × category grid" with:

1. **Header** — playbook title + one-line pitch.
2. **Continue Learning** — if `lastVisitedTopicId` and it's `available`. One large card.
3. **Recommended Next** — first `available` topic in curriculum after the last visited (or first ever if no progress). Skips coming-soon.
4. **Featured flagship** — 3 flagship cards, deterministic order (first three flagships in curriculum).
5. **Learning Paths** — 3 path cards with progress bars.
6. **Category overview** — one row per category: label, available count, completed count, link to `/topics?category=...`.
7. **Browse All Topics** CTA → `/topics`.

Grid density: at most ~12 cards above the fold. No mass rendering of all 50.

---

## 11. Curriculum + prev/next

`curriculum.topicOrder` is an explicit array of topic IDs. It defines the canonical linear reading order across categories (e.g., `bloom-filter`, `lru-cache`, `consistent-hashing`, `trie`, ...).

Prev/next logic in `TopicPage`:

```ts
function nextAvailableFrom(currentId: string): string | null {
  const i = curriculum.topicOrder.indexOf(currentId);
  for (let j = i + 1; j < curriculum.topicOrder.length; j++) {
    const cand = topicsById[curriculum.topicOrder[j]];
    if (cand?.availability === "available") return cand.id;
  }
  return null;
}
```

`prevAvailableFrom` is the mirror. Never returns the current topic. If no next available exists, prev/next block renders a "Browse all topics" card in the next slot.

Multi-category topics have exactly one position in `topicOrder`. Whether they were reached via a "Practical Data Structures" nav or a "Distributed Systems" nav does not affect prev/next.

---

## 12. Learning paths

`packages/content/src/catalog/learning-paths.ts` defines the 6 paths listed in the user spec. Each path's `topicIds` may include coming-soon topics; the path page renders them with a "Coming soon" chip in place of a completion pill.

`/learn` — landing page listing all 6 paths with progress bars.
`/learn/[slug]` — one path:

- Ordered numbered list of topics.
- "Recommended next" = first available topic in path where current progress status is `not-started` or `in-progress`.
- Path progress: `completedInPath / availableInPath` (coming-soon topics don't count against denominator).
- Prerequisites for path topics show inline where they diverge from the path order.

Topic membership in multiple paths is expected (LRU appears in "Caching" and could appear in others).

---

## 13. Progress model updates

`UserProgress` v2:

```ts
export type UserProgressV2 = {
  version: 2;
  topicsById: Record<string, TopicProgress>; // keyed by TopicDefinition.id
  collapsedCategories: TopicCategory[]; // sidebar persistence
  preferredLanguage: ProgrammingLanguage;
  lastVisitedTopicId: string | null;
};
```

New computed helpers exported from `progressStore`:

```ts
getCategoryProgress(categoryId): { completed, available, percent }
getAreaProgress(areaId): { completed, available, percent }
getPathProgress(pathId): { completed, available, percent, nextRecommendedId }
getOverallProgress(): {
  completedAvailable, totalAvailable, percentAvailable,
  completedAny, totalAny, percentAny
}
```

Overall progress on Dashboard displays `completedAvailable / totalAvailable` with a subtitle "out of X planned topics" so the roadmap denominator is honest but not the default metric. When more than one content area exists, the Dashboard also shows an area breakdown row (Backend 5/10, Frontend 0/12, …).

---

## 14. Testing strategy

New test files in `apps/web/src/**/__tests__/`:

- `catalog.test.ts`
  - No duplicate `id`.
  - No duplicate `slug`.
  - Every `prerequisites[]` entry references a real topic id.
  - Every `relatedTopics[]` entry references a real topic id.
  - Every `learningPaths[]` entry references a real path id.
  - Every path's `topicIds[]` references real topic ids.
  - Every topic's `categories[]` values are in the enum.
  - `curriculum.topicOrder` is a permutation of all topic ids (no missing, no extras).
  - Coming-soon topics have no `lesson`.
- `catalogFilters.test.ts`
  - Search matches title, tags, summary case-insensitively.
  - Multi-category topic appears once regardless of category filter.
  - Combining filters (difficulty + depth + availability) intersects correctly.
- `navigation.test.ts`
  - `nextAvailableFrom` skips coming-soon.
  - `prevAvailableFrom` never returns the current topic.
  - When no next available exists, function returns `null` (UI shows browse-all).
- `progressMigration.test.ts`
  - v1 → v2 preserves completed challenges for Bloom Filter and LRU Cache.
  - v1 `lastVisitedTopic: "bloom-filter"` maps to `lastVisitedTopicId: "bloom-filter"`.
  - v1 with unknown slug is dropped without crash.
  - v2 input passes through unchanged.
- `progressCalculations.test.ts`
  - Category progress counts only available topics.
  - Path progress recommended next is first available not-started or in-progress.
  - Overall progress reports available vs full-roadmap correctly.
- `topicPage.smoke.test.ts` (light DOM/render)
  - Bloom Filter renders same section IDs as before.
  - LRU Cache renders `lru-visual` section.
  - Coming-soon topic renders `TopicPageComingSoon`, not challenges.

Existing tests (`progressStore.test.ts`, `challengeCompletion.test.ts`) must continue to pass — extend them for the id-based routing.

Full check: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

---

## 15. Content-production workflow doc

Separate file `docs/architecture/content-production.md`, referenced from the main design doc and from `CLAUDE.md`. Covers:

1. Add a `TopicDefinition` entry in `catalog/definitions.ts` with `availability: "coming-soon"` and `depth: "reference"`.
2. Add the topic id to `curriculum.topicOrder` in the appropriate position.
3. Add categories, prerequisites, related topics, learning paths.
4. Add to `learning-paths.ts` if it belongs to a path.
5. When ready to author content:
   - Create `packages/content/src/topics/<slug>/{metadata,lesson,index}.ts`.
   - Fill `LessonContent` structured slots for a **standard** lesson. Only compose an arbitrary `sections[]` for **flagship**.
   - Add implementations and challenges as needed.
   - Import the topic's `lesson` into the definition; flip `availability: "available"`; bump `depth` if warranted.
6. Add sources for any factual claim.
7. Verify: `pnpm test` (catalog integrity), `pnpm build`, then browser smoke.

Includes three worked examples (~20 lines each):

- **Flagship**: HyperLogLog (with `sections[]` for a custom visualization).
- **Standard**: Retry + Exponential Backoff (structured `LessonContent` slots only).
- **Reference**: Skip List (metadata only, `availability: "coming-soon"`).

---

## 16. Full topic catalog (initial state)

At ship time the catalog contains **one content area** (`backend-systems`, "Backend & Systems") with **five categories** and **49 topics**. Each topic lives in its own `packages/content/src/topics/<slug>/definition.ts`. Only Bloom Filter and LRU Cache are `available`; every other topic is `coming-soon`. Consistent Hashing, Idempotency, and Rate Limiter (currently partial) are marked `coming-soon` — the existing content is preserved but not exposed as "complete" until it goes through the new schema and gets sources.

Future content areas (Frontend Foundations, Data Foundations, System Design, …) are **not** added in this refactor. The architecture supports them via §4.2 + §7.3 + §20; adding one becomes a per-area PR that touches only data files.

Grouping by target category and depth mark:

**Practical Data Structures** (10 topics)

- `bloom-filter` — flagship, available
- `lru-cache` — flagship, available
- `consistent-hashing` — flagship, coming-soon (multi-category: also distributed-systems)
- `trie` — standard, coming-soon
- `skip-list` — reference, coming-soon
- `heap-priority-queue` — standard, coming-soon
- `bitmaps-bitsets` — standard, coming-soon
- `hyperloglog` — flagship, coming-soon
- `count-min-sketch` — standard, coming-soon
- `merkle-tree` — standard, coming-soon

**Distributed Systems** (15 topics — Consistent Hashing dual-listed above)

- `leader-election` — standard, coming-soon
- `replication` — standard, coming-soon
- `sharding` — standard, coming-soon
- `quorum` — standard, coming-soon
- `gossip-protocol` — standard, coming-soon
- `heartbeats` — standard, coming-soon
- `circuit-breaker` — standard, coming-soon
- `retry-exponential-backoff` — standard, coming-soon
- `idempotency` — flagship, coming-soon
- `distributed-lock` — standard, coming-soon
- `lease` — standard, coming-soon
- `saga-pattern` — flagship, coming-soon
- `outbox-pattern` — flagship, coming-soon
- `cqrs` — standard, coming-soon
- `event-sourcing` — standard, coming-soon

**Messaging** (8 topics)

- `pub-sub` — standard, coming-soon
- `consumer-groups` — standard, coming-soon
- `dead-letter-queue` — standard, coming-soon
- `delivery-semantics` (at-least/at-most/exactly-once) — standard, coming-soon
- `deduplication` — standard, coming-soon
- `ordering` — standard, coming-soon
- `backpressure` — standard, coming-soon
- `competing-consumers` — standard, coming-soon

**Caching** (8 topics — LRU dual-listed above)

- `cache-aside` — flagship, coming-soon
- `write-through` — standard, coming-soon
- `write-behind` — standard, coming-soon
- `read-through` — standard, coming-soon
- `ttl` — standard, coming-soon
- `cache-invalidation` — standard, coming-soon
- `cache-stampede` — standard, coming-soon
- `distributed-cache` — standard, coming-soon

**Design Patterns** (8 topics)

- `strategy` — flagship, coming-soon
- `factory` — standard, coming-soon
- `adapter` — standard, coming-soon
- `decorator` — standard, coming-soon
- `observer` — standard, coming-soon
- `command` — standard, coming-soon
- `repository` — standard, coming-soon
- `dependency-injection` — standard, coming-soon

**Total: 49 unique topics.** (Consistent Hashing counts once, dual-categorized.)

Existing partial content for `consistent-hashing`, `idempotency`, `rate-limiter` is retained in-tree so it can be promoted to `available` later without rewriting from scratch. `rate-limiter` is not on the target list; keep it as a hidden topic (available but marked `depth: standard`, unlisted from paths) or drop from the catalog. **Decision:** keep as an available topic under `distributed-systems` (it exists and works today) — do not silently remove existing user-facing content.

---

## 17. Execution order (commit sequence)

Each commit compiles, typechecks, and passes the existing tests. If any step would break the app, split the step further.

1. `feat(schema): add ContentArea, CategoryDefinition, TopicDefinition, LessonContent, LearningPath, Curriculum types`
   Content-schema types only. Additive. No consumers change.

2. `refactor(content): migrate consistent-hashing, idempotency, rate-limiter to directories`
   Split flat files. Content unchanged. `allTopics` array still assembles the old `Topic` shape.

3. `feat(content): add catalog registries (areas, categories, curriculum) and per-topic definition files`
   New `catalog/` module (`areas.ts`, `categories.ts`, `curriculum.ts`, `learning-paths.ts`, `derive-order.ts`, `build-topic.ts`). New `topics/index.ts` registry that imports every `<slug>/definition.ts`. All 49 definitions added, only Bloom Filter and LRU Cache have `lesson`. Existing `allTopics` becomes a computed view: `allTopics = allDefinitions.filter(availability === "available").map(buildTopic)`. Bloom Filter and LRU Cache paths unchanged.

4. `feat(progress): v1→v2 migration, id-keyed storage, computed progress helpers`
   `progressMigration.ts` + `progressStore` extensions. Existing localStorage payloads migrate on first load. All existing tests still pass.

5. `refactor(topic-page): use catalog for prev/next; support categories[]`
   Small edits to `TopicPage.tsx` — replace `topic.category` with `topic.categories[0]` for display, use `nextAvailableFrom` for nav. Bloom/LRU pages render identically.

6. `feat(nav): rewrite Sidebar with collapsible groups, search, filters, persistence`
   New Sidebar. AppShell unchanged.

7. `feat(app): add /topics catalog page and TopicCard`
   New route + components. FilterBar, empty state, query-param sync.

8. `feat(app): add TopicPageComingSoon and route to it from /topics/[slug]`
   Reference-topic renderer. Route decides between `TopicPage` and `ComingSoon` variant based on `availability`.

9. `feat(learn): add /learn and /learn/[slug] with LearningPathPage`
   Path rendering with recommended-next logic.

10. `feat(homepage): rewrite Dashboard with continue-learning / featured / paths / categories`
    New homepage. Old dashboard grid retired.

11. `test: add catalog, filters, navigation, progress migration, path calc tests`
    Batch new tests. `pnpm test` green with 60+ tests.

12. `docs: add content-production.md and cross-link from CLAUDE.md and README.md`
    Author workflow doc.

13. `chore: browser smoke — screenshots at 375px, 768px, 1440px in light and dark`
    Playwright script + captured images. Manual review, no code delivered here.

At each step run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Commit only when all four pass. Push after step 4 (progress migration) as a checkpoint, then after step 10, then final.

---

## 18. Acceptance-criteria coverage

| #   | Criterion                                             | Covered by                                                                                               |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | All planned topics in the catalog                     | §16 (49 definitions) + step 3                                                                            |
| 2   | Bloom Filter and LRU still work exactly               | §6.1 + step 5 (small edit only) + smoke tests                                                            |
| 3   | Consistent Hashing dual-category, one canonical entry | §4.3 `categories[]`; §16 dual-listed once; §11 single position in topicOrder                             |
| 4   | Search never returns duplicates                       | §7 (filter by unique id); tested in `catalogFilters.test.ts`                                             |
| 5   | Sidebar usable with full catalog                      | §7.2 collapsed-by-default; step 6                                                                        |
| 6   | Catalog filters work individually and combined        | §8 + `catalogFilters.test.ts`                                                                            |
| 7   | Coming-soon pages render, cannot affect progress      | §9 + §6.4; tested in `topicPage.smoke.test.ts`                                                           |
| 8   | Learning paths render from data                       | §12 + step 9                                                                                             |
| 9   | Prev/next skips unavailable                           | §11 + `navigation.test.ts`                                                                               |
| 10  | Existing progress survives                            | §6.3 + `progressMigration.test.ts`                                                                       |
| 11  | Tests, lint, typecheck, build pass                    | Step-by-step gate + final CI                                                                             |
| 12  | No new console errors                                 | Browser smoke (step 13)                                                                                  |
| 13  | Both themes and widths                                | Browser smoke (step 13)                                                                                  |
| 14  | Screenshots delivered                                 | Step 13 captures 6 shots                                                                                 |
| 15  | Written summary                                       | Delivered with the final PR description                                                                  |
| 16  | Ready for open-ended catalog growth                   | §3.3 principles + §4.2 content areas + §4.7 nested curriculum + §5 per-topic files + §20 growth playbook |

---

## 19. What the follow-up execution session should do

1. Re-read this doc.
2. Create branch `feature/catalog-architecture` from `main`.
3. Execute steps 1–13 in order, committing after each. Push after step 4, step 10, and final.
4. Open one PR: **feat: catalog architecture for 50-topic scale**. Include the acceptance-matrix from §18 with each row linked to its commit or test.
5. Deliver in the PR description:
   - Architecture summary (this doc as reference).
   - Files changed grouped by concern.
   - Data model diff.
   - Progress migration details.
   - Test list.
   - Screenshots (homepage, sidebar expanded/collapsed, /topics, coming-soon page, /learn/[slug], mobile).
   - Remaining TODOs (specifically: authoring the ~48 coming-soon lessons).

**Do not begin writing any new lesson content in the execution session.** That is deliberately deferred to per-topic PRs authored after this refactor lands.

### Locked-in decisions (previously "open questions")

These are baked into the plan; no confirmation needed at execution time:

1. **`rate-limiter`** stays as an available topic under `distributed-systems`. Existing content is preserved.
2. **Category renames** happen in step 1 (`data-structures` → `practical-data-structures`, `backend-patterns` → `design-patterns`, drop `fundamentals` and `resilience`). New categories live in the data-driven `CategoryDefinition[]` registry (§4.2).
3. **Catalog route:** `/topics` (index) and `/topics/[slug]` (already the individual route).
4. **Progress storage:** keep key `engineering-playbook:progress`; version internally with a `version: 2` field. Migration is transparent.
5. **`Topic.category` (singular):** ships as a deprecated getter returning `categories[0]` for one commit (step 5), then removed.
6. **Ship-time content areas:** one area (`backend-systems`) holds all 49 topics. Additional content areas are deferred to their own PRs and require no code change.

---

## 20. Growth playbook

Concrete steps for adding new content to the catalog after this refactor lands. Each recipe assumes the architecture from §§3–7 is in place.

### 20.1 Adding a new topic (any depth)

1. Create `packages/content/src/topics/<slug>/definition.ts` exporting a `TopicDefinition`.
2. Add one import line to `packages/content/src/topics/index.ts` and include it in the exported array.
3. Add the topic's id to the appropriate array in `packages/content/src/catalog/curriculum.ts` (`topicsInCategory[categoryId]`), in the position that makes pedagogical sense.
4. If the topic belongs to a learning path, add its id to `packages/content/src/catalog/learning-paths.ts`.
5. If `depth: "flagship" | "standard"` — author `lesson.ts` (structured `LessonContent` slots for standard; free-form `sections[]` for flagship). If `depth: "reference"` — no `lesson.ts`.
6. Set `availability: "coming-soon"` while unfinished; flip to `"available"` when acceptance criteria pass.
7. Run `pnpm test` — `catalog.test.ts` fails loudly if the definition is orphaned, references a non-existent category, or duplicates an id.

Files touched for a **coming-soon** topic: 2 (definition.ts, topics/index.ts). Plus 1 line in curriculum. Plus optionally 1 line per learning path.

### 20.2 Adding a new category

1. Add a `CategoryDefinition` entry to `packages/content/src/catalog/categories.ts` with `contentAreaId` pointing at the appropriate area, and a display `order` that positions it among siblings.
2. Add the category id to `curriculum.categoriesInArea[areaId]` in the desired position.
3. Add `topicsInCategory[<newCategoryId>] = []` to `curriculum.topicsInCategory`.
4. Optionally: add a summary paragraph in the category definition; the sidebar and catalog page will surface it.
5. Test: `catalog.test.ts` checks that every category referenced by a topic exists in the registry.

Files touched: 2 (categories.ts, curriculum.ts). Zero UI code.

### 20.3 Adding a new content area (e.g., "Frontend Foundations")

This is the target growth path — the primary reason the refactor uses a data-driven registry instead of a TS enum.

1. Add a `ContentArea` entry to `packages/content/src/catalog/areas.ts`:

   ```ts
   {
     id: "frontend-foundations",
     title: "Frontend Foundations",
     summary: "Rendering, state, performance, accessibility.",
     order: 20,
   }
   ```

2. Append the area id to `curriculum.areaOrder`.
3. Add the area's initial categories via §20.2 (e.g., `rendering`, `state-management`, `performance`, `accessibility`) with `contentAreaId: "frontend-foundations"`.
4. Add topics under those categories via §20.1 — start entirely with `coming-soon` entries so the area is browsable immediately.
5. The moment `contentAreas.length ≥ 2` the sidebar auto-mounts the area tab strip (§7.3), the catalog page reveals its area filter (§8), and the Dashboard shows per-area progress (§13). Zero UI code changes.
6. If the new area needs its own learning paths, add them to `learning-paths.ts`. Paths can span areas — no restriction.

Files touched to create the area shell: 4 (areas.ts, categories.ts, curriculum.ts, learning-paths.ts). Every subsequent topic follows §20.1.

### 20.4 Introducing a new content type (deferred)

Today `contentType` defaults to `"lesson"` and has no runtime effect. When we want to add non-lesson content (cheatsheets, case studies, interview questions):

1. Extend the `contentType` union: `"lesson" | "cheatsheet"`.
2. Add a matching route (e.g., `/cheatsheets/[slug]`) or extend `/topics/[slug]` to dispatch on `contentType`.
3. Add a `CheatsheetContent` type parallel to `LessonContent` and its renderer.
4. Filter catalog page and sidebar by `contentType` when the catalog contains a mix.

The `TopicDefinition` shape and its registry, categories, areas, tags, progress model, and learning paths **all continue to work unchanged**. Content type is an additive discriminator.

### 20.5 Cross-cutting themes that don't fit categories

If a theme cuts across categories (e.g., "async programming" touches messaging, distributed systems, and design patterns), use **tags**, not a new category. Tag-based filtering in the catalog page and search covers it without taxonomy changes.

Reserve categories for stable, orthogonal groupings that a reader would use to browse. Reserve tags for facets a reader would use to filter.

### 20.6 What NOT to do as the catalog grows

- **Don't** create a mega-file listing all topics. The per-topic-definition + registry pattern exists to avoid this.
- **Don't** promote tags to categories reflexively. If two topics share a tag, that's fine. If ten do, consider a category — but only if browsing by that dimension is a first-class need.
- **Don't** hardcode content-area or category strings in components. Everything derives from `catalog/`.
- **Don't** re-order categories or areas by editing many files — order lives in `curriculum.ts` and the `order` field on definitions. Two places, not N.
- **Don't** couple learning paths to categories. Paths intentionally cut across the taxonomy.
