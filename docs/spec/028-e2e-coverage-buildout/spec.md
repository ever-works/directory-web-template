# Spec 028 — End-to-end coverage buildout (continuous)

**Status:** in-progress (rolling — new specs land hourly via scheduled session)
**Owner:** automated agent session, running on the operator's bot
**Started:** 2026-05-19

## What

Spec 010 (E2E test coverage) added the initial Playwright surface and the
`apps/web-e2e/` infrastructure. As of this spec, the repository has
**311** `.spec.ts` files but **no GitHub Actions workflow that runs
them** — they exist but are not protecting any commit.

This spec covers two parallel workstreams:

1. **Run the existing 311 specs in CI.** Add a sharded, postgres-backed
   GitHub Actions workflow at `.github/workflows/e2e.yml` that runs the
   Playwright suite on every push to `main`/`develop`/`stage` and every
   PR targeting those. Four shards in parallel keep the wall-clock
   under the lint+build job's ~5 min budget.
2. **Fill coverage gaps continuously.** A scheduled CCDB task re-spawns
   this agent every hour. Each invocation:
   - Inventories existing specs vs. `apps/web/app/[locale]/**/page.tsx`
     and `apps/web/app/api/**/route.ts`.
   - Picks the highest-impact gap not yet covered.
   - Adds one or more `.spec.ts` files following the existing patterns
     (public selectors, `data-testid` over copy, multi-state tolerance,
     `test.skip` for environment-dependent fixtures).
   - Commits, pushes, opens a PR, merges (admin), cascades to stage and
     main so demo.ever.works picks it up.

## Why

- The bug that motivated Spec 027 (post-register redirect-to-signin)
  was a production-only regression that would have been caught by an
  e2e run against any reasonably-realistic build environment. The
  suite that would have caught it already existed locally — it just
  wasn't running in CI.
- Manual operator triage costs ~30 minutes per "is it deployed yet"
  cycle. Wall-clock cost of adding the workflow is bounded
  (~10 min CI per push); recurring agent cost is bounded by the 1-hour
  cadence and is reverted instantly if it starts producing flakes.

## Initial deliverables (this PR)

- `.github/workflows/e2e.yml` — Postgres service, build, run Playwright
  sharded 4-ways across chromium, upload HTML report + traces.
- `apps/web-e2e/tests/client/followers-following.spec.ts` —
  `/client/profile/[username]/followers` and `/following`. Reads
  username from the dashboard's "View Profile" link so it works for
  any seeded admin / client.
- `apps/web-e2e/tests/client/settings-subroutes.spec.ts` — matrix of
  every `/client/settings/profile/*` and `/client/settings/security`
  sub-page; asserts non-5xx + heading + no signin-bounce for the
  authenticated client; asserts signin-bounce for anonymous.
- `apps/web-e2e/tests/public/route-coverage-matrix.spec.ts` — full
  walk of public pages with a "no 5xx ever" assertion. Catches the
  whole class of "broke a server fetch in a way TypeScript can't see"
  regressions.
- `apps/web-e2e/tests/api/public-api-coverage-matrix.spec.ts` —
  same idea for API routes: public ones respond JSON, protected ones
  reject anonymous with 401/403/404 (not 500, not 200).
- This spec + a `docs/log.md` entry.

## What each subsequent hourly run does

The recurring CCDB task fires this session every hour. The prompt
(passed verbatim each fire) is reproduced below — keep it
self-contained so the new session can pick up cold:

> You are picking up Spec 028 (e2e coverage buildout) in the Ever Works
> Template repo at `C:/Coding/Ever Works/Code/directory-web-template`.
> The spec is at `docs/spec/028-e2e-coverage-buildout/spec.md`.
> Inventory existing specs (`apps/web-e2e/tests/**/*.spec.ts`) and
> compare against the page tree (`apps/web/app/[locale]/**/page.tsx`)
> and API tree (`apps/web/app/api/**/route.ts`). Pick ONE significant
> gap, add tests for it on a fresh `feat/e2e-coverage-<timestamp>`
> branch off `develop`, push, open a PR, admin-merge it, then cascade
> develop→stage→main so the next deploy picks it up. Log a one-line
> entry in `docs/log.md` summarizing what you added. Use only public
> selectors, tolerate empty fixture data, skip gracefully on missing
> env. Don't ask questions, just proceed. Re-schedule yourself for the
> next hour via the same CCDB task; the schedule already exists.

## Verification

- CI status icon on this PR goes green once the workflow runs (first
  shard is slowest because of Playwright browser cache miss).
- Each subsequent hourly PR has its own CI run; we accept the PR
  iff CI passes.
- Drift watch: after 24 hourly iterations, manually review the
  delta. If the agent has spent multiple cycles on the same shrinking
  gap, mark this spec **shipped** and stop the schedule.

## Rollback

- Workflow: delete `.github/workflows/e2e.yml`. No code dependency.
- Hourly schedule: `DELETE $CCDB_API_URL/api/tasks/{id}` or post
  `?one_shot=true` with a huge `interval_seconds` to effectively pause.
- New specs: revert individual PRs; they're isolated.
