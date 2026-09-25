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
| `pnpm copy` | The copy check: the copy lint over every string in `apps/portal/lib/copy`, every template fixture and the three Supabase Auth email templates |
| `pnpm build` | `next build` of the application |
| `pnpm db:start`, `db:stop`, `db:reset`, `db:test`, `db:lint` | The local Supabase stack; `db:test` runs the pgTAP suite |
| `pnpm db:types` | Regenerates `apps/portal/lib/supabase/database.types.ts` from the local database; CI fails if the committed file differs |
| `pnpm --filter @performancevp/portal e2e` | The Playwright suite against the local stack. Run `pnpm build` first; it starts `next start` itself, or reuses a server already on port 3000. `e2e/setup.spec.ts` is the Milestone 4 exit criterion and `e2e/measurement-units.spec.ts` the Milestone 4b one, sharing `e2e/setup-helpers.ts`; set `E2E_SHOT_DIR` to a folder to keep their screenshots |

## Environment variables

The register is `apps/portal/.env.example`: every variable, its exposure (browser or server-only) and the milestone that first needs it. The application reads `APP_ENV` (`local`, `staging` or `production`) and never a hosting platform's own environment name. A variable is added to an environment only when the code that uses it exists.

Milestone 3 adds five, all server-only, since every Supabase call is made on the server and nothing takes the `NEXT_PUBLIC_` prefix: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `APP_BASE_URL` and `CRON_SECRET`. The local values are the Supabase CLI's fixed local keys (`pnpm exec supabase status`) and any long random `CRON_SECRET`, in `apps/portal/.env.local`, which is git-ignored and never committed.

## Keys

The portal uses Supabase's publishable and secret keys; the legacy anon and service-role keys are not used. Requests made with the publishable key run as the signed-in person, under row level security, and that is how every page and server action reaches the database. The secret key acts as the service role and bypasses row level security. It is read only in `apps/portal/lib/supabase/admin.ts`, behind a `server-only` guard, and only three purposes use it: directory files (the upload route stores a file and stages it for the person who uploaded it, and applying or discarding an upload removes its file), the daily job, and sending invitations. The service role holds no grant on the anonymous response tables.

## Sign-in

Account owners, administrators, viewers and PerformanceVP staff sign in with a password: at least 12 characters with upper and lower case letters and digits, and a password change needs a recent sign-in. The Owner, support staff, account owners and administrators must enrol a TOTP authenticator and complete it at every sign-in; anyone else who enrols one is challenged too. Managers who rate their direct reports sign in with a six-digit code sent by email and never have a password. The database is the authority on all of this: a session opened by email code counts only for the manager role, and a role that needs TOTP counts only at `aal2`. `apps/portal/proxy.ts` sends people to the right step first, and sets the content security policy with a fresh nonce on every request.

Public sign-up is off. People join by invitation, from the PerformanceVP console (an account owner, when an organisation is provisioned) or from the account owner's access page. Supabase has one expiry for email codes and email links, set to one hour (decided 23 September 2026), so an invitation or password link must be used within the hour and a manager's code lasts as long. An expired or used link lands on `/auth/new-link`, "Send me a new link", which the invitation email and the sign-in page also point to. It answers the same whatever the address. After the answer is sent, `public.new_link_kind` (service role only) decides whether to send the invitation again (it was never taken up), a password link (a confirmed account with a role that signs in with a password), or nothing (an unknown address, a manager, or a repeat within 60 seconds or beyond five an hour for one account, counted by account and never by address).

## Scheduled jobs

One route, `GET /api/jobs/daily`, runs every scheduled job. Vercel Cron calls it daily at 17:00 UTC (03:00 in Sydney in winter, 04:00 in summer) with `CRON_SECRET` as a bearer token, and the route refuses any other caller. It expires directory uploads left undecided for 7 days, removes the files of decided uploads from storage, purges directory records deactivated 30 or more days earlier, and records each run in the audit log as `job.daily_completed`, so a missed run shows as a gap. Later milestones add their jobs to the same route. Vercel's Hobby plan allows daily cron only; the campaign engine in Milestone 5 will need more frequent runs.

## Measurement units

The directory keeps a client's units as their HRIS holds them; campaigns measure measurement units, laid over them (Online Measurement Specification 6.2; migration `20260923001000_measurement_units.sql`). Every org unit has a single measurement unit, created with it by trigger, that carries its code and follows its name and status. An administrator combines a unit under 10 with others in its branch on the units screen, and the combination, coded with its units' codes joined by `+`, holds them until it is undone. Unit context and `campaign_units` key on measurement units, and so will results, suggestions and trends from Milestone 6; nothing later reads an org unit where it means what is measured. `apps/portal/lib/setup/measurement.ts` holds the model the readiness check and the setup screens share: each measurement unit's state, the candidates a unit under 10 could combine with, whether a combination's units still share a branch, and where its leader comes from. The database holds tenancy, exclusive membership and the rule that nothing a campaign has measured is changed.

## The database suite

`supabase/tests/database` holds the pgTAP suite: 21 files and 334 assertions at Milestone 3, 24 files and 384 at Milestone 4, 25 files and 437 at Milestone 4b. It proves the access matrix of `PORTAL_BUILD_PLAN.md` Section 3.3 across two seeded organisations, including that no role can read anonymous responses and that executive and unit viewers cannot read ratings. Two include files carry the shared machinery: `helpers/tests.psql` (personas, `tests.authenticate_as`, and data-driven matrix runners) and `helpers/fixture.psql` (the two organisations, their directories, campaigns, responses and ratings). Each test file includes them with `\ir` inside its own transaction and rolls back, so nothing persists. `02_privileges` holds the exact list of grants; a new table or function without its grant line fails there.

## Local personas

`supabase/seed.sql` creates one organisation, Local Demo Organisation, with three units, eleven people and a persona for each role. Every persona except the manager signs in with the password `Portal-local-2026`.

| Email | Role |
|---|---|
| `owner@pvp.local` | The PerformanceVP Owner |
| `support@pvp.local` | PerformanceVP support staff |
| `ao@local.test` | Account owner |
| `admin@local.test` | Administrator |
| `exec@local.test` | Executive viewer |
| `uv@local.test` | Unit viewer (Operations) |
| `mgr@local.test` | Manager; signs in with a code, not the password |

The first four enrol TOTP at their first sign-in. Local email, including sign-in codes and invitation links, appears in Mailpit at http://127.0.0.1:55324.

## The staging database

Staging is the Supabase project `xmvpinejfzvmofjsxbdh` in Sydney. Migrations reach it through the link, with `pnpm exec supabase link --project-ref xmvpinejfzvmofjsxbdh` and then `pnpm exec supabase db push`. The pgTAP suite reaches it through the session pooler instead:

```
export SESSION_POOLER='postgresql://postgres.xmvpinejfzvmofjsxbdh:<password, URL-encoded>@<session pooler host>:5432/postgres'
pnpm exec supabase test db --db-url "$SESSION_POOLER"
```

The reason is the network, not the suite. `supabase test db` runs its test runner in a container. The direct database host, `db.<ref>.supabase.co`, is IPv6-only, and the Colima containers on this machine cannot resolve it, so `--linked` fails. The session pooler is reachable over IPv4 and works. Its URI is under Connect, Session pooler, in the Supabase dashboard, and its user is `postgres.<ref>`, not `postgres`. Each test file rolls back, so a run leaves nothing on staging. The suite passed there with 21 files and 334 assertions on 23 September 2026.

`SESSION_POOLER` is the documented path for every remote database command: use `--db-url "$SESSION_POOLER"` wherever a command would otherwise use `--linked`. `db push` works through the link today. If it ever fails the same way, run `pnpm exec supabase db push --db-url "$SESSION_POOLER"`.

The URI carries the database password. It is set in the shell for the session only, and never written to a file in the repository or committed. URL-encode the password (`@` as `%40`, `:` as `%3A`, `/` as `%2F`, `#` as `%23`, `%` as `%25`), and keep the whole URI in single quotes so zsh does not expand `$` or `!` inside it. An `export` typed at the prompt is kept in the shell history; start the line with a space when `HIST_IGNORE_SPACE` is set, or remove the entry afterwards.

The staging Security Advisor reports two expected warning types, and neither needs action: the SECURITY DEFINER functions that signed-in users can call (26 at Milestone 3), which by design are the checked, audited route for every action a row policy cannot express, and leaked-password protection being off, which Supabase offers on the Pro plan only.

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

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`: `lint`, `typecheck`, `copy`, `test (engine)`, `test (intake)`, `test (recommendations)`, `test (portal)`, `build` and `e2e`, as separately named checks. The `e2e` job starts the local Supabase stack from the migrations and the dev seed, builds the application and runs the Playwright suite against it. `.github/workflows/database.yml` runs always: it starts Postgres alone, lints the schema, runs the pgTAP suite and checks that the committed generated types match the migrations. `database`, `copy`, `test (portal)` and `e2e` are to be required checks on `main`. Actions are pinned to commit SHAs. No secrets are stored in GitHub.

Deployment is through Vercel's Git integration, not from Actions. The Vercel project's root directory is `apps/portal`; `main` deploys to the project's temporary `*.vercel.app` URL, which serves as staging until cutover to `app.performancevp.com.au`; pull requests get preview URLs. `apps/portal/vercel.json` sets the function region to Sydney. `GET /api/health` reports the environment, the commit and the three package versions.

The fonts are self-hosted, so the build makes no network call: Spectral, IBM Plex Sans and IBM Plex Mono load through `next/font/local` from `apps/portal/app/fonts`, latin subset, each family with its OFL licence beside its files. Fetching them from Google at build time failed on Vercel.

## Named placeholders

Consequential decisions not yet settled are held as named placeholders rather than guessed (`CLAUDE.md` Section 10). Each is resolved deliberately by Michael.

| Placeholder | What it holds | Needed by |
|---|---|---|
| `IP_OWNER_ENTITY` | Which entity owns the Performance Equation IP and this repository. Written confirmation is a dependency before the first paying client (`DECISIONS.md` Section 4, item 5). | Launch |
| `VERCEL_ENV_SPLIT` | How staging and production are arranged on Vercel once both exist: a custom environment on one project, or a long-lived `staging` branch with branch-scoped variables. The application reads `APP_ENV`, so the choice does not touch code. | Milestone 10 |
| `ERROR_TRACKING_PROVIDER` | Which error-tracking service the portal uses. The plan asks for error tracking from day one; error payloads can carry personal data, so the provider and its data handling are chosen with care, not by default. Vercel's runtime logs serve the scaffold. | Milestone 10 |

| `EMPLOYEE_BANDS` | The subscription bands and the most employees each allows. `ref_employee_bands` is created empty; the dev seed and the test fixture carry test bands, and staging needs one clearly labelled test band before an organisation can be provisioned. | First client |
| `SESSION_LIMITS` | The inactivity and absolute session timeouts, recommended at 8 and 24 hours. Hosted Supabase sets them on the Pro plan only. | Staging on Pro |
| `ROLE_FAMILY_TEMPLATE_LIBRARY` | The starter content the unit-context screens offer: role-family skill frameworks, decision-type starter lists by unit type, and prompts for knowledge domains, processes and systems (Online Measurement Specification 4.5). `ref_templates` is seeded with placeholder content, every row flagged `is_placeholder`, until the library is written. | First client |
| `EMPLOYMENT_STATUS_VALUES` | The values of the directory's employment status field. Online Measurement Specification 6.1 names the field without defining them, so it is held as free text for information only and used by no rule. | Before any rule depends on it |

`ENTITLEMENT_ENFORCEMENT`, the commercial rule for headcount against plan band, is held in `PORTAL_BUILD_PLAN.md` Section 11. The directory preview shows the active headcount against the band and does nothing more until it is settled.

## Conventions

TypeScript strict throughout. Constants and weights in one sourced location, never duplicated. All copy and documentation in executive prose: no em dashes, no AI-flavoured language, limitations stated honestly (`CLAUDE.md` Sections 9 and 10).
