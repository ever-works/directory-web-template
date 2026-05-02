---
id: tasks-018-performance-budget
title: 'Tasks 018 — Performance Budget Enforcement'
sidebar_label: '018 Performance Budget Tasks'
---

# Tasks — `018-performance-budget`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions:

- `[P]` — can run in parallel with other `[P]` tasks.
- `[seq]` — must be done after the previous numbered task.
- Each task ends with a **Verification** line.
- Tasks are grouped by the two PRs described in the plan
  (Track 1 + 3 = "Bundle gate", Track 2 = "Lighthouse CI").

## Track 1 + 3 — Bundle budget gate (PR 1)

### T-001 [P] — Inventory current first-load JS per route

- Files: scratch / report only.
- Steps:
  1. Run `pnpm install`, `pnpm build` from the monorepo root.
  2. Inspect `apps/web/.next/build-manifest.json` and the per-page
     entry points to compute the gzipped first-load JS for every
     public route under `apps/web/app/[locale]/**`.
  3. Capture the table in a scratch file (do not commit) so T-002
     can use the numbers as starting budgets.
- Verification: a table with one row per route exists and matches the
  numbers reported by `pnpm next build` Output Routes summary
  (Vercel-style table).

### T-002 [seq after T-001] — Add `performance/budgets.json`

- Files: `performance/budgets.json` (new).
- Steps:
  1. Create the file with one entry per public route from T-001.
  2. Set each entry's `gzipKb` to the measured first-load JS from
     T-001 plus a 10 % padding rounded to the nearest 5 KB, capped
     at the constitution's 250 KB limit.
  3. Set a top-level `framework_overhead_kb` field that documents
     today's Next.js shared-chunk weight.
  4. Add a JSON schema header (`$schema`) pointing at a colocated
     `performance/budgets.schema.json` so editors can auto-complete.
- Verification: `node -e "JSON.parse(require('fs').readFileSync('performance/budgets.json', 'utf8'))"`
  exits 0.

### T-003 [seq after T-002] — Add `scripts/perf-bundle.cjs`

- Files: `scripts/perf-bundle.cjs` (new).
- Steps:
  1. Read `apps/web/.next/build-manifest.json` and resolve the
     gzipped size of each page's chunks via `zlib.gzipSync` over the
     concatenated bytes.
  2. Match each chunk set to a route key in `performance/budgets.json`
     (route keys mirror Next.js `page` keys minus the `[locale]`
     prefix).
  3. Print a fixed-width table with columns: `route`, `current (KB)`,
     `budget (KB)`, `Δ`, `status`. Sort by `Δ` descending.
  4. Exit `0` when every route is at or under budget. Exit `1`
     otherwise. Print a one-line summary `Performance budget
     exceeded for N route(s)` on failure.
  5. Accept `--help`, `--check` (parse-only), `--json` (emit JSON
     instead of the table) flags.
- Verification: running the script on a clean `develop` build prints
  the table and exits 0.

### T-004 [seq after T-003] — Wire script into the Web CI workflow

- Files: `.github/workflows/web-ci.yml`.
- Steps:
  1. Add a job step `Performance Budget` that runs after the
     existing build step and executes
     `pnpm exec node scripts/perf-bundle.cjs`.
  2. Mark the step with `if: ${{ github.event_name == 'pull_request' || github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/main' }}`
     so it skips for Dependabot scheduled reruns until the soak
     window ends.
  3. After two weeks of soak, flip `continue-on-error: true` to
     `false` in a follow-up PR (one-line change).
- Verification: open a PR that intentionally breaks the home-route
  budget; the new step turns red. Revert; turns green again.

### T-005 [P] — Add `pnpm perf:bundle` script alias

- Files: `package.json` (root).
- Steps:
  1. Add `"perf:bundle": "node scripts/perf-bundle.cjs"` to
     `package.json#scripts`.
  2. Add a brief one-line description to the `README.md` "Common
     Scripts" section.
- Verification: `pnpm perf:bundle --help` exits 0.

### T-006 [P] — Author the dashboard docs page

- Files:
  - `docs/architecture/performance-budgets.md` (new).
  - `docs/index.md` (modify — link the new page).
- Steps:
  1. Create the page with three sections: "Why we have a budget",
     "Current budget table" (auto-generated note pointing at
     `performance/budgets.json`), and "How to bump a budget"
     (referencing Article V's amendment requirement).
  2. Add a worked example of reading a `pnpm perf:bundle`
     failure output.
  3. Cross-link the page from `docs/index.md` and from each spec
     that touches public-route bundles (Spec 016, Spec 017).
- Verification: `pnpm lint` passes; no broken links; the page
  renders in the local Docusaurus dev server.

### T-007 [P] — Document the new CI step

- Files: `docs/development/ci.md` (modify or create).
- Steps:
  1. Add a "Performance Budget" subsection listing the workflow
     name, the script invoked, the failure mode, and the link to
     the dashboard page from T-006.
  2. Note the soak-window plan and which date the gate becomes
     blocking.
- Verification: `pnpm lint` passes.

### T-008 [seq after T-002..T-007] — Verification & ship PR 1

- Files: this `tasks.md`.
- Steps:
  1. `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build`.
  2. `pnpm perf:bundle` on a clean `develop` build exits 0.
  3. Append a `docs/log.md` line.
  4. Tick T-001..T-007 above.
- Verification: CI green; PR description links spec, plan, tasks.

## Track 2 — Lighthouse CI (PR 2)

### T-009 [P] — Add `lighthouserc.cjs`

- Files: `lighthouserc.cjs` (new).
- Steps:
  1. Configure URLs: `/`, `/discover/1`, `/items/<sample-slug>`,
     `/map`, `/admin` (latter expected to redirect — keep as smoke
     check).
  2. Set assertions per Article V: LCP ≤ 2500 ms, INP ≤ 200 ms,
     CLS ≤ 0.1, plus performance score ≥ 0.9 as a soft warn.
  3. Use `numberOfRuns: 3` and median aggregation to dampen
     network noise.
- Verification: `pnpm exec lhci collect --config=lighthouserc.cjs`
  runs locally without erroring (CI may still fail on cold start).

### T-010 [seq after T-009] — Add LHCI workflow

- Files: `.github/workflows/lhci.yml` (new).
- Steps:
  1. Trigger on `schedule` (`'0 6 * * *'` UTC) and on
     `pull_request: [labeled]` filtered to the `perf-check`
     label.
  2. Build the web app, start it via `pnpm --filter @ever-works/web
     start &`, wait for `http://localhost:3000`, then run LHCI.
  3. Upload the LHCI HTML report and `assertion-results.json`
     as workflow artefacts.
  4. Add a job summary that links the artefacts.
- Verification: trigger the workflow manually on a branch; confirm
  the artefact uploads and the assertion table renders in the job
  summary.

### T-011 [seq after T-010] — Document Lighthouse CI

- Files: `docs/architecture/performance-budgets.md` (extend).
- Steps:
  1. Add a "Lighthouse CI" subsection covering: when it runs, how
     to opt in (`perf-check` label), where artefacts live, and how
     to interpret a failure.
- Verification: `pnpm lint` passes.

### T-012 [seq after T-011] — Verification & ship PR 2

- Files: this `tasks.md`.
- Steps:
  1. `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build`.
  2. Trigger LHCI on a branch; capture artefact link in the PR.
  3. Append a `docs/log.md` line.
  4. Tick T-009..T-011 above.
- Verification: CI green; LHCI artefact uploaded for the test branch.

## Acceptance Criteria → Task Map

| AC     | Tasks                                |
| ------ | ------------------------------------ |
| AC-1   | T-001, T-002                         |
| AC-2   | T-003, T-005                         |
| AC-3   | T-004, T-008                         |
| AC-4   | T-009, T-010                         |
| AC-5   | T-006, T-011                         |
| AC-6   | T-002, T-008                         |
| AC-7   | T-007, T-011                         |
| AC-8   | T-003 (`--check` flag) + workflow self-test in T-004 |

## Notes

- The first PR is intentionally small — one script, one JSON file,
  one CI step, one docs page. This is the smallest unit that
  enforces Article V.
- The two-week soak window for the bundle gate (T-004) is
  conservative; we may flip to required earlier if the gate proves
  stable.
- Sidebar virtualisation work for Spec 017's `MapSidebar` pre-dates
  this gate. When that lands the budget table updates accordingly;
  we treat budget bumps as commits, not as spec amendments, unless
  the new ceiling exceeds the constitution's 250 KB ceiling.
