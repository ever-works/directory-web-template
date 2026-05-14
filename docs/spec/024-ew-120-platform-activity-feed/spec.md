---
id: spec-024-ew-120-platform-activity-feed
title: 'Spec 024 — EW-120 Platform Activity Feed (pull-mode endpoint)'
sidebar_label: '024 Activity Feed (pull)'
---

# Feature spec — `024-ew-120-platform-activity-feed`

> **Status:** proposed.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code),
> VII (Plugin & Integration Boundaries),
> IX (Test Coverage Bar — Definition of Done).

## 1. Summary

The Ever Works platform (EW-120) needs a way to surface activity that
happens **on the deployed directory site** — new user registrations,
user-submitted items, items moving through admin review, and content
reports — back to the operator inside the platform's "Activity Feed"
tab. The platform supports two transports for that:

- **push** — the deployed site `POST`s each event to the platform's
  `/api/activity-log/ingest` endpoint as it happens.
- **pull** — the platform reaches into the deployed site over HMAC and
  asks for a paginated window of recent events.

This spec covers **only the pull-mode endpoint** on the directory
template — `GET /api/platform/activity-feed`. Push-mode emission from
the template is a separate, follow-up spec.

The endpoint authenticates each request with a per-Work HMAC-SHA256
signature, returns a normalised JSON window of the three event sources
already backed by the template's Drizzle schema (`users`,
`itemAuditLogs`, `reports`), and is wire-compatible with the
platform's `DirectoryWebsiteClient` (see the ever-works repo,
`apps/api/src/works/activity-feed/directory-website-client.service.ts`).

## 2. Motivation

- The platform PR
  ([ever-works#740](https://github.com/ever-works/ever-works/pull/740))
  built the entire pull-side stack — schema migration, encrypted
  per-Work secret store, HTTP client with retry / timeout / drift
  checking, mode-aware service routing, UI banner + degraded states —
  but it has no upstream to talk to. Without this endpoint on each
  deployed site, `activitySyncMode === 'pull'` always degrades to
  `not_provisioned`.
- Operators are asking for a feed of "what happened on my directory"
  without us having to invent a brand-new transport. Pull mode lets
  the deployed site stay passive: no outbound traffic when nobody is
  looking, exact-once delivery on demand, no retry queues. That
  removes a whole class of failure modes from the directory side.
- Push-only would require every deployed instance to be reachable
  from the platform's outbound IPs AND keep a working secret pinned
  in env at all times. Pull lets the platform initiate, which is the
  shape we already have for every other platform-→-template surface
  (cron pings, sponsor-ad fan-out, etc.).

## 3. Goals

- Expose `GET /api/platform/activity-feed` that, given a valid HMAC
  signature, returns a JSON page of the three event sources.
- Verify each request with a constant-time HMAC-SHA256 comparison
  matching the platform's `DirectoryWebsiteClient.sign` scheme
  exactly: `HMAC-SHA256(secret, ${timestamp}:${queryString}:${workId})`.
- Reject stale requests (timestamp drift > 5 minutes) and replays.
- Return ≤ 200 entries per page, cursor-paginated by timestamp.
- Default to `503 not_provisioned` when env vars are missing so the
  platform surfaces a clean "configure pull mode" banner rather than
  a runtime error.
- Stay on the same Node.js runtime + Drizzle stack the rest of the
  template uses — no new dependencies, no edge runtime.

## 4. Non-goals

- **Push emission from this template** — separate follow-up spec.
- **Comments / votes / favourites / item views** — these exist in the
  schema but aren't part of the EW-120 v1 entry-type vocabulary on
  the platform side. We can extend later without breaking the wire.
- **Multi-tenant fan-out** — one deployed site = one Work. The
  template's tenant column is independent of the platform's Work ID.
- **Rate limiting** — the platform is the sole caller and self-throttles.
- **Admin UI for inspecting recent pulls** — out of scope for v1.

## 5. User-visible behaviour

Operators don't see this endpoint directly. The behaviour they observe
is in the Ever Works platform UI:

- Before any deploy that wires the env vars in, the platform shows a
  "pull mode is not provisioned on this directory" banner with a
  link to settings.
- Once `PLATFORM_SYNC_SECRET` + `PLATFORM_WORK_ID` are set and the
  site is redeployed, the Activity Feed tab starts showing
  `directory-site` entries (users / items / reports), merged into
  the existing platform-side feed and sorted newest-first.
- If the secret falls out of sync (rotation gap, stale env), the
  platform falls back to `unauthorized` and the operator gets a
  "rotate secret" CTA on the platform settings page.

## 6. Wire contract

### Request

```
GET /api/platform/activity-feed?since=<ISO8601>&limit=<int>&types=<csv>
Authorization: Bearer <hex-hmac>
x-platform-ts: <ISO8601>
User-Agent: ever-works-platform/activity-feed
```

- `since` (optional) — exclusive lower bound on entry timestamp.
- `limit` (1–200, default 50) — page size.
- `types` — comma-separated, one or more of `users,items,reports,all`.

The HMAC is computed over the **canonical** form of the query (sorted
lexicographically, URI-encoded, `since` omitted when absent):

```
HMAC-SHA256(secret, `${timestamp}:${canonicalQuery}:${workId}`)
```

### Response

```json
{
	"entries": [
		{
			"id": "user:<uuid>",
			"type": "user_registered",
			"timestamp": "2026-05-14T16:00:00.000Z",
			"summary": "alice signed up",
			"actor": { "id": "<uuid>", "name": "alice", "email": "a@example.com" },
			"target": { "id": "<uuid>", "type": "user", "name": "alice", "adminUrl": "https://site/admin/users/<uuid>" }
		}
	],
	"nextCursor": "2026-05-14T15:55:00.000Z",
	"serverTime": "2026-05-14T16:01:23.456Z"
}
```

- `type` ∈ `user_registered | item_created | item_status_changed | report_created`.
- `target.type` ∈ `user | item | report`.
- `nextCursor` is the timestamp of the last entry returned (exclusive)
  or `null` when the page wasn't full.
- `serverTime` is used by the platform for drift detection (rejects
  if > 5 minutes off).

### Status codes

| Status | Meaning on platform side                              |
| ------ | ----------------------------------------------------- |
| 200    | success                                               |
| 400    | `parse_error` — bad query (platform stops retrying)   |
| 401    | `unauthorized` — bad signature / drift / missing hdrs |
| 503    | `not_provisioned` — env vars missing                  |

## 7. Data sources

| DB table         | Filter                                                | Entry `type`            | Target type |
| ---------------- | ----------------------------------------------------- | ----------------------- | ----------- |
| `users`          | LEFT JOIN `clientProfiles` for display name           | `user_registered`       | `user`      |
| `itemAuditLogs`  | `action IN ('created','status_changed')`              | `item_created` / `item_status_changed` | `item` |
| `reports`        | LEFT JOIN `clientProfiles` for reporter name          | `report_created`        | `report`    |

Each source is queried with a per-source over-fetch of `limit` rows
(not `limit / sourceCount`), then merged globally by timestamp DESC
and trimmed to `limit`. This avoids the same dominant-source starvation
bug the platform side just fixed (EW-120 Codex P1, commit `4070ec08`).

## 8. Environment variables

| Var                       | Required | Purpose                                          |
| ------------------------- | -------- | ------------------------------------------------ |
| `PLATFORM_SYNC_SECRET`    | yes      | HMAC secret, per-Work, distributed by platform   |
| `PLATFORM_WORK_ID`        | yes      | UUID of this directory's Work                    |
| `PLATFORM_ADMIN_BASE_URL` | no       | Absolute base for `target.adminUrl` (defaults to request origin) |

Both required vars blank → 503 `not_provisioned`. This is the only
"feature flag" — there is no separate enable/disable toggle.

## 9. Security posture

- Constant-time HMAC compare (`timingSafeEqual` against an
  equal-length buffer regardless of attacker-controlled token length).
- Work ID is part of the signed payload so a leaked secret for one
  Work can't be replayed against another Work hosted on the same
  template instance (multi-tenant deployments).
- 5-minute drift window mitigates replay; the platform applies the
  same cap on our `serverTime`.
- Endpoint reads the canonical query from validated params, not from
  `URL.search` — proxies / Next.js can normalise / add params, and we
  must not let those into the signed string.
- No tenant data crosses the boundary beyond what the platform needs
  to render an admin link (id, display name, action type, timestamp).

## 10. Open questions

- Do we need a `tenantId` filter when `TENANT_ID` is set? V1 returns
  everything; multi-tenant deployments are extremely rare on this
  template today. Tracked in `docs/questions.md` with a default of
  "no filter".
- Should `itemAuditLogs.action = 'reviewed'` map to
  `item_status_changed` too? V1 omits it because the platform vocab
  doesn't have a distinct "reviewed" state. Default: only `created`
  + `status_changed`.

## 11. References

- Platform PR: [ever-works#740](https://github.com/ever-works/ever-works/pull/740)
- Platform ADR-004: `docs/specs/decisions/004-activity-feed-push-vs-pull.md`
  (in the ever-works repo)
- Platform client implementation:
  `apps/api/src/works/activity-feed/directory-website-client.service.ts`
- Platform entry-type contract:
  `apps/api/src/works/activity-feed/dto/feed-entry.dto.ts`
