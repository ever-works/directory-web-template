---
id: plan-060-lemonsqueezy-webhook-integrity
title: Plan 060 — LemonSqueezy webhook integrity and list access
sidebar_label: 060 Plan
---

# Plan — `060-lemonsqueezy-webhook-integrity`

> **Spec:** [`spec.md`](./spec.md) · **Tasks:** [`tasks.md`](./tasks.md)

## Approach

- **Signature (R1–R2).** `apps/web/lib/payment/lemonsqueezy-webhook.ts` verifies `X-Signature` as the
  hex HMAC-SHA256 of the raw body (`request.text()`, read once) with a constant-time compare, then parses
  that same text. Nothing is re-serialised before the check.
- **Plan from the paid variant (R9–R10).** `lemonsqueezy-variant-catalog.ts` builds a server-side catalog
  from the same sources the pricing page checks out from (`LEMONSQUEEZY_CONFIG` monthly/yearly ids per
  currency, the plan cards' `lemonVariantId` env ids, `works.yml` `pricing.plans`, the sponsor-ad
  variants). `lemonsqueezy-variant-plan.ts` maps an event's `variant_id` to a plan; an unknown or doubly
  configured variant maps to nothing. `custom_data.planId` is never read. The checkout route builds its
  custom data on the server (`lemonsqueezy-checkout-params.ts`): `{ userId, email, name }` from the session,
  and only `variantId` and `dark` from the body; a client `customPrice` or metadata is never forwarded.
- **Event handling (R3–R8, R11, R13).** `lemonsqueezy-subscription-events.ts` dispatches subscription and
  invoice events. Creation needs a plan variant; updates and invoices only touch an existing row
  (`createIfMissing: false`, a new option of the shared subscription service whose default keeps the
  Stripe, Polar and Solidgate paths unchanged). Sponsor ads are identified by sponsor-ad variant and by the
  subscription they are bound to, never by custom data, and use the sponsor-ad lifecycle decisions.
  Invoice rows store the invoice's own id. A failed write answers 503 so LemonSqueezy redelivers it; a
  per-pod bounded set acknowledges a redelivery once.
- **Plan changes (R12).** `update-plan` and `update` accept only catalog plan variants (400 otherwise)
  before calling LemonSqueezy; ownership is checked by #1114's `findOwnedLemonSqueezySubscription`.
- **List access (R5).** `lemonsqueezy-list-access.ts`: the list routes use the session email; another
  email needs a live admin role lookup, not the JWT claim.

## Risks

- **Configuration.** With no plan variant configured, every plan purchase is "unknown" and writes nothing
  (by design). Deployments must set the variant env ids or `works.yml` `lemonVariantId`s; the catalog
  test fails if a variant the pricing page can check out is missing from the catalog.
- **Several pods.** The redelivery set is per pod and bounded; a cross-pod duplicate can run a handler
  twice. Subscription rows are keyed on `(provider, subscription id)`, so the row write is idempotent; the
  order email and sponsor-ad renewal are not (Q-060a: a persisted event-id table needs a migration).
- **Moves made outside our routes.** A change made in the LemonSqueezy dashboard to a non-plan variant
  keeps the stored plan (Q-060b).

## Constitution Check

- [x] **I — Plugin-First** — not applicable; the payment provider path in core.
- [x] **II — TypeScript Everywhere** — all new modules and specs are TypeScript.
- [x] **III — Spec Before Code** — spec, plan and tasks exist.
- [x] **IV — Documentation First-Class** — spec folder, index row, `docs/questions.md` (Q-060a, Q-060b) and
  the `docs/log.md` entry; `docs/api/lemonsqueezy-deep-dive.md` updated.
- [x] **V — Performance Budget** — one catalog lookup per webhook event; the catalog is built from config.
- [x] **VI — Latest Stable Frameworks** — no dependency changes.
- [x] **VII — Reuse Before Build** — reuses the subscription service, the sponsor-ad lifecycle decisions and
  the admin guard; HMAC from `node:crypto`.
- [x] **VIII — No Removal Without Migration** — no schema change; client-sent checkout fields are ignored,
  not rejected, so existing callers keep working.
- [x] **IX — Test Coverage Bar** — `lemonsqueezy-webhook.spec.ts`, `lemonsqueezy-plan-integrity.spec.ts`,
  `lemonsqueezy-checkout-wiring.spec.ts`, `sponsor-ad-subscription.spec.ts` in `test:unit`.
- [x] **X — Modular Packages** — no package changes.

## Follow-ups

1. A persisted webhook event-id table for cross-pod de-duplication (Q-060a).
2. ~~`handleSubscriptionCreated` ignores a user found by email when the user id is missing~~ Done (R14):
   `lemonsqueezy-verified-email-user.ts` + `planData` in `lemonsqueezy-subscription-events.ts`; the shared
   service is unchanged because Stripe also uses it.
3. ~~Skip the retry for a payment failure on an unknown-variant subscription.~~ Done (R15): `createIfMissing: false`
   on `handleSubscriptionPaymentFailed`.
