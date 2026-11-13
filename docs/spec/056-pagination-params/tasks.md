---
id: tasks-056-pagination-params
title: Tasks 056 — Safe page / limit query parsing
sidebar_label: 056 Tasks
---

# Tasks — `056-pagination-params`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

- [x] **T-001** `apps/web/lib/utils/pagination-params.ts`: `parsePaginationParams()`.
- [x] **T-002** `apps/web/app/api/auth/security/login-activity/route.ts` uses it.
- [x] **T-003** `apps/web/lib/utils/__tests__/pagination-params.spec.ts` (unit, `test:unit`):
  defaults, valid values, non-numeric values, zero / negative / oversized values, a fallback
  above the maximum, custom limits.
- [ ] **T-004** Move the routes listed in the plan's follow-ups onto the helper, one small change each.
