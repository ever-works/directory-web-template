---
id: item-comments-rating-id-update-method-spec
title: E2E Item Comments Rating [commentId] Update Method Spec (apps/web-e2e/tests/api/item-comments-rating-id-update-method.spec.ts)
sidebar_label: E2E Item Comments Rating [commentId] Update Method Spec
sidebar_position: 589
---

# E2E Item Comments Rating [commentId] Update Method Spec — `apps/web-e2e/tests/api/item-comments-rating-id-update-method.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**per-comment rating-update PATCH dynamic-segment /
body / header smoke spec** paired with
[`apps/web-e2e/tests/api/item-comments-rating-id-update-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comments-rating-id-update-method.spec.ts).

This is the **first per-source-file PATCH smoke**
the docs tree publishes that documents a **Q-010-
style NO-AUTH-GATE finding for a non-admin mutating
route** — the handler has NO `auth()` call, NO
ownership check, NO rating validation. ANY caller
can update ANY comment's rating to ANY value (so
long as `DATABASE_URL` is configured). See
[`docs/questions.md`](../questions.md) for the
Q-### entry. The smoke spec pins this finding as
the CURRENT contract — a future PR that adds auth
would explicitly break this spec, prompting an
update.

## What's distinct from EVERY prior mutating-method smoke

- **NO `auth()` gate** — the FIRST per-source-file
  mutating smoke pinning a Q-010-style no-auth-gate
  finding for a non-admin / non-internal route.
- **NO ownership check** — the handler trusts the
  path-param `commentId` directly.
- **NO rating validation** — any value (including
  `'string'`, `null`, `-99`, `999`) is passed
  straight to `updateCommentRating(...)` without
  type / range checking.
- **Production-leftover `console.log`** with debug
  arrow `'============rating=============>'` — the
  handler emits this on every PATCH request in ALL
  environments (NOT dev-gated).
- **Returns raw comment row verbatim** — no wrapper
  envelope, no field filtering.
- **`checkDatabaseAvailability()` as the SOLE
  gate** — if DB unavailable → 503; otherwise
  proceed to the unconditional update.

## Why this spec is the no-auth-gate Q-010 PATCH smoke

The route under test
([`apps/web/app/api/items/[slug]/comments/rating/[commentId]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/items/[slug]/comments/rating/[commentId]/route.ts))
exports `GET` and `PATCH`. The PATCH handler
combines:

1. **`checkDatabaseAvailability()` gate** — the
   ONLY gate. Returns 503 with the
   DATABASE_UNAVAILABLE envelope when `DATABASE_URL`
   is missing.
2. **`{ commentId } = await params`** dynamic-
   segment resolution.
3. **`{ rating } = await request.json()`** body
   parse — NO try/catch, NO validation.
4. **`console.log` debug statement** — production-
   leftover.
5. **`updateCommentRating(commentId, rating)`** —
   load-bearing UNGUARDED DB write.
6. **Success payload** — raw comment row verbatim
   with status 200.
7. **Outer catch** — `console.error` + 500
   `{ error: 'Failed to update comment rating' }`.
8. **Method-resolution surface** — the route
   exports `GET` and `PATCH`. `POST` / `PUT` /
   `DELETE` must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **two bulk-loop walks** (~6 headers + ~13
bodies) and **six hand-written scenarios**.

| Block                                                                                    | Purpose                                                                                                                                |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                    | ~6 headers.                                                                                                                            |
| Body bulk-loop walk                                                                      | ~13 bodies covering valid ratings, boundary values, type-violation probes, bypass attempts.                                            |
| `test('… does NOT return 401 (no auth gate Q-010-style finding)', …)`                    | CURRENT contract: the handler has NO auth gate. Pins that the response is NOT 401 regardless of body — a future PR that adds auth would explicitly break this. |
| `test('… treats unauth and authed requests identically (no auth gate)', …)`              | Pins that requests with fabricated auth headers produce the SAME status as bare requests (handler ignores all auth signals).           |
| `test('… does NOT branch on rating value type (no validation)', …)`                      | Pins that invalid rating values produce the SAME status as valid values (handler does NOT validate).                                    |
| `test('… cross-method probe (POST / PUT / DELETE) does NOT 5xx', …)`                     | Method-resolution walk. GET + PATCH are exported.                                                                                      |
| `test('… catch-branch generic 500 message is NOT echoed for valid bodies', …)`           | Pins that valid-shape requests do NOT surface the 500 catch envelope.                                                                  |
| `test('… response does NOT include a wrapper envelope for valid bodies', …)`             | Pins the UNUSUAL contract: success branch returns the raw comment row verbatim (no `success` key wrapper).                             |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header /
   body permutation must round-trip to a `< 500`
   status.
2. **NO-401 contract** — the unauth response is
   NEVER 401 (because there's no auth gate).
3. **Auth-signal-ignored contract** — fabricated
   auth headers do NOT change the status.
4. **No-validation contract** — invalid rating
   values produce the same status as valid values.
5. **Cross-method invariance** — POST / PUT /
   DELETE return `< 500`.
6. **No-catch-on-valid-body contract**.
7. **No-wrapper-envelope contract** — success
   branch returns the raw comment row verbatim.

## See also

- The companion minimal smoke
  [`item-comment-rating-by-id.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/item-comment-rating-by-id.spec.ts)
  pins only the `< 500` no-server-error contract;
  this spec drills into the body / dynamic-segment
  surface with detailed invariants.
- The parent route's PUT / DELETE handlers at
  [`item-comments-id-method-spec.md`](item-comments-id-method-spec.md)
  DO enforce auth + ownership; this child rating-
  update route does not.
- The companion comment-create POST sibling
  [`item-comments-create-body-spec.md`](item-comments-create-body-spec.md)
  uses the SAME `checkDatabaseAvailability()` helper
  but pairs it with an explicit `auth()` gate —
  unlike this rating-update PATCH which has only
  the DB-availability gate.
- The public per-item rating-aggregate GET sibling
  [`item-comments-rating-query-spec.md`](item-comments-rating-query-spec.md)
  is the read-side counterpart to this PATCH.
- [`docs/questions.md`](../questions.md) — the
  Q-### entry tracking the no-auth-gate finding.
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
