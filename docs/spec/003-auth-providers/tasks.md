---
id: tasks-003-auth-providers
title: 'Tasks 003 — Authentication Providers'
sidebar_label: '003 Auth Providers Tasks'
---

# Tasks — `003-auth-providers`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Auth.js v5 baseline

- Files: `apps/web/auth.config.ts`, `apps/web/auth.ts`,
  `apps/web/middleware.ts`, `apps/web/lib/db/schema/auth.ts`.
- Verification: `pnpm --filter @ever-works/web build` succeeds and the
  signin page renders the configured providers.

### T-002 [done] — OAuth provider env-flag selection

- Files: `apps/web/auth.config.ts`.
- Verification: setting `AUTH_GOOGLE_ENABLED=false` removes the Google
  button without code changes.

### T-003 [done] — Drizzle adapter session persistence

- Files: `apps/web/lib/db/schema/auth.ts`,
  `apps/web/lib/auth/middleware.ts`.
- Verification: signing in creates a row in `sessions`.

### T-004 [done] — `AUTH_SECRET` / cookie hardening

- Files: `apps/web/scripts/check-env.js`, `apps/web/auth.config.ts`,
  PR #690.
- Verification: missing `AUTH_SECRET` aborts boot with a clear message.

### T-005 [done] — Sign-in / register / signout e2e specs

- Files: `apps/web-e2e/tests/auth/{signin,signout,register}.spec.ts`.
- Verification: `pnpm --filter @ever-works/web-e2e exec playwright test
  tests/auth/` is green.

### T-006 [P] — Forgot-password e2e spec

- Files: `apps/web-e2e/tests/auth/forgot-password.spec.ts`,
  `apps/web-e2e/page-objects/auth/forgot-password.page.ts`.
- Steps:
  1. Drive `/auth/forgot-password`, fill the email field, submit.
  2. Assert the success card or alert renders without leaking whether the
     email exists (privacy-preserving copy).
  3. Assert the `Back to login` link returns to `/auth/signin`.
- Verification: `pnpm --filter @ever-works/web-e2e exec playwright test
  tests/auth/forgot-password.spec.ts` passes.

### T-007 [P] — New-password e2e spec

- Files: `apps/web-e2e/tests/auth/new-password.spec.ts`.
- Steps:
  1. Visit `/auth/new-password` (with and without `token` param).
  2. Assert the form renders or the page redirects gracefully.
- Verification: spec passes on Chromium.

### T-008 [seq] — Migrate Google provider to plugin

- Files: `packages/plugin-auth-google/`, runtime registry from spec 002.
- Verification: removing the package disables the Google button without
  breaking the sign-in screen.

### T-009 [seq] — Migrate the remaining OAuth providers

- Files: `packages/plugin-auth-{github,facebook,twitter,microsoft}/`.
- Verification: each plugin can be enabled/disabled independently from
  the admin UI.

### T-010 [seq] — Deprecate env-flag form once plugins reach parity

- Files: `apps/web/auth.config.ts`,
  `docs/spec/NNN-deprecate-auth-env-flags/spec.md` (future).
- Verification: env flags trigger a deprecation warning; admin UI is the
  documented path.

## Acceptance Criteria → Task Map

| AC    | Tasks                                |
| ----- | ------------------------------------ |
| AC-1  | T-001                                |
| AC-2  | T-002, T-008, T-009                  |
| AC-3  | T-002, T-008, T-009                  |
| AC-4  | T-001, T-003                         |
| AC-5  | T-001                                |
| AC-6  | T-004                                |
| AC-7  | T-004                                |
| AC-8  | T-005, T-006, T-007                  |

## Notes

- Migration to plugin packages stays sequential because the SDK shape
  needs to be stable before all five providers move.
- Forgot-password / new-password e2e gaps are this plan's only
  immediate code work; everything else is documentation of shipped
  behaviour or follow-up plugin migration.
