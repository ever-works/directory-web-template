---
id: tasks-012-newsletter-providers
title: 'Tasks 012 — Newsletter Providers'
sidebar_label: '012 Newsletter Tasks'
---

# Tasks — `012-newsletter-providers`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — Provider interface + Resend impl

- Files: `apps/web/lib/newsletter/{types,index,resend}.ts`.
- Verification: typecheck passes; subscribing via Resend test mode works.

### T-002 [done] — Public footer signup

- Files: `apps/web/components/footer/Newsletter.tsx`,
  `apps/web/app/api/newsletter/subscribe/route.ts`,
  `apps/web-e2e/tests/public/newsletter.spec.ts`.
- Verification: newsletter spec is green.

### T-003 [done] — Admin Settings → Newsletter section

- Files: `apps/web/components/admin/settings/newsletter/**`.
- Verification: enabling Resend persists across reloads.

### T-004 [P] — Newsletter-validation e2e (closes 010 AC-8)

- Files: `apps/web-e2e/tests/public/newsletter-validation.spec.ts`.
- Steps:
  1. Submit invalid email → assert inline error.
  2. Submit valid email → assert success toast.
  3. Submit the same email again → assert idempotent success.
- Verification: spec passes on Chromium.

### T-005 [seq] — Subscriber DB mirror

- Files: `apps/web/lib/db/schema/subscribers.ts` (existing or new),
  `apps/web/app/api/newsletter/subscribe/route.ts`.
- Verification: subscribing inserts a row when `NEWSLETTER_DB_MIRROR=true`.

### T-006 [seq] — Migrate Resend to plugin

- Files: `packages/plugin-newsletter-resend/**`.
- Verification: removing the package disables the form's provider hook
  without breaking the form layout.

### T-007 [seq] — Mailchimp / ConvertKit / Loops adapters

- Files: `packages/plugin-newsletter-{mailchimp,convertkit,loops}/**`.
- Verification: each plugin can be selected from admin UI.

## Acceptance Criteria → Task Map

| AC    | Tasks               |
| ----- | ------------------- |
| AC-1  | T-001               |
| AC-2  | T-001               |
| AC-3  | T-002, T-004        |
| AC-4  | T-003               |
| AC-5  | T-002, T-004        |

## Notes

- DB mirror toggle defaults to `true` per `Q-012a`.
