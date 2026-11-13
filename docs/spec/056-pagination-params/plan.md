---
id: plan-056-pagination-params
title: Plan 056 — Safe page / limit query parsing
sidebar_label: 056 Plan
---

# Plan — `056-pagination-params`

> **Spec:** [`spec.md`](./spec.md) · **Tasks:** [`tasks.md`](./tasks.md)

## Approach

A pure function in `apps/web/lib/utils/pagination-params.ts`, with no new
dependency, route, setting or schema. The value is trimmed first; it is read as a
number only when the trimmed text matches a plain whole number (`/^-?\d+$/`) and is
a safe integer. Anything else (`abc`, `2abc`, `1.5`, `9007199254740993`) falls back
to the default, so `NaN` never reaches the query and a malformed value never
selects a different page or size. A whole number is not replaced by the default
when it is out of range: it is clamped, `page` to 1..`MAX_PAGE` and `limit` to
1..`maxLimit` (`Math.min(maxLimit, Math.max(1, …))`). The fallback limit goes
through the same clamp.

## Constitution Check

- [x] **I — Plugin-First** — not applicable; a pure utility used by one API route.
- [x] **II — TypeScript Everywhere** — the helper, its route change and its unit spec are TypeScript.
- [x] **III — Spec Before Code** — spec, plan and tasks exist.
- [x] **IV — Documentation First-Class** — spec folder and `docs/log.md` entry added.
- [x] **V — Performance Budget** — O(1) string parsing; the page cap keeps the SQL OFFSET small.
- [x] **VI — Latest Stable Frameworks** — no framework or dependency changes.
- [x] **VII — Reuse Before Build** — `lib/utils/pagination-validation.ts` answers 400 for bad input on admin routes; this helper intentionally falls back to defaults so existing `login-activity` clients keep working (see spec §4). The two policies are deliberate, not duplicated.
- [x] **VIII — No Removal Without Migration** — additive; no removal. Plain whole-number input in range behaves as before, except a page above 100000, which is now clamped to and reported as 100000. Malformed numbers that `parseInt` used to read loosely (`2abc`, `1.5`) now fall back to the defaults (spec R5).
- [x] **IX — Test Coverage Bar** — unit spec in `test:unit`; not a user-visible UI change, so no Playwright test.
- [x] **X — Modular Packages** — no package changes.

## Follow-ups

Routes with the same `parseInt` / `Number` pattern that can adopt this lenient helper
without changing a documented answer: `apps/web/app/api/items/popularity-scores` (public,
`limit` only; `limit=abc` returns no items today and a negative `limit` drops items from the
end).

Not candidates: `apps/web/app/api/admin/companies` and `apps/web/app/api/admin/collections`
already answer 400 for a non-numeric or out-of-range `page` / `limit` (the companies OpenAPI
block documents that 400; the collections one documents only the 1-1000 bounds), so the
helper's fallback would change their contract. They still read
`2abc` loosely through `parseInt`; tightening that belongs with the strict
`validateStrictPaginationParams()` (`lib/utils/pagination-validation.ts`, spec 052, #1104),
which `apps/web/app/api/admin/comments` now uses, and collections' 1-1000 limit would need a
`maxLimit` option there first.
