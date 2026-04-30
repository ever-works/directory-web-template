---
id: tasks-008-analytics-providers
title: 'Tasks 008 — Analytics Providers'
sidebar_label: '008 Analytics Tasks'
---

# Tasks — `008-analytics-providers`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Typed event API

- Files: `apps/web/lib/analytics/events.ts`,
  `apps/web/lib/analytics/index.ts`.
- Verification: emitting an unknown event id is a TypeScript error.

### T-002 [done] — Per-provider modules

- Files: `apps/web/lib/analytics/{posthog,google-analytics,plausible,datafast,jitsu,segment}/**`.
- Verification: enabling a provider via env causes its initialisation
  call to fire on page load.

### T-003 [done] — Per-provider `enabled` Zod toggle (PR #685)

- Files: `apps/web/lib/analytics/schemas.ts`.
- Verification: a disabled provider does not load its script.

### T-004 [done] — Admin Analytics Settings (PR #686)

- Files: `apps/web/components/admin/settings/analytics/**`.
- Verification: toggling Plausible from the admin UI persists across
  reloads.

### T-005 [done] — Deep-merge env + DB (PR #686)

- Files: `apps/web/lib/analytics/config.ts` (or equivalent),
  `apps/web/app/[locale]/layout.tsx`.
- Verification: setting a key only in env yields the same effective
  config as setting it only in DB.

### T-006 [done] — Key event coverage (PR #692)

- Files: `apps/web/lib/analytics/events.ts` and call sites across
  client/server actions.
- Verification: `track('item.viewed', …)` fires on item detail view.

### T-007 [done] — CSP for enabled providers (PR #691)

- Files: `apps/web/lib/csp.ts`.
- Verification: enabling PostHog adds `app.posthog.com` to the allow
  list.

### T-008 [P] — i18n keys for analytics admin UI

- Files: `apps/web/messages/<locale>.json` (existing).
- Verification: switching to French translates the analytics section.

### T-009 [seq] — Analytics emission e2e (per spec 010 AC-5)

- Files: `apps/web-e2e/tests/public/analytics-emission.spec.ts`,
  `apps/web-e2e/page-objects/public/AnalyticsPage.ts`.
- Verification: the spec asserts at least one outbound network request
  per enabled provider host on canonical routes.

### T-010 [seq] — Migrate PostHog to plugin

- Files: `packages/plugin-analytics-posthog/**`.
- Verification: removing the package disables PostHog without
  breaking other providers.

### T-011 [seq] — Migrate the remaining five providers to plugins

- Files: `packages/plugin-analytics-{ga,plausible,datafast,jitsu,segment}/**`.
- Verification: each plugin can be enabled/disabled independently from
  the admin UI.

### T-012 [seq] — Consent banner (future plugin)

- Files: future `packages/plugin-consent/**`,
  `docs/spec/NNN-consent-banner/spec.md`.
- Verification: spec lands; not part of this plan
  (per `Q-008a` default).

## Acceptance Criteria → Task Map

| AC    | Tasks                          |
| ----- | ------------------------------ |
| AC-1  | T-003                          |
| AC-2  | T-004                          |
| AC-3  | T-005                          |
| AC-4  | T-001, T-006                   |
| AC-5  | T-007                          |
| AC-6  | T-008                          |

## Notes

- Once plugin migration completes, the env-flag form remains as a
  fallback for one minor version.
