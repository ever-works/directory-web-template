---
id: tasks-004-payment-providers
title: 'Tasks 004 — Payment Providers'
sidebar_label: '004 Payment Providers Tasks'
---

# Tasks — `004-payment-providers`

> **Spec:** [`spec.md`](./spec.md)
> **Plan:** [`plan.md`](./plan.md)

Conventions: `[P]` parallel, `[seq]` sequential, `[done]` already shipped.

## Task list

### T-001 [done] — `PaymentProvider` interface & shared types

- Files: `apps/web/lib/payment/index.ts`,
  `apps/web/lib/payment/types.ts`.
- Verification: each implementation imports the same interface.

### T-002 [done] — Stripe provider

- Files: `apps/web/lib/payment/stripe/**`,
  `apps/web/app/api/webhooks/stripe/route.ts`.
- Verification: signed webhook updates `subscriptions.status`.

### T-003 [done] — LemonSqueezy provider

- Files: `apps/web/lib/payment/lemonsqueezy/**`,
  `apps/web/app/api/webhooks/lemonsqueezy/route.ts`.
- Verification: signed webhook updates `subscriptions.status`.

### T-004 [done] — Polar provider

- Files: `apps/web/lib/payment/polar/**`,
  `apps/web/app/api/webhooks/polar/route.ts`.
- Verification: signed webhook updates `subscriptions.status`.

### T-005 [done] — Public pricing page

- Files: `apps/web/app/[locale]/pricing/**`,
  `apps/web-e2e/tests/public/pricing.spec.ts`.
- Verification: pricing spec is green.

### T-006 [done] — Admin sponsorships management

- Files: `apps/web/app/[locale]/admin/sponsorships/**`,
  `apps/web-e2e/tests/admin/sponsorships.spec.ts`.
- Verification: sponsorships spec is green.

### T-007 [P] — Public sponsor page e2e smoke

- Files: `apps/web-e2e/tests/public/sponsor.spec.ts`.
- Steps:
  1. Visit `/sponsor`.
  2. Assert the heading and CTA are present (or that a 404 / disabled
     state renders if the route is gated off).
- Verification: spec passes on Chromium.

### T-008 [seq] — Migrate Stripe to plugin package

- Files: `packages/plugin-payment-stripe/**`.
- Verification: enabling/disabling the plugin from the admin UI swaps
  the active payment surface without code changes.

### T-009 [seq] — Migrate LemonSqueezy and Polar to plugins

- Files: `packages/plugin-payment-lemonsqueezy/**`,
  `packages/plugin-payment-polar/**`.
- Verification: each plugin can be installed/disabled independently.

### T-010 [seq] — Multi-currency display preference (future spec)

- Files: future `docs/spec/NNN-multi-currency/`.
- Verification: spec lands; not part of this plan.

## Acceptance Criteria → Task Map

| AC    | Tasks                          |
| ----- | ------------------------------ |
| AC-1  | T-002                          |
| AC-2  | T-003                          |
| AC-3  | T-004                          |
| AC-4  | T-002, T-003, T-004            |
| AC-5  | T-001                          |
| AC-6  | T-005, T-007                   |
| AC-7  | T-006                          |

## Notes

- Webhook processors must remain idempotent — providers may retry.
- Once plugin migration is complete, the env-flag form keeps working
  for one minor version.
