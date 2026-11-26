---
id: tasks-063-location-index-visibility
title: Tasks 063 — Only approved items in the public location index
sidebar_label: 063 Tasks
---

# Tasks — `063-location-index-visibility`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

- [x] **T-001** `apps/web/lib/utils/location-indexable.ts`: `isLocationIndexable` (R1).
- [x] **T-002** `apps/web/lib/services/location/location-index.service.ts`: the helper in `indexItem` (removes
  the row otherwise), `prepareLocationEntry` and `rebuildIndex` (R2).
- [x] **T-003** `apps/web/lib/services/item-git.service.ts`: `reviewItem` syncs the index; `indexLocationAsync`
  no longer skips an item without a location (R3).
- [x] **T-004** `apps/web/app/api/admin/items/[id]/review/route.ts`: awaited `indexItem` after the review,
  an error log when the index could not be updated (R3).
- [x] **T-008** `apps/web/lib/utils/keyed-serial-queue.ts`: index writes for one slug run in call order (R3);
  `keyed-serial-queue.spec.ts`.
- [x] **T-005** Unit spec `apps/web/lib/utils/__tests__/location-indexable.spec.ts` and Playwright API spec
  `apps/web-e2e/tests/api/location-index-unpublished.spec.ts`; `location-search-radius-reach.spec.ts` now
  creates approved items.
- [x] **T-006** Docs: this spec, the index row, Q-063a, `docs/api/location-endpoints.md`,
  `docs/services/location-services.md`, the Swagger text and `openapi.json`, `docs/log.md`.
- [ ] **T-007** Query-time status filter as a second line of defence (Q-063a, open).
