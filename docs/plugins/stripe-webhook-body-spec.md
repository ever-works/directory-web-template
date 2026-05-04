---
id: stripe-webhook-body-spec
title: E2E Stripe Webhook Body Spec (apps/web-e2e/tests/api/stripe-webhook-body.spec.ts)
sidebar_label: E2E Stripe Webhook Body Spec
sidebar_position: 564
---

# E2E Stripe Webhook Body Spec — `apps/web-e2e/tests/api/stripe-webhook-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Stripe payment-provider webhook POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/stripe-webhook-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-webhook-body.spec.ts).

This is the **fourth and final per-source-file
webhook POST smoke** the docs tree publishes —
completing the four-provider webhook quartet
(Polar / LemonSqueezy / Solidgate / Stripe). The
existing multi-provider
[`webhooks.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/webhooks.spec.ts)
covers all four with two assertions each (GET-not-5xx
and POST-rejected); this spec drills into the Stripe
webhook handler specifically.

## What's distinct from ALL three siblings

This is the **simplest** of the four handlers:

- **Single-header signature check via
  `stripe-signature`:** unique header name distinct
  from polar (`webhook-signature`), lemonsqueezy
  (`x-signature`), and solidgate (`x-signature ||
  solidgate-signature`).
- **NO JSON parse:** the handler reads the raw body
  via `await request.text()` and passes it as a
  STRING directly to `stripeProvider.handleWebhook
  (body, signature)`. Matches lemonsqueezy; distinct
  from polar and solidgate which parse via
  `JSON.parse(body)`.
- **NO `validateWebhookPayload` check:** distinct
  from polar's 4-tier chain.
- **NO idempotency check:** distinct from solidgate's
  in-memory `Set<string>` tracker.
- **NO event-type-string-fallback in the switch
  dispatcher:** matches ONLY the `WebhookEventType`
  enum values (8 mapped + the UNIQUE
  `BILLING_PORTAL_SESSION_UPDATED` Stripe-specific
  event = 9 cases). Distinct from solidgate which
  accepts both enum AND lowercase strings for each
  event.
- **`BILLING_PORTAL_SESSION_UPDATED` in switch:**
  UNIQUE Stripe-specific event handler that NO other
  webhook smoke covers.
- **POST-only export:** matches polar and
  lemonsqueezy; distinct from solidgate which also
  exports a documentation GET handler.
- **Same 400-default catch as all three siblings:**
  outer catch returns 400 (NOT 500) via raw
  `NextResponse.json({ error: 'Webhook processing
  failed' }, { status: 400 })`.

## Why this spec is the simplest-handler webhook POST smoke

The route under test
([`apps/web/app/api/stripe/webhook/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/stripe/webhook/route.ts))
exports only `POST`. The handler combines:

1. **Raw-body read via `await request.text()`** — no
   auth gate (webhooks use signature verification).
2. **`stripe-signature` header presence check** —
   missing → 400 `{ error: 'No signature
   provided' }`.
3. **`stripeProvider.handleWebhook(body, signature)`**
   — load-bearing signature-verification call.
   Receives the RAW body STRING, not a parsed object.
4. **`!webhookResult.received` check** — 400
   `{ error: 'Webhook not processed' }`.
5. **Switch-statement event dispatcher** — 9 event
   types matched on `WebhookEventType` enum values
   ONLY (no string fallback). Default branch only
   `console.log`s.
6. **Success payload** — `{ received: true }` with
   status 200.
7. **Outer catch** — `console.error` + 400 `{ error:
   'Webhook processing failed' }`.
8. **Method-resolution surface** — the route exports
   ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~14 headers + ~11
bodies) and **eleven hand-written scenarios**.

| Block                                                                                                                 | Purpose                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of STRIPE_WEBHOOK_HEADERS) test(…)`                                                    | Bulk-loop walk of every plausible header shape (~14 headers, including sibling-provider signature headers that should be IGNORED).     |
| `for (const { data, label } of STRIPE_WEBHOOK_BODIES) test(…)`                                                        | Bulk-loop walk of every plausible body shape (~11 bodies, including the Stripe-unique `billing_portal.session.updated` event).         |
| `test('… returns 400 with No signature provided when stripe-signature header is missing', …)`                         | Pins the FIRST gate (header presence) producing the 400 envelope.                                                                      |
| `test('… envelope shape on rejected branches has exactly one error key', …)`                                          | Strict envelope-shape assertion across all rejection branches.                                                                         |
| `test('… does NOT echo the success-branch received key on rejected branches', …)`                                     | Negative-property assertion: `received: true` must NOT appear on any rejection branch.                                                 |
| `test('… catch branch defaults to 400 (NOT 500) for any unhandled error', …)`                                         | Pins the 400-default catch.                                                                                                            |
| `test('… every error message comes from the allowed list', …)`                                                        | Pins the static-string set: 3-message set.                                                                                             |
| `test('… ignores sibling-provider signature headers (only stripe-signature satisfies the gate)', …)`                  | Cross-route divergence: polar / lemonsqueezy / solidgate signature headers must NOT satisfy the Stripe gate.                           |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                                      | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                                           | Method-resolution walk. POST is the only exported method.                                                                              |
| `test('… signature-verification call is NOT entered without stripe-signature header', …)`                             | Pins the header-check-before-signature-verification order.                                                                             |
| `test('… switch-statement event dispatcher (incl. BILLING_PORTAL_SESSION_UPDATED) is NOT entered without valid signature', …)` | Pins the signature-verification-before-dispatcher order, with explicit coverage of the Stripe-unique billing_portal case.              |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~25 total) must round-trip to a
   `< 500` status.
2. **First-gate (signature header) → 400 `'No
   signature provided'`** invariant.
3. **Strict envelope-shape preservation** on rejection
   branches.
4. **Success-branch-`received`-key non-disclosure**
   on rejection branches.
5. **Catch branch defaults to 400 (NOT 500)**.
6. **Static-string allow-list** for all rejection
   error messages (3-message set).
7. **Cross-route divergence** — polar / lemonsqueezy
   / solidgate signature headers must NOT satisfy the
   Stripe gate.
8. **Side-channel isolation**.
9. **Cross-method invariance** — POST is the only
   exported method; the four other HTTP verbs must
   round-trip to `< 500`.
10. **Signature-verification call gated by header
    check**.
11. **Switch-statement event dispatcher gated by
    signature verification** — invalid signatures
    must NEVER trigger any of the 9 event handlers
    (including the Stripe-unique
    `BILLING_PORTAL_SESSION_UPDATED` case).

## See also

- The first webhook POST smoke
  [`polar-webhook-body-spec.md`](polar-webhook-body-spec.md)
  covers Polar with a 4-tier rejection chain.
- The second webhook POST smoke
  [`lemonsqueezy-webhook-body-spec.md`](lemonsqueezy-webhook-body-spec.md)
  covers LemonSqueezy with a simpler 2-tier rejection
  chain.
- The third webhook POST smoke
  [`solidgate-webhook-body-spec.md`](solidgate-webhook-body-spec.md)
  covers Solidgate with the two-header signature
  fallback and in-memory idempotency tracker.
- The multi-provider sibling
  [`webhooks.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/webhooks.spec.ts)
  covers all four providers with two assertions each.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
