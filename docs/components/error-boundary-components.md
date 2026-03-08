---
id: error-boundary-components
title: "Error Boundary Reference"
sidebar_label: "Error Boundary"
sidebar_position: 46
---

# Error Boundary

## Overview

The error handling system consists of two components: `ErrorBoundary`, a React class component that catches render-time errors and displays a fallback UI with retry capabilities, and `ErrorProvider`, a wrapper component that combines `ErrorBoundary` with global `window.onerror` and `unhandledrejection` event listeners. Together they provide a comprehensive error catching strategy for the entire application.

## Architecture

```
template/components/
  error-boundary.tsx    # React class ErrorBoundary with fallback UI
  error-provider.tsx    # Global error provider wrapping ErrorBoundary
```

---

## ErrorBoundary

### Import

```typescript
import { ErrorBoundary } from "@/components/error-boundary";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `React.ReactNode` | Yes | - | The component tree to protect from uncaught render errors. |
| `fallback` | `React.ReactNode` | No | Built-in error UI | Custom fallback UI to render when an error is caught. When omitted, the default full-screen error page is displayed. |

### State

| Field | Type | Description |
|-------|------|-------------|
| `hasError` | `boolean` | Whether an error has been caught. |
| `error` | `Error \| undefined` | The caught error object. |
| `errorInfo` | `React.ErrorInfo \| undefined` | React component stack information. |
| `isRetrying` | `boolean` | Whether a retry is currently in progress (500ms delay for UX). |

### Usage Examples

#### Basic Usage

```tsx
<ErrorBoundary>
  <MyApp />
</ErrorBoundary>
```

#### With Custom Fallback

```tsx
<ErrorBoundary fallback={<div>Something went wrong. Please refresh.</div>}>
  <Dashboard />
</ErrorBoundary>
```

### Default Fallback UI

When no custom `fallback` is provided, the built-in error page includes:

1. **Alert icon** - A red `AlertTriangle` icon from Lucide.
2. **Error heading** - "Oops! Something went wrong" message.
3. **Collapsible error details** - Expandable `<details>` element showing the error message and stack trace.
4. **Retry button** - Calls `handleRetry()` which resets the error state after a 500ms delay.
5. **Technical info** - Error name, timestamp, and current URL path.

### Error Tracking

Caught errors are automatically reported via `analytics.captureException()` on the client side, including the React component stack and a `type: 'react-error-boundary'` tag.

---

## ErrorProvider

### Import

```typescript
import { ErrorProvider } from "@/components/error-provider";
// or
import ErrorProvider from "@/components/error-provider";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `React.ReactNode` | Yes | - | The application tree to wrap with global error handling. |

### Usage Examples

#### Basic Usage

```tsx
// In your root layout
<ErrorProvider>
  <App />
</ErrorProvider>
```

### Behavior

`ErrorProvider` sets up two global event listeners on mount:

- **`window.error`** - Catches uncaught synchronous JavaScript errors and logs them to the console.
- **`window.unhandledrejection`** - Catches unhandled Promise rejections and logs them to the console.

Both listeners are cleaned up when the component unmounts. Internally, `ErrorProvider` wraps its children with `<ErrorBoundary>` to also catch React render errors.

## Styling

- The default fallback UI uses a full-screen gradient background: `from-red-50 via-white to-orange-50` (light) / `from-red-950 via-gray-900 to-orange-950` (dark).
- The retry button uses the theme primary color: `bg-theme-primary`.
- Error details are shown in a monospace font inside a rounded container.
- All elements include dark mode variants.

## Accessibility

- The retry button includes a spinning animation state (`animate-spin` on the `RefreshCw` icon) to indicate loading.
- The collapsible error details use a native `<details>`/`<summary>` element, which is keyboard-accessible by default.
- The retry button receives `disabled` state during retry to prevent double-clicks.

## Related Components

- [Provider Components](/docs/template/components/provider-components) - Application-level providers that include ErrorProvider.
