---
id: tasks-061-shared-item-parse-cache
title: Tasks 061 — Cached public pages and a shared item parse
sidebar_label: 061 Tasks
---

# Tasks — `061-shared-item-parse-cache`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

**Cached pages**

- [x] **T-001** Document shell moves to `[locale]/layout.tsx` (`components/layout/document-shell.tsx`); the root
  layout passes children through; `not-found` / `unauthorized` render the shell themselves (R2).
- [x] **T-002** Public pages call `setRequestLocale`; `AiChatMount` reads no session; `NavigationProvider` keeps
  `useSearchParams()` behind its own Suspense boundary (R2, R3).
- [x] **T-003** Item and tag pages ISR for every slug; plain listing URLs rewritten to cached twins; direct twin
  requests answer 404 (R1).
- [x] **T-004** Item comments for the shared-render tenant (`lib/auth/shared-render-tenant.ts`) (R4).
- [x] **T-005** Per-visitor segments and index grids pinned to `force-dynamic` (R5).
- [x] **T-006** Runtime page cache in memory through `cache-handler.cjs`; `NEXT_CACHE_MAX_MEMORY_MB` (R6).

**Content and sync**

- [x] **T-007** `lib/item-file-cache.ts`: parse each item YAML once per file version, shared by every locale (R7).
- [x] **T-008** Collection YAML, `works.yml` and `getCachedConfig` cached per file version / content revision
  (R8, R10).
- [x] **T-009** Content caches on `globalThis`; listing LRU; walks with IO errors or started before a clear store
  nothing (R9, R11).
- [x] **T-010** Sync invalidates on HEAD change or hourly, retries cache tags, warms the default locale, rebuilds
  the location index per commit (R12); repair once per set of YAML-less directories (R13).

**Memory**

- [x] **T-011** Server-side React Query schedules no long timers (`lib/query-client.ts`) (R14).

**Tests and measurements**

- [x] **T-012** Unit specs: `item-file-cache`, `content-revision`, `cacheable-public-pages`, `page-cache-handler`,
  `shared-render-tenant`.
- [x] **T-013** Before/after measurements and the sync-under-load test (spec §5).
- [ ] **T-014** Measure on the live site; run the e2e suite.
- [ ] **T-015** Open questions Q-061a–f.
