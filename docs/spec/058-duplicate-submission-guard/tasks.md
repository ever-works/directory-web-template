---
id: tasks-058-duplicate-submission-guard
title: Tasks 058 — Duplicate submission guard
sidebar_label: 058 Tasks
---

# Tasks — `058-duplicate-submission-guard`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

- [x] **T-001** `apps/web/lib/utils/source-url.ts`: `normalizeSourceUrl()`, `findItemBySourceUrl()`.
- [x] **T-002** `apps/web/lib/repositories/client-item.repository.ts`: `createAsClient` throws `DuplicateSourceUrlError`.
- [x] **T-003** `apps/web/app/api/client/items/route.ts`: answer 409 (and document it in the swagger block).
- [x] **T-004** `apps/web/lib/utils/__tests__/source-url.spec.ts` (unit, `test:unit`): equivalent links, links that
  must stay apart, unusable input, status filter.
- [x] **T-004a** `apps/web/lib/utils/mutex.ts` + `__tests__/mutex.spec.ts`: `createAsClient` runs its checks and
  save exclusively within one server process; concurrent same-link submissions to that process yield one 201 and one
  409 (separate instances are not coordinated).
- [x] **T-004b** `apps/web/lib/utils/__tests__/duplicate-submission-wiring.spec.ts` (unit, `test:unit`): source guards
  that `createAsClient` checks the link inside the lock before saving and that the route answers 409.
- [ ] **T-005** Playwright API spec under `apps/web-e2e/tests/api/` for the 409 (needs a seeded data repository).
- [ ] **T-006** The plan's follow-ups, one small change each.
