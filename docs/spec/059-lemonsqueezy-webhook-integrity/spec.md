---
id: spec-059-lemonsqueezy-webhook-integrity
title: Spec 059 — LemonSqueezy webhook integrity and list access
sidebar_label: 059 LemonSqueezy webhook integrity
---

# Feature spec — `059-lemonsqueezy-webhook-integrity`

> **Status:** in-progress · **Code:** `apps/web/lib/payment/lemonsqueezy-webhook.ts`, `apps/web/lib/payment/lemonsqueezy-list-access.ts`, `apps/web/app/api/lemonsqueezy/{webhook,list}/route.ts`

## 1. Summary

`POST /api/lemonsqueezy/webhook` now verifies the signature over the raw request body and stores
subscription data under the `lemonsqueezy` provider. `GET /api/lemonsqueezy/list` no longer lets a
signed-in user list another customer's subscriptions by passing `customerEmail`.

## 2. Motivation

- The route passed the body text to the provider as if it were the parsed payload, and the provider
  fell back to `JSON.stringify` of it. The HMAC was computed over text that is not what LemonSqueezy
  signed, so every genuine event failed with `verification_failed` and nothing was ever stored.
- When data did reach the subscription service it read Stripe field names, and the service was built
  with its default provider (`stripe`), so rows would have carried the wrong provider.
- `GET /list` used `customerEmail || session.user.email`: any signed-in user could read another
  customer's subscriptions (the POST handler already refused this).

## 3. Requirements

- **R1.** The body is read once with `request.text()`. `X-Signature` must equal the lowercase hex
  HMAC-SHA256 of those exact bytes keyed with the webhook secret, compared in constant time. A missing,
  malformed, wrong-length or wrong signature, or an empty configured secret, is rejected (400).
- **R2.** The event is parsed (`JSON.parse`) from the same verified text, never from a re-serialised copy.
- **R3.** Subscription events map: subscription id, customer id, user id and plan id from
  `meta.custom_data`, status, `renews_at` / `ends_at` (period end), `trial_ends_at`, `cancelled`.
  Invoice events are keyed on their subscription id and carry amounts in cents. Rows use provider
  `lemonsqueezy`. `subscription_resumed`, `_expired`, `_paused` and `_unpaused` are stored through the
  updated handler.
- **R4.** A redelivery of the same event (same name, resource id and body) is acknowledged once per pod;
  a delivery that arrives while the same event is in flight gets 409 so LemonSqueezy retries. Subscription
  rows are idempotent on (provider, subscription id), which is the durable boundary.
- **R5.** `GET` and `POST /api/lemonsqueezy/list` use the session email. A `customerEmail` equal to it
  (case-insensitive) is accepted; a different one is `403 ACCESS_DENIED` unless the caller is an admin.

## 4. Out of scope / open

- A persisted event-id table for cross-pod de-duplication (needs a migration); see `docs/questions.md`.
- The subscription service remains shaped around Stripe objects; LemonSqueezy data is adapted to it.

## 5. Verification

Unit spec `apps/web/lib/payment/__tests__/lemonsqueezy-webhook.spec.ts`: a body signed over the raw
bytes verifies; a tampered body, a re-serialised body, a wrong secret and an empty secret do not; field
mapping; list-email decision.
