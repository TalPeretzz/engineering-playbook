# Content Production Workflow

How to add and promote topics in the catalog introduced by
[`catalog-refactor-plan.md`](./catalog-refactor-plan.md). This describes the
architecture as it actually shipped (across PRs #10–#13), which differs in a
few small, deliberate ways from that plan's original file layout — this doc
is the accurate reference; treat the plan doc as historical context.

---

## 1. Adding a new topic (coming-soon)

Every topic — available or not — is one `TopicDefinition` object, one file,
registered in one place.

1. **Create `packages/content/src/topics/<slug>/definition.ts`:**

   ```ts
   import type { TopicDefinition } from "@engineering-playbook/content-schema";

   export const mySlug: TopicDefinition = {
     id: "my-slug",
     slug: "my-slug",
     title: "My Topic",
     summary: "One or two sentences — shown on cards, headers, and search results.",
     categories: ["distributed-systems"], // first entry is primary; list is data-driven (see §4)
     tags: ["coordination", "reliability"], // free-form; surfaces in search
     depth: "standard", // "flagship" | "standard" | "reference"
     availability: "coming-soon",
     difficulty: "intermediate", // "beginner" | "intermediate" | "advanced"
     estimatedMinutes: 20,
     prerequisites: [], // real topic ids only — see §2
     relatedTopics: [],
     learningPaths: [],
     // no `lesson` field — coming-soon topics render via TopicPageComingSoon
   };
   ```

2. **Add `packages/content/src/topics/<slug>/index.ts`:**

   ```ts
   export { mySlug } from "./definition";
   ```

3. **Register it in `packages/content/src/topics/index.ts`** — one import line, one
   array entry:

   ```ts
   import { mySlug } from "./my-slug";
   // ...
   export const allTopicDefinitions: TopicDefinition[] = [
     // ...
     mySlug,
   ];
   ```

4. **Add its id to `packages/content/src/catalog/curriculum.ts`**, in
   `topicsInCategory[<categoryId>]`, at the position that makes pedagogical
   sense. A topic with multiple `categories[]` can appear in more than one
   category's list — `deriveTopicOrder()` (in `derive-order.ts`) dedupes to
   the topic's **first-listed** category when building the global reading
   order used for prev/next.

5. **If it belongs to a learning path**, add its id to the path's `topicIds`
   in `packages/content/src/catalog/learning-paths.ts`. Coming-soon topics in
   a path render with a "Soon" chip instead of a completion pill.

6. **Verify:** `pnpm --filter @engineering-playbook/web test` — `catalog.test.ts`
   fails loudly if the id is a duplicate, an unknown category, or missing
   from `derivedTopicOrder`.

Files touched for a coming-soon topic: 3 (`definition.ts`, `index.ts`, one
line in `topics/index.ts`), plus one line in `curriculum.ts`, plus optionally
one line per learning path.

---

## 2. Promoting a topic to `available`

1. **Author the lesson.** Add to the topic's directory:
   - `lesson.ts` — see §3 for which shape to use (`sections[]` vs structured
     `LessonContent` slots).
   - `implementations/{typescript,python,java}.ts` if the topic has a code
     implementation.
   - `challenges/*.ts` for each challenge (`multiple-choice`, `implementation`,
     `system-design` — see `Challenge` in `packages/content-schema`).

2. **Wire the lesson into `definition.ts`:**

   ```ts
   import { sections } from "./lesson";
   // ...
   lesson: {
     sections,
     implementations: { typescript: /* ... */, python: /* ... */, java: /* ... */ },
     challenges: [/* ... */],
   },
   availability: "available", // flip this
   ```

3. **Fill in `prerequisites`/`relatedTopics`** with real topic ids now that
   the content justifies them. `catalog.test.ts` rejects any id that isn't a
   real topic — this caught and fixed two dangling `"hashing"` references
   left over from the pre-refactor Bloom Filter/Consistent Hashing content.

4. **Add sources** for factual claims — see `Source`/`RichParagraph` (type
   `"sources"`) in `packages/content-schema`. Used in the `realWorldUsage`
   slot or in a `sections[]` entry.

5. **Verify:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, then
   a manual pass with `pnpm --filter @engineering-playbook/web dev` — load the
   topic page, its prev/next neighbors, `/topics`, and `/learn/<path>` if it's
   on a path.

---

## 3. `sections[]` vs structured `LessonContent`

`LessonContent` (in `packages/content-schema`) offers two authoring modes:

- **`sections: Section[]`** — a free-form ordered list, rendered by
  `TopicSectionRenderer`. This is what Bloom Filter and LRU Cache use, and
  what every currently-`available` topic uses today (`sections` is the only
  populated field on all five). Reach for this when a topic needs a custom
  visualization (`type: "visual"` with `steps`, or a bespoke `lru-visual`-style
  component wired into `TopicSectionRenderer`) or doesn't fit the standard
  shape.
- **Structured slots** (`problem`, `intuition`, `visualization`, `howItWorks`,
  `complexity`, `comparisons`, `tradeoffs`, `useCases`, `production`,
  `realWorldUsage`, `recap`) — a fill-in-the-form shape for topics that don't
  need bespoke rendering. **Not yet consumed by `TopicPage`** — `buildTopic()`
  (in `packages/content/src/catalog/build-topic.ts`) currently only reads
  `lesson.sections`. Wiring `TopicPage` to compose these slots (in the order
  listed above, falling back to `sections[]` as an escape hatch) is
  unfinished work — the schema exists, the renderer doesn't yet. Until then,
  **author every new lesson as `sections[]`**, matching the existing five.

**Depth guidance:** `flagship` topics (custom visualization, the deepest
treatment) always use `sections[]`. `standard` and `reference` topics should
use the structured slots once `TopicPage` supports them; use `sections[]` in
the meantime.

---

## 4. Adding a new category

1. Add a `CategoryDefinition` to `packages/content/src/catalog/categories.ts`
   (`id`, `contentAreaId`, `title`, `order`).
2. Add the category id to `curriculum.categoriesInArea["backend-systems"]`
   (or a new area's array — see §5).
3. Add `topicsInCategory[<newCategoryId>] = []` and start filling it via §1.

## 5. Adding a new content area

Today there's one `ContentArea` (`"backend-systems"`). To add another
(Frontend Foundations, Database Foundations, …):

1. Add a `ContentArea` to `packages/content/src/catalog/areas.ts`.
2. Append its id to `curriculum.areaOrder`.
3. Add its categories via §4.
4. Add topics under those categories via §1 — start entirely `coming-soon`.

No sidebar/catalog-page code changes: `Sidebar` and `CatalogPage` already
derive every group directly from `curriculum`/`categories`/`allTopicDefinitions`.

---

## Known gaps (not blocking, worth knowing)

- **Structured `LessonContent` slots are unused** — see §3. Every topic today
  is `sections[]` or has no lesson at all.
- **`rate-limiter`** is `available` but isn't one of the 49 topics in the
  target catalog (`docs/architecture/catalog-refactor-plan.md` §16). It's
  kept as a working, already-shipped topic under `distributed-systems`
  rather than removed.
- **No tag facet** on `/topics` yet — tags exist on every `TopicDefinition`
  and are searchable, but there's no dedicated filter chip for them.
- **No URL sync or result windowing** on `/topics` filters beyond the
  `?category=` param — not needed yet at 50 topics.
