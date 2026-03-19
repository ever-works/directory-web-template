---
id: health-endpoints
title: "Health API Reference"
sidebar_label: "Health"
sidebar_position: 52
---

# Health API Reference

## Overview

The Health endpoint provides a simple database connectivity check for monitoring and infrastructure purposes. It executes a lightweight query to verify the database connection is active and responsive, returning status information with timestamps.

## Endpoints

### GET /api/health/database

Performs a basic database health check by executing a `SELECT 1` query to verify the database connection.

**Request**

No parameters or body required.

**Response**
```typescript
// Healthy response
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // ISO 8601 format, e.g. "2024-01-15T10:30:00.000Z"
  result: object;           // Raw query result from SELECT 1
}

// Unhealthy response (status 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**Example**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('Database is connected at', health.timestamp);
} else {
  console.error('Database is disconnected:', health.error);
}
```

## Authentication

This endpoint is **public** -- no authentication is required. It is intended for use by load balancers, uptime monitors, and deployment health checks.

## Error Responses

| Status | Description |
|--------|-------------|
| 200 | Database connection is healthy |
| 500 | Database connection failed -- returns `"unhealthy"` status with error details |

## Rate Limiting

No explicit rate limiting is applied. This endpoint is lightweight and suitable for frequent polling by monitoring systems.

## Related Endpoints

- [Config Feature Endpoints](./config-feature-endpoints) -- Feature availability flags (also depends on database)
- [Version Sync Endpoints](./version-sync-endpoints) -- System version and sync status
