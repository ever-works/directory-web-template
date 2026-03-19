---
id: internal-endpoints
title: "Internal & System Endpoints"
sidebar_label: "Internal & System"
sidebar_position: 17
---

# Internal & System Endpoints

These endpoints provide system-level operations: database initialization, feature flag configuration, health checks, version information, and repository synchronization. Most are used by the platform itself rather than by end users.

**Source files:**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/internal/db-init` | Dev only | Trigger database initialization |
| GET | `/api/config/features` | None | Get feature availability flags |
| GET | `/api/health/database` | None | Database health check |
| GET | `/api/version` | None | Get application version info |
| GET | `/api/version/sync` | None | Get sync status |
| POST | `/api/version/sync` | None | Trigger manual repository sync |

---

## GET `/api/internal/db-init`

Triggers automatic database migration and seeding if the database is not yet initialized.

### Security

This endpoint is **only available in development mode**. In production, it returns 403:

```ts
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json(
    { error: 'Not available in production' },
    { status: 403 }
  );
}
```

### Runtime Configuration

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Response: 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Response: 403 (Production)

```json
{
  "error": "Not available in production"
}
```

---

## GET `/api/config/features`

Returns current feature availability flags based on system configuration (primarily database availability). This is a **public endpoint** used by the frontend to gracefully handle missing features.

### Response: 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### Response: 200 (No Database)

When the database is not configured, all features are disabled:

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### Caching

Successful responses are cached for 5 minutes with stale-while-revalidate:

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

Error responses use `Cache-Control: no-cache`.

### Error Behavior

On error, the endpoint returns all features as disabled (with a 500 status) to ensure the frontend degrades gracefully.

---

## GET `/api/health/database`

A lightweight health check that tests the database connection by executing `SELECT 1`.

### Response: 200 (Healthy)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Response: 500 (Unhealthy)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Use Cases

- Kubernetes/Docker liveness and readiness probes
- Monitoring dashboards
- Deployment verification scripts
- Load balancer health checks

---

## GET `/api/version`

Retrieves comprehensive version information from the Git content repository, including the latest commit details, author information, branch, and synchronization status.

### How It Works

1. Validates that the Git directory exists at the content path
2. If the `.git` directory is missing, attempts to sync (useful for cold starts on Vercel)
3. Reads the latest commit using `isomorphic-git`
4. Returns formatted version info with caching headers

### Response: 200

```json
{
  "commit": "a1b2c3d",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new feature for user management",
  "author": "John Doe",
  "repository": "https://github.com/user/repo.git",
  "lastSync": "2024-01-15T10:35:00.000Z",
  "branch": "main"
}
```

### Response Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | 1-minute client cache |
| `ETag` | `"a1b2c3d-1705312200000"` | Based on commit hash |
| `Last-Modified` | `Mon, 15 Jan 2024 10:30:00 GMT` | Commit timestamp |

### Error Responses

All errors include a structured format with error code:

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `REPOSITORY_NOT_FOUND` | Git directory does not exist |
| 404 | `NO_COMMITS` | Repository has no commits |
| 500 | `GIT_ERROR` | Failed to read commit information |
| 500 | `VALIDATION_ERROR` | Commit data is missing required fields |
| 500 | `INTERNAL_ERROR` | Unexpected error |

```json
{
  "error": "Data repository not found",
  "code": "REPOSITORY_NOT_FOUND",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "details": "Git directory not found at: /path/to/content/.git"
}
```

---

## GET `/api/version/sync`

Returns the current synchronization status including whether a sync is in progress, when the last sync occurred, and server uptime.

### Response: 200

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": 300000,
  "timeSinceLastSyncHuman": "300s ago",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Response: 200 (Never Synced)

```json
{
  "syncInProgress": false,
  "lastSyncTime": null,
  "timeSinceLastSync": null,
  "timeSinceLastSyncHuman": "never",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## POST `/api/version/sync`

Manually triggers a background synchronization of the Git content repository. Prevents concurrent sync operations (if a sync is already running, it returns success with an informational message).

### Request Body

Optional. Reserved for future use:

```json
{}
```

### Response: 200 (Sync Complete)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 1250,
  "message": "Repository synchronized successfully",
  "details": "Updated 5 files, 3 commits ahead"
}
```

### Response: 200 (Already In Progress)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 50,
  "message": "Sync was already in progress",
  "details": "Another sync operation is currently running"
}
```

### Response: 500

```json
{
  "success": false,
  "error": "Manual sync request failed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 800,
  "details": "Git fetch failed: network timeout"
}
```

Both GET and POST responses include `Cache-Control: no-cache, no-store, must-revalidate` to prevent stale sync status.

---

## Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/internal/db-init/route.ts` | Database initialization endpoint |
| `template/app/api/config/features/route.ts` | Feature flags endpoint |
| `template/app/api/health/database/route.ts` | Database health check |
| `template/app/api/version/route.ts` | Version info endpoint |
| `template/app/api/version/sync/route.ts` | Sync trigger and status |
| `template/lib/db/initialize.ts` | Database initialization logic |
| `template/lib/config/feature-flags.ts` | Feature flag resolution |
| `template/lib/services/sync-service.ts` | Repository sync service |
| `template/lib/lib.ts` | Content path and filesystem utilities |
