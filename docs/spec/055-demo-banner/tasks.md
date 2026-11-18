---
id: tasks-055-demo-banner
title: Tasks 055 — Demo account banner
sidebar_label: 055 Tasks
---

# Tasks — `055-demo-banner`

> **Spec:** [`spec.md`](./spec.md) · **Plan:** [`plan.md`](./plan.md)

- [x] **T-001** `apps/web/components/layout/demo-banner.tsx`: the strip, shown when the runtime
  answer of `usePublicPaymentConfig()` succeeded with `demo=true`. Verify: nothing with `demo=false`,
  before the answer, or when the request fails.
- [x] **T-002** `ConditionalLayout` renders it above `Header` (not on `/auth-demo/`).
- [x] **T-003** `common.DEMO_BANNER_TEXT` / `common.DEMO_BANNER_SIGN_UP` in all 21 locales.
- [x] **T-004** `apps/web/lib/__tests__/demo-banner.spec.ts` (unit, `test:unit`): the runtime
  reader reports `demo` only for `NEXT_PUBLIC_DEMO=true`; both keys in every locale.
- [x] **T-005** `apps/web-e2e/tests/public/demo-banner.spec.ts` (Playwright, stage/main): visible
  above the header with the sign-up link; hidden when the runtime config answers `demo=false`.
- [x] **T-006** Live check after the cascade: demo.ever.works shows it, and a customer directory
  (e.g. timetrack.ever.works) does not. Done 2026-11-13 after #1106 (`f712d5c`): demo.ever.works answers
  `demo=true` and renders `[data-testid="demo-banner"]` with the app.ever.works/register link;
  timetrack.ever.works answers `demo=false` and renders none.
