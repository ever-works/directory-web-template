---
id: logging
title: "Application Logging"
sidebar_label: "Logging"
sidebar_position: 21
---

# Application Logging

The template includes a lightweight Logger utility that provides consistent, context-aware logging with environment-appropriate output formatting.

**Source:** `lib/logger.ts`

## Overview

The Logger provides:
- **Four log levels** -- DEBUG, INFO, WARN, ERROR
- **Environment-aware filtering** -- DEBUG and INFO are suppressed in production
- **Contextual prefixes** -- each logger instance can be scoped to a module or component
- **Browser styling** -- colored output in development browser console
- **Structured error logging** -- automatically extracts error name, message, and stack trace
- **Specialized methods** -- API request logging and performance metric tracking

## Log Levels

| Level   | Color   | Production | Use Case                           |
|---------|---------|------------|------------------------------------|
| `DEBUG` | Purple  | Suppressed | Detailed debugging information     |
| `INFO`  | Blue    | Suppressed | General informational messages     |
| `WARN`  | Amber   | Logged     | Potential issues or deprecations   |
| `ERROR` | Red     | Logged     | Errors and exceptions              |

In production (`NODE_ENV !== 'development'`), only WARN and ERROR messages are output.

## Usage

### Default Logger

The module exports a singleton logger instance for general use:

```ts
import { logger } from '@/lib/logger';

logger.info('Application started');
logger.debug('Cache hit', { key: 'user-123', ttl: 300 });
logger.warn('Deprecated API endpoint used', { endpoint: '/api/v1/items' });
logger.error('Database connection failed', new Error('ECONNREFUSED'));
```

### Contextual Loggers

Create a logger scoped to a specific module or service for easier log filtering:

```ts
import { Logger } from '@/lib/logger';

const log = Logger.create('GeocodingService');

log.info('Geocoding address', { address: '123 Main St' });
// Output: [10:30:45] INFO [GeocodingService] Geocoding address {...}

log.error('Provider API failed', new Error('Rate limit exceeded'));
// Output: [10:30:46] ERROR [GeocodingService] Provider API failed {...}
```

The context string appears as a bracketed prefix in every log message.

## API Methods

### `debug(message, data?)`

Log detailed debugging information. Only outputs in development:

```ts
logger.debug('Query executed', {
  sql: 'SELECT * FROM items WHERE status = ?',
  params: ['active'],
  duration: '12ms'
});
```

### `info(message, data?)`

Log general informational messages. Only outputs in development:

```ts
logger.info('User signed in', { userId: 'user-123', method: 'google' });
```

### `warn(message, data?)`

Log warnings. Outputs in all environments:

```ts
logger.warn('Rate limit approaching', { remaining: 5, resetIn: '30s' });
```

### `error(message, error?)`

Log errors with automatic Error object extraction. Outputs in all environments:

```ts
try {
  await fetchData();
} catch (err) {
  logger.error('Failed to fetch data', err);
  // Automatically extracts: errorMessage, stack, name
}
```

When the second argument is an `Error` instance, the logger extracts structured data:

```ts
// Output includes:
// {
//   errorMessage: "Network request failed",
//   stack: "Error: Network request failed\n    at ...",
//   name: "Error"
// }
```

Non-Error objects are logged as-is in the data field.

### `api(method, url, data?)`

Log API requests. Only outputs in development:

```ts
logger.api('POST', '/api/items', { name: 'New Item', category: 'tools' });
// Internally calls: debug('API POST', { url: '/api/items', data: {...} })
```

### `performance(label, duration)`

Log performance metrics. Only outputs in development:

```ts
const start = performance.now();
await processItems();
const duration = performance.now() - start;

logger.performance('processItems', duration);
// Output: [10:30:45] DEBUG Performance: processItems { duration: "145.23ms" }
```

## Output Formatting

### Browser (Development)

In the browser during development, logs use `console.log` with CSS styling:

```
%c[10:30:45] INFO [MyService] message-text
```

Each level has its own color for visual distinction in the browser console.

### Server / Production

In Node.js environments or production, logs are output as plain text with JSON-serialized data:

```
[10:30:45] INFO [MyService] User signed in {"userId":"user-123"}
```

## Log Entry Structure

Internally, each log message generates a `LogEntry`:

```ts
interface LogEntry {
  timestamp: string;   // ISO 8601 timestamp
  level: LogLevel;     // DEBUG | INFO | WARN | ERROR
  context?: string;    // Module/service name
  message: string;     // Log message
  data?: any;          // Additional structured data
}
```

## Best Practices

### Create contextual loggers for services

```ts
// In a service file
const log = Logger.create('ItemAuditService');

export async function logCreation(item: ItemData) {
  log.info('Item created', { itemId: item.id, name: item.name });
}
```

### Use appropriate log levels

```ts
// DEBUG: Internal state, cache hits, query details
log.debug('Cache hit for key', { key, ttl });

// INFO: Business events, state transitions
log.info('Subscription upgraded', { userId, newPlan });

// WARN: Recoverable issues, deprecations
log.warn('Falling back to default provider');

// ERROR: Failures that need attention
log.error('Payment processing failed', error);
```

### Pass Error objects directly

```ts
// Preferred -- extracts structured error data
logger.error('Operation failed', error);

// Avoid -- loses stack trace information
logger.error('Operation failed', { message: error.message });
```

### Use performance logging for slow operations

```ts
const start = performance.now();
const results = await heavyDatabaseQuery();
logger.performance('heavyDatabaseQuery', performance.now() - start);
```

## Integration Pattern

A typical service module using the logger:

```ts
import { Logger } from '@/lib/logger';

const log = Logger.create('WebhookService');

export async function processWebhook(event: WebhookEvent) {
  log.info('Processing webhook', { type: event.type, id: event.id });

  try {
    const result = await handleEvent(event);
    log.debug('Webhook processed successfully', { result });
    return result;
  } catch (error) {
    log.error('Webhook processing failed', error);
    throw error;
  }
}
```
