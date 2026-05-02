---
id: spec-018-performance-budget
title: 'Spec 018 — Performance Budget Enforcement'
sidebar_label: '018 Performance Budget'
---

# Feature spec — `018-performance-budget`

> **Status:** Proposed.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code), IV
> (Documentation First-Class), V (Performance Budget), IX (Test
> Coverage Bar).
>
> **Depends on:**
> [Spec 010 — E2E Test Coverage](../010-e2e-test-coverage/spec.md)
> for the existing Playwright + CI scaffolding.

## 1. Summary

Article V of the [constitution](../../../.specify/memory/constitution.md)
sets **best-in-class Core Web Vitals** as a non-negotiable requirement
for the template's public surface (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤
0.1, public first-load JS ≤ 250 KB gzip per route). Today these
numbers are aspirational — there is no automated CI gate that fails a
PR when a regression slips in.

This spec converts Article V into a measurable, enforceable contract:

- Every public route declares a **JS bundle budget** in a single
  `performance/budgets.json` file, and CI fails when a route exceeds
  it.
- A scheduled **Lighthouse CI** run (manually triggerable on PRs)
  reports LCP / INP / CLS for the canonical `/`, `/discover/1`, an
  item-detail page, `/map`, and a typical admin list page.
- A `pnpm perf:report` script aggregates current bundle stats so
  contributors can see the budget margin locally before pushing.

The deliverable is **measurement plumbing + CI gates + an operator
docs page**, not optimisation work. Optimisation lands as separate
specs whenever a route exceeds its budget.

## 2. Motivation

- Article V is a constitutional principle but lives only in prose. A
  rule that nothing measures degrades silently as features ship.
- Forks of the template inherit our performance posture — when a
  popular route on the upstream develops a regression, every
  downstream user pays for it. CI gating is the cheapest way to keep
  the public surface fast across many forks.
- Plugins (Spec 002) will inevitably ship UI components that cross
  the bundle boundary. A pre-merge size gate gives plugin authors an
  immediate "you went over" signal instead of waiting for a release
  to discover it via Lighthouse on production.
- The map view (Spec 017) and analytics events (Spec 016) already
  required ad-hoc bundle reasoning. Codifying the budget makes that
  reasoning a routine code-review step.

Primary users:

- **Template maintainers** reviewing PRs that touch public routes.
- **Plugin authors** publishing first-load-affecting code.
- **Fork maintainers** running a forked CI pipeline who want the same
  guard rails the upstream relies on.

## 3. Goals

- G-1: Codify the per-route JS bundle budget in a single declarative
  file (`performance/budgets.json`) at the monorepo root.
- G-2: Add a `pnpm perf:bundle` script that reads the Next.js build
  manifest, computes first-load JS per route, compares it to the
  budget, and fails with a clear, route-level diff when any route is
  over.
- G-3: Wire `perf:bundle` into the existing Web CI workflow so it
  blocks merges to `develop` / `main` when a budget is breached.
- G-4: Add a Lighthouse CI configuration (`lighthouserc.cjs`) with
  thresholds matching Article V (LCP ≤ 2500 ms, INP ≤ 200 ms,
  CLS ≤ 0.1). The Lighthouse job runs nightly on `develop` and on
  PRs labelled `perf-check`.
- G-5: Produce a human-readable performance dashboard page
  (`docs/architecture/performance-budgets.md`) that lists the current
  budget per route, links the canonical CI run, and explains how to
  raise a budget (it requires a spec under
  `docs/spec/NNN-perf-budget-bump-…/`).
- G-6: Re-use the existing GitHub Actions cache + Turborepo remote
  cache so the new perf step adds < 60 s to CI on the cached path.

## 4. Non-Goals

- We do not micro-optimise existing code in this spec. If a route
  exceeds the budget at the moment we land the gate, we either raise
  the budget (with a justification commit) or open a follow-up spec.
- We do not introduce a new framework (e.g. WebPageTest, Calibre).
  Lighthouse CI + `next build` output is enough for v1.
- We do not measure SSR latency or backend perf in this spec — that
  is a separate observability concern.
- We do not add real-user monitoring (RUM). Posthog Web Vitals
  reporting is already wired up; consuming those numbers in a
  dashboard belongs in a future analytics spec.

## 5. User Stories

```text
As a template maintainer reviewing a PR that adds a heavy chart
library to the public listing, I want CI to fail with "discover/[page]
went from 218 KB to 271 KB (over the 250 KB budget by 21 KB)" so I
can ask the contributor to lazy-load the chart before I approve.

As a plugin author shipping a new homepage hero, I want to run
`pnpm perf:bundle` locally and see whether my plugin's slot
contribution pushes the home route over budget.

As a fork maintainer onboarding the template, I want one obvious
file (`performance/budgets.json`) where I can see and bump every
route budget, instead of reading scattered comments in code.

As a CI operator, I want the Lighthouse CI run to upload its report
artefact so I can drill into a regression without rerunning the job.
```

## 6. Acceptance Criteria

- [ ] AC-1: `performance/budgets.json` exists at the monorepo root
  and lists every public route under `apps/web/app/[locale]/**` with
  a `gzipKb` first-load-JS budget. Routes whose budget defaults to
  the global 250 KB may be omitted.
- [ ] AC-2: `pnpm perf:bundle` (added at the monorepo root) runs
  after `pnpm build` and exits non-zero when any route exceeds its
  budget. Output is human-readable and includes a per-route diff
  table.
- [ ] AC-3: The existing Web CI workflow gains a `Performance
  Budget` job that runs `pnpm build` + `pnpm perf:bundle` on every
  push to `develop`/`main` and on every PR. The job fails the
  pipeline when budgets are exceeded.
- [ ] AC-4: A `lighthouserc.cjs` file exists with thresholds matching
  Article V. A new GitHub Actions workflow (`.github/workflows/lhci.yml`)
  runs Lighthouse CI nightly on `develop` and on PRs labelled
  `perf-check`. The workflow uploads the LHCI report as an artefact.
- [ ] AC-5: `docs/architecture/performance-budgets.md` exists and
  contains: the budget table, a "How to bump a budget" subsection
  pointing at Article V's amendment rule, and a worked example of
  reading a `pnpm perf:bundle` failure.
- [ ] AC-6: Running `pnpm perf:bundle` on a clean `develop` build is
  green. (We do not introduce a regression to bring this spec in.)
- [ ] AC-7: The CI job names and required-status-checks are
  documented under `docs/development/ci.md` so fork maintainers know
  which checks must pass.
- [ ] AC-8: Playwright e2e coverage:
  - one smoke spec asserts that running `node ./scripts/perf-bundle.cjs
    --dry-run` exits 0 (so we catch regressions to the script
    itself), or
  - if a Node-level smoke spec is overkill, document the manual
    verification recipe in the plan and ship without e2e coverage
    for the script (Article IX permits this for build tooling).

## 7. Out-of-Scope Considerations

- Per-locale budgets. Locale switching does not meaningfully change
  first-load JS, so a single budget per route applies to every
  locale.
- A11y CI gates. Accessibility metrics are tracked separately under
  the existing `.claude/skills/accessibility/` workflow and a future
  Spec 020 (proposed under `docs/spec/`).
- Backend latency budgets. Service-level objectives are tracked in
  observability tooling, not in this spec.
- Public CDN cache hit ratios. Out of scope; can ship as a follow-up
  spec when we have a CDN to instrument.

## 8. UX Notes

This is a maintainer-facing spec; there is no end-user UI. The user
experience surfaces are:

- **`pnpm perf:bundle` output.** Single-screen table with one row
  per route, columns: `route`, `current (kB)`, `budget (kB)`, `Δ`,
  `status`. Status is `OK` (green), `WARN` (within 5 % of budget,
  yellow), or `FAIL` (over, red). Sort by `Δ` descending so the
  worst offenders surface first.
- **CI logs.** Failure mode prints the same table plus a one-line
  summary `Performance budget exceeded for N route(s)` so the
  failing job summary is grep-able.
- **Lighthouse CI artefact.** Linked from the failing PR check
  description; opens the standard LHCI HTML report.
- **Docs page.** Tableau-style listing of every route + its budget
  + last measured value, refreshed on every push to `develop`.

## 9. Data & API Surface

No new database tables or API routes. The spec adds:

- `performance/budgets.json` — declarative budget table.
- `scripts/perf-bundle.cjs` (or `.ts`) — Node script that reads
  `apps/web/.next/build-manifest.json` + the `App-Build-Manifest`
  and computes first-load JS per route.
- `lighthouserc.cjs` — Lighthouse CI config.
- `.github/workflows/perf-budget.yml` job (or a new step in the
  existing `web-ci.yml`).
- `.github/workflows/lhci.yml` — separate workflow for Lighthouse.

## 10. Plugin / Adapter Impact

Plugins that contribute UI to public routes (e.g. `header.right`,
`item.detail.sidebar` slots from Spec 002) inherit the same per-route
budget through their host route. The plugin SDK does not enforce a
per-plugin budget in v1; we treat plugin contributions as part of
their host route's budget and rely on `perf:bundle` to catch
regressions when a plugin is enabled in CI.

A future iteration may attribute KB-per-plugin in the report, but
that needs the plugin runtime (Spec 002 Phase B) to be wired up
first.

## 11. Risks & Open Questions

- **Risk:** flaky Lighthouse runs (network jitter, cold cache). We
  use the `lhci` `numberOfRuns: 3` median to smooth this out and
  treat "yellow" verdicts as warnings, not failures.
- **Risk:** false-positive bundle bloat from Next.js framework
  upgrades — when a Next.js minor bump shifts shared chunks, every
  route's first-load JS moves. Mitigation: the budget file allows a
  `framework_overhead_kb` global offset that bumps when Next.js
  upgrades land. Bumping it is a one-line change documented in the
  upgrade plan.
- **Risk:** plugin authors getting blocked because their plugin
  pushes a host route over budget. Mitigation: in the docs we point
  authors at lazy-loading patterns (Vercel best-practices skill +
  `next/dynamic`).
- **Open question Q-018a:** Should we run Lighthouse on every PR,
  not just labelled ones? **Default chosen:** labelled-only, to
  contain CI cost. Recorded in
  [`docs/questions.md`](../../questions.md).
- **Open question Q-018b:** Where does the perf budget file live —
  monorepo root or `apps/web/`? **Default chosen:** monorepo root,
  so future apps under `apps/**` can reuse the same enforcement
  script. Recorded in `docs/questions.md`.

## 12. Acceptance Test Plan

- **Unit-ish check:** a tiny Node test asserts that
  `scripts/perf-bundle.cjs --check` parses the budget file and the
  manifest without throwing. Lives in `apps/web/scripts/__tests__/`
  if we adopt Vitest, otherwise it's a `node --experimental-vm-modules`
  run from the perf-budget workflow.
- **Manual recipe:**
  1. `pnpm install`, `pnpm build` from monorepo root.
  2. `pnpm perf:bundle` exits 0 on a clean `develop`.
  3. Add a 300 KB dummy import to `apps/web/app/[locale]/page.tsx`,
     rebuild, rerun — it must fail with the home route over budget.
  4. Push to a PR, confirm CI red.
  5. Revert dummy, rerun, confirm CI green.

## 13. References

- Constitution Article V — [Performance Budget](../../../.specify/memory/constitution.md#article-v--performance-budget).
- Spec 010 — [E2E Test Coverage](../010-e2e-test-coverage/spec.md).
- Spec 002 — [Plugin Architecture](../002-plugin-architecture/spec.md).
- Vercel React Best Practices — `bundle-*` rules under
  `.claude/skills/vercel-react-best-practices/rules/`.
- Lighthouse CI docs: <https://github.com/GoogleChrome/lighthouse-ci>.
