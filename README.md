# Engineering Playbook

An interactive learning platform for software engineering concepts, patterns, system design building blocks, and practical engineering techniques.

The product combines technical documentation, structured learning paths, progress tracking, hands-on challenges, and lightweight coding practice — all in a developer-focused interface.

---

## Product Vision

Engineering Playbook teaches concepts that matter in real systems: not just definitions, but *why* they exist, *when* to use them, and *how* to implement them. Every topic follows a consistent structure:

1. What problem does it solve?
2. How does it work? (with visual explanation)
3. Complexity
4. Tradeoffs
5. When to use / when not to use
6. Real-world examples
7. Code implementation (TypeScript, Python, Java)
8. Three challenges: conceptual, implementation, system design

Progress is tracked in localStorage and surfaced throughout the UI — sidebar indicators, progress bars, and a dashboard.

---

## MVP Topics

| Topic | Category |
|-------|----------|
| Bloom Filter | Data Structures |
| LRU Cache | Data Structures |
| Consistent Hashing | Distributed Systems |
| Rate Limiter | Backend / API |
| Idempotency | Backend / API |

---

## Project Structure

```
engineering-playbook/
├── apps/
│   └── web/                     # Next.js 14 frontend
│       └── src/
│           ├── app/             # Next.js App Router pages
│           ├── components/
│           │   ├── layout/      # AppShell, Topbar, Sidebar, Dashboard
│           │   ├── topic/       # TopicPage, CodeBlock, ComplexityTable, etc.
│           │   └── challenges/  # MultipleChoice, Implementation, SystemDesign
│           ├── hooks/           # useProgress, useLanguage
│           └── store/           # progressStore (localStorage abstraction)
│
├── packages/
│   ├── content/                 # All topic data (exported as allTopics)
│   │   └── src/
│   │       ├── bloom-filter.ts
│   │       ├── lru-cache.ts
│   │       ├── consistent-hashing.ts
│   │       ├── rate-limiter.ts
│   │       ├── idempotency.ts
│   │       └── index.ts
│   ├── content-schema/          # TypeScript types: Topic, Challenge, etc.
│   ├── shared-types/            # UserProgress, TopicProgress, TopicStatus
│   └── ui/                      # Shared components: Badge, ProgressRing
```

---

## Running Locally

**Prerequisites:** Node.js ≥ 20, pnpm ≥ 9

```bash
# Clone and install
git clone https://github.com/TalPeretzz/engineering-playbook.git
cd engineering-playbook
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type check all packages
pnpm typecheck
```

The app runs at `http://localhost:3000`.

---

## How to Add a New Topic

### 1. Create the topic file

Add a new file in `packages/content/src/`:

```ts
// packages/content/src/my-topic.ts
import type { Topic } from "@engineering-playbook/content-schema";

export const myTopic: Topic = {
  slug: "my-topic",
  title: "My Topic",
  description: "One-sentence description shown in the sidebar and dashboard.",
  category: "data-structures", // see TopicCategory in content-schema
  difficulty: "intermediate",
  estimatedMinutes: 20,
  prerequisites: ["bloom-filter"], // slugs of prerequisite topics
  nextTopics: ["lru-cache"],        // slugs of recommended next topics
  content: {
    problemStatement: "...",
    howItWorks: "...",
    visualExplanation: "ASCII diagram here",
    complexity: [
      { operation: "lookup", time: "O(1)", space: "O(n)" },
    ],
    tradeoffs: {
      pros: ["Fast", "Simple"],
      cons: ["No deletion"],
    },
    whenToUse: ["When X", "When Y"],
    whenNotToUse: ["When Z"],
    realWorldExamples: ["**Redis** — uses this for..."],
  },
  implementations: {
    typescript: `// TypeScript code here`,
    python: `# Python code here`,
    java: `// Java code here`,
  },
  challenges: [
    // see below
  ],
};
```

### 2. Register the topic

In `packages/content/src/index.ts`:

```ts
import { myTopic } from "./my-topic";

export { myTopic };

export const allTopics: Topic[] = [
  bloomFilter,
  lruCache,
  // ...
  myTopic, // add here
];
```

The topic will automatically appear in the sidebar, dashboard, and routing — no other changes needed.

---

## How to Add Code Examples

Each topic has an `implementations` field with optional entries per language:

```ts
implementations: {
  typescript: `// your TypeScript implementation`,
  python: `# your Python implementation`,
  java: `// your Java implementation`,
},
```

The active language is selected globally via the top bar language picker. The user's preference is stored in localStorage. If a language implementation is missing for a topic, it falls back to TypeScript.

---

## How to Add Challenges

Each topic has a `challenges` array. Three challenge types are supported:

### Multiple Choice (Conceptual)

```ts
{
  type: "multiple-choice",
  id: "my-topic-conceptual",  // must be globally unique
  question: "Which statement is true?",
  options: [
    { id: "a", text: "Option A" },
    { id: "b", text: "Option B" },
    { id: "c", text: "Option C" },
    { id: "d", text: "Option D" },
  ],
  correctOptionId: "b",
  explanation: "Explanation shown after answering.",
}
```

### Implementation Challenge

```ts
{
  type: "implementation",
  id: "my-topic-implementation",
  title: "Implement X",
  description: "Detailed task description...",
  starterCode: {
    typescript: `// starter code`,
    python: `# starter code`,
    java: `// starter code`,
  },
  hints: ["Hint 1", "Hint 2", "Hint 3"],
  solution: {
    typescript: `// full solution`,
    python: `# full solution`,
    java: `// full solution`,
  },
}
```

### System Design Challenge

```ts
{
  type: "system-design",
  id: "my-topic-system-design",
  title: "Design X at scale",
  scenario: "You are building... (multi-paragraph scenario)",
  hints: ["Hint 1", "Hint 2"],
  discussionPoints: [
    "**Point 1:** explanation",
    "**Point 2:** explanation",
  ],
}
```

---

## Architecture Notes

**Separation of concerns:**

- `content-schema` — pure TypeScript types, no runtime dependencies
- `content` — topic data, imports types from `content-schema`
- `shared-types` — user-facing types (progress, status)
- `web` — Next.js app, depends on all packages above
- `ui` — shared headless components (Badge, ProgressRing), no app-specific logic

**Progress store:**

`progressStore.ts` exposes a `createProgressStore(storage: Storage)` factory. The app uses it bound to `window.localStorage`. Tests pass an in-memory `Storage` implementation — no mocking required.

**No per-topic pages:**

There are no `BloomFilterPage.tsx`, `LRUCachePage.tsx` etc. The single `/topics/[slug]` route renders a generic `<TopicPage topic={topic} />` driven by content data.

**Language selection:**

The selected programming language is global state managed via React Context (`LanguageProvider`). It is persisted to localStorage and survives navigation between topics.

---

## Future Roadmap

The architecture is designed to support these additions without restructuring:

- **`apps/api`** — NestJS backend for auth, progress sync, and challenge submission
- **`apps/runner`** — Sandboxed code execution (e.g., via Deno, Firecracker, or a WASM sandbox)
- **Database** — PostgreSQL for user accounts and server-side progress
- **AI feedback** — Evaluate system design answers via an LLM API
- **More topics** — Trie, Heap, HyperLogLog, Circuit Breaker, Saga Pattern, etc.
- **Topic dependency graph** — Visual skill graph showing learning paths
- **Leaderboard / streaks** — Gamification layer
- **MDX content** — Migrate lesson prose to MDX for richer formatting

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 14, React 18, TypeScript strict |
| Styling | Tailwind CSS (dark mode) |
| Testing | Vitest |
| Type safety | Strongly typed content schema, discriminated union challenges |
