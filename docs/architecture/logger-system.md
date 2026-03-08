---
id: logger-system
title: "Logger System"
sidebar_label: "Logger System"
sidebar_position: 44
---

# Logger System

## Overview

The Logger System provides a lightweight, environment-aware logging utility for consistent log output across the application. It supports four log levels (DEBUG, INFO, WARN, ERROR), context-scoped logger instances, and environment-specific formatting -- styled console output in the browser during development and plain JSON-formatted output in Node.js and production environments.

## Architecture

The module (`lib/logger.ts`) exports two items:

- **`logger`** -- A default singleton instance without a context label, suitable for general-purpose logging.
- **`Logger`** (class) -- The class itself, for creating contextual logger instances scoped to specific modules or features.

The logger follows a simple filtering strategy: in production (`NODE_ENV !== 'development'`), only WARN and ERROR messages are emitted. In development, all levels are logged. This ensures verbose debugging output does not leak into production environments.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## API Reference

### Exports

#### `logger` (Singleton)

A pre-instantiated `Logger` instance with no context. Use for quick, unscoped logging.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (Class)

##### `static create(context: string): Logger`

Factory method to create a context-scoped logger. The context string appears as a prefix in all log messages.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

Logs a debug-level message. Only emitted in development.

##### `info(message: string, data?: any): void`

Logs an informational message. Only emitted in development.

##### `warn(message: string, data?: any): void`

Logs a warning message. Emitted in all environments.

##### `error(message: string, error?: any): void`

Logs an error message. If the `error` parameter is an `Error` instance, the logger automatically extracts `message`, `stack`, and `name` properties. Emitted in all environments.

##### `api(method: string, url: string, data?: any): void`

Convenience method for logging API requests. Delegates to `debug()` with structured data. Development only.

##### `performance(label: string, duration: number): void`

Convenience method for logging performance metrics. Logs the label and duration in milliseconds. Development only.

### Internal Types

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;  // ISO 8601
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}
```

## Implementation Details

**Environment detection**: The logger checks `process.env.NODE_ENV === 'development'` at construction time and caches the result. This avoids repeated environment lookups on every log call.

**Browser styling**: When running in the browser (`typeof window !== 'undefined'`) in development mode, log messages are styled using `%c` CSS directives:

| Level | Color |
|-------|-------|
| DEBUG | `#6366f1` (indigo) |
| INFO  | `#3b82f6` (blue) |
| WARN  | `#f59e0b` (amber) |
| ERROR | `#ef4444` (red) |

**Node.js output**: In Node.js environments or production, messages are formatted as plain strings with JSON-serialized data (pretty-printed with 2-space indent).

**Error extraction**: The `error()` method detects `Error` instances and extracts `errorMessage`, `stack`, and `name` into a structured data object for easier debugging.

## Configuration

The logger requires no configuration. Its behavior is determined entirely by `NODE_ENV`:

| `NODE_ENV` | DEBUG | INFO | WARN | ERROR |
|------------|-------|------|------|-------|
| `development` | Yes | Yes | Yes | Yes |
| `production` | No | No | Yes | Yes |
| `test` | No | No | Yes | Yes |

## Usage Examples

```typescript
import { logger, Logger } from '@/lib/logger';

// General logging
logger.info('Server started on port 3000');
logger.warn('Deprecated API endpoint called', { endpoint: '/api/v1/items' });
logger.error('Failed to fetch data', new Error('Network timeout'));

// Context-scoped logging
const dbLogger = Logger.create('Database');
dbLogger.info('Connection established', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection refused'));

// API request logging
const apiLogger = Logger.create('API');
apiLogger.api('GET', '/api/items', { page: 1, limit: 20 });
apiLogger.api('POST', '/api/items', { title: 'New Item' });

// Performance tracking
const perfLogger = Logger.create('Performance');
const start = performance.now();
// ... expensive operation ...
const duration = performance.now() - start;
perfLogger.performance('fetchItems', duration);
// Output: [10:30:45] DEBUG [Performance] Performance: fetchItems { duration: "42ms" }
```

## Best Practices

- Create context-scoped loggers for each module or feature area using `Logger.create('ModuleName')` to make logs easy to filter.
- Use `debug()` for detailed tracing that should never appear in production; use `info()` for notable events.
- Always pass `Error` objects (not strings) to the `error()` method so that stack traces are automatically captured.
- Use the `api()` method for HTTP request logging to maintain consistent log structure across API calls.
- Do not rely on the logger for monitoring in production; integrate with a proper observability platform (PostHog, Sentry) for production error tracking.

## Related Modules

- [API Client Layer](/docs/template/architecture/api-client-layer) -- Uses the logger for request/response logging
- [Config Manager System](./config-manager-system) -- ConfigService logs validation results at startup
