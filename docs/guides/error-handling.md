---
id: error-handling
title: "Error Handling"
sidebar_label: "Error Handling"
sidebar_position: 15
---

# Error Handling

The template implements a multi-layered error handling strategy covering API responses, client-side error boundaries, toast notifications, and structured error logging. This guide documents every layer and how they work together.

## Architecture Overview

```
app/global-error.tsx          # Root-level error page (catches layout errors)
components/error-boundary.tsx  # Reusable React error boundary
components/error-provider.tsx  # Global error/rejection listeners
lib/logger.ts                 # Structured logging utility
hooks/use-toast.ts            # Client-side error notifications
```

## Global Error Page

The `app/global-error.tsx` file handles fatal errors that occur at the root layout level. Because it replaces the entire page, it renders its own `<html>` and `<body>` tags.

```tsx
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <AlertTriangle className="h-16 w-16 text-amber-500" />
          <h1>Something went wrong!</h1>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md text-left">
              <p className="font-semibold text-red-600">{error.message}</p>
              {error.stack && <pre className="text-xs">{error.stack}</pre>}
              {error.digest && <p className="text-xs">Error ID: {error.digest}</p>}
            </div>
          )}
          <Button onPress={() => reset()}>Refresh</Button>
          <Link href="/">Go Home</Link>
        </div>
      </body>
    </html>
  );
}
```

Key behaviors:

- Logs the error to the console via `useEffect`
- Shows error details (message, stack trace, digest) only in development
- Provides a "Refresh" button that calls the `reset()` function to retry rendering
- Provides a "Go Home" link as a fallback escape route

## ErrorBoundary Component

The `components/error-boundary.tsx` file provides a reusable React class component error boundary with analytics integration and retry support.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Content to render |
| `fallback` | `React.ReactNode` | Optional custom fallback UI |

### State

```ts
interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  isRetrying: boolean;
}
```

### Analytics Integration

When an error is caught, the boundary reports it to the configured analytics provider:

```ts
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  if (typeof window !== 'undefined') {
    analytics.captureException(error, {
      ...errorInfo,
      componentStack: errorInfo.componentStack,
      type: 'react-error-boundary',
    });
  }
  this.setState({ error, errorInfo });
}
```

This sends the error, component stack, and a `type` tag to PostHog or Sentry (depending on the configured exception tracking provider).

### Retry Mechanism

The retry handler resets the error state after a brief delay for better UX:

```ts
handleRetry = () => {
  this.setState({ isRetrying: true });
  setTimeout(() => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      isRetrying: false,
    });
  }, 500);
};
```

### Default Fallback UI

When no custom `fallback` prop is provided, the boundary renders a full-page error display with:

- An error icon in a red circle
- A friendly error message
- Collapsible error details (using a `<details>` element)
- A "Try Again" button with a spinner animation during retry
- Technical information (error name, timestamp, current URL)

### Usage

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

// With default fallback
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary fallback={<div>Custom error UI</div>}>
  <MyComponent />
</ErrorBoundary>
```

## ErrorProvider

The `components/error-provider.tsx` wraps the application with both an `ErrorBoundary` and global browser event listeners for uncaught errors.

```tsx
export function ErrorProvider({ children }: ErrorProviderProps) {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[Global Error]', event.error);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Rejection]', event.reason);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
```

This catches three categories of errors:

| Category | Handler |
|----------|---------|
| React rendering errors | `ErrorBoundary` via `componentDidCatch` |
| Uncaught JavaScript errors | `window.addEventListener('error', ...)` |
| Unhandled Promise rejections | `window.addEventListener('unhandledrejection', ...)` |

Add `<ErrorProvider>` to your root layout to enable global error handling:

```tsx
import { ErrorProvider } from '@/components/error-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorProvider>{children}</ErrorProvider>
      </body>
    </html>
  );
}
```

## Logger Utility

The `lib/logger.ts` module provides structured, level-based logging with contextual namespacing and environment-aware output.

### Log Levels

| Level | Color | Production | Purpose |
|-------|-------|------------|---------|
| `DEBUG` | Indigo (`#6366f1`) | Suppressed | Detailed debugging information |
| `INFO` | Blue (`#3b82f6`) | Suppressed | General informational messages |
| `WARN` | Amber (`#f59e0b`) | Logged | Warning conditions |
| `ERROR` | Red (`#ef4444`) | Logged | Error conditions |

In production (`NODE_ENV !== 'development'`), only `WARN` and `ERROR` messages are logged.

### Creating Loggers

```ts
import { logger, Logger } from '@/lib/logger';

// Use the global singleton
logger.info('Application started');

// Create a contextual logger
const authLogger = Logger.create('Auth');
authLogger.debug('Session validated', { userId: '123' });
// Output: [10:30:00] DEBUG [Auth] Session validated { userId: "123" }

const paymentLogger = Logger.create('Payment');
paymentLogger.error('Charge failed', new Error('Card declined'));
```

### Log Methods

```ts
// Standard logging
logger.debug('Debugging info', { key: 'value' });
logger.info('Operation complete');
logger.warn('Deprecated API usage');
logger.error('Something failed', error);

// API request logging (development only)
logger.api('POST', '/api/items', { name: 'New Item' });

// Performance measurement (development only)
logger.performance('Database query', 45);
// Output: [10:30:00] DEBUG Performance: Database query { duration: "45ms" }
```

### Error Handling in Logger

The `error` method automatically extracts structured information from `Error` objects:

```ts
error(message: string, error?: any): void {
  if (error instanceof Error) {
    this.log(LogLevel.ERROR, message, {
      errorMessage: error.message,
      stack: error.stack,
      name: error.name,
    });
  } else {
    this.log(LogLevel.ERROR, message, error);
  }
}
```

### Browser vs Server Output

The logger detects its environment and adjusts output formatting:

- **Browser (development)** -- uses `console.log` with CSS color styling via `%c` format
- **Server / production** -- outputs plain text with JSON-serialized data

### Log Entry Structure

Every log entry contains:

```ts
interface LogEntry {
  timestamp: string;   // ISO 8601 timestamp
  level: LogLevel;     // DEBUG, INFO, WARN, ERROR
  context?: string;    // Logger namespace
  message: string;     // Human-readable message
  data?: any;          // Optional structured data
}
```

## API Route Error Handling

API routes follow a consistent pattern for error responses:

```ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed' },
        { status: 400 }
      );
    }

    const result = await someService.create(parsed.data);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] Operation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Error Response Format

All API error responses follow a consistent structure:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### HTTP Status Code Conventions

| Status | Meaning | When Used |
|--------|---------|-----------|
| 400 | Bad Request | Zod validation failure, missing fields |
| 401 | Unauthorized | No session or invalid session |
| 403 | Forbidden | Valid session but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 500 | Internal Server Error | Unexpected server-side errors |
| 503 | Service Unavailable | Feature is disabled (feature flag off) |

## Error Handling Best Practices

1. **Wrap components in ErrorBoundary** -- any component that fetches data or has complex rendering should be wrapped
2. **Use the ErrorProvider** at the root layout level to catch global errors
3. **Create contextual loggers** for each module using `Logger.create('ModuleName')`
4. **Never expose stack traces in production** -- the global error page and error boundary both guard against this
5. **Validate all inputs** with Zod before processing to catch errors early
6. **Return consistent error shapes** from API routes using the `{ success, error }` format
7. **Report errors to analytics** -- the ErrorBoundary automatically sends to PostHog/Sentry
8. **Use toast notifications** for user-facing error feedback in client components

## Related Files

| Path | Description |
|------|-------------|
| `app/global-error.tsx` | Root-level error page |
| `components/error-boundary.tsx` | Reusable React error boundary |
| `components/error-provider.tsx` | Global error/rejection listeners |
| `lib/logger.ts` | Structured logging utility |
| `lib/analytics.ts` | Analytics provider (error reporting) |
| `hooks/use-toast.ts` | Toast notifications for error feedback |
| `components/ui/toast.tsx` | Toast UI components |
