---
id: spec-056-pagination-params
title: Spec 056 — Safe page / limit query parsing
sidebar_label: 056 Pagination params
---

# Feature spec — `056-pagination-params`

> **Status:** shipped · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)

## 1. Summary

A shared parser, `parsePaginationParams()` in `apps/web/lib/utils/pagination-params.ts`,
turns the `page` and `limit` query-string values into safe integers. The first
route to use it is `GET /api/auth/security/login-activity`. The second is
`GET /api/items/popularity-scores` (R6).

## 2. Motivation

`login-activity` read `page` with `Math.max(1, parseInt(value, 10))`. A
non-numeric value such as `?page=abc` makes `parseInt` return `NaN`, and
`Math.max(1, NaN)` is still `NaN`, so the SQL `OFFSET` / `LIMIT` was `NaN`, the
query failed and the route answered 500 instead of the first page. Several other
routes parse the same way (see plan, "Follow-ups").

## 3. Requirements

- **R0.** Only a plain whole number is read as a number: after surrounding whitespace
  is trimmed, an optional leading `-`, then digits, within the safe-integer range.
  `" 3 "` is 3 (as `parseInt` read it); `2abc`, `1.5`, `+4` or `9007199254740993` are
  treated as non-numeric, never as a different page or size.
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
- **R5.** The response shape of `login-activity` does not change. A `page` or `limit`
  that is a whole number under R0 behaves as before, out-of-range ones included:
  they are clamped as the old code clamped them (`page=0` is page 1, `limit=0` is 1,
  `limit=500` is 50). The one exception is a page above 100000, which is clamped to
  100000 and reported as 100000. Only values that are not whole numbers under R0 now
  get the defaults: values that used to answer 500 (`?page=abc`), and malformed
  numbers that `parseInt` used to read loosely (`?page=2abc` was page 2 and is now
  page 1; `?limit=1.5` returned 1 row and now returns 10).
- **R6.** `GET /api/items/popularity-scores` reads `limit` through the helper with a
  default of 20 and a maximum of 100 (its documented bounds). A missing, empty or
  non-numeric `limit` returns 20 items, zero or a negative value returns 1, and a value
  above 100 returns 100. A whole number from 1 to 100 behaves as before. The old code
  answered `?limit=abc` with no items and `showing: null`, and `?limit=-3` with every
  item but the last three. Malformed numbers that `parseInt` read loosely (`2abc`,
  `1.5`, `1e3`) now get 20.

## 4. Out of scope

- Returning 400 for invalid values: the route's callers never sent them on purpose,
  and falling back keeps the existing clients working.
- Migrating the other routes: one small slice at a time (plan, "Follow-ups").
