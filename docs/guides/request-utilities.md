---
id: request-utilities
title: Request Body Utilities
sidebar_label: Request Utilities
sidebar_position: 29
---

# Request Body Utilities

This page documents the request body parsing and validation utilities in `lib/utils/request-body.ts`. These utilities provide size-limited, type-safe request body reading for Next.js API route handlers.

## Overview

When handling POST/PUT/PATCH requests in API routes, you need to:

1. Enforce maximum body size to prevent abuse
2. Parse JSON safely with proper error handling
3. Track actual payload size for logging and monitoring

The `request-body.ts` module provides these capabilities through incremental stream reading with early size rejection.

## Core Function: `readBodyWithLimit`

The primary function reads request bodies with configurable size limits:

```ts
export async function readBodyWithLimit<T = unknown>(
  request: NextRequest,
  options: ReadBodyOptions
): Promise<ReadBodyResult<T>> {
  const { maxSize, parseJson = true } = options;

  // Fast path: check Content-Length header
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const sizeInBytes = parseInt(contentLength, 10);
    if (!isNaN(sizeInBytes) && sizeInBytes > maxSize) {
      throw new BodySizeLimitError(maxSize, sizeInBytes);
    }
  }

  // Get the body stream
  const body = request.body;
  if (!body) {
    return { data: null, text: "", size: 0 };
  }

  // Read with incremental size checking
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let bodyText = "";
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.length;

      if (totalBytes > maxSize) {
        reader.cancel();
        throw new BodySizeLimitError(maxSize, totalBytes);
      }

      bodyText += decoder.decode(value, { stream: true });
    }
    bodyText += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  // Parse JSON if requested
  let data: T | null = null;
  if (parseJson && bodyText.trim()) {
    try {
      data = JSON.parse(bodyText) as T;
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        data = null;
      } else {
        throw parseError;
      }
    }
  } else if (bodyText.trim()) {
    data = bodyText as unknown as T;
  }

  return { data, text: bodyText, size: totalBytes };
}
```

### How It Works

The function uses a two-phase size check:

1. **Header check (fast path):** If the `Content-Length` header is present and exceeds the limit, the request is rejected immediately without reading any body data.

2. **Stream check (streaming path):** The body is read chunk by chunk through `ReadableStream`. After each chunk, the accumulated size is checked. If the limit is exceeded mid-stream, the reader is cancelled and an error is thrown.

This approach is more reliable than trusting `Content-Length` alone, since that header can be spoofed or absent.

## Types

### ReadBodyOptions

```ts
export interface ReadBodyOptions {
  /** Maximum size in bytes */
  maxSize: number;
  /** Whether to parse as JSON (default: true) */
  parseJson?: boolean;
}
```

### ReadBodyResult

```ts
export interface ReadBodyResult<T = unknown> {
  /** Parsed body data (if parseJson is true) */
  data: T | null;
  /** Raw body text */
  text: string;
  /** Actual size in bytes */
  size: number;
}
```

The result provides three values:
- `data` -- The parsed JSON object (typed as `T`), or `null` if parsing failed or was disabled
- `text` -- The raw body string, useful for logging or custom parsing
- `size` -- The actual byte count of the body

### BodySizeLimitError

```ts
export class BodySizeLimitError extends Error {
  constructor(
    public readonly maxSize: number,
    public readonly actualSize: number
  ) {
    super(
      `Request body too large. Maximum size is ` +
        `${maxSize} bytes, received ${actualSize} bytes.`
    );
    this.name = "BodySizeLimitError";
  }
}
```

This custom error class carries both the configured limit and the actual size, making it easy to create informative error responses.

## Early Rejection: `validateContentLength`

For routes where you want to reject oversized requests before reading any data:

```ts
export function validateContentLength(
  request: NextRequest,
  maxSize: number
): boolean {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return true; // No header, can't validate early
  }

  const sizeInBytes = parseInt(contentLength, 10);
  if (isNaN(sizeInBytes) || sizeInBytes < 0) {
    return true; // Invalid header, let readBodyWithLimit handle it
  }

  if (sizeInBytes > maxSize) {
    throw new BodySizeLimitError(maxSize, sizeInBytes);
  }

  return true;
}
```

This is useful as a pre-check before expensive middleware operations.

## Usage Examples

### Basic API Route

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  readBodyWithLimit,
  BodySizeLimitError,
} from "@/lib/utils/request-body";

// Maximum 10 KB body
const MAX_BODY_SIZE = 10 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { data } = await readBodyWithLimit<{
      name: string;
      email: string;
    }>(request, { maxSize: MAX_BODY_SIZE });

    if (!data) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // data is typed as { name: string; email: string }
    return NextResponse.json({ success: true, name: data.name });
  } catch (error) {
    if (error instanceof BodySizeLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Reading Raw Text

```ts
const { text, size } = await readBodyWithLimit(request, {
  maxSize: 50 * 1024,
  parseJson: false,
});

console.log(`Received ${size} bytes of text data`);
// Process raw text...
```

### With Early Content-Length Check

```ts
import {
  validateContentLength,
  readBodyWithLimit,
  BodySizeLimitError,
} from "@/lib/utils/request-body";

export async function PUT(request: NextRequest) {
  try {
    // Reject obviously oversized requests immediately
    validateContentLength(request, 1024 * 1024);

    // Proceed with streaming read
    const { data } = await readBodyWithLimit(request, {
      maxSize: 1024 * 1024,
    });
    // ...
  } catch (error) {
    if (error instanceof BodySizeLimitError) {
      return NextResponse.json(
        {
          error: "Payload too large",
          maxSize: error.maxSize,
          actualSize: error.actualSize,
        },
        { status: 413 }
      );
    }
    throw error;
  }
}
```

## JSON Parse Error Handling

When `parseJson` is `true` (the default) and the body contains invalid JSON:

- `data` is set to `null`
- `text` contains the raw body string
- No error is thrown for `SyntaxError`

This allows callers to handle invalid JSON gracefully:

```ts
const { data, text } = await readBodyWithLimit(request, {
  maxSize: 1024,
});

if (!data) {
  console.warn("Received non-JSON body:", text);
  return NextResponse.json(
    { error: "Expected JSON body" },
    { status: 400 }
  );
}
```

Non-`SyntaxError` parse failures (which are rare) are re-thrown to be caught by outer error handlers.

## Multi-Byte Character Support

The function handles multi-byte characters (UTF-8) correctly by using `TextDecoder` in streaming mode:

```ts
bodyText += decoder.decode(value, { stream: true });
```

The `stream: true` option tells the decoder to buffer incomplete multi-byte sequences between chunks, and the final `decoder.decode()` call flushes any remaining bytes.

## Size Limits Guide

| Route Type | Suggested Limit | Rationale |
|------------|----------------|-----------|
| Contact forms | 10 KB | Plain text fields only |
| JSON API endpoints | 100 KB | Structured data |
| File metadata | 1 MB | JSON with base64 thumbnails |
| Bulk operations | 5 MB | Large batch imports |

## Related Resources

- [Error Handler Patterns](/docs/template/guides/error-handler-patterns) -- Centralized error handling for API routes
- [Rate Limiting](/docs/template/guides/rate-limiting) -- Complementary request protection
- [Email Validation](/docs/template/guides/email-validation) -- Validating parsed request fields
