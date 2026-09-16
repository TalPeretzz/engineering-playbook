# Contributing

## Setup

```bash
pnpm install
pnpm dev       # apps/web on http://localhost:3000
```

Requires Node ≥22.13 and pnpm ≥9 (see `engines` in `package.json`; the
workspace pins pnpm 11.2.2 via `packageManager`).

## Before opening a PR

```bash
pnpm format:check   # prettier --check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All five run in CI (`.github/workflows/ci.yml`) on every PR to `main`. Run
`pnpm format` to fix formatting issues automatically.

## Branches and PRs

- Never push to `main` directly — always work on a branch:
  `feature/<description>`, `fix/<description>`, `refactor/<description>`,
  or `chore/<description>`.
- Every PR targets `main`. One PR per concern — don't mix unrelated changes.
- Commit messages: `<type>: <short description>` (`feat`, `fix`, `refactor`,
  `chore`, `docs`, `test`).

## Adding or promoting a topic

The topic catalog is data-driven — see
[`docs/architecture/catalog-refactor-plan.md`](docs/architecture/catalog-refactor-plan.md)
for the architecture and
[`docs/architecture/content-production.md`](docs/architecture/content-production.md)
for the step-by-step workflow to add a coming-soon topic or promote one to a
full lesson. Read the latter before touching anything under
`packages/content/src/topics/`.

## Project layout

- `apps/web` — Next.js 14 App Router frontend.
- `packages/content` — topic data: catalog registries (`src/catalog/`) and
  per-topic definitions (`src/topics/<slug>/`).
- `packages/content-schema` — shared types for topics, sections, and
  challenges.
- `packages/shared-types` — progress-tracking types.
- `packages/ui` — small headless shared components.

## Tests

Vitest, colocated in `__tests__/` directories next to the code they cover
(plus `apps/web/src/__tests__/` for cross-cutting catalog tests). No
component-rendering library is installed — the one smoke test that renders a
component (`topicPage.smoke.test.ts`) uses `react-dom/server`'s
`renderToStaticMarkup` directly rather than adding a new dependency.
