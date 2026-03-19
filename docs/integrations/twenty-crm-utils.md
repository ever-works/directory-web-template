---
id: twenty-crm-utils
title: "Twenty CRM Utilities"
sidebar_label: "CRM Utilities"
sidebar_position: 2
---

# Twenty CRM Utilities

The Twenty CRM integration includes two utility modules that support the REST client: a **client utilities** module (`lib/utils/twenty-crm-client.utils.ts`) for retry logic, backoff, and error sanitization, and a **validation** module (`lib/utils/twenty-crm-validation.ts`) for Zod-based configuration validation and API key masking.

## Client Utilities

The client utilities module (`twenty-crm-client.utils.ts`) provides helpers for robust HTTP request handling with exponential backoff and retry logic.

### generateIdempotencyKey

Generates a unique UUID v4 for POST/PUT request deduplication:

```ts
import { generateIdempotencyKey } from '@/lib/utils/twenty-crm-client.utils';

const key = generateIdempotencyKey();
// "550e8400-e29b-41d4-a716-446655440000"
```

Uses `crypto.randomUUID()` for RFC 4122 compliance.

### calculateExponentialBackoff

Calculates a retry delay using exponential backoff with jitter to prevent the thundering herd problem:

```ts
import { calculateExponentialBackoff } from '@/lib/utils/twenty-crm-client.utils';

calculateExponentialBackoff(0); // ~1000ms (1s + jitter)
calculateExponentialBackoff(1); // ~2000ms (2s + jitter)
calculateExponentialBackoff(2); // ~4000ms (4s + jitter)
calculateExponentialBackoff(3); // ~8000ms (8s + jitter)
```

#### Implementation

```ts
export function calculateExponentialBackoff(
  attempt: number,
  initialBackoffMs: number = DEFAULT_INITIAL_BACKOFF_MS,
  maxBackoffMs: number = DEFAULT_MAX_BACKOFF_MS
): number {
  const exponentialDelay = initialBackoffMs * Math.pow(2, attempt);
  const jitter = Math.random() * MAX_JITTER_MS;
  return Math.min(exponentialDelay + jitter, maxBackoffMs);
}
```

The formula is: `min(initialBackoff * 2^attempt + jitter, maxBackoff)`

| Parameter | Default | Description |
|-----------|---------|-------------|
| `attempt` | Required | Current retry attempt (0-indexed) |
| `initialBackoffMs` | `DEFAULT_INITIAL_BACKOFF_MS` | Base delay in ms |
| `maxBackoffMs` | `DEFAULT_MAX_BACKOFF_MS` | Maximum delay cap in ms |

The random jitter (between 0 and `MAX_JITTER_MS`) prevents multiple clients from retrying at the same time after a server recovers.

### shouldRetryRequest

Determines whether a failed request should be retried based on the error type, HTTP status code, and attempt count:

```ts
import { shouldRetryRequest } from '@/lib/utils/twenty-crm-client.utils';

shouldRetryRequest(429, error, 1, 3); // true  (rate limited)
shouldRetryRequest(500, error, 1, 3); // true  (server error)
shouldRetryRequest(401, error, 1, 3); // false (auth error)
shouldRetryRequest(200, error, 4, 3); // false (max retries exceeded)
```

#### Retry Conditions

The function returns `true` when any of the following conditions are met and the attempt count has not exceeded `maxRetries`:

| Condition | Examples |
|-----------|---------|
| Retryable HTTP status code | `408` (Timeout), `429` (Rate Limited), `5xx` (Server Errors) |
| Timeout error | `AbortError` from fetch timeout |
| Network error | `TypeError` from fetch failures |
| Connection error | `ECONNRESET`, `ENOTFOUND`, `ETIMEDOUT`, `ECONNREFUSED` |

#### Implementation

```ts
export function shouldRetryRequest(
  status: number | undefined,
  error: Error | unknown,
  attempt: number,
  maxRetries: number
): boolean {
  if (attempt > maxRetries) return false;

  // Retryable status codes (408, 429, 5xx)
  if (status && RETRYABLE_STATUS_CODES.includes(status)) return true;

  // Timeout errors
  if (error instanceof Error && error.name === 'AbortError') return true;

  // Network errors from fetch
  if (error instanceof TypeError && error.message.includes('fetch'))
    return true;

  // Connection reset and similar errors
  if (error && typeof error === 'object' && 'code' in error) {
    const networkErrorCodes = [
      'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED',
    ];
    if (networkErrorCodes.includes(error.code)) return true;
  }

  return false;
}
```

### sanitizeErrorForLogging

Removes sensitive information (API keys) from error messages before logging:

```ts
import { sanitizeErrorForLogging } from '@/lib/utils/twenty-crm-client.utils';

const message = sanitizeErrorForLogging(
  new Error('Auth failed with key sk_live_abc123xyz'),
  'sk_live_abc123xyz'
);
// "Auth failed with key ****xyz"
```

The function handles `Error` objects, strings, and objects with a `message` property. All occurrences of the API key are replaced with a masked version.

### delay

A simple promise-based delay utility for implementing backoff pauses between retries:

```ts
import { delay } from '@/lib/utils/twenty-crm-client.utils';

await delay(2000); // Wait 2 seconds
```

## Validation Utilities

The validation module (`twenty-crm-validation.ts`) provides Zod schemas and helper functions for validating Twenty CRM configuration.

### Sync Modes

The module defines the valid synchronization modes:

```ts
const SYNC_MODE_VALUES = ['disabled', 'platform', 'direct_crm'] as const;
```

| Mode | Description |
|------|-------------|
| `disabled` | CRM sync is turned off |
| `platform` | Sync through the platform API |
| `direct_crm` | Direct connection to Twenty CRM API |

### Zod Schemas

Four schemas are provided for validating CRM configuration fields:

#### syncModeSchema

```ts
import { syncModeSchema } from '@/lib/utils/twenty-crm-validation';

syncModeSchema.parse('platform');   // OK
syncModeSchema.parse('invalid');    // Throws ZodError
```

#### baseUrlSchema

Validates that the URL is non-empty, well-formed, and uses HTTP or HTTPS:

```ts
import { baseUrlSchema } from '@/lib/utils/twenty-crm-validation';

baseUrlSchema.parse('https://crm.example.com'); // OK
baseUrlSchema.parse('ftp://crm.example.com');   // Throws (wrong protocol)
baseUrlSchema.parse('');                          // Throws (empty)
```

#### apiKeySchema

Validates that the API key is non-empty and at least 10 characters:

```ts
import { apiKeySchema } from '@/lib/utils/twenty-crm-validation';

apiKeySchema.parse('sk_live_abcdef1234'); // OK
apiKeySchema.parse('short');               // Throws (under 10 chars)
apiKeySchema.parse('');                    // Throws (empty)
```

#### updateTwentyCrmConfigSchema

The complete schema for configuration update requests:

```ts
import { updateTwentyCrmConfigSchema } from '@/lib/utils/twenty-crm-validation';

const result = updateTwentyCrmConfigSchema.safeParse({
  baseUrl: 'https://crm.example.com',
  apiKey: 'sk_live_abcdef1234',
  enabled: true,
  syncMode: 'platform',
});

if (result.success) {
  // result.data is typed as ValidatedTwentyCrmConfigUpdate
  console.log(result.data.baseUrl);
}
```

The schema validates these fields:

| Field | Type | Validation |
|-------|------|------------|
| `baseUrl` | `string` | Non-empty, valid URL, HTTP/HTTPS protocol |
| `apiKey` | `string` | Non-empty, at least 10 characters |
| `enabled` | `boolean` | Boolean value |
| `syncMode` | `string` | One of `'disabled'`, `'platform'`, `'direct_crm'` |

### maskApiKey

Masks an API key for safe display, showing only the last 4 characters:

```ts
import { maskApiKey } from '@/lib/utils/twenty-crm-validation';

maskApiKey('sk_live_abcdef1234'); // "****1234"
maskApiKey('ab');                  // "****" (too short)
maskApiKey('');                    // "****"
```

#### Implementation

```ts
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) {
    return '****';
  }
  const lastFourChars = apiKey.slice(-4);
  return `****${lastFourChars}`;
}
```

### validateTwentyCrmConfig

A convenience wrapper around `updateTwentyCrmConfigSchema.safeParse()`:

```ts
import { validateTwentyCrmConfig } from '@/lib/utils/twenty-crm-validation';

const result = validateTwentyCrmConfig(requestBody);

if (!result.success) {
  return Response.json(
    { errors: result.error.flatten().fieldErrors },
    { status: 400 }
  );
}

// result.data is validated and typed
await updateCrmConfig(result.data);
```

## Usage Pattern: Retry Loop

A typical usage combining the client utilities in a retry loop:

```ts
import {
  shouldRetryRequest,
  calculateExponentialBackoff,
  delay,
  sanitizeErrorForLogging,
  generateIdempotencyKey,
} from '@/lib/utils/twenty-crm-client.utils';

async function makeRequestWithRetry(
  url: string,
  apiKey: string,
  maxRetries: number = 3
) {
  const idempotencyKey = generateIdempotencyKey();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Idempotency-Key': idempotencyKey,
        },
      });

      if (!response.ok) {
        if (shouldRetryRequest(response.status, null, attempt, maxRetries)) {
          const backoff = calculateExponentialBackoff(attempt);
          await delay(backoff);
          continue;
        }
        throw new Error(`Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (shouldRetryRequest(undefined, error, attempt, maxRetries)) {
        const backoff = calculateExponentialBackoff(attempt);
        await delay(backoff);
        continue;
      }
      const safeMessage = sanitizeErrorForLogging(error, apiKey);
      throw new Error(safeMessage);
    }
  }
}
```

## Source Files

| File | Purpose |
|------|---------|
| `lib/utils/twenty-crm-client.utils.ts` | HTTP retry, backoff, and error sanitization |
| `lib/utils/twenty-crm-validation.ts` | Zod schemas and config validation |
| `lib/config/twenty-crm.config.ts` | Default backoff/retry constants |
