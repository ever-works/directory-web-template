---
id: spec-034-billing-payments-response-shape
title: 'Spec 034 — Billing payments response-shape crash fix'
sidebar_label: '034 Billing Payments Shape'
---

# Feature spec — `034-billing-payments-response-shape`

> **Status:** shipped.
>
> **Owner:** Template maintainers.
>
> **Type:** bug fix.
>
> **Constitution articles invoked:** III (Spec Before Code),
> IX (Test Coverage Bar — Definition of Done).

## 1. Summary

`/client/settings/profile/billing` crashed on load with:

```
TypeError: providerPayments.reduce is not a function
    at useProviderPayment.useMemo[totalSpent] (...)
```

Root cause: `GET /api/user/payments` returns a **bare array** of payment
records on every path **except one** — when Stripe configuration is
incomplete (the common local-dev / un-provisioned case), it returned the
object `{ payments: [] }`. `fetchPayments` passed that object through,
`useBillingData` stored it as `payments` (the `|| []` guard never fired
because a non-empty object is truthy), and `useProviderPayment` then called
`providerPayments.reduce(...)` on a non-array, throwing and blanking the
page.

## 2. Fix

Two changes, both minimal:

1. **API contract (root cause)** —
   `apps/web/app/api/user/payments/route.ts`: the "Stripe configuration is
   incomplete" branch now returns `[]` (bare array) instead of
   `{ payments: [] }`, matching the documented response schema and every
   other code path in the handler.
2. **Client hardening (defence in depth)** —
   `apps/web/hooks/use-billing-data.ts`: derive `payments` with
   `Array.isArray(paymentsQuery.data) ? paymentsQuery.data : []` so any
   future non-array payload degrades to "no payments" instead of crashing
   the array consumers (`reduce` / `filter` / `map`) in
   `useProviderPayment`.

## 3. Non-goals

- No change to the payment data model, the Stripe/LemonSqueezy adapters, or
  the billing UI layout.
- No new dependencies, no schema changes.
- LemonSqueezy's `transformedCheckouts` path is already array-safe (it is a
  `.map` result) and is left untouched.

## 4. Acceptance criteria

- `/client/settings/profile/billing` renders without the
  `providerPayments.reduce is not a function` error when Stripe is not
  configured (empty-state billing view shows instead of a crash).
- With Stripe configured and payments present, totals/averages/active-count
  compute exactly as before.
- `pnpm lint` and `pnpm tsc --noEmit` pass; no new dependencies.
