---
id: solidgate-webhook-body-spec
title: E2E Solidgate Webhook Body Spec (apps/web-e2e/tests/api/solidgate-webhook-body.spec.ts)
sidebar_label: E2E Solidgate Webhook Body Spec
sidebar_position: 562
---

# E2E Solidgate Webhook Body Spec — `apps/web-e2e/tests/api/solidgate-webhook-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Solidgate payment-provider webhook POST body /
header smoke spec** paired with
[`apps/web-e2e/tests/api/solidgate-webhook-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/solidgate-webhook-body.spec.ts).

This is the **third per-source-file webhook POST
smoke** the docs tree publishes (after
[`polar-webhook-body-spec.md`](polar-webhook-body-spec.md)
and
[`lemonsqueezy-webhook-body-spec.md`](lemonsqueezy-webhook-body-spec.md)).

## What's distinct from the polar AND lemonsqueezy siblings

- **Two-header signature fallback:** Solidgate reads
  `x-signature || solidgate-signature` — UNIQUE:
  NEITHER polar (`webhook-signature`) NOR lemonsqueezy
  (`x-signature` only) uses this two-header fallback
  pattern.
- **Manual JSON parse like polar but NO
  `validateWebhookPayload` check:** the handler calls
  `JSON.parse(body)` (matching polar) but DOES NOT
  validate the parsed shape (distinct from polar's
  `validateWebhookPayload(body)` 4-tier chain).
- **In-memory idempotency Set:** the FIRST webhook
  smoke that pins an idempotency contract.
  `processedWebhooks: Set<string>` tracks `webhookId`
  for 24 hours via `setTimeout(() =>
  processedWebhooks.delete(webhookId),
  WEBHOOK_EXPIRY_MS)`. Duplicate webhook IDs return
  **200** `{ received: true }` (NOT 400) — the FIRST
  webhook smoke with TWO 200-success branches.
- **Switch dispatcher accepting BOTH enum AND string
  values:** 9 event types are matched on BOTH the
  `WebhookEventType.PAYMENT_SUCCEEDED` enum AND the
  lowercase `'payment_succeeded'` string. UNIQUE:
  lemonsqueezy uses ONLY the mapped enum, polar uses
  ONLY `webhookResult.type` from the provider
  response.
- **GET export with informative message:** the route
  exports a GET handler that returns 200 `{ message:
  'Solidgate webhook endpoint', instructions: '...',
  method: 'POST' }` — UNIQUE: polar and lemonsqueezy
  export only POST.
- **Same 400-default catch as polar + lemonsqueezy:**
  outer catch is raw `NextResponse.json({ error:
  'Webhook processing failed' }, { status: 400 })`.

## Why this spec is the two-header-fallback-with-idempotency webhook POST smoke

The route under test
([`apps/web/app/api/solidgate/webhook/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/solidgate/webhook/route.ts))
exports `GET` and `POST`. The POST handler combines:

1. **Raw-body read via `await request.text()`** — no
   auth gate (webhooks use signature verification).
2. **Two-header signature fallback** — `x-signature
   || solidgate-signature`. Missing BOTH → 400
   `{ error: 'No signature provided' }`.
3. **Manual JSON parse via `JSON.parse(body)`**
   INSIDE the outer `try` block — failure cascades to
   the catch (400 `'Webhook processing failed'`).
4. **Idempotency check** — `webhookId =
   parsedBody.id || x-request-id`. If
   `processedWebhooks.has(webhookId)` → 200
   `{ received: true }` (NOT 400 — duplicates are
   silently acked).
5. **`solidgateProvider.handleWebhook(parsedBody,
   signature, body)`** — load-bearing signature-
   verification call. Receives parsed body, raw
   signature, AND raw body string.
6. **`!webhookResult.received` check** — 400
   `{ error: 'Webhook not processed' }`.
7. **Switch-statement event dispatcher** — 9 event
   types matched on BOTH enum AND string. Default
   branch only `console.log`s.
8. **Success payload** — `{ received: true }` with
   status 200.
9. **Outer catch** — `console.error` + 400
   `{ error: 'Webhook processing failed' }`.
10. **Method-resolution surface** — the route exports
    `GET` AND `POST`. `PUT` / `PATCH` / `DELETE` must
    round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~14 headers + ~11
bodies) and **twelve hand-written scenarios**.

| Block                                                                                                                                  | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of SOLIDGATE_WEBHOOK_HEADERS) test(…)`                                                                  | Bulk-loop walk of every plausible header shape (~14 headers, including `solidgate-signature` fallback and polar-shape ignored).        |
| `for (const { data, label } of SOLIDGATE_WEBHOOK_BODIES) test(…)`                                                                      | Bulk-loop walk of every plausible body shape (~11 bodies covering valid Solidgate events with both dot-case and snake_case event names). |
| `test('… returns 400 with No signature provided when both signature headers are missing', …)`                                          | Pins the FIRST gate with the two-header fallback semantics: missing BOTH → 400.                                                        |
| `test('… accepts solidgate-signature as fallback when x-signature is missing', …)`                                                     | Pins the fallback header semantics: solidgate-signature alone satisfies the gate, but signature verification still fails downstream.   |
| `test('… envelope shape on rejected branches has exactly one error key', …)`                                                           | Strict envelope-shape assertion across all rejection branches.                                                                         |
| `test('… does NOT echo the success-branch received key on rejected branches', …)`                                                      | Negative-property assertion: `received: true` must NOT appear on any rejection branch.                                                 |
| `test('… catch branch defaults to 400 (NOT 500) for any unhandled error', …)`                                                          | Pins the 400-default catch.                                                                                                            |
| `test('… every error message comes from the allowed list', …)`                                                                         | Pins the static-string set: 3-message set (same as lemonsqueezy).                                                                      |
| `test('… ignores polar-shape webhook-signature header (only x-signature OR solidgate-signature satisfy the gate)', …)`                 | Cross-route divergence: polar headers must NOT satisfy the Solidgate gate.                                                             |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                                                       | Side-channel walk.                                                                                                                     |
| `test('GET … returns 200 with the informative-message envelope', …)`                                                                   | Pins the unique GET export's 200 envelope.                                                                                             |
| `test('… cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                                                                  | Method-resolution walk. POST + GET are exported.                                                                                       |
| `test('… signature-verification call is NOT entered without any signature header', …)`                                                 | Pins the header-check-before-signature-verification order.                                                                             |
| `test('… switch-statement event dispatcher is NOT entered without valid signature', …)`                                                | Pins the signature-verification-before-dispatcher order.                                                                               |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~25 total) must round-trip to a
   `< 500` status.
2. **First-gate two-header-fallback rejection** —
   missing BOTH `x-signature` AND `solidgate-
   signature` → 400 `'No signature provided'`.
3. **Fallback header acceptance** —
   `solidgate-signature` alone satisfies the gate.
4. **Strict envelope-shape preservation** on
   rejection branches.
5. **Success-branch-`received`-key non-disclosure**
   on rejection branches.
6. **Catch branch defaults to 400 (NOT 500)**.
7. **Static-string allow-list** for all rejection
   error messages.
8. **Cross-route divergence** — polar-shape webhook
   headers must NOT satisfy the Solidgate gate.
9. **Side-channel isolation**.
10. **GET export 200 with informative-message
    envelope** — UNIQUE: only Solidgate exports a
    documented GET handler.
11. **Cross-method invariance** — POST + GET
    exported; PUT / PATCH / DELETE must round-trip to
    `< 500`.
12. **Signature-verification call gated by header
    check**.
13. **Switch-statement event dispatcher gated by
    signature verification** — invalid signatures
    must NEVER trigger any of the 9 event handlers.

## See also

- The first webhook POST smoke
  [`polar-webhook-body-spec.md`](polar-webhook-body-spec.md)
  covers the Polar webhook handler with a 4-tier
  rejection chain.
- The second webhook POST smoke
  [`lemonsqueezy-webhook-body-spec.md`](lemonsqueezy-webhook-body-spec.md)
  covers the LemonSqueezy webhook handler with the
  simpler 2-tier rejection chain and the
  `x-signature` header.
- The multi-provider sibling
  [`webhooks.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/webhooks.spec.ts)
  covers Stripe / LemonSqueezy / Polar / Solidgate
  with two assertions each.
- The Stripe webhook route remains undocumented as a
  per-source-file reference.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
