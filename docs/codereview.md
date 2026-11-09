# Engineering Playbook — Code Review

This is a read-only review of the full repository: roughly 10,800 lines across the web app, shared packages, content catalog, tests, configuration, and documentation.

Overall, the project is in good shape for an MVP. The architecture is understandable, TypeScript is strict, rendering is data-driven, and the production build succeeds. The largest opportunities are around progress-state reliability, runtime validation, UI testing, accessibility, and completing the catalog migration.

## Verification results

- TypeScript passed.
- ESLint passed with no warnings.
- The production build passed and generated 62 static pages.
- A direct Vitest run passed 55 tests across four files.
- Turbo's cached run reported only 46 tests because it reused results from before the new catalog-filter tests. This is worth watching when reviewing untracked or newly added test files.
- Existing work in `CatalogPage.tsx` and `catalogFilters.ts` was treated as user-owned and was not modified during the review.

## Highest-priority improvements

### 1. Progress changes do not reliably update the rest of the page

`apps/web/src/hooks/useProgress.ts` listens for the browser's `storage` event. That event normally fires in other tabs, not in the same tab that performed the write.

Meanwhile, the sidebar refreshes statuses only when the pathname changes, and the dashboard reads progress only once when it mounts.

As a result, completing a challenge can update the topic itself while the top bar, sidebar, or dashboard remains stale until navigation or reload.

Use `useSyncExternalStore`, Zustand, or a small store subscription API. Every progress write should notify same-tab subscribers, while the browser's `storage` event can continue handling synchronization between tabs.

### 2. Persisted data is trusted after checking only its version

`apps/web/src/utils/progressMigration.ts` treats any object with `version === 2` as a valid `UserProgress` value.

Malformed local storage could therefore introduce:

- Invalid languages or statuses
- A non-array `completedChallenges` value
- A missing or invalid `topicsById` value
- Invalid category IDs
- Runtime failures in downstream operations

Validate and normalize every persisted field with a runtime schema such as Zod or Valibot, or with a small handwritten parser. Unknown or corrupt fields should fall back individually rather than invalidating all progress.

### 3. The default progress object can be mutated

`migrateProgress()` sometimes returns the exported `DEFAULT_PROGRESS_V2` object directly. Store operations then mutate the returned object, which can mutate the module-level default and leak state into subsequent operations or tests.

Always create a fresh value:

```ts
function createDefaultProgress(): UserProgress {
  return {
    version: 2,
    topicsById: {},
    collapsedCategories: [],
    preferredLanguage: "typescript",
    lastVisitedTopicId: null,
  };
}
```

Avoid exporting a mutable default object.

### 4. Add catalog integrity tests

The project has around 50 topic definitions and several interconnected registries, but no comprehensive test verifies all relationships.

Important invariants include:

- Topic IDs and slugs are unique.
- Challenge IDs are unique.
- Every category references a real content area.
- Every curriculum topic and category exists.
- Every learning-path topic exists.
- Every prerequisite and related topic exists.
- Available topics contain lessons.
- Coming-soon topics do not accidentally produce empty available pages.
- A topic's `primaryCategoryId` belongs to its `categories` collection.
- Section IDs are unique within a lesson.
- Required challenges contain the data their renderer expects.

These tests would catch content mistakes that TypeScript cannot detect because identifiers such as `TopicCategoryId` are strings.

### 5. Add continuous integration

There is no `.github/workflows` configuration. Add a pull-request workflow that runs:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Also add a `format:check` command. The current root formatting command only rewrites files.

## Architecture and maintainability

### Complete the catalog migration

The code currently maintains both `TopicDefinition` and a legacy `Topic` view model. `packages/content/src/catalog/build-topic.ts` documents this as transitional, but it creates two models for categories, navigation, lesson structure, and related topics.

Recommended cleanup:

- Remove `LEGACY_TOPIC_OVERRIDES`.
- Stop casting the first category to `TopicCategory`.
- Use stable topic IDs internally and slugs only for URLs.
- Generate prerequisite and next-topic navigation from the catalog.
- Update `TopicPage` to consume `TopicDefinition` or a clearly defined page view model.
- Remove legacy properties once all consumers migrate.

Until then, catalog and legacy data can quietly disagree.

### Avoid assumptions that IDs equal slugs

`apps/web/src/components/topic/TopicPage.tsx` passes `topic.slug` into ID-based navigation because IDs and slugs happen to match today.

That undermines the stated goal of stable IDs surviving slug changes. Pass the definition ID explicitly or resolve the slug through `definitionsBySlug` before performing navigation.

### Separate generic utilities from React component modules

`apps/web/src/utils/catalogFilters.ts` imports `CatalogFilterState` from a component file. Move that type and `DEFAULT_FILTER_STATE` into the utility or domain module, then let `FilterBar` import them.

This keeps the pure filtering utility independent of the UI layer and makes it easier to reuse or move into the content package.

### Reduce duplicated language-state APIs

The project has both `usePreferredLanguage()` in `useProgress.ts` and the active `LanguageProvider` in `useLanguage.tsx`.

Choose one public API. The duplicated implementation can drift and makes it unclear which hook consumers should use.

### Make store methods independent of `this`

`progressStore.ts` implements some methods using `this`, then binds every exported function manually.

Prefer closed-over functions such as `setTopicStatus(...)`. They are easier to extract, test, mock, and refactor without accidentally losing their context.

## Testing recommendations

Current tests focus on pure state utilities. That foundation is good, but there are no component or end-to-end tests.

Add tests in this order:

1. Catalog integrity tests
2. Same-tab progress synchronization
3. Topic auto-completion after all required challenges
4. Sidebar status updates after challenge completion
5. Progress migration with corrupt and partially valid input
6. Catalog filters reflected in and restored from the URL
7. Keyboard navigation and mobile-sidebar behavior
8. A Playwright smoke path covering catalog, topic, challenge, completion, and dashboard

Also configure real coverage reporting and thresholds. The Turbo configuration declares `coverage/**` as a test output, but regular tests do not generate coverage, which produces a warning.

## Accessibility and UI resilience

### Improve the mobile sidebar

`AppShell.tsx` visually overlays the page but does not provide dialog-like behavior.

Add:

- Escape-to-close behavior
- Focus movement into the sidebar
- Focus trapping while it is open
- Focus restoration to the menu button
- A proper interactive close control
- Background scroll locking
- An accessible relationship between the toggle and sidebar state

### Label the sidebar search explicitly

The search input in `Sidebar.tsx` relies on its placeholder. Add a real `<label>` or `aria-label="Search topics"`.

### Improve code-tab semantics

The language buttons in `CodeBlock.tsx` visually behave like tabs but do not expose tab semantics.

Use `role="tablist"`, `role="tab"`, `aria-selected`, keyboard arrow navigation, and an associated `tabpanel`, or consistently present them as ordinary pressed buttons.

### Handle clipboard failures

`CodeBlock.tsx` assumes clipboard access succeeds. It may fail in insecure contexts or when permission is denied. Catch failures and expose success or error feedback through an `aria-live` status.

### Respect reduced-motion preferences globally

`LruCacheVisual` checks reduced-motion preferences, but many Tailwind transitions still run throughout the interface. Add `motion-reduce:` variants or a global reduced-motion rule.

## Documentation and repository hygiene

### Rewrite the topic-authoring documentation

The README still instructs contributors to create flat files under `packages/content/src/` and register them in the old `allTopics` structure.

The actual project uses per-topic directories, `TopicDefinition`, catalog registries, availability, depth, tags, structured sections, and learning paths. The roadmap is also stale because many topics described as future work already exist as definitions.

### Add standard project metadata

Consider adding:

- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- A pull-request template
- Issue templates
- Architecture decision records for major migrations
- A supported Node and pnpm setup through `.nvmrc`, `.node-version`, or Volta

### Clarify the current functionality in the README

Document the distinction between:

- Fully available flagship lessons
- Available standard or reference lessons
- Coming-soon catalog entries
- Implemented versus planned code execution

At present, the phrase "hands-on coding practice" can imply executed code, while implementation challenges are primarily editable and revealable exercises.

## Product improvements

After the reliability work, useful product improvements include:

- Persist implementation drafts per challenge.
- Add reset, export, and import controls for progress.
- Show prerequisite completion status.
- Recommend the first incomplete topic rather than simply the next catalog entry.
- Add search keyboard shortcuts.
- Persist lesson reading position.
- Provide citations and "last verified" indicators for real-world technical claims.
- Add stronger completion feedback and a clear next-action flow.
- Introduce content quality states such as `draft`, `reviewed`, and `verified`.
- Add basic anonymous product analytics only with an explicit privacy policy.

## Recommended order of work

1. Fix progress-store subscriptions and mutable defaults.
2. Add runtime validation for persisted progress.
3. Add catalog integrity tests and CI.
4. Finish the `TopicDefinition` migration.
5. Update the README and contribution documentation.
6. Add component and Playwright coverage.
7. Address mobile navigation and code-block accessibility.
8. Expand learning features such as saved drafts and better recommendations.

The strongest aspect of the repository is its content-driven direction. The most important next step is making the catalog and progress store truly authoritative, validated, and reactive. That will give future content growth a much safer foundation.
