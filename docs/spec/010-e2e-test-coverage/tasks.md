---
id: tasks-010-e2e-test-coverage
title: 'Tasks 010 — End-to-End Test Coverage'
sidebar_label: '010 E2E Coverage Tasks'
---

# Tasks — `010-e2e-test-coverage`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

The plan groups work into AC-aligned batches. Tasks below follow the
plan’s ordering. `[P]` means the task can be done in parallel with
other `[P]` tasks (no shared dependencies). Each task ends in a
verification step.

## Phase A — Plugin coverage (depends on Spec 002)

### T-001 [seq Spec 002 / T-003] — Demo plugin registry spec

- File: `apps/web-e2e/tests/plugins/registry.spec.ts`
- Steps:
  1. Read `bundledPlugins` from
     `apps/web/lib/plugins/registry.ts` (via a small public list
     endpoint or by reading the admin REST API).
  2. Assert the demo plugin appears with `enabled: true`.
  3. Disable it via `POST /api/admin/plugins/demo/disable`,
     reload, assert it appears with `enabled: false`.
- Verification: `pnpm --filter @ever-works/web-e2e exec playwright test plugins/registry`.

### T-002 [seq T-001] — Slot rendering spec

- File: `apps/web-e2e/tests/plugins/slots.spec.ts`
- Steps:
  1. Navigate to `/`; expect the demo plugin’s
     `header.right` slot to render.
  2. Disable the demo plugin; expect the slot to disappear.
- Verification: spec passes.

### T-003 [seq T-001] — Admin toggle spec

- File: `apps/web-e2e/tests/plugins/admin-toggle.spec.ts`
- Steps:
  1. As admin, open Settings → Plugins.
  2. Toggle the demo plugin off via the UI.
  3. Reload the public site; expect the slot to be gone.
- Verification: spec passes.

## Phase B — Capability backlog (independent of Spec 002)

### T-004 [P] — Maps render spec

- File: `apps/web-e2e/tests/public/maps.spec.ts`
- Steps:
  1. Skip if `GOOGLE_MAPS_API_KEY` is not set.
  2. Seed an item with `latitude` / `longitude` via DB helper.
  3. Visit the item detail page; assert the map container exists
     and a marker is visible.
- Verification: spec passes locally with API key set.

### T-005 [P] — Payments smoke spec

- File: `apps/web-e2e/tests/public/payments-smoke.spec.ts`
- Steps:
  1. Visit `/pricing`; assert at least one enabled provider has a
     visible CTA.
  2. Click the CTA; assert the URL redirects to a provider
     sandbox domain (host check, not deep navigation).
- Verification: spec passes.

### T-006 [P] — Analytics emission spec

- File: `apps/web-e2e/tests/public/analytics-emission.spec.ts`
- Helper: `apps/web-e2e/helpers/analytics.ts` (new)
- Steps:
  1. Implement `recordAnalyticsRequests(page, providerHosts)`.
  2. Walk: home → category → item detail → submit.
  3. For each enabled provider, assert ≥ 1 outgoing request to its
     analytics endpoint per route.
- Verification: spec passes against a session with at least one
  provider enabled (e.g. PostHog test key).

### T-007 [P] — Newsletter validation spec

- File: `apps/web-e2e/tests/public/newsletter-validation.spec.ts`
- Steps:
  1. Submit valid email; assert success toast.
  2. Submit invalid email; assert inline error referenced by
     `aria-describedby`.
  3. Re-submit valid email (idempotent); assert success.
- Verification: spec passes.

### T-008 [P] — Client notifications spec

- File: `apps/web-e2e/tests/client/notifications.spec.ts`
- Steps:
  1. As admin, approve a known seeded submission.
  2. As that client, expect bell badge to increment within
     `expect.poll` timeout.
  3. Open dropdown; assert notification entry text matches the
     localised message key.
- Verification: spec passes locally and in CI.

## Phase C — Engineering backlog

### T-009 [P] — Resilience pass

- Files: `apps/web-e2e/tests/**`
- Steps:
  1. Audit `getByText('…')` usages where the text is content-driven.
  2. Replace with role / label / `data-testid` selectors.
  3. Land in small PRs (≤ 1 area per PR) to keep review easy.
- Verification: full suite still green.

### T-010 [P] — Speed pass

- Files: `apps/web-e2e/tests/**`, `apps/web-e2e/playwright.config.ts`
- Steps:
  1. Group same-state specs into describe blocks with
     `test.use({ storageState })`.
  2. Lift redundant per-test navigations to `beforeAll` where the
     page state is read-only.
- Verification: measure wall-time delta; confirm no flakes.

### T-011 [seq T-002, T-003, T-004, T-005, T-006, T-007, T-008] — Update coverage map

- File: `apps/web-e2e/E2E-TESTS.md`
- Steps:
  1. Add new rows for every spec landed.
  2. Bump the “Total” line.
- Verification: PR review.

### T-012 [seq T-011] — Append change log

- File: `docs/log.md`
- Steps:
  1. Append a single line per landed area.
- Verification: PR merge.

## Acceptance Criteria → Task Map

| AC    | Tasks                       |
| ----- | --------------------------- |
| AC-4  | T-001, T-002, T-003         |
| AC-5  | T-006                       |
| AC-6  | T-005                       |
| AC-7  | T-004                       |
| AC-8  | T-007                       |
| AC-9  | T-008                       |
| —     | T-009 (resilience), T-010 (speed) |

## Notes

- Tasks T-001..T-003 cannot start until Spec 002 (plugin runtime)
  ships. T-004..T-008 are independent and can be picked up by any
  contributor.
- Append new gaps discovered during implementation **here**, not in
  scratch files.
