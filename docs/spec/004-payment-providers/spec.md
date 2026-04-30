---
id: spec-004-payment-providers
title: 'Spec 004 — Payment Providers'
sidebar_label: '004 Payment Providers'
---

# Feature spec — `004-payment-providers`

> **Status:** Shipped (Stripe, LemonSqueezy, Polar). Retroactive spec.
> **Future direction:** migrate to plugin architecture per
> [`002-plugin-architecture`](../002-plugin-architecture/spec.md).

## 1. Summary

Support **Stripe**, **LemonSqueezy**, and **Polar** as payment providers
for directory monetisation features (sponsorships, paid listings,
subscriptions). All three providers can be enabled simultaneously; the
admin chooses which one is the default checkout flow.

## 2. Motivation

- Different geographies / regulatory regimes prefer different payment
  processors.
- Some adopters prefer merchant-of-record (MoR) providers like
  LemonSqueezy or Polar to avoid handling tax themselves.
- A single, abstracted payment surface keeps invoice / receipt / webhook
  handling consistent across providers.

## 3. Goals

- A `PaymentProvider` interface in
  [`apps/web/lib/payment/`](../../apps/web/lib/payment) that all three
  implementations share.
- Provider selection via env / admin UI.
- Webhook endpoints under `apps/web/app/api/webhooks/{stripe,lemon,polar}/`.
- Subscription model unified across providers (active / past_due /
  cancelled / trialing).
- Test mode toggles per provider.

## 4. Non-Goals

- Adding additional providers (Paddle, Mollie, etc.) — future specs.
- Cryptocurrency payments — future spec.

## 5. User Stories

```text
As an admin, I want to choose Stripe vs LemonSqueezy for checkout so I
can pick the one that fits my tax setup.

As a sponsor, I want a clear receipt regardless of which provider
processed my payment.
```

## 6. Acceptance Criteria

- [x] AC-1: Stripe checkout works end-to-end (test mode).
- [x] AC-2: LemonSqueezy checkout works end-to-end (test mode).
- [x] AC-3: Polar checkout works end-to-end (test mode).
- [x] AC-4: Webhook signatures verified for each provider.
- [x] AC-5: Subscription status mapped to a unified `SubscriptionStatus`.
- [x] AC-6: Pricing page (`/pricing`) renders provider-agnostic UI.
- [x] AC-7: Admin sponsorships page lists transactions across providers.

## 7. Out-of-Scope Considerations

- Multi-currency display preferences (future spec).
- Tax / VAT handling beyond what each provider offers.

## 8. UX Notes

- Pricing page localised; currency formatting via `Intl.NumberFormat`.
- Receipts / invoices delivered by the provider; the admin gets an event
  log.

## 9. Data & API Surface

- Drizzle tables: `subscriptions`, `payments`, `sponsorships`.
- Webhook routes: `app/api/webhooks/stripe/route.ts`, …
- Server actions for initiating checkout sessions.

## 10. Plugin / Adapter Impact

Currently a hard-wired switch. Migration plan: each provider becomes a
plugin (`packages/plugin-payment-stripe`, …) implementing
`PaymentProvider` from `@ever-works/plugin-sdk`. Tracked in
[`002`](../002-plugin-architecture/spec.md).

## 11. Risks & Open Questions

- **Risk:** webhook secrets must rotate independently of `AUTH_SECRET`.
  Documented.
- **Open:** allow multiple providers to be active at the same checkout?
  Default: **no, single active provider per session**, recorded in
  `docs/questions.md`.

## 12. Acceptance Test Plan

- `apps/web-e2e/tests/public/pricing.spec.ts` (renders)
- `apps/web-e2e/tests/admin/sponsorships.spec.ts` (admin view)
- Manual: end-to-end checkout in each provider’s test mode.

## 13. References

- Stripe API: <https://stripe.com/docs>
- LemonSqueezy: <https://docs.lemonsqueezy.com>
- Polar: <https://polar.sh/docs>
- Constitution articles: I, II, III, IV, VI, VII.
