---
id: version-sync-endpoints
title: "Version & Sync API Reference"
sidebar_label: "Version & Sync"
sidebar_position: 58
---

# Version & Sync API Reference

## Overview

The Version and Sync endpoints provide access to the application's content version information and repository synchronization controls. The version endpoint reads Git metadata from the content repository, while the sync endpoints allow triggering and monitoring background repository synchronization operations.

## Endpoints

### GET /api/version

Retrieves comprehensive version information from the Git content repository, including the latest commit details, author, branch, and synchronization timestamp. Automatically attempts to sync the repository if the Git directory is not found (useful for cold starts on Vercel).

**Request**

No parameters required.

**Response**
```typescript
{
  commit: string;       // Short commit hash (7 characters), e.g. "a1b2c3d"
  date: string;         // Commit date in ISO 8601 format
  message: string;      // Commit message
  author: string;       // Commit author name
  repository: string;   // DATA_REPOSITORY URL or "unknown"
  lastSync: string;     // Current timestamp (ISO 8601) indicating when this info was fetched
  branch?: string;      // Current Git branch (defaults to "main")
}
```

**Response Headers**
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag: "<commit-hash>-<timestamp>"`
- `Last-Modified: <commit-date>`

**Example**
```typescript
const response = await fetch('/api/version');
const version = await response.json();
// { commit: "a1b2c3d", date: "2024-01-15T10:30:00.000Z", message: "Update content", author: "John", ... }
```

### POST /api/version/sync

Triggers a manual background synchronization of the Git content repository. Prevents concurrent sync operations -- if a sync is already in progress, it returns immediately with a status message.

**Request**
```typescript
{
  options?: object;   // Reserved for future use (optional)
}
```

The request body is entirely optional.

**Response**
```typescript
// Successful sync
{
  success: true;
  timestamp: string;    // ISO 8601 completion timestamp
  duration: number;     // Operation duration in milliseconds
  message: string;      // e.g. "Repository synchronized successfully"
  details?: string;     // e.g. "Updated 5 files, 3 commits ahead"
}

// Sync already in progress
{
  success: true;
  timestamp: string;
  duration: number;
  message: "Sync was already in progress";
  details: "Another sync operation is currently running";
}

// Sync failed (status 500)
{
  success: false;
  error: string;        // e.g. "Manual sync request failed"
  timestamp: string;
  duration: number;
  details?: string;     // e.g. "Git fetch failed: network timeout"
}
```

**Example**
```typescript
const response = await fetch('/api/version/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const result = await response.json();
console.log(`Sync completed in ${result.duration}ms: ${result.message}`);
```

### GET /api/version/sync

Returns the current synchronization status including whether a sync is running, when the last sync occurred, and server uptime.

**Request**

No parameters required.

**Response**
```typescript
{
  syncInProgress: boolean;              // Whether a sync operation is currently running
  lastSyncTime: string | null;          // ISO 8601 timestamp of last successful sync
  timeSinceLastSync: number | null;     // Milliseconds since last sync
  timeSinceLastSyncHuman: string;       // Human-readable, e.g. "300s ago" or "never"
  uptime: number;                       // Server uptime in seconds
  timestamp: string;                    // Current server timestamp (ISO 8601)
}
```

**Example**
```typescript
const response = await fetch('/api/version/sync');
const status = await response.json();

if (status.syncInProgress) {
  console.log('Sync is currently running...');
} else {
  console.log(`Last synced: ${status.timeSinceLastSyncHuman}`);
}
```

## Authentication

All version and sync endpoints are **public** -- no authentication is required. These endpoints are designed for monitoring dashboards and administrative tooling.

## Error Responses

### GET /api/version

| Status | Code | Description |
|--------|------|-------------|
| 404 | `REPOSITORY_NOT_FOUND` | Content repository Git directory not found |
| 404 | `NO_COMMITS` | Repository exists but contains no commits |
| 500 | `GIT_ERROR` | Failed to read Git log or commit information |
| 500 | `VALIDATION_ERROR` | Commit data is missing required fields |
| 500 | `INTERNAL_ERROR` | Unexpected runtime error |

Error responses include a structured body with `error`, `code`, `timestamp`, and optional `details` fields.

### POST /api/version/sync

| Status | Description |
|--------|-------------|
| 200 | Sync completed successfully or was already in progress |
| 500 | Sync operation failed (includes duration and error details) |

## Rate Limiting

- **GET /api/version**: Cached for 1 minute client-side with 5-minute stale-while-revalidate. Includes ETag and Last-Modified headers for conditional requests.
- **GET /api/version/sync** and **POST /api/version/sync**: No caching (`Cache-Control: no-cache, no-store, must-revalidate`). Concurrent sync prevention ensures only one sync runs at a time.

## Related Endpoints

- [Health Endpoints](./health-endpoints) -- Database connectivity health check
- [Config Feature Endpoints](./config-feature-endpoints) -- Feature availability flags
