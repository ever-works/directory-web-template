---
id: error-boundaries
title: "Error Boundaries & Error Handling"
sidebar_label: "Error Boundaries"
sidebar_position: 25
---

# Error Boundaries & Error Handling

The template implements a multi-layered error handling strategy using React error boundaries, global error providers, and Next.js error conventions. This architecture ensures that runtime errors are caught gracefully, reported to analytics, and presented to users with recovery options.

## Architecture Overview

The error handling system is organized into four layers:

| Layer | File | Scope |
|-------|------|-------|
| Global Error Page | `app/global-error.tsx` | Catches errors in the root layout itself |
| Error Provider | `components/error-provider.tsx` | Wraps the app tree with global JS error listeners |
| Error Boundary | `components/error-boundary.tsx` | Reusable React class component boundary |
| Admin Error Boundary | `components/admin/admin-error-boundary.tsx` | Scoped boundary for admin dashboard sections |

## Global Error Page

The `app/global-error.tsx` file is a special Next.js convention that catches errors occurring in the root layout. Because the root layout itself may have failed, this component renders its own `<html>` and `<body>` tags.

```tsx
// app/global-error.tsx
'use client';
import Link from 'next/link';
import { Button } from '@heroui/react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

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
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
          <h1 className="text-3xl font-bold mb-4">Something went wrong!</h1>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md text-left">
              <p className="font-semibold text-red-600">{error.message}</p>
              {error.digest && (
                <p className="mt-2 text-xs text-gray-500">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-4">
            <Button onPress={() => reset()} variant="solid">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link href="/" passHref>
              <Button variant="solid">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
```

Key behaviors:
- Logs the error to the console on mount via `useEffect`
- Shows a stack trace and error digest in development mode only
- Provides a **Refresh** button (calls `reset()` to re-render the segment) and a **Go Home** link
- The `error.digest` is a server-generated hash useful for correlating with server-side logs

## Not Found Page

The `app/not-found.tsx` file handles 404 responses. It is a client component that uses the Next.js router for navigation.

```tsx
// app/not-found.tsx
'use client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center ...">
      <h1 className="text-8xl font-bold ...">404</h1>
      <h2 className="text-2xl font-semibold ...">Page Not Found</h2>
      <div className="flex gap-4 justify-center">
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </Button>
        <Button onClick={() => router.push('/')}>
          <Home className="w-4 h-4" /> Back to Home
        </Button>
      </div>
    </div>
  );
}
```

The page includes a search suggestion section and a link to the help/support page.

## React Error Boundary Component

The core reusable boundary lives at `components/error-boundary.tsx`. It is a React class component (required for `componentDidCatch`) that integrates with the analytics system.

```tsx
// components/error-boundary.tsx
import { analytics } from '@/lib/analytics';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  isRetrying: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRetrying: false };
  }

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

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (/* default error UI */);
    }
    return this.props.children;
  }
}
```

Notable design decisions:
- **Analytics integration**: errors are automatically reported via `analytics.captureException`
- **Custom fallback**: pass a `fallback` prop to render a custom UI, or let the default full-page error screen appear
- **Retry with delay**: the 500ms delay on retry provides visual feedback and prevents instant re-crash loops
- **Collapsible details**: in the default UI, error details are inside a `<details>` element so users can inspect the stack
- **Technical footer**: shows the error name, timestamp, and current URL for debugging

## Error Provider

The `ErrorProvider` at `components/error-provider.tsx` wraps the entire application tree. It adds global JavaScript error listeners that catch errors outside the React render cycle.

```tsx
// components/error-provider.tsx
export function ErrorProvider({ children }: { children: React.ReactNode }) {
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

This component handles two categories of errors that React error boundaries cannot catch:
- **Global errors** (`window.error`): script errors, runtime exceptions outside React
- **Unhandled promise rejections** (`unhandledrejection`): forgotten `.catch()` handlers or uncaught `await` failures

## Admin Error Boundary

The admin dashboard wraps each section in its own `AdminErrorBoundary` so a failure in one widget (e.g., a chart) does not take down the entire dashboard.

```tsx
// components/admin/admin-dashboard.tsx (usage pattern)
<AdminLandmark as="section" label="Dashboard Statistics">
  <AdminErrorBoundary>
    <AdminStatsOverview stats={stats} isLoading={false} />
  </AdminErrorBoundary>
</AdminLandmark>

<AdminLandmark as="section" label="Analytics Overview">
  <AdminResponsiveGrid cols={2} gap="lg">
    <AdminErrorBoundary>
      <AdminActivityChart data={stats?.activityTrendData || []} />
    </AdminErrorBoundary>
    <AdminErrorBoundary>
      <AdminTopItems data={stats?.topItemsData || []} />
    </AdminErrorBoundary>
  </AdminResponsiveGrid>
</AdminLandmark>
```

Each `AdminErrorBoundary` isolates failures to its own section, allowing the rest of the dashboard to continue working.

## API Error Handling

Server-side API routes use a standardized error handler defined in `lib/api/error-handler.ts`:

```tsx
// lib/api/error-handler.ts
export function handleApiError(
  error: unknown,
  context = 'API'
): NextResponse<ApiErrorResponse> {
  // Log with context
  if (error instanceof Error) {
    logError(error, context);
  }

  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected error occurred';

  if (error instanceof Error) {
    message = error.message;
    // Auto-detect error type from message content
    if (message.includes('unauthorized')) status = HttpStatus.UNAUTHORIZED;
    if (message.includes('validation'))   status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (message.includes('not found'))    status = HttpStatus.NOT_FOUND;
  }

  // Sanitize in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'An unexpected error occurred';
  }

  return createApiErrorResponse(message, status, code);
}
```

A convenience wrapper is also available:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## Error Handling Best Practices

1. **Wrap feature sections** in `ErrorBoundary` components so a single crash does not take down the entire page
2. **Use custom fallbacks** for critical sections where you want a more contextual recovery UI
3. **Leverage `withErrorHandling`** in API routes to guarantee consistent error response shapes
4. **Never expose stack traces** in production -- the `global-error.tsx` and `error-handler.ts` both gate debug output behind `NODE_ENV`
5. **Report to analytics** -- the `ErrorBoundary` automatically reports to the analytics service via `analytics.captureException`

## File Reference

| File | Purpose |
|------|---------|
| `app/global-error.tsx` | Root-level error page with full HTML shell |
| `app/not-found.tsx` | 404 not-found page with navigation options |
| `components/error-boundary.tsx` | Reusable React error boundary with analytics |
| `components/error-provider.tsx` | Global JS error listener wrapping the app |
| `components/admin/admin-error-boundary.tsx` | Scoped boundary for admin dashboard widgets |
| `lib/api/error-handler.ts` | Standardized API route error handling |
