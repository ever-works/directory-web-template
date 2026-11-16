---
id: spec-060-lemonsqueezy-webhook-integrity
title: Spec 060 — LemonSqueezy webhook integrity and list access
sidebar_label: 060 LemonSqueezy webhook integrity
---

# Feature spec — `060-lemonsqueezy-webhook-integrity`

> **Status:** in-progress · **Code:** `apps/web/lib/payment/lemonsqueezy-webhook.ts`, `apps/web/lib/payment/lemonsqueezy-subscription-events.ts`, `apps/web/lib/payment/lemonsqueezy-variant-{plan,catalog}.ts`, `apps/web/lib/payment/lemonsqueezy-checkout-params.ts`, `apps/web/lib/payment/lemonsqueezy-list-access.ts`, `apps/web/app/api/lemonsqueezy/{webhook,list,checkout}/route.ts`

## 1. Summary

`POST /api/lemonsqueezy/webhook` now verifies the signature over the raw request body and stores
subscription data under the `lemonsqueezy` provider. `GET /api/lemonsqueezy/list` no longer lets a
signed-in user list another customer's subscriptions by passing `customerEmail`. The plan a
subscription grants comes from the variant that was paid for, never from the checkout custom data, and
`POST /api/lemonsqueezy/checkout` no longer forwards a client price or client custom data.

## 2. Motivation

- The route passed the body text to the provider as if it were the parsed payload, and the provider
  fell back to `JSON.stringify` of it. The HMAC was computed over text that is not what LemonSqueezy
  signed, so every genuine event failed with `verification_failed` and nothing was ever stored.
- When data did reach the subscription service it read Stripe field names, and the service was built
  with its default provider (`stripe`), so rows would have carried the wrong provider.
- `GET /list` used `customerEmail || session.user.email`: any signed-in user could read another
  customer's subscriptions (the POST handler already refused this).
- Once signatures verified, the webhook wrote the plan named by `meta.custom_data.planId`. That value is
  buyer-controlled: the checkout route spread the client's `metadata` into the custom data and forwarded a
  client `customPrice`, and a LemonSqueezy checkout link accepts `checkout[custom][...]` as well. A signed-in
  user could pay for the cheap variant (or a price of their choosing) and be granted Premium. Sponsor ads
  were recognised the same way (`custom_data.type`), so a plan purchase could activate, renew or cancel a
  sponsor ad named in its custom data.

## 3. Requirements

- **R1.** The body is read once with `request.text()`. `X-Signature` must equal the lowercase hex
  HMAC-SHA256 of those exact bytes keyed with the webhook secret, compared in constant time. A missing,
  malformed, wrong-length or wrong signature, or an empty configured secret, is rejected (400).
- **R2.** The event is parsed (`JSON.parse`) from the same verified text, never from a re-serialised copy.
- **R3.** Subscription events map: subscription id, customer id, user id (from `meta.custom_data`), the
  plan the paid variant stands for (R9), status, `renews_at` / `ends_at` (period end), `trial_ends_at`,
  `cancelled`.
  Invoice events are keyed on their subscription id and carry amounts in cents. Rows use provider
  `lemonsqueezy`. `subscription_resumed`, `_expired`, `_paused` and `_unpaused` are stored through the
  updated handler.
- **R4.** A redelivery of the same event (same name, resource id and body) is acknowledged once per pod,
  within a bounded set (the coordinator clears its keys after 1000 events; a later redelivery runs again).
  Only a successfully handled event is remembered: if the subscription handler fails (or the same event is
  in flight) the route answers 503 so LemonSqueezy redelivers it. Subscription rows are idempotent on
  (provider, subscription id), which is the durable boundary.
- **R6.** A subscription cancelled with paid time left (`ends_at` in the future) stays `active` with
  `cancel_at_period_end` set and its end date at `ends_at`; the expiry event later stores `expired`. Past
  `ends_at` (or with no end date) it is `cancelled` at once. `auto_renewal` is written as the opposite of
  `cancel_at_period_end`, because the table rejects both being true. An unknown period end on create is
  stored as no end date, not "now".
- **R7.** `amount`, `amount_due` and `amount_paid` are integer columns holding major units; webhook writes
  round cents to whole units (never a decimal, never NaN) so the row is saved.
- **R5.** `GET` and `POST /api/lemonsqueezy/list` use the session email. A `customerEmail` equal to it
  (case-insensitive) is accepted; a different one is `403 ACCESS_DENIED` unless the caller is an admin.
  Admin is a live role lookup (`isAdmin(userId)`), not the JWT `isAdmin` claim, and only runs when another
  email is requested.
- **R8.** A sponsor-ad subscription never creates a plan row: its variant is not a plan variant (R9), so
  `subscription_updated` (and the events routed to it) can only update an existing plan row, and a payment
  failure of a bound sponsor ad (R11) is acknowledged. Its first invoice (`billing_reason: 'initial'`) is
  acknowledged, not counted as a renewal.
- **R9.** The plan comes from the event's `variant_id`, looked up in a server-side catalog built from the
  configuration the pricing page checks out with: `LEMONSQUEEZY_CONFIG` monthly/yearly variant ids per
  currency (`NEXT_PUBLIC_LEMONSQUEEZY_{STANDARD,PREMIUM}_{MONTHLY,YEARLY}_PRICE_ID_{USD,EUR,GBP,CAD}`), each
  plan card's `lemonVariantId` (`NEXT_PUBLIC_LEMONSQUEEZY_{FREE,STANDARD,PREMIUM}_VARIANT_ID`, the
  `*_WITH_SETUP_VARIANT_ID` variants, and `works.yml` `pricing.plans.*.lemonVariantId` for plan ids
  `free` / `standard` / `premium`), and the sponsor-ad variants (`LEMONSQUEEZY_SPONSOR_{WEEKLY,MONTHLY}_VARIANT_ID`).
  `custom_data.planId` is ignored. Only a plan variant creates a plan row or sets its plan. A variant that is
  missing, not configured, or configured for two different targets is unknown: `subscription_created` is
  logged and acknowledged (2xx) with no row written; an update can only change the status and dates of a row
  that already exists (`createIfMissing: false`), never its plan. An invoice carries no variant, so
  `subscription_payment_success` never creates a plan row either. If `works.yml` cannot be read the event
  answers 503 and is redelivered.
- **R10.** `POST /api/lemonsqueezy/checkout` takes only `variantId` and `dark` from the body. The variant's own
  price is charged (a client `customPrice` is still validated but never forwarded, and is no longer echoed),
  and the checkout custom data is `{ userId, email, name }` from the session; client `metadata`, `planId`,
  `type` and `sponsorAdId` are dropped. `GET` forwards only `email` and `variantId`. The pricing page still
  sends its `metadata` (with `planId`); the route drops it. Sponsor-ad checkouts keep their own route
  (`/api/sponsor-ads/checkout`), which sets `type` and `sponsorAdId` on the server.
- **R11.** A sponsor ad is activated only by a sponsor-ad variant whose interval (`weekly` / `monthly`) matches
  the ad named in the custom data (`type: 'sponsor_ad'`), and only while the ad awaits payment;
  `confirmPayment` binds the ad to that subscription. Renewal, cancellation and payment-failure events act on
  a sponsor ad only when the custom data names an ad already bound to the same subscription id. A plan
  subscription carrying someone's `sponsorAdId` therefore cannot activate, renew or cancel that ad. An ad
  already past the state an event applies to (a redelivered activation, a cancellation of an ended ad, a
  renewal of a cancelled or rejected ad) is acknowledged, not retried, using the Stripe path's
  `sponsor-ad-lifecycle.ts` decisions.
- **R12.** `POST /api/lemonsqueezy/update-plan` (`variantId`) and `POST /api/lemonsqueezy/update` (`priceId`)
  only move a subscription to a plan variant of the R9 catalog; any other variant (a sponsor-ad variant, one
  not configured) answers 400 before LemonSqueezy is called. The webhook keeps the stored plan for a
  non-plan variant (Q-060b), so without this a paying user could keep Premium at another variant's price.
- **R13.** Invoice events store the invoice's own id as the row's `invoice_id` (the subscription id is only
  the lookup key).
- **R14.** When a plan-variant `subscription_created` (or a `subscription_updated` that has to create the row) has
  no user id in its custom data, the handler looks the user up by the customer email and passes the id to the
  subscription service as `metadata.userId`. Only a verified address is matched: the same rule as the LemonSqueezy
  management routes (`isEmailVerifiedForOwnership`: `users.emailVerified`, or a linked OAuth/OIDC account for a
  user without a password; the match is case-insensitive). With no verified user the event is handled as before. A
  user id in the custom data is never replaced. The fallback lives in
  `lemonsqueezy-subscription-events.ts`, not in the shared service, which Stripe also uses: a Stripe invoice that
  arrives before its subscription must not create a row from an email match. A failing lookup makes the event retry.
- **R15.** A `subscription_payment_failed` for a subscription with no stored row is acknowledged (2xx, logged):
  the handler passes `createIfMissing: false` to `handleSubscriptionPaymentFailed`, which returns success for a
  missing row. A subscription of a variant that is neither a catalog plan nor a sponsor-ad variant never gets a row
  (R9), and an invoice carries no variant, so the missing row is how it shows up. A failed write on an existing
  row still answers 503. Without the option the service still fails on a missing row (Stripe, Polar, Solidgate).

## 4. Out of scope / open

- A persisted event-id table for cross-pod de-duplication (needs a migration); see `docs/questions.md`.
- The subscription service remains shaped around Stripe objects; LemonSqueezy data is adapted to it.
- A plan row whose subscription moves to a variant that is not a plan variant keeps its stored plan (R9);
  see `docs/questions.md` Q-060b. Our routes can no longer make that move (R12); a change made in the
  LemonSqueezy dashboard still can. The owner check on `update-plan` and `update` is #1114's.
- `update-plan` still forwards the client's `disableProrations` / `invoiceImmediately`, so an upgrade can be
  billed only from the next renewal.
- LemonSqueezy sponsor-ad renewal subscriptions (`type: 'sponsor_ad_renewal'`) are acknowledged without
  extending the ad (before this change they were booked as a Standard plan row).

## 5. Verification

Unit spec `apps/web/lib/payment/__tests__/lemonsqueezy-webhook.spec.ts`: a body signed over the raw
bytes verifies; a tampered body, a re-serialised body, a wrong secret and an empty secret do not; field
mapping (`custom_data.planId` never reaches the stored plan); list-email decision; the route wires the
variant-checked handlers. `lemonsqueezy-plan-integrity.spec.ts`: the Standard variant with custom data
saying premium stores Standard; an unknown variant writes nothing and is acknowledged; updates on unknown
variants and invoices never create a row; sponsor-ad activation needs a matching sponsor-ad variant;
renewals and cancellations act only on the ad bound to the subscription; the catalog covers the pricing
page's variant sources and treats a doubly configured id as unknown. `lemonsqueezy-checkout-wiring.spec.ts`:
the checkout parameters ignore a client `customPrice`, `planId`, `type`, `sponsorAdId` and `metadata`, and
the route uses them for POST and forwards no query price or metadata on GET.
`lemonsqueezy-webhook-followups.spec.ts` (R14–R15): a plan purchase with no user id is stored for the verified-email
user (create and update-that-creates), an id in the custom data is kept, an unverified or password-user email, a
blank email, invoices, cancellations and unknown variants never match, a failing lookup retries; a payment failure
with no row is acknowledged while a failed write on a row still retries.
