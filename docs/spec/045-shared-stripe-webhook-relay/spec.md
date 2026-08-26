---
id: spec-045-shared-stripe-webhook-relay
title: Spec 045 — Shared Stripe webhook relay
sidebar_label: 045 Shared Stripe relay
---

# Feature spec — `045-shared-stripe-webhook-relay`

## 1. Summary

Platform-provisioned directories accept Stripe events from the Ever Works shared
relay through an authenticated site-side endpoint and run the same fulfilment
handlers as the legacy direct Stripe webhook.

## 2. Motivation

Stripe's live endpoint quota cannot support one endpoint per directory. A shared
platform endpoint can route by `metadata.work_id`, but each directory still needs
a fail-closed authenticated boundary and exactly one fulfilment implementation.

## 3. Goals

- Reuse the direct Stripe webhook's existing fulfilment handlers.
- Authenticate relay deliveries with the existing platform-to-site HMAC channel.
- Request a relay retry when fulfilment fails, and deduplicate only successes.
- Preserve the direct Stripe route throughout the migration.

## 4. Non-Goals

- Creating or configuring Stripe endpoints; that is a platform operations task.
- Replacing handler-level durable idempotency with the per-pod burst deduplicator.
- Changing payment products, prices, tax configuration, or checkout UX.

## 5. User Stories

As a directory operator, I want purchases fulfilled through one shared relay so
that my directory does not consume its own Stripe webhook slot.

As a buyer, I want transient fulfilment failures retried so that an acknowledged
payment is not left unfulfilled.

## 6. Acceptance Criteria

- [x] AC-1: the direct route and relay route call one shared dispatcher.
- [x] AC-2: missing or invalid platform HMAC never dispatches an event.
- [x] AC-3: failed dispatch returns a retryable response and is not remembered.
- [x] AC-4: successful repeated event ids are treated as duplicates.
- [x] AC-5: payment email amounts are formatted from cents before rendering.
- [x] AC-6: the legacy direct Stripe endpoint remains present.

## 7. Out-of-Scope Considerations

Durable cross-pod event idempotency remains the responsibility of the existing
payment and subscription writes. A persistent event ledger would be a separate
data-model change.

## 8. UX Notes

No visible UI or localisation change.

## 9. Data & API Surface

`POST /api/stripe/platform-webhook` accepts the raw Stripe event JSON and requires
`Authorization: Bearer <HMAC>` plus `x-platform-ts`. The HMAC input includes the
timestamp from `x-platform-ts`, the raw-body SHA-256 digest, and the directory
Work id. Success returns 200; an invalid HMAC returns 401; a missing or mismatched
event Work id returns 409; transient fulfilment failure returns 502 so the
platform retries. Status 503 remains reserved for an unprovisioned platform-sync
channel.

## 10. Plugin / Adapter Impact

No new adapter. Both routes reuse the existing payment-provider event mapping and
fulfilment services.

## 11. Risks & Open Questions

- A handler may partly complete before failing; durable writes must remain
  idempotent, as they already must be for Stripe retries.
- In-memory deduplication is intentionally per pod and bounded; it is not the
  durable correctness boundary.

## 12. Acceptance Test Plan

Node tests cover retry/deduplication and amount formatting. Playwright API tests
prove unauthenticated and fabricated-HMAC relay requests fail closed.

## 13. References

- Related spec: [004 payment providers](../004-payment-providers/spec.md)
- Platform rollout runbook: `EVER_WORKS_STRIPE_WEBHOOK_RELAY.md` in the private
  `ever-works/workspace` repository.
