---
id: spec-024-ew-120-platform-activity-feed-plan
title: 'Spec 024 — Plan'
sidebar_label: '024 Plan'
---

# Plan — `024-ew-120-platform-activity-feed`

> See [`spec.md`](./spec.md) for the **what** and **why**. This document
> is the **how**.

## Constitution check

| Article                                                | Pass | Note                                                                                                                   |
| ------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| I. Boring choices over clever ones                     | ✔    | Plain Next.js route handler + Drizzle + Node `crypto`. No new deps.                                                    |
| II. One way to do things                               | ✔    | Reuses the existing `db` instance from `lib/db/drizzle.ts` and the `safeErrorResponse` helper.                         |
| III. Spec before code                                  | ✔    | Spec + plan landed alongside code in the same PR.                                                                      |
| IV. Plugin-first when possible                         | n/a  | Platform sync is a single integration contract, not a swap-out provider.                                               |
| V. Performance budget                                  | ✔    | Three indexed Drizzle queries, no N+1. Page caps at 200 entries.                                                       |
| VI. i18n / a11y                                        | n/a  | Server-only JSON endpoint, no UI surface in this template.                                                             |
| VII. Plugin & integration boundaries                   | ✔    | All EW-120 code lives under `lib/services/platform-activity-feed/` and `app/api/platform/`.                            |
| VIII. No silent removals                               | ✔    | Net-new files only. No existing routes or schemas changed.                                                             |
| IX. Test coverage bar                                  | ⚠    | Template has no Jest/Vitest setup. Manual verification via curl + signed test request. Tracked in `docs/questions.md`. |
| X. Continual improvement                               | ✔    | `docs/log.md` updated; spec indexed in `docs/spec/README.md`.                                                          |

## File layout

```
apps/web/
  app/api/platform/activity-feed/
    route.ts                     # Next.js route handler (GET only)
  lib/services/platform-activity-feed/
    hmac.ts                      # Signature verification + canonical query
    types.ts                     # Wire types shared with platform contract
    feed-builder.ts              # Drizzle queries → normalised entries
  .env.example                   # Add PLATFORM_SYNC_SECRET / PLATFORM_WORK_ID / PLATFORM_ADMIN_BASE_URL
docs/spec/024-ew-120-platform-activity-feed/
  spec.md
  plan.md
```

## Implementation walk-through

### 1. `hmac.ts` — verification primitive

- `canonicaliseQuery({ since, limit, types })` — rebuilds the same
  sorted, URI-encoded `key=value` string the platform signs. We
  re-derive it from validated params, NOT `URL.search`, because
  proxies and Next.js can reorder / add params that would otherwise
  poison the signed string.
- `verifyPlatformSignature(...)` — runs the four-step check:
  bearer prefix → timestamp parse → drift ≤ 5 minutes → constant-time
  hex compare with equal-length buffer trick (mirrors the platform's
  `PlatformSecretGuard` so timing leaks aren't a side channel).

### 2. `feed-builder.ts` — DB → wire-shape

Three async queries fanned out in `Promise.all`, each fetching up to
`limit` rows from its source (over-fetch so global newest-first
selection isn't starved by a dominant source — the same fix we made
on the platform side as Codex P1):

- `users` LEFT JOIN `clientProfiles` → `user_registered` entries.
- `itemAuditLogs WHERE action IN ('created','status_changed')` →
  `item_created` / `item_status_changed`.
- `reports` LEFT JOIN `clientProfiles` (reporter) → `report_created`.

After merge, sort by `timestamp` DESC, slice to `limit`, compute
`nextCursor` from the tail. Convert relative `target.adminUrl` paths
into absolute URLs against `PLATFORM_ADMIN_BASE_URL` (or the request
origin as fallback).

### 3. `route.ts` — Next.js handler

- Zod-validates `since` (ISO8601), `limit` (1–200, default 50),
  `types` (csv of `users|items|reports|all`).
- Reads `PLATFORM_SYNC_SECRET` + `PLATFORM_WORK_ID` from env; missing
  → 503 (`not_provisioned`).
- Bad query → 400 (`parse_error`).
- Bad signature / drift / missing headers → 401 (`unauthorized`).
- Success → 200 with `FeedResponse`.

Pinned `runtime = 'nodejs'` (we need Node `crypto`, not the Edge
subset) and `dynamic = 'force-dynamic'` (signed/timestamp-sensitive
responses must never be cached).

## Verification

Template has no automated test runner today. Manual verification:

```bash
# from apps/web/ with .env.local set:
TS=$(node -e "console.log(new Date().toISOString())")
QS="limit=10&types=all"
SIG=$(node -e "
const c = require('crypto');
const s = process.env.PLATFORM_SYNC_SECRET;
const wid = process.env.PLATFORM_WORK_ID;
process.stdout.write(c.createHmac('sha256', s).update(\`\${process.argv[1]}:\${process.argv[2]}:\${wid}\`).digest('hex'));
" "$TS" "$QS")
curl -i "http://localhost:3000/api/platform/activity-feed?$QS" \
  -H "Authorization: Bearer $SIG" \
  -H "x-platform-ts: $TS"
```

Expected matrix:

- `200` with entries when secret + work ID match and DB has rows.
- `200` with empty `entries` and `nextCursor: null` on a clean DB.
- `401` after tampering with the query string or flipping a byte in
  the signature.
- `401` after rewinding `x-platform-ts` by 10 minutes.
- `503` after unsetting `PLATFORM_SYNC_SECRET`.

Repo-wide quality checks:

```bash
pnpm lint
pnpm tsc --noEmit
pnpm build
```

## Risks

- **Stale `clientProfiles` join** — if a user signs up but no profile
  row exists yet (race during onboarding), display name falls back
  to email → user-id. Acceptable v1 behaviour; not a correctness bug.
- **`itemAuditLogs` row volume** — busy directories could see
  thousands of audit rows per day. The `createdAt` index covers the
  `since` filter; the `limit` cap prevents pathological pages.
- **Multi-tenant deployments** — the template's `TENANT_ID` is not
  threaded into queries. A multi-tenant deployment with several
  Works on one instance would leak cross-tenant rows. Tracked in
  `docs/questions.md` with a default of "v1 single-tenant only".

## Rollout

1. Land this spec + endpoint on `develop`.
2. Platform side (ever-works PR #740) already encrypts and provisions
   `PLATFORM_SYNC_SECRET` per-Work via
   `WorkLifecycleService.createWork` / the secret-rotation endpoint.
3. Once a directory is redeployed with the env vars in place, the
   platform's "Activity Feed (pull)" UI lights up automatically.
4. Push-mode follow-up spec when product asks for it.
