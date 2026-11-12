---
id: spec-056-pagination-params
title: Spec 056 — Safe page / limit query parsing
sidebar_label: 056 Pagination params
---

# Feature spec — `056-pagination-params`

> **Status:** in-progress (first route shipped; follow-up routes open) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)

## 1. Summary

A shared parser, `parsePaginationParams()` in `apps/web/lib/utils/pagination-params.ts`,
turns the `page` and `limit` query-string values into safe integers. The first
route to use it is `GET /api/auth/security/login-activity`.

## 2. Motivation

`login-activity` read `page` with `Math.max(1, parseInt(value, 10))`. A
non-numeric value such as `?page=abc` makes `parseInt` return `NaN`, and
`Math.max(1, NaN)` is still `NaN`, so the SQL `OFFSET` / `LIMIT` was `NaN`, the
query failed and the route answered 500 instead of the first page. Several other
routes parse the same way (see plan, "Follow-ups").

## 3. Requirements

- **R0.** Only a plain whole number (optional leading `-`, then digits, a safe
  integer) is read as a number. `2abc`, `1.5` or `9007199254740993` are treated as
  non-numeric, never as a different page or size.
- **R1.** A missing, empty or non-numeric `page` is page 1; a numeric one is at
  least 1.
- **R2.** A missing, empty or non-numeric `limit` is the caller's default
  (10 unless set); a numeric one is at least 1.
- **R3.** The limit never exceeds the caller's maximum (50 unless set), including
  when the fallback default is above that maximum.
- **R3a.** `page` never exceeds `MAX_PAGE` (100000), so a large numeric value
  cannot produce an OFFSET the database rejects. (An integer beyond the safe range
  is non-numeric under R0 and is page 1.)
- **R4.** `offset` is `(page - 1) * limit`.
- **R5.** The response shape of `login-activity` does not change. Requests whose
  `page` and `limit` are plain whole numbers in range behave as before, with one
  exception: a page above 100000 is clamped to 100000 and reported as 100000.
  Everything else now gets the defaults: values that used to answer 500, and
  malformed numbers that `parseInt` used to read loosely (`?page=2abc` was page 2
  and is now page 1; `?limit=1.5` returned 1 row and now returns 10).

## 4. Out of scope

- Returning 400 for invalid values: the route's callers never sent them on purpose,
  and falling back keeps the existing clients working.
- Migrating the other routes: one small slice at a time (plan, "Follow-ups").
