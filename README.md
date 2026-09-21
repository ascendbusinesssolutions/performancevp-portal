# PerformanceVP online subscription portal

The multi-tenant web application through which a client organisation measures its own business units with the Performance Equation, without a PerformanceVP analyst in the loop. It is the self-service product line; the consultant-led Diagnostic and Intervention Design do not use it.

**Proprietary.** This repository and everything in it, including the Performance Equation source documents in `docs/source-ip/` and the workbooks in `docs/benchmarks/`, are the confidential property of `IP_OWNER_ENTITY` (a named placeholder until the owning entity is confirmed; see Named placeholders below). All rights reserved. No licence is granted, every package is marked `UNLICENSED`, and nothing here is published.

## The documents

Read `CLAUDE.md` first. It is the operating instruction for anyone, human or agent, working in this repository. Then `PORTAL_BUILD_PLAN.md` (the approved plan of 21 September 2026), `DECISIONS.md` (the settled decisions and their reasoning) and `docs/ENGINE_SPEC.md` (the engine specification).

**This repository is the only home of those four documents.** From 21 September 2026 they are edited here and nowhere else. The Performance Equation source documents and the benchmark workbooks are the opposite case: they are mastered in the separate IP folder and are only ever copied in, never edited here. `docs/source-ip/README.md` and `docs/benchmarks/README.md` describe each snapshot and how it is refreshed.

## Layout

```
apps/portal/                The Next.js application (App Router, TypeScript strict, Tailwind)
packages/engine/            The calculation engine: pure, a mirror of the Diagnostic Workbook
packages/intake/            The intake package: pure, a mirror of the Survey Processing Workbook
packages/recommendations/   The recommendations package: pure functions of a stored run
supabase/                   Local stack configuration, migrations, seed and pgTAP tests
docs/source-ip/             Snapshot of the eleven source IP documents (read-only)
docs/benchmarks/            Snapshot of the three workbooks and the parity fixtures (read-only)
docs/ENGINE_SPEC.md         The engine specification
archive/                    The superseded first plan, for history only
.github/                    CI workflows and the shared setup action
```

Dependencies run one way: the engine depends on nothing; intake and recommendations depend on the engine only; the application depends on all three. The three packages perform no IO, and the application never computes a score or a suggestion (`PORTAL_BUILD_PLAN.md` 1.3).

## Getting started

Prerequisites: Node 24 or later, pnpm 11 (the exact version is pinned in `package.json` under `packageManager`), and Docker for the local Supabase stack. On this machine Docker runs through Colima.

```
pnpm install                       # dependencies, from the lockfile
cp apps/portal/.env.example apps/portal/.env.local
pnpm dev                           # the application on http://localhost:3000
pnpm db:start                      # the local Supabase stack, on the 55320 port range
```

Every check the CI runs, in one command: `pnpm check`.

| Script | What it does |
|---|---|
| `pnpm lint`, `pnpm format:check` | ESLint across the workspace; Prettier on code (Markdown and the snapshots are excluded) |
| `pnpm typecheck` | Every workspace; package source and package tests are checked separately |
| `pnpm test` | Each package's own Vitest suite. A package can also run its suite alone from its folder |
| `pnpm build` | `next build` of the application |
| `pnpm db:start`, `db:stop`, `db:reset`, `db:test`, `db:lint` | The local Supabase stack; `db:test` runs the pgTAP suite |

## Environment variables

The register is `apps/portal/.env.example`: every variable, its exposure (browser or server-only) and the milestone that first needs it. Only `APP_ENV` exists at Milestone 0. The application reads `APP_ENV` (`local`, `staging` or `production`) and never a hosting platform's own environment name. A variable is added to an environment only when the code that uses it exists.

## Version pins and why

Each pin below is deliberate and is revisited when its blocker clears, not before.

| Pin | Reason | Revisit when |
|---|---|---|
| TypeScript 6.0.3 | `typescript-eslint` supports TypeScript below 6.1 only. TypeScript 7 (the Go-based compiler) is current on npm. | `typescript-eslint` declares support for 7. |
| ESLint 9.39.5 | Three plugins bundled by `eslint-config-next` (`eslint-plugin-react`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`) accept ESLint 9 at most. npm marks the 9.x line deprecated now that 10 is current. | `eslint-config-next` moves its dependencies to ESLint 10. |
| Node 24 (`.nvmrc`, CI, Vercel) | Node 24 is the current LTS line; Node 26 is not yet LTS. `engines` accepts 24 and above, so a newer local Node works unchanged. | Node 26 enters LTS. |
| pnpm 11.25.0 (`packageManager`) | The version the workspace was built and verified with. pnpm 12 shipped after the plan was written and has not been evaluated. | Deliberately, with the lockfile regenerated and CI green. |

Next.js, React, Tailwind, Vitest and the Supabase CLI are pinned to exact versions for reproducibility and move on ordinary dependency updates.

## What keeps the packages pure

Three guards, each independent, all proven on a deliberately violating file at Milestone 0:

1. **Dependencies.** The engine declares none. Intake and recommendations declare the engine only. Under pnpm's strict linking an undeclared import cannot resolve.
2. **Compiler.** Package source compiles with `lib: ["es2023"]` and `types: []`, so `fs`, `process`, `fetch` and `window` fail to typecheck. `rootDir` refuses a relative import that escapes the package.
3. **Lint.** In `packages/*/src`: no Node built-ins, `next`, `react` or `@supabase/*`; no `Date.now()`, argument-free `new Date()` or `Math.random()`; no relative import into another package; the engine may import neither sibling; intake may import the engine as types only; recommendations may not import intake.

## CI and deployment

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`: `lint`, `typecheck`, `test (engine)`, `test (intake)`, `test (recommendations)` and `build`, as separately named checks. `.github/workflows/database.yml` starts Postgres alone, lints the schema and runs the pgTAP suite; it is path-filtered to `supabase/` until the first migration lands in Milestone 3, after which it runs always and becomes a required check. Actions are pinned to commit SHAs. No secrets are stored in GitHub.

Deployment is through Vercel's Git integration, not from Actions. The Vercel project's root directory is `apps/portal`; `main` deploys to the project's temporary `*.vercel.app` URL, which serves as staging until cutover to `app.performancevp.com.au`; pull requests get preview URLs. `apps/portal/vercel.json` sets the function region to Sydney. `GET /api/health` reports the environment, the commit and the three package versions.

## Named placeholders

Consequential decisions not yet settled are held as named placeholders rather than guessed (`CLAUDE.md` Section 10). Each is resolved deliberately by Michael.

| Placeholder | What it holds | Needed by |
|---|---|---|
| `IP_OWNER_ENTITY` | Which entity owns the Performance Equation IP and this repository. Written confirmation is a dependency before the first paying client (`DECISIONS.md` Section 4, item 5). | Launch |
| `VERCEL_ENV_SPLIT` | How staging and production are arranged on Vercel once both exist: a custom environment on one project, or a long-lived `staging` branch with branch-scoped variables. The application reads `APP_ENV`, so the choice does not touch code. | Milestone 10 |
| `ERROR_TRACKING_PROVIDER` | Which error-tracking service the portal uses. The plan asks for error tracking from day one; error payloads can carry personal data, so the provider and its data handling are chosen with care, not by default. Vercel's runtime logs serve the scaffold. | Milestone 10 |

`ENTITLEMENT_ENFORCEMENT`, the commercial rule for headcount against plan band, is held in `PORTAL_BUILD_PLAN.md` Section 11.

## Conventions

TypeScript strict throughout. Constants and weights in one sourced location, never duplicated. All copy and documentation in executive prose: no em dashes, no AI-flavoured language, limitations stated honestly (`CLAUDE.md` Sections 9 and 10).
