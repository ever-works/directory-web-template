---
id: plan-056-pagination-params
title: Plan 056 — Safe page / limit query parsing
sidebar_label: 056 Plan
---

# Plan — `056-pagination-params`

> **Spec:** [`spec.md`](./spec.md) · **Tasks:** [`tasks.md`](./tasks.md)

## Approach

A pure function in `apps/web/lib/utils/pagination-params.ts`, with no new
dependency, route, setting or schema. A value is accepted only when it matches a
plain whole number (`/^-?\d+$/`) and is a safe integer; anything else (`abc`,
`2abc`, `1.5`, `9007199254740993`) falls back to the default, so `NaN` never
reaches the query and a malformed value never selects a different page or size.
The fallback limit goes through the same `Math.min(maxLimit, Math.max(1, …))`
clamp as a parsed one.

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

Routes with the same `parseInt` / `Number` pattern that can adopt the helper:
`apps/web/app/api/items/popularity-scores`, `apps/web/app/api/admin/companies`,
`apps/web/app/api/admin/collections`. (`apps/web/app/api/admin/comments` went the other way: it now answers 400
for an invalid `page` or `limit`, like the other admin lists — spec 052, #1104.)
