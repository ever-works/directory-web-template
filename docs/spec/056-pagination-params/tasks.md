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
- [ ] **T-004** Move the route listed in the plan's follow-ups (`items/popularity-scores`) onto the helper. The
  admin lists that already answer 400 stay off it (plan, "Follow-ups").
