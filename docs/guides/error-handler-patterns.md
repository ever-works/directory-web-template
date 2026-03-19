---
id: error-handler-patterns
title: Error Handler Patterns
sidebar_label: Error Handler Patterns
sidebar_position: 28
---

# Error Handler Patterns

This page documents the centralized error handling system used across the template. The system spans three layers: core error types (`lib/utils/error-handler.ts`), API error responses (`lib/api/error-handler.ts`), and safe error utilities (`lib/utils/api-error.ts`).

## Overview

The template implements a structured, multi-layer error handling approach:

1. **Core layer** -- Error types, creation, logging, and environment validation
2. **API layer** -- HTTP-aware error responses with status codes
3. **Safe error layer** -- Production-safe error messages that prevent information leakage

## Core Error Handler

Located at `lib/utils/error-handler.ts`, this module defines the foundational error types and utilities used throughout the application.

### Error Types

```ts
export enum ErrorType {
  AUTH = "auth",
  CONFIG = "config",
  DATABASE = "database",
  NETWORK = "network",
  VALIDATION = "validation",
  UNKNOWN = "unknown",
}
```

Each error type maps to a specific domain:

| Type | Usage |
|------|-------|
| `AUTH` | Authentication and authorization failures |
| `CONFIG` | Missing or invalid configuration (env vars, settings) |
| `DATABASE` | Database connection, query, or migration errors |
| `NETWORK` | External API calls, fetch failures, timeouts |
| `VALIDATION` | Input validation, schema violations |
| `UNKNOWN` | Unclassified errors |

### AppError Interface

```ts
export interface AppError {
  message: string;
  type: ErrorType;
  code?: string;
  originalError?: unknown;
}
```

The `AppError` interface provides structured error information:

- `message` -- Human-readable description of what went wrong
- `type` -- Category from the `ErrorType` enum
- `code` -- Machine-readable error code (e.g., `"ENV_MISSING"`, `"OAUTH_CONFIG_FAILED"`)
- `originalError` -- The original thrown error for debugging

### Creating Errors

```ts
export function createAppError(
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  code?: string,
  originalError?: unknown
): AppError {
  return { message, type, code, originalError };
}
```

Usage example:

```ts
import {
  createAppError,
  ErrorType,
} from "@/lib/utils/error-handler";

const error = createAppError(
  "Failed to configure OAuth providers",
  ErrorType.CONFIG,
  "OAUTH_CONFIG_FAILED",
  originalCaughtError
);
```

### Logging Errors

The `logError` function handles three types of error objects with context-aware formatting:

```ts
export function logError(
  error: AppError | Error | unknown,
  context?: string
): void {
  const isAppError = (err: any): err is AppError =>
    err &&
    typeof err === "object" &&
    "type" in err &&
    Object.values(ErrorType).includes(err.type);

  if (isAppError(error)) {
    console.error(
      `[${error.type.toUpperCase()}]` +
        `${context ? ` [${context}]` : ""}: ` +
        `${error.message}`
    );
    if (error.code) console.error(`Error code: ${error.code}`);
    if (error.originalError)
      console.error("Original error:", error.originalError);
  } else if (error instanceof Error) {
    console.error(
      `[ERROR]${context ? ` [${context}]` : ""}: ${error.message}`
    );
    console.error(error.stack);
  } else {
    console.error(
      `[UNKNOWN ERROR]${context ? ` [${context}]` : ""}: `,
      error
    );
  }
}
```

Log output examples:

```
[CONFIG] [Auth Config]: Missing required environment variables: GOOGLE_CLIENT_SECRET
Error code: ENV_MISSING

[ERROR] [API]: Cannot read property 'id' of undefined
    at getUser (/lib/services/user.ts:42:15)

[UNKNOWN ERROR] [Webhook]: { status: 503, body: "Service Unavailable" }
```

### Environment Variable Validation

```ts
export function validateEnvVariables(
  variables: string[]
): AppError | undefined {
  const missingVars = variables.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    return createAppError(
      `Missing required environment variables: ${missingVars.join(", ")}`,
      ErrorType.CONFIG,
      "ENV_MISSING"
    );
  }

  return undefined;
}
```

Returns `undefined` when all variables are present, or an `AppError` describing which ones are missing.

### Safe Environment Variable Access

```ts
export function getEnvVariable(
  name: string,
  required = true
): string | undefined {
  const value = process.env[name]?.trim();

  if (!value && required) {
    const error = validateEnvVariables([name]);
    logError(error);
    throw error;
  }

  return value;
}
```

This function trims whitespace and throws a structured `AppError` for missing required variables.

## API Error Handler

Located at `lib/api/error-handler.ts`, this module bridges the core error system with HTTP responses.

### HTTP Status Enum

```ts
export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}
```

### Creating API Error Responses

```ts
export function createApiErrorResponse(
  message: string,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  code?: string
): NextResponse<ApiErrorResponse> {
  if (status < 100 || status > 599) {
    status = HttpStatus.INTERNAL_SERVER_ERROR;
  }
  return NextResponse.json(
    { error: { message, code, status } },
    { status }
  );
}
```

The response shape follows a consistent structure:

```json
{
  "error": {
    "message": "Resource not found",
    "code": "NOT_FOUND",
    "status": 404
  }
}
```

### Automatic Error Classification

The `handleApiError` function automatically maps error messages to appropriate HTTP status codes:

```ts
export function handleApiError(
  error: unknown,
  context = "API"
): NextResponse<ApiErrorResponse> {
  logError(error, context);

  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = "An unexpected error occurred";

  if (error instanceof Error) {
    message = error.message;

    // Auto-detect status from error properties
    if ("status" in error) status = (error as any).status;

    // Auto-detect from message content
    if (
      message.includes("authentication") ||
      message.includes("unauthorized")
    )
      status = HttpStatus.UNAUTHORIZED;

    if (
      message.includes("validation") ||
      message.includes("invalid")
    )
      status = HttpStatus.UNPROCESSABLE_ENTITY;

    if (
      message.includes("not found") ||
      message.includes("missing")
    )
      status = HttpStatus.NOT_FOUND;
  }

  // Hide internal details in production
  if (
    process.env.NODE_ENV === "production" &&
    status === HttpStatus.INTERNAL_SERVER_ERROR
  ) {
    message = "An unexpected error occurred";
  }

  return createApiErrorResponse(message, status);
}
```

### Wrapping Route Handlers

The `withErrorHandling` higher-order function wraps async route handlers with automatic error catching:

```ts
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = "API"
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) =>
    handleApiError(error, context)
  );
}
```

Usage in an API route:

```ts
import { withErrorHandling } from "@/lib/api/error-handler";

export async function GET() {
  return withErrorHandling(async () => {
    const data = await fetchSomething();
    return NextResponse.json({ data });
  }, "GET /api/items");
}
```

## Safe Error Utilities

Located at `lib/utils/api-error.ts`, these functions prevent information leakage in production.

### Safe Error Response

```ts
export function safeErrorResponse(
  error: unknown,
  fallbackMessage: string,
  status: number = 500
): NextResponse {
  const detail =
    error instanceof Error ? error.message : String(error);

  // Always log full details server-side
  console.error(`[API Error] ${fallbackMessage}:`, detail);

  const message =
    process.env.NODE_ENV === "development"
      ? detail
      : fallbackMessage;

  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}
```

**In development:** Returns the actual error message for debugging.
**In production:** Returns only the generic `fallbackMessage`.

### Safe Error Message

```ts
export function safeErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (process.env.NODE_ENV === "development") {
    return error instanceof Error
      ? error.message
      : String(error);
  }
  return fallbackMessage;
}
```

Use this when you need the message string without creating a full `NextResponse`.

## Error Flow Summary

```
Error occurs
  |
  +-- createAppError() -- Structured error object
  |
  +-- logError() -- Console output with context
  |
  +-- API route?
  |     +-- handleApiError() -- Auto-classify, log, respond
  |     +-- OR safeErrorResponse() -- Generic fallback
  |
  +-- Auth error?
  |     +-- handleAuthError() -- Provider-specific messages
  |
  +-- Config error?
        +-- validateEnvVariables() -- Check env vars
        +-- getEnvVariable() -- Throw on missing
```

## Best Practices

1. **Always use `createAppError`** instead of bare `new Error()` for domain errors
2. **Include context** when calling `logError` to make logs searchable
3. **Use `withErrorHandling`** in API routes to ensure errors never go unhandled
4. **Use `safeErrorResponse`** when you need to guarantee no internal details leak
5. **Set error codes** to enable programmatic error handling by API consumers

## Related Resources

- [Error Handling Guide](/docs/template/guides/error-handling) -- General error handling patterns
- [Logging](/docs/template/guides/logging) -- Application logging system
- [Instrumentation](/docs/template/guides/instrumentation) -- How startup errors are captured
