---
id: polar-webhook-body-spec
title: E2E Polar Webhook Body Spec (apps/web-e2e/tests/api/polar-webhook-body.spec.ts)
sidebar_label: E2E Polar Webhook Body Spec
sidebar_position: 556
---

# E2E Polar Webhook Body Spec — `apps/web-e2e/tests/api/polar-webhook-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**Polar payment-provider webhook POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/polar-webhook-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/polar-webhook-body.spec.ts).

This is the **first per-source-file webhook POST
smoke** the docs tree publishes (the existing
multi-provider [`webhooks.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/webhooks.spec.ts)
covers Stripe / LemonSqueezy / Polar / Solidgate
with two assertions each — GET-not-5xx and POST-
unauthenticated-rejected; this spec drills into the
Polar webhook handler specifically).

It is also the **first POST smoke** the docs tree
publishes that uses **`await request.text()` (raw
body)** instead of `await request.json()` — because
Polar calculates signatures on the raw body, not the
parsed JSON. The handler manually parses the raw
text via `JSON.parse(bodyText)` inside a try/catch.

It is also the **first POST smoke** that uses
**`safeErrorResponse(..., 400)`** in the outer catch
(defaulting to **400 NOT 500** for unhandled webhook
errors) — preventing a 5xx crash on signature /
parsing errors that would otherwise trip Polar's
webhook-retry logic.

## Why this spec is the raw-body-signature-verified webhook POST smoke

The route under test
([`apps/web/app/api/polar/webhook/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/polar/webhook/route.ts))
exports only `POST`. The handler combines:

1. **Raw-body read via `await request.text()`** — no
   auth gate (webhooks are not session-authenticated;
   they use signature verification). Polar calculates
   signatures on the raw body, not on parsed JSON, so
   the handler reads the raw text first.
2. **Manual JSON parse via `JSON.parse(bodyText)`**
   inside a per-call try/catch — failure → 400
   `{ error: 'Invalid JSON payload' }`.
3. **`validateWebhookPayload(body)` structure check**
   — payload must have string `id`, string `type`,
   and object `data` keys → 400 `{ error: 'Invalid
   webhook payload' }` if any missing.
4. **`webhook-signature` header presence check** —
   missing → 400 `{ error: 'No signature
   provided' }`.
5. **`polarProvider.handleWebhook(body,
   signatureHeader, bodyText, timestampHeader,
   webhookIdHeader)`** — load-bearing signature-
   verification call.
6. **`!webhookResult.received`** check — 400
   `{ error: 'Webhook not processed' }`.
7. **`routeWebhookEvent(webhookResult.type,
   webhookResult.data)`** — load-bearing event-
   routing call (subscription lifecycle, payment
   events, checkout updates) on the success branch.
8. **Success payload** — `{ received: true }` with
   status 200.
9. **Outer catch** — `safeErrorResponse(error,
   'Webhook processing failed', 400)`. NOTE: catch
   defaults to 400 (NOT 500) — a regression that
   flips this to 500 would surface here as a `< 500`
   violation.
10. **Method-resolution surface** — the route exports
    ONLY `POST`. `GET` / `PUT` / `PATCH` / `DELETE`
    must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~13 headers + ~14
bodies) and **eleven hand-written scenarios**.

| Block                                                                                 | Purpose                                                                                                                                               |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of POLAR_WEBHOOK_HEADERS) test(…)`                     | Bulk-loop walk of every plausible header shape (~13 headers, including the three Polar webhook headers).                                              |
| `for (const { data, label } of POLAR_WEBHOOK_BODIES) test(…)`                         | Bulk-loop walk of every plausible body shape (~14 bodies covering required-key probes, type-violation probes, valid events).                          |
| `test('… returns 400 with Invalid JSON payload for malformed JSON', …)`               | Pins the FIRST gate (manual JSON parse) producing the 400 `'Invalid JSON payload'` envelope.                                                          |
| `test('… returns 400 with Invalid webhook payload for missing required keys', …)`     | Pins the SECOND gate (`validateWebhookPayload`) producing the 400 `'Invalid webhook payload'` envelope.                                               |
| `test('… returns 400 with No signature provided for missing webhook-signature', …)`   | Pins the THIRD gate (header presence check) producing the 400 `'No signature provided'` envelope.                                                     |
| `test('… envelope shape on rejected branches has exactly one error key', …)`          | Strict envelope-shape assertion across all three pre-delivery branches.                                                                               |
| `test('… does NOT echo the success-branch received key on rejected branches', …)`     | Negative-property assertion: `received: true` must NOT appear on any rejection branch.                                                                |
| `test('… catch branch defaults to 400 (NOT 500) for any unhandled error', …)`         | Pins the safeErrorResponse(..., 400) default — preventing 5xx that would trip Polar's webhook-retry logic.                                            |
| `test('… every error message comes from the allowed pre-delivery list', …)`           | Pins the static-string set: only `'Invalid JSON payload'` / `'Invalid webhook payload'` / `'No signature provided'` / `'Webhook not processed'` / `'Webhook processing failed'` are allowed. |
| `test('… does NOT branch on side-channel cookies / headers', …)`                      | Side-channel walk.                                                                                                                                    |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`           | Method-resolution walk. POST is the only exported method.                                                                                             |
| `test('… signature-verification call is NOT entered without webhook-signature', …)`   | Pins the header-check-before-signature-verification order: a valid payload without the header must produce `'No signature provided'`, not 200.        |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~27 total) must round-trip to a
   `< 500` status.
2. **First-gate (JSON parse) → 400 `'Invalid JSON
   payload'`** invariant.
3. **Second-gate (validate-payload) → 400 `'Invalid
   webhook payload'`** invariant.
4. **Third-gate (signature-header) → 400 `'No
   signature provided'`** invariant.
5. **Strict envelope-shape preservation** on rejection
   branches.
6. **Success-branch-`received`-key non-disclosure**
   on rejection branches.
7. **Catch branch defaults to 400 (NOT 500)**.
8. **Static-string allow-list** for all rejection
   error messages.
9. **Side-channel isolation**.
10. **Cross-method invariance** — POST is the only
    exported method; the four other HTTP verbs must
    round-trip to `< 500`.
11. **Signature-verification call gated by header
    check** — `'No signature provided'` must fire
    before the signature-verification call runs.

## See also

- The multi-provider sibling
  [`webhooks.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/webhooks.spec.ts)
  covers Stripe / LemonSqueezy / Polar / Solidgate
  with two assertions each (GET-not-5xx and POST-
  rejected); this spec drills into Polar specifically.
- The other webhook routes (Stripe, LemonSqueezy,
  Solidgate) are not yet documented as per-source-
  file references.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
