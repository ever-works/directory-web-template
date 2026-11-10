---
id: plan-056-pagination-params
title: Plan 056 — Safe page / limit query parsing
sidebar_label: 056 Plan
---

# Plan — `056-pagination-params`

> **Spec:** [`spec.md`](./spec.md) · **Tasks:** [`tasks.md`](./tasks.md)

## Approach

A pure function in `apps/web/lib/utils/pagination-params.ts`, with no new
dependency, route, setting or schema. `parseInt` results go through
`Number.isFinite` before clamping, so `NaN` never reaches the query. The fallback
limit goes through the same `Math.min(maxLimit, Math.max(1, …))` clamp as a
parsed one.

## Constitution Check

- **No new dependency, no removal:** met.
- **Additive and reversible:** met; one route switched, behaviour of valid input unchanged.

## Follow-ups

Routes with the same `parseInt` / `Number` pattern that can adopt the helper:
`app/api/items/popularity-scores`, `app/api/admin/comments`,
`app/api/admin/companies`, `app/api/admin/collections`.
