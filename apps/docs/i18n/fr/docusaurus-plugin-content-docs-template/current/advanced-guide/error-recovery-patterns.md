---
id: error-recovery-patterns
title: Patterns de récupération d'erreurs
sidebar_label: Error Recovery
sidebar_position: 2
---

# Patterns de récupération d'erreurs

This guide covers the error handling architecture used throughout the template, including error boundaries, retry logic, fallback UI patterns, and centralized error reporting.

## Architecture Overview

```
Error Handling Layers
======================

  Component Layer        Service Layer         API Layer
  +--------------+       +--------------+      +--------------+
  | Error        |       | Try/Catch    |      | handleApi    |
  | Boundaries   |       | + Retry      |      | Error()      |
  | (React)      |       | + Fallback   |      | + Logging    |
  +--------------+       +--------------+      +--------------+
       |                      |                      |
       v                      v                      v
  +---------------------------------------------------+
  |           Centralized Error Handler                |
  |   lib/utils/error-handler.ts                       |
  |   - ErrorType enum                                 |
  |   - createAppError()                               |
  |   - logError()                                     |
  +---------------------------------------------------+
```

## Centralized Error Types

The `lib/utils/error-handler.ts` module defines a typed error system:

```typescript
// lib/utils/error-handler.ts
export enum ErrorType {
  AUTH = 'auth',
  CONFIG = 'config',
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export interface AppError {
  message: string;
  type: ErrorType;
  code?: string;
  originalError?: unknown;
}
```

### Creating Typed Errors

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### Structured Error Logging

```typescript
import { logError } from '@/lib/utils/error-handler';

// AppError - logs type, code, and original error
logError(appError, 'PaymentService');
// Output: [CONFIG] [PaymentService]: Missing required environment variables

// Standard Error - logs message and stack trace
logError(new Error('Connection refused'), 'Database');
// Output: [ERROR] [Database]: Connection refused

// Unknown error - logs raw value
logError('something went wrong', 'Unknown');
// Output: [UNKNOWN ERROR] [Unknown]: something went wrong
```

## API Error Handling

### Standardized API Error Responses

The `lib/api/error-handler.ts` module provides consistent HTTP error formatting:

```typescript
// lib/api/error-handler.ts
export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}
```

### Using `handleApiError` in Route Handlers

```typescript
import { handleApiError, withErrorHandling } from '@/lib/api/error-handler';

// Pattern 1: Manual try/catch
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, 'GET /api/items');
  }
}

// Pattern 2: Wrapped handler (recommended)
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const result = await createItem(body);
    return NextResponse.json({ success: true, data: result });
  }, 'POST /api/items');
}
```

### Automatic Error Classification

The `handleApiError` function automatically maps error messages to HTTP status codes:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### Production Error Sanitization

In production, internal error details are stripped from 500 responses:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## Client-Side API Error Handling

The `ApiClient` class in `lib/api/api-client-class.ts` provides automatic error handling:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### Formatted Client Errors

All API errors are normalized to the `ApiError` interface:

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Server API Client Retry Logic

The `ServerClient` in `lib/api/server-api-client.ts` includes built-in retry logic:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### Retry Decision Logic

```
Retry Decision Tree
====================

  Fetch fails
       |
       v
  Is it a network error?
  (TypeError or "fetch" in message)
       |
  +----+----+
  YES       NO
  |         |
  v         v
  attempt   Throw
  < retries?  immediately
  |
  YES -> Wait retryDelay -> Retry
  NO  -> Throw error
```

Only network-level failures trigger retries. HTTP errors (4xx, 5xx) do not retry.

### Timeout Handling

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## Environment Variable Validation

```typescript
import { validateEnvVariables, getEnvVariable } from '@/lib/utils/error-handler';

// Validate multiple variables at once
const error = validateEnvVariables(['DATABASE_URL', 'AUTH_SECRET']);
if (error) {
  logError(error, 'Startup');
  process.exit(1);
}

// Get single variable with automatic validation
const dbUrl = getEnvVariable('DATABASE_URL', true); // throws if missing
const optional = getEnvVariable('OPTIONAL_VAR', false); // returns undefined
```

## Background Job Error Recovery

Background jobs use the `LocalJobManager` error handling pattern:

```typescript
// lib/background-jobs/local-job-manager.ts
private async executeJob(id: string): Promise<void> {
  // Skip if already running (prevents overlap)
  if (jobStatus.status === 'running') return;

  try {
    await jobFunction();
    jobStatus.status = 'completed';
    this.metrics.successfulJobs++;
  } catch (error) {
    jobStatus.status = 'failed';
    jobStatus.error = error instanceof Error ? error.message : 'Unknown error';
    this.metrics.failedJobs++;
    // Job remains scheduled - will retry on next interval
  }
}
```

Jobs that fail continue to be scheduled at their regular interval, providing automatic retry behavior.

## Cache Invalidation Error Recovery

```typescript
// lib/cache-invalidation.ts
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      // Expected during render - skip silently
      console.warn(`Skipping invalidation during render (tag: ${tag})`);
    } else {
      throw error; // Unexpected errors propagate
    }
  }
}
```

## Performance Considerations

1. **Retry delays**: The 1-second retry delay prevents thundering herd effects but adds latency. For user-facing requests, consider reducing to 500ms.
2. **Timeout values**: The 30-second default is generous. For internal API calls, 10 seconds is usually sufficient.
3. **Error logging**: In production, avoid logging full stack traces for expected errors (404, 422) to reduce log noise.

## Troubleshooting

### API returns 500 with generic message in production

This is by design. Check server logs for the actual error details. The `handleApiError` function sanitizes 500 errors in production.

### Retries not working for API calls

Retries only apply to network-level failures (connection refused, DNS errors). HTTP 500 responses do not trigger retries. If you need HTTP-level retries, extend the `shouldRetry` logic.

### Background job stuck in "running" status

The `LocalJobManager` skips execution if a job is already running. If a job hangs, it blocks future executions. Consider adding a timeout wrapper around long-running jobs.

## Related Documentation

- [API Client Architecture](./api-client-architecture.md)
- [Webhook Architecture](./webhook-architecture.md)
- [Rate Limiting Architecture](./rate-limiting-architecture.md)