# Post-Refactor Roadmap

Follow-up work identified after the catalog architecture refactor
([`catalog-refactor-plan.md`](./catalog-refactor-plan.md), shipped as PRs
#10–#14) and a full-repo code review (`docs/codereview.md`, local-only, not
tracked in this repo). Each step below is its own PR, branched from `main`,
gated on `pnpm lint && pnpm typecheck && pnpm test && pnpm build` the same
way the refactor was.

**Status:** Plan (not yet executed) as of 2026-09-14.

---

## Step 1 — CI workflow

Nothing currently enforces lint/typecheck/test/build on a PR except a human
remembering to run them.

- Add `.github/workflows/ci.yml`: on every PR to `main`, run
  `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Add a `format:check` script (`prettier --check` — the existing `format`
  script only rewrites, it can't fail a check).

## Step 2 — Quick wins / polish

- Add a favicon. Confirmed missing during the refactor's browser smoke pass
  (`/favicon.ico` 404s) — pre-existing, unrelated to the refactor itself.
- Add a tag filter to `/topics`. Every `TopicDefinition.tags[]` is already
  searchable; there's no dedicated facet chip for it yet
  (`content-production.md` §"Known gaps").
- Add `LICENSE` and `CONTRIBUTING.md`.

## Step 3 — Accessibility pass

- Mobile sidebar (`AppShell.tsx`/`Sidebar.tsx`): focus-trap while open,
  Escape-to-close, focus restoration to the toggle button on close,
  background scroll lock, proper dialog semantics.
- `CodeBlock.tsx` language switcher: either real tab semantics
  (`role="tablist"`/`tab`/`aria-selected`, arrow-key navigation, an
  associated `tabpanel`) or consistently present as ordinary buttons — not
  the current visual-tabs-without-semantics middle ground.
- `CodeBlock.tsx` clipboard copy: handle failure (insecure context,
  permission denied) and surface success/error via `aria-live`.
- `Sidebar.tsx` search input: add a real `<label>` or `aria-label` instead
  of relying on the placeholder alone.
- Respect `prefers-reduced-motion` beyond `LruCacheVisual` (the only place
  that currently checks it) — sweep Tailwind `transition-*` usage.

## Step 4 — Complete the `TopicDefinition` migration

`packages/content/src/catalog/build-topic.ts` documents `LEGACY_TOPIC_OVERRIDES`
as transitional (added in PR #10). It's still there.

- Migrate `TopicPage.tsx`, `TopicHeader.tsx`, `Sidebar.tsx`, `Dashboard.tsx`
  off `topic.category` (singular) onto `TopicDefinition.categories[]`.
- Drop the authored `nextTopics` fallback — `TopicPage`'s prev/next already
  uses curriculum-derived navigation (`nextAvailableTopicId`/
  `prevAvailableTopicId`, since PR #11); the override map exists only to
  keep the _legacy_ `Topic.category`/`nextTopics` fields correct for
  components not yet migrated.
- Once no consumer reads `Topic.category`/`Topic.nextTopics`, remove
  `LEGACY_TOPIC_OVERRIDES` and those two fields from the legacy `Topic`
  type in `packages/content-schema`.
- Resolve topic ids explicitly instead of assuming `id === slug`
  everywhere (true for all 50 topics today, but not guaranteed by the
  type system — see `content-production.md`).

## Step 5 — Author lessons for the 45 coming-soon topics

Not a single PR — ongoing, one topic (or a small batch of related ones) at
a time, following [`content-production.md`](./content-production.md) §2.
Flip `availability` to `"available"` as each lands. This is the actual
point of the catalog refactor: everything above exists to make this safe
and mechanical.

---

## Explicitly out of scope for this roadmap

Logged in PR #14's description as deliberately not done; revisit only if
requested:

- Swapping the handwritten progress-validation parser for Zod/Valibot.
- A Playwright e2e suite (component/interaction tests, not just the smoke
  screenshots taken manually during PR #14).
- Product ideas from the code review: draft persistence per challenge,
  progress export/import, prerequisite-completion display, content
  quality states (`draft`/`reviewed`/`verified`), analytics.
