---
id: sponsor-ads-user-id-query-spec
title: E2E Sponsor Ads User [id] Query Spec (apps/web-e2e/tests/api/sponsor-ads-user-id-query.spec.ts)
sidebar_label: E2E Sponsor Ads User [id] Query Spec
sidebar_position: 607
---

# E2E Sponsor Ads User [id] Query Spec — `apps/web-e2e/tests/api/sponsor-ads-user-id-query.spec.ts`

Per-source-file reference for the Playwright e2e suite's
**per-id user-scoped sponsor-ad lookup GET dynamic-
segment / header smoke spec** paired with
[`apps/web-e2e/tests/api/sponsor-ads-user-id-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-user-id-query.spec.ts).

This is the **first per-source-file dynamic-segment
GET smoke** the docs tree publishes that pins a
**404-mask user-scoped IDOR** — when `sponsorAd.
userId !== session.user.id`, the handler returns 404
`'Sponsor ad not found'` (NOT 403 'Forbidden') with
the SAME envelope as the genuine not-found branch.
UNIQUE: the FIRST per-source-file dynamic-segment
GET smoke pinning a 404-mask security pattern on a
USER-OWNED resource (the surveys-id sibling pins a
404-mask on STATUS-gated admin resources; this
sponsor-ads-user-id sibling pins the pattern on a
per-user-ownership resource).

## What's distinct from EVERY prior dynamic-segment GET smoke

- **404-mask user-scoped IDOR** — UNIQUE: the FIRST
  per-source-file dynamic-segment GET smoke pinning
  a 404-mask security pattern on a per-user-
  ownership resource. The 404 envelope for cross-
  user access is BYTE-IDENTICAL to the 404 envelope
  for genuinely-non-existent IDs.
- **TWO-key 401 envelope** `{ success: false,
  error: 'Unauthorized' }`.
- **TWO-key 404 envelope** `{ success: false,
  error: 'Sponsor ad not found' }` — used for BOTH
  not-found AND IDOR violations (intentional
  masking).
- **TWO-key success payload** `{ success: true,
  data: <sponsorAd> }`.
- **TWO-key 500 envelope** `{ success: false,
  error: 'Failed to fetch sponsor ad' }`.

## Why this spec is the first user-scoped 404-mask dynamic-segment GET smoke

The route under test
([`apps/web/app/api/sponsor-ads/user/[id]/route.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web/app/api/sponsor-ads/user/[id]/route.ts))
exports only `GET`. The handler combines:

1. **`auth()` session lookup** — `!session?.user?.id`
   → 401 TWO-key.
2. **`{ id } = await params`** dynamic-segment
   resolution.
3. **`getSponsorAdById(id)`** — load-bearing DB
   read.
4. **`!sponsorAd` check** — 404 TWO-key `{ success:
   false, error: 'Sponsor ad not found' }`.
5. **404-mask user-scoped IDOR check** —
   `sponsorAd.userId !== session.user.id` → 404 with
   the SAME envelope (intentional masking of cross-
   user access).
6. **Success payload** — `{ success: true, data:
   <sponsorAd> }` with status 200.
7. **Outer catch** — 500 TWO-key `{ success: false,
   error: 'Failed to fetch sponsor ad' }`.
8. **Method-resolution surface** — the route exports
   ONLY `GET`. `POST` / `PUT` / `PATCH` / `DELETE`
   must round-trip to a `< 500` status.

## How the spec walks its scenario tree

The spec emits **a single header bulk-loop walk** (~6
headers) and **eight hand-written scenarios**.

| Block                                                                                      | Purpose                                                                                                                                |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Header bulk-loop walk                                                                      | ~6 headers.                                                                                                                            |
| `test('… returns 401 with the canonical TWO-key envelope', …)`                             | Pins the canonical envelope.                                                                                                           |
| `test('… 401 envelope shape has exactly success and error keys', …)`                       | Strict envelope-shape assertion.                                                                                                       |
| `test('… does NOT echo any of the post-auth messages on the unauth branch', …)`            | Pins the gate-before-post-auth order.                                                                                                  |
| `test('… does NOT branch on side-channel cookies / headers', …)`                           | Side-channel walk.                                                                                                                     |
| `test('… cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx', …)`               | Method-resolution walk. GET is the only exported method.                                                                               |
| `test('… getSponsorAdById is NOT entered on the unauth branch', …)`                        | CRITICAL — pins that no `data.userId` / `data.itemSlug` / etc. fields from a sponsor-ad row are leaked.                                |
| `test('… cross-id invariance — different IDs produce IDENTICAL unauth envelope', …)`       | Pins that the auth gate fires BEFORE any per-id branch (the 404-mask is unreachable on unauth).                                        |
| `test('… catch-branch 'Failed to fetch sponsor ad' is NOT entered on the unauth branch', …)` | Pins the gate-before-catch-dispatcher order.                                                                                           |

## What the spec asserts

1. **Bulk-loop `< 500` contract** — every header
   permutation must round-trip to a `< 500` status.
2. **Canonical TWO-key envelope** `{ success:
   false, error: 'Unauthorized' }` on unauth.
3. **Strict TWO-key envelope-shape preservation**.
4. **Gate-before-post-auth invariant**.
5. **Side-channel isolation**.
6. **Cross-method invariance** — GET is the only
   exported method.
7. **Gate-before-DB-read invariant** (CRITICAL).
8. **Cross-id invariance** — different IDs produce
   IDENTICAL unauth envelopes.
9. **Gate-before-catch-dispatcher invariant**.

## See also

- The companion sponsor-ads cancel sibling
  [`sponsor-ads-user-id-cancel-body-spec.md`](sponsor-ads-user-id-cancel-body-spec.md)
  uses POST verb on the same `[id]` segment.
- The companion sponsor-ads renew sibling
  [`sponsor-ads-user-id-renew-body-spec.md`](sponsor-ads-user-id-renew-body-spec.md)
  uses POST verb on the same `[id]` segment.
- The collection-level GET + POST sibling
  [`sponsor-ads-user-method-spec.md`](sponsor-ads-user-method-spec.md)
  uses Zod-safeParse on both query and body.
- The surveys-id 404-mask sibling
  [`surveys-id-method-spec.md`](surveys-id-method-spec.md)
  uses the 404-mask pattern on STATUS-gated admin
  resources (vs this user-ownership pattern).
- [Spec 010 — End-to-End Test Coverage](../spec/010-e2e-test-coverage/spec.md)
  governs the e2e suite at large.
