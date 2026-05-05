---
id: sponsor-ads-user-id-cancel-body-spec
title: E2E Sponsor-Ads User [id] Cancel Body Spec (apps/web-e2e/tests/api/sponsor-ads-user-id-cancel-body.spec.ts)
sidebar_label: E2E Sponsor-Ads User [id] Cancel Body Spec
sidebar_position: 571
---

# E2E Sponsor-Ads User [id] Cancel Body Spec — `apps/web-e2e/tests/api/sponsor-ads-user-id-cancel-body.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**user-owned sponsor-ad cancel POST body / header
smoke spec** paired with
[`apps/web-e2e/tests/api/sponsor-ads-user-id-cancel-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-user-id-cancel-body.spec.ts).

This is the **first per-source-file POST smoke** the
docs tree publishes that pins a **body-parse-fault-
tolerant contract** via `await request.json().catch(()
=> ({})) ?? {}` — malformed JSON OR `null` body OR
empty body silently coalesces to `{}` (NO 400 for
malformed JSON). EVERY prior POST smoke either has
a per-call try/catch that returns a 400 (solidgate /
lemonsqueezy / polar-webhook) OR no try/catch at all
(polar / stripe checkout). This is the FIRST silent-
coalesce contract.

It is also the **first per-source-file POST smoke**
that pins a **conditional Zod validation contract**:
`cancelSponsorAdSchema.omit({ id: true }).safeParse
(body)` runs unconditionally, but the 400-rejection
only fires if the validation FAILS AND
`body.cancelReason !== undefined`. So an empty body
OR a body without `cancelReason` skips the validation
rejection entirely.

## What's distinct from EVERY prior POST smoke

- **Body-parse-fault-tolerant contract:** `await
  request.json().catch(() => ({})) ?? {}`. The FIRST
  per-source-file POST smoke pinning a silent-
  coalesce body-parse contract.
- **Conditional Zod validation:** `.omit({ id: true })
  .safeParse(body)` with `if (!parsed.success &&
  body.cancelReason !== undefined)` gate. The FIRST
  per-source-file POST smoke pinning a conditional-
  validation contract.
- **Default-fallback string:** `cancelReason =
  parsed.data.cancelReason?.trim() || 'Cancelled by
  user'`. The FIRST per-source-file POST smoke
  pinning a default-fallback string contract.
- **THREE-branch outer catch:** `error.message ===
  'Sponsor ad not found'` → 404 (exact-string
  match); `error.message.includes('Cannot cancel')`
  → 400 (substring match); default →
  `safeErrorResponse(...)` 500. The FIRST per-
  source-file POST smoke pinning a mixed exact-
  string + substring catch-dispatcher.
- **Schema `.omit({ id: true })`:** the handler
  strips the path-param ID from the validation
  schema. The FIRST per-source-file POST smoke
  pinning a schema-omit contract.

## Why this spec is the silent-coalesce + conditional-Zod sponsor-ad cancel smoke

The route under test
([`apps/web/app/api/sponsor-ads/user/[id]/cancel/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/sponsor-ads/user/[id]/cancel/route.ts))
exports only `POST`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.id`
   → 401 `{ success: false, error: 'Unauthorized' }`
   (one-key envelope).
2. **`{ id }` param resolution** via dynamic-segment
   route.
3. **Body parse with silent coalesce** — `await
   request.json().catch(() => ({})) ?? {}`.
4. **`cancelSponsorAdSchema.omit({ id: true })
   .safeParse(body)`** with conditional 400
   rejection: only fires if validation FAILS AND
   `body.cancelReason !== undefined`.
5. **`cancelReason` default fallback** to `'Cancelled
   by user'`.
6. **`sponsorAdService.getSponsorAdById(id)`** → 404
   `'Sponsor ad not found'`.
7. **Ownership verification** — `sponsorAd.userId
   !== session.user.id` → 403 `'You do not have
   permission to cancel this sponsor ad'`.
8. **`sponsorAdService.cancelSponsorAd(id,
   cancelReason)`** — load-bearing cancel call.
9. **`!cancelledAd`** → 500 `'Failed to cancel
   sponsor ad'`.
10. **Success payload** — `{ success: true, data:
    <cancelledAd>, message: 'Sponsor ad cancelled
    successfully' }`.
11. **THREE-branch outer catch** with mixed exact-
    string + substring detection.
12. **Method-resolution surface** — the route
    exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
    `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~9 headers + ~12
bodies) and **eleven hand-written scenarios**.

| Block                                                                                            | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `for (const { headers, label } of SPONSOR_ADS_CANCEL_HEADERS) test(…)`                           | Bulk-loop walk of every plausible header shape (~9 headers).                                                                           |
| `for (const { data, label } of SPONSOR_ADS_CANCEL_BODIES) test(…)`                               | Bulk-loop walk of every plausible body shape (~12 bodies covering silent-coalesce probes, conditional-validation probes, bypass).      |
| `test('… returns 401 with the canonical one-key Unauthorized envelope', …)`                      | Pins the canonical envelope `{ success: false, error: 'Unauthorized' }`.                                                               |
| `test('… envelope shape has exactly success and error keys', …)`                                 | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo the success-branch keys on the unauth branch', …)`                        | Negative-property assertion: `data` key must NOT appear.                                                                               |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`                  | Pins the gate-before-post-auth order across six candidate messages.                                                                    |
| `test('… silent-coalesce body-parse handles malformed JSON without 400', …)`                     | Pins the silent-coalesce contract: malformed JSON does NOT produce an 'Invalid JSON' 400.                                              |
| `test('… has a stable status across header / body permutations', …)`                             | Six body permutations vs the no-body baseline.                                                                                         |
| `test('… does NOT branch on side-channel cookies / headers', …)`                                 | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx', …)`                      | Method-resolution walk. POST is the only exported method.                                                                              |
| `test('… conditional Zod validation is NOT entered on the unauth branch', …)`                    | Pins the gate-before-Zod order: over-length / wrong-type cancelReason values must NEVER produce validation messages on unauth.         |
| `test('… ownership / not-found / cancelSponsorAd are NOT entered on the unauth branch', …)`      | Pins the gate-before-ownership-and-cancel order.                                                                                       |
| `test('… three-branch outer catch (404 / 400 / 500 dispatcher) is NOT entered on the unauth branch', …)` | Pins the gate-before-catch-dispatcher order.                                                                                           |
| `test('… cancelReason value is NOT echoed on the unauth branch', …)`                             | Pins XSS-shaped cancelReason values are NEVER echoed back.                                                                             |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation (~21 total) must round-trip to a
   `< 500` status.
2. **Canonical envelope** `{ success: false, error:
   'Unauthorized' }` on the unauth branch.
3. **Strict envelope-shape preservation**.
4. **Success-branch-key non-disclosure**.
5. **Gate-before-post-auth invariant**.
6. **Silent-coalesce body-parse invariant** —
   malformed JSON must NEVER produce an 'Invalid
   JSON' 400.
7. **Status invariance across body permutations**.
8. **Side-channel isolation**.
9. **Cross-method invariance** — POST is the only
   exported method.
10. **Gate-before-conditional-Zod invariant**.
11. **Gate-before-ownership-and-cancel invariant**.
12. **Gate-before-three-branch-catch invariant**.
13. **No-cancelReason-leak invariant** — XSS-shaped
    `cancelReason` values must NEVER appear in the
    unauth response.

## See also

- The sibling sponsor-ads checkout POST smoke
  [`sponsor-ads-checkout-body-spec.md`](sponsor-ads-checkout-body-spec.md)
  uses a different ownership-verification chain on
  the SAME `sponsorAdService.getSponsorAdById(...)`
  service.
- The public sponsor-ads list smoke
  [`sponsor-ads-public.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-public.spec.ts)
  covers the GET surface of `/api/sponsor-ads`.
- The user-owned sponsor-ad renew sibling
  `/api/sponsor-ads/user/[id]/renew/route.ts` is not
  yet documented as a per-source-file reference.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
