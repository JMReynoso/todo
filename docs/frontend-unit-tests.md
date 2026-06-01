# Frontend unit tests

Unit tests for the Next.js web app (`apps/web`), covering the
framework-agnostic logic and presentational components.

- **Runner:** [Vitest](https://vitest.dev/)
- **DOM:** [jsdom](https://github.com/jsdom/jsdom) via `@vitejs/plugin-react`
- **Component testing:** [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) + `@testing-library/jest-dom`
- **Coverage:** `@vitest/coverage-v8`
- **Location:** all tests live under `apps/web/test/`, mirroring the source tree
  (`test/_lib`, `test/_data`, `test/_hooks`, `test/_components/...`).

## What's covered

The suite focuses on the genuinely unit-testable units; stateful
view/detail/settings components are left to integration/e2e:

| Area | Examples |
|------|----------|
| `_lib/` helpers | date/urgency math, recurrence/“history” derivation, the `apiFetch` wrapper (headers, error-body parsing), id generation. |
| `_data/` | constants and seed data shape. |
| `_hooks/` | pure hooks such as `useIsMobile`, `useDismissable` (rendered with Testing Library). |
| `_components/atoms/` | presentational atoms (`Avatar`, `Pill`, `Toggle`, `Check`, `Icon`, …) — render + interaction. |

## Configuration

- **`vitest.config.ts`** — `jsdom` environment, global test APIs, the
  `test/**/*.{test,spec}.{ts,tsx}` include glob, the `@/` path alias (so tests
  import from `@/app/...` regardless of their folder), and a v8 coverage config
  whose `include` is scoped to the units above.
- **`vitest.setup.ts`** — registers `@testing-library/jest-dom` matchers,
  unmounts React trees between tests, and provides a minimal in-memory
  `localStorage` for jsdom.
- **Coverage gate:** 75% for **lines, branches, functions, and statements**
  (`thresholds` in `vitest.config.ts`). `vitest run --coverage` exits non-zero
  if any metric drops below 75%, so the gate is enforced in CI.

## Running

```bash
cd apps/web

pnpm test            # watch mode
pnpm test:run        # one-off run
pnpm test:coverage   # one-off run with coverage + thresholds (as CI runs it)
```

In CI this is the **Unit tests web** step of the **Build & Test** job — see the
[GitHub workflow](github-workflow.md) doc.

## Conventions

- **Import via the `@/` alias** (`@/app/_lib/dates`), never deep relative paths —
  tests stay valid if files move.
- **Keep tests next to the unit's mirror path** under `test/` (e.g.
  `app/_lib/dates.ts` → `test/_lib/dates.test.ts`).
- **Add to the coverage `include`** when introducing a new unit-tested module so
  the 75% gate stays meaningful.
