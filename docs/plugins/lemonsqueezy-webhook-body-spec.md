---
id: lemonsqueezy-webhook-body-spec
title: E2E LemonSqueezy Webhook Body Spec (apps/web-e2e/tests/api/lemonsqueezy-webhook-body.spec.ts)
sidebar_label: E2E LemonSqueezy Webhook Body Spec
sidebar_position: 560
---

# E2E LemonSqueezy Webhook Body Spec — `apps/web-e2e/tests/api/lemonsqueezy-webhook-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**LemonSqueezy payment-provider webhook POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/lemonsqueezy-webhook-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/lemonsqueezy-webhook-body.spec.ts).

This is the **second per-source-file webhook POST
smoke** the docs tree publishes (after
[`polar-webhook-body-spec.md`](polar-webhook-body-spec.md)).
The existing multi-provider
[`webhooks.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/webhooks.spec.ts)
covers Stripe / LemonSqueezy / Polar / Solidgate with
two assertions each — GET-not-5xx and POST-
unauthenticated-rejected; this spec drills into the
LemonSqueezy webhook handler specifically.

## What's distinct from the polar sibling

- **Different signature header:** LemonSqueezy uses
  `x-signature` (lowercase, single field); Polar uses
  `webhook-signature` + `webhook-timestamp` +
  `webhook-id`.
- **NO manual JSON parse:** the handler reads the raw
  body via `await request.text()` and passes it as a
  STRING to `lemonSqueezyProvider.handleWebhook(body,
  signature)`. The provider parses the body itself;
  the route does NOT call `JSON.parse(bodyText)`.
- **Simpler 2-tier rejection chain:** only `'No
  signature provided'` (400) and `'Webhook not
  processed'` (400). Polar has 4 tiers (Invalid JSON
  payload / Invalid webhook payload / No signature
  provided / Webhook not processed).
- **Switch-statement event dispatcher:**
  `webhookResult.type` is mapped via
  `mapLemonSqueezyEventType(...)` and dispatched into
  one of 8 distinct handlers (subscription created /
  updated / cancelled, payment succeeded / failed,
  subscription payment succeeded / failed, trial
  ending). The default branch only `console.log`s the
  unhandled event.
- **Same 400-default catch as polar but via raw
  `NextResponse.json` call:** outer catch is
  `NextResponse.json({ error: 'Webhook processing
  failed' }, { status: 400 })` — NOT
  `safeErrorResponse(...)` like polar uses.

## Why this spec is the simpler-2-tier-LemonSqueezy webhook POST smoke

The route under test
([`apps/web/app/api/lemonsqueezy/webhook/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/lemonsqueezy/webhook/route.ts))
exports only `POST`. The handler combines:

1. **Raw-body read via `await request.text()`** — no
   auth gate (webhooks use signature verification,
   not session auth).
2. **`x-signature` header presence check** — missing
   → 400 `{ error: 'No signature provided' }`.
3. **`lemonSqueezyProvider.handleWebhook(body,
   signature)`** — load-bearing signature-
   verification call. Note: receives the RAW body
   STRING, not a parsed object.
4. **`!webhookResult.received` check** — 400
   `{ error: 'Webhook not processed' }`.
5. **`mapLemonSqueezyEventType(webhookResult.type)`
   mapping** — translates LemonSqueezy event names to
   internal `WebhookEventType` enum (8 mapped +
   default).
6. **Switch-statement event dispatcher** — dispatches
   to one of 8 handler functions based on
   `eventType`. Default branch only `console.log`s.
7. **Success payload** — `{ received: true }` with
   status 200.
8. **Outer catch** — `console.error` + 400 `{ error:
   'Webhook processing failed' }`. NOT
   `safeErrorResponse(...)`. Same 400-default as
   polar but via raw `NextResponse.json` call.
9. **Method-resolution surface** — the route exports
   ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~14 headers + ~12
bodies) and **ten hand-written scenarios**.

| Block                                                                                      | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of LEMONSQUEEZY_WEBHOOK_HEADERS) test(…)`                   | Bulk-loop walk of every plausible header shape (~14 headers, including polar-shape headers that should be IGNORED).                    |
| `for (const { data, label } of LEMONSQUEEZY_WEBHOOK_BODIES) test(…)`                       | Bulk-loop walk of every plausible body shape (~12 bodies covering valid LemonSqueezy events, type-violation probes, malformed text).   |
| `test('… returns 400 with No signature provided when x-signature header is missing', …)`   | Pins the FIRST gate (header presence) producing the 400 `'No signature provided'` envelope.                                            |
| `test('… envelope shape on rejected branches has exactly one error key', …)`               | Strict envelope-shape assertion across all rejection branches.                                                                         |
| `test('… does NOT echo the success-branch received key on rejected branches', …)`          | Negative-property assertion: `received: true` must NOT appear on any rejection branch.                                                 |
| `test('… catch branch defaults to 400 (NOT 500) for any unhandled error', …)`              | Pins the 400-default catch — preventing 5xx that would trip LemonSqueezy's webhook-retry logic.                                        |
| `test('… every error message comes from the allowed list', …)`                             | Pins the static-string set: only `'No signature provided'` / `'Webhook not processed'` / `'Webhook processing failed'` are allowed.    |
| `test('… ignores polar-shape webhook headers (x-signature is the only signature header read)', …)` | Cross-route divergence: polar headers must NOT satisfy the LemonSqueezy gate.                                                          |
| `test('… does NOT branch on side-channel cookies / headers', …)`                           | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                | Method-resolution walk. POST is the only exported method.                                                                              |
| `test('… signature-verification call is NOT entered without x-signature header', …)`       | Pins the header-check-before-signature-verification order: a valid payload without the header must produce `'No signature provided'`. |
| `test('… switch-statement event dispatcher is NOT entered without valid signature', …)`    | Pins the signature-verification-before-dispatcher order: invalid signatures must NEVER trigger any of the 8 event handlers.            |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~26 total) must round-trip to a
   `< 500` status.
2. **First-gate (signature header) → 400 `'No
   signature provided'`** invariant.
3. **Strict envelope-shape preservation** on rejection
   branches.
4. **Success-branch-`received`-key non-disclosure**
   on rejection branches.
5. **Catch branch defaults to 400 (NOT 500)**.
6. **Static-string allow-list** for all rejection
   error messages (3-message set vs polar's 5-message
   set).
7. **Cross-route divergence** — polar-shape webhook
   headers must NOT satisfy the LemonSqueezy gate.
8. **Side-channel isolation**.
9. **Cross-method invariance** — POST is the only
   exported method; the four other HTTP verbs must
   round-trip to `< 500`.
10. **Signature-verification call gated by header
    check**.
11. **Switch-statement event dispatcher gated by
    signature verification** — invalid signatures
    must NEVER trigger any of the 8 event handlers.

## See also

- The first per-source-file webhook POST smoke
  [`polar-webhook-body-spec.md`](polar-webhook-body-spec.md)
  covers the Polar webhook handler with a 4-tier
  rejection chain and the `webhook-signature` header.
- The multi-provider sibling
  [`webhooks.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/webhooks.spec.ts)
  covers Stripe / LemonSqueezy / Polar / Solidgate
  with two assertions each.
- The other webhook routes (Stripe, Solidgate) are
  not yet documented as per-source-file references.
- The lemonsqueezy/list sibling
  [`lemonsqueezy-list-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/lemonsqueezy-list-query.spec.ts)
  covers the GET surface of `/api/lemonsqueezy/list`.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
