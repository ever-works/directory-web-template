---
id: sponsor-ads-user-method-spec
title: E2E Sponsor Ads User Method Spec (apps/web-e2e/tests/api/sponsor-ads-user-method.spec.ts)
sidebar_label: E2E Sponsor Ads User Method Spec
sidebar_position: 605
---

# E2E Sponsor Ads User Method Spec — `apps/web-e2e/tests/api/sponsor-ads-user-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**user-scoped sponsor-ads GET + POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/sponsor-ads-user-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-user-method.spec.ts).

This is the **first per-source-file dual-method
smoke** the docs tree publishes that pins **Zod-
`safeParse` validation on BOTH a query-parameter
surface AND a body surface** (GET validates query
via `querySponsorAdsSchema.safeParse`; POST
validates body via `createSponsorAdSchema.
safeParse`). UNIQUE: the FIRST per-source-file dual-
method smoke pinning Zod schema validation across
both query and body.

## What's distinct from EVERY prior dual-method smoke

- **Zod-safeParse on BOTH query AND body** — UNIQUE:
  the FIRST per-source-file dual-method smoke
  pinning Zod validation across both surfaces.
- **Dynamic environment-based payment provider** —
  `ACTIVE_PAYMENT_PROVIDER = process.env.
  NEXT_PUBLIC_PAYMENT_PROVIDER ||
  PaymentProvider.STRIPE` is a module-level
  constant. UNIQUE: the FIRST per-source-file dual-
  method smoke pinning a module-level env-based
  provider constant (the handler ALWAYS uses this
  provider, regardless of what the caller sends in
  the body).
- **POST returns 201 status** (NOT 200) — UNIQUE
  among sponsor-ads POST smokes.
- **POST 400 for invalid JSON** — `'Invalid JSON
  in request body'` distinct from the body-
  validation 400 message (the FIRST per-source-
  file POST smoke pinning a try/catch around
  `await request.json()` with a distinct message).
- **Conditional already-exists 400 catch branch**
  — `error.message.includes('already have')` →
  400 `'You already have an active sponsor ad'`
  (UNIQUE: the FIRST per-source-file POST smoke
  pinning a message-substring catch dispatcher
  with a status override via
  `safeErrorResponse(error, message, 400)`).
- **Pagination success payload on GET** — `{ data,
  pagination: { page, limit, total, totalPages,
  hasNext, hasPrev } }` (UNIQUE: the FIRST per-
  source-file GET smoke pinning a hasNext/hasPrev
  computed-pagination contract).
- **Approval-workflow success message on POST** —
  `'Sponsor ad submission created successfully.
  Pending admin approval.'` (UNIQUE: the FIRST per-
  source-file POST smoke pinning an approval-
  workflow success message).
- **TWO-key 401 envelope** `{ success: false,
  error: 'Unauthorized' }` on both methods.

## Why this spec is the first dual-Zod-safeParse smoke

The route under test
([`apps/web/app/api/sponsor-ads/user/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/sponsor-ads/user/route.ts))
exports `GET` AND `POST`. The handlers combine:

1. **GET handler** — `auth()` session lookup;
   `searchParams` extraction; build queryParams with
   `userId: session.user.id`;
   `querySponsorAdsSchema.safeParse(queryParams)`;
   `getSponsorAdsPaginated(...)` load-bearing DB
   read; success returns paginated payload.
2. **POST handler** — `auth()`; JSON body parse with
   try/catch; `createSponsorAdSchema.safeParse({
   ...body, paymentProvider:
   ACTIVE_PAYMENT_PROVIDER })`;
   `createSponsorAd(userId, validated)` load-bearing
   DB write; success returns 201 with `{ data,
   message }`; conditional 400 catch-branch on
   `'already have'` message substring.
3. **Method-resolution surface** — the route
   exports `GET` AND `POST`. `PUT` / `PATCH` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **three bulk-loop walks** (~6 headers
× 2 methods + ~8 POST bodies) and **eleven hand-
written scenarios**.

| Block                                                                                              | Purpose                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walks (GET / POST)                                                                | ~6 headers per method.                                                                                                                 |
| POST body bulk-loop walk                                                                           | ~8 bodies covering minimal valid bodies, monthly/weekly intervals, invalid intervals, bypass attempts.                                 |
| `test('GET … returns 401 with the canonical TWO-key envelope', …)`                                 | Pins the canonical envelope on GET.                                                                                                    |
| `test('POST … returns 401 with the canonical TWO-key envelope', …)`                                | Pins the canonical envelope on POST.                                                                                                   |
| `test('GET and POST … have IDENTICAL 401 envelopes', …)`                                           | Pins byte-identical 401 envelopes.                                                                                                     |
| `test('GET … 401 envelope shape has exactly success and error keys', …)`                           | Strict envelope-shape assertion.                                                                                                       |
| `test('POST … does NOT echo any of the post-auth messages on the unauth branch', …)`               | Pins the gate-before-post-auth order across six candidate messages including the conditional already-exists 400 message.               |
| `test('POST … createSponsorAd is NOT entered on the unauth branch', …)`                            | CRITICAL — pins that XSS markers in the body are NEVER echoed back.                                                                    |
| `test('GET … querySponsorAdsSchema validation is NOT entered on the unauth branch', …)`            | Pins the gate-before-Zod-query-validation order — invalid query values still produce 401 NOT 400.                                       |
| `test('POST … body-parse and Zod-validation are NOT entered on the unauth branch', …)`             | Pins the gate-before-body-parse + gate-before-Zod-body-validation order.                                                               |
| `test('GET … cross-method probe (PUT / PATCH / DELETE) does NOT 5xx', …)`                          | Method-resolution walk. GET + POST are exported.                                                                                       |
| `test('POST … does NOT branch on side-channel cookies / headers', …)`                              | Side-channel walk on POST.                                                                                                             |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status across both methods.
2. **Canonical TWO-key envelope** `{ success:
   false, error: 'Unauthorized' }` on both
   methods.
3. **Cross-method 401 envelope equality** — GET
   and POST return BYTE-IDENTICAL 401 envelopes.
4. **Strict TWO-key envelope-shape preservation**.
5. **Gate-before-post-auth invariant**.
6. **Gate-before-DB-mutation invariant** on POST
   (CRITICAL).
7. **Gate-before-Zod-query-validation invariant**
   on GET — even invalid query values produce 401
   NOT 400.
8. **Gate-before-body-parse and Zod-body-
   validation invariant** on POST.
9. **Cross-method invariance** — PUT / PATCH /
   DELETE return `< 500`.
10. **Side-channel isolation** on POST.

## See also

- The companion sponsor-ads checkout sibling
  [`sponsor-ads-checkout-body-spec.md`](sponsor-ads-checkout-body-spec.md)
  uses a different POST shape for checkout-session
  creation.
- The companion sponsor-ads cancel sibling
  [`sponsor-ads-user-id-cancel-body-spec.md`](sponsor-ads-user-id-cancel-body-spec.md)
  uses a per-id POST verb.
- The companion sponsor-ads renew sibling
  [`sponsor-ads-user-id-renew-body-spec.md`](sponsor-ads-user-id-renew-body-spec.md)
  uses a per-id POST verb.
- The companion public-sponsor-ads spec
  [`sponsor-ads-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-public.spec.ts)
  covers the unauthenticated GET surface.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
