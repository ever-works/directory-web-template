---
id: sentry-logs
title: Sentry Logs Configuration
sidebar_label: Sentry Logs
sidebar_position: 7
---

# Sentry Logs Configuration

This document explains how to configure and use Sentry Logs in the Template repository and Ever Works repository.

## Overview

Sentry Logs provides centralized log management, allowing you to capture, forward, and analyze application logs in Sentry's Logs Explorer. All logs are automatically forwarded to Sentry when enabled, providing a unified view of application behavior across different environments.

## Features

- ✅ Automatic log forwarding to Sentry
- ✅ Support for all log levels (debug, info, warn, error)
- ✅ Context-aware logging with automatic tagging
- ✅ Environment-specific configuration
- ✅ Structured logging with metadata support
- ✅ Integration with existing logger utility

## Configuration

### Environment Variables

Add these variables to your `.env.local` file for local development:

```env
# Sentry Configuration (Required for Logs)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# Enable Sentry in development (optional, defaults to production only)
SENTRY_ENABLE_DEV=true

# Sentry Debug Mode (optional)
SENTRY_DEBUG=false

# Sentry Logs Configuration
SENTRY_LOGS_ENABLED=true  # Enable/disable Sentry Logs (default: true)
SENTRY_LOGS_LEVEL=info    # Minimum log level to capture (default: info)
```

### Environment-Specific Setup

#### Local Development

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # Capture all logs in development
```

#### Development/Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info  # Capture info, warn, and error logs
```

#### Production

```env
SENTRY_ENABLE_DEV=false  # Not needed in production
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # Capture only warnings and errors in production
```

## Usage

### Basic Logging

The logger automatically forwards logs to Sentry when enabled:

```typescript
import { logger } from '@/lib/logger';

// Info log
logger.info('User logged in', { userId: '12345' });

// Warning log
logger.warn('Rate limit approaching', { current: 90, limit: 100 });

// Error log
logger.error('Payment failed', { orderId: '67890', error: errorObject });

// Debug log (only in development)
logger.debug('API request', { method: 'GET', url: '/api/users' });
```

### Contextual Logging

Create a logger with a specific context for better organization:

```typescript
import { Logger } from '@/lib/logger';

const paymentLogger = Logger.create('PaymentService');

paymentLogger.info('Processing payment', { amount: 100, currency: 'USD' });
paymentLogger.error('Payment failed', error);
```

### Log Levels

The logger supports four log levels, automatically mapped to Sentry severity levels:

| Logger Level | Sentry Level | Description |
|-------------|-------------|-------------|
| `DEBUG` | `debug` | Detailed debugging information (development only) |
| `INFO` | `info` | General informational messages |
| `WARN` | `warning` | Warning messages for potential issues |
| `ERROR` | `error` | Error messages for failures |

## How It Works

### Initialization

Sentry Logs is enabled in both client and server instrumentation:

1. **Server-side** (`instrumentation.ts`): Initializes Sentry for Node.js runtime
2. **Client-side** (`instrumentation-client.ts`): Initializes Sentry for browser runtime

Both configurations include:
```typescript
_experiments: {
  enableLogs: SENTRY_LOGS_ENABLED,
}
```

### Log Forwarding

The logger utility (`lib/logger.ts`) automatically:
1. Checks if Sentry Logs is enabled
2. Formats log entries with context and metadata
3. Forwards logs to Sentry using `Sentry.captureMessage()` with proper tags and levels
4. Falls back gracefully if Sentry is unavailable

### Log Structure

Each log entry sent to Sentry includes:
- **Message**: The log message with optional context prefix
- **Level**: Severity level (debug, info, warning, error)
- **Tags**: 
  - `logLevel`: The original log level
  - `logType`: Always `application_log`
  - `context`: Optional context identifier
- **Extra Data**: 
  - `data`: Any additional data provided
  - `timestamp`: ISO timestamp

## Viewing Logs in Sentry

### Logs Explorer

1. Navigate to your Sentry project
2. Go to **Logs** → **Logs Explorer**
3. Use filters to find specific logs:
   - Filter by `logLevel` tag (debug, info, warn, error)
   - Filter by `context` tag to see logs from specific modules
   - Filter by `logType:application_log` to see only application logs

### Querying Logs

Example queries in Sentry Logs Explorer:

```
# All error logs
logLevel:error

# Logs from a specific context
context:PaymentService

# All application logs
logType:application_log

# Errors from a specific time range
logLevel:error timestamp:>2024-01-01
```

## Integration with Monitoring Package

If you're using the `@ever-works/monitoring` package, ensure it's configured to work with Sentry Logs:

1. The monitoring package should initialize Sentry with logs enabled
2. The logger utility in this template will automatically forward logs to Sentry
3. Both systems work together to provide comprehensive monitoring

## Troubleshooting

### Logs Not Appearing in Sentry

1. **Check DSN Configuration**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   Ensure the DSN is correctly set and accessible.

2. **Verify Logs Are Enabled**
   ```bash
   echo $SENTRY_LOGS_ENABLED
   ```
   Should be `true` for logs to be forwarded.

3. **Check Sentry Initialization**
   - Verify `SENTRY_ENABLED` is true
   - Check browser console for Sentry initialization errors
   - Verify `_experiments.enableLogs` is set to `true`

4. **Check Log Level Filtering**
   - Ensure your log level meets the `SENTRY_LOGS_LEVEL` threshold
   - Debug logs are only captured if level is set to `debug`

### Performance Considerations

- Logs are sent asynchronously and won't block your application
- In production, consider setting `SENTRY_LOGS_LEVEL=warn` to reduce log volume
- Sentry automatically handles rate limiting and batching

### Disabling Logs

To disable Sentry Logs without disabling Sentry entirely:

```env
SENTRY_LOGS_ENABLED=false
```

The logger will continue to work normally, but logs won't be forwarded to Sentry.

## Best Practices

1. **Use Appropriate Log Levels**
   - Use `debug` for detailed development information
   - Use `info` for general application flow
   - Use `warn` for potential issues that don't break functionality
   - Use `error` for actual errors and exceptions

2. **Include Context**
   - Use contextual loggers for better organization
   - Include relevant metadata in log data

3. **Avoid Sensitive Data**
   - Never log passwords, tokens, or PII
   - Sanitize data before logging

4. **Production Configuration**
   - Set `SENTRY_LOGS_LEVEL=warn` in production
   - Monitor your Sentry quota usage
   - Review logs regularly for patterns

## Validation Checklist

- [ ] Sentry DSN is configured correctly
- [ ] `SENTRY_LOGS_ENABLED=true` is set
- [ ] Logs appear in Sentry Logs Explorer
- [ ] Log levels are properly mapped (info, warn, error, debug)
- [ ] Context tags are visible in Sentry
- [ ] Logs work in both local and deployment environments
- [ ] QA can see and filter logs in Sentry Logs Explorer

## Additional Resources

- [Sentry Logs Documentation](https://docs.sentry.io/product/logs/)
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Logs Explorer Guide](https://docs.sentry.io/product/logs/explorer/)

