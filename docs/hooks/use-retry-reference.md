---
id: use-retry-reference
title: useRetry Hook Reference
sidebar_label: useRetry
sidebar_position: 113
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useRetry

Provides a configurable retry wrapper for async operations with exponential backoff, optional jitter, abort support, and automatic skip of client errors. Also exports a companion `useRetryOperation` hook that binds a specific operation for simpler one-shot usage.

**Source:** `template/hooks/use-retry.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useRetry` | General-purpose retry wrapper -- pass any async function at call time |
| `useRetryOperation` | Binds a specific async operation and exposes `execute` with built-in loading/data state |

---

## useRetry

### Signature

```ts
function useRetry(config?: Partial<RetryConfig>): UseRetryReturn;
```

### Parameters

```ts
interface RetryConfig {
  maxRetries: number;        // Maximum number of retry attempts (default: 3)
  retryDelay: number;        // Base delay in milliseconds between retries (default: 1000)
  backoffMultiplier: number; // Multiplier applied to delay after each attempt (default: 2)
  maxDelay: number;          // Upper bound for computed delay in ms (default: 10000)
  jitter: boolean;           // Add random jitter to prevent thundering herd (default: true)
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxRetries` | `number` | `3` | Total retry attempts after the initial call |
| `retryDelay` | `number` | `1000` | Base delay in ms before the first retry |
| `backoffMultiplier` | `number` | `2` | Exponential multiplier applied per attempt |
| `maxDelay` | `number` | `10000` | Maximum delay cap in ms |
| `jitter` | `boolean` | `true` | When true, randomizes delay between 85% and 115% of the computed value |

### Return Value

```ts
const {
  retry,  // <T>(fn: () => Promise<T>) => Promise<T> -- Execute fn with retry logic
  reset,  // () => void -- Abort any in-flight retry and reset state
  state,  // RetryState -- Current retry state
} = useRetry();
```

### RetryState

```ts
interface RetryState {
  attempt: number;       // Current attempt number (0 = initial call)
  isRetrying: boolean;   // True when executing a retry (attempt > 0)
  lastError: Error | null; // The most recent error, if any
}
```

### Implementation Details

1. **Exponential backoff** -- Delay for attempt `n` is calculated as `retryDelay * backoffMultiplier^n`, capped at `maxDelay`.
2. **Jitter** -- When enabled, the delay is multiplied by a random factor between 0.85 and 1.15 to spread out retries across clients.
3. **Abort support** -- Each call to `retry` creates a new `AbortController`. Calling `retry` again or `reset` aborts any in-progress retry sequence.
4. **Client error skip** -- Errors whose message contains `'4'` (indicative of 4xx HTTP status codes) are thrown immediately without retry.
5. **AbortError skip** -- `AbortError` exceptions are re-thrown immediately and never retried.
6. **State tracking** -- The hook tracks the current attempt number, whether a retry is in progress, and the last encountered error.

### Delay Calculation

```
attempt 0: 1000ms * 2^0 = 1000ms  (+ jitter)
attempt 1: 1000ms * 2^1 = 2000ms  (+ jitter)
attempt 2: 1000ms * 2^2 = 4000ms  (+ jitter)
attempt 3: 1000ms * 2^3 = 8000ms  (+ jitter)
attempt 4: capped at   = 10000ms  (+ jitter)
```

### Usage: Retry an API Call

```tsx
function DataLoader() {
  const { retry, state } = useRetry({ maxRetries: 5 });
  const [data, setData] = useState(null);

  const loadData = async () => {
    try {
      const result = await retry(() => fetch('/api/data').then(r => r.json()));
      setData(result);
    } catch (error) {
      console.error('All retries failed:', error);
    }
  };

  return (
    <div>
      <button onClick={loadData}>Load</button>
      {state.isRetrying && <p>Retrying (attempt {state.attempt})...</p>}
      {state.lastError && <p>Error: {state.lastError.message}</p>}
    </div>
  );
}
```

### Usage: Abort and Reset

```tsx
function CancellableUpload() {
  const { retry, reset, state } = useRetry();

  const upload = async (file: File) => {
    await retry(async () => {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    });
  };

  return (
    <div>
      <button onClick={() => upload(selectedFile)}>Upload</button>
      <button onClick={reset} disabled={!state.isRetrying}>Cancel</button>
    </div>
  );
}
```

---

## useRetryOperation

A higher-level hook that binds a specific async operation and provides `execute`, `data`, `loading`, and retry state in one object.

### Signature

```ts
function useRetryOperation<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): UseRetryOperationReturn<T>;
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `operation` | `() => Promise<T>` | The async function to execute with retry logic |
| `config` | `Partial<RetryConfig>` | Optional retry configuration (same as `useRetry`) |

### Return Value

```ts
const {
  execute,    // () => Promise<T> -- Run the operation with retries
  reset,      // () => void -- Abort and reset state
  data,       // T | null -- Result of the last successful execution
  loading,    // boolean -- True while the operation is executing
  attempt,    // number -- Current attempt number
  isRetrying, // boolean -- True during retry attempts
  lastError,  // Error | null -- Most recent error
} = useRetryOperation(myAsyncFn);
```

### Usage: Bound Operation

```tsx
function UserProfile({ userId }: { userId: string }) {
  const {
    execute: loadProfile,
    data: profile,
    loading,
    isRetrying,
    lastError,
  } = useRetryOperation(
    () => fetch(`/api/users/${userId}`).then(r => r.json()),
    { maxRetries: 2, retryDelay: 500 }
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) return <Spinner />;
  if (lastError) return <ErrorMessage error={lastError} />;
  if (!profile) return null;

  return <ProfileCard profile={profile} />;
}
```

## Dependencies

This hook has no external dependencies beyond React (`useState`, `useCallback`, `useRef`, `useMemo`).

## Related Hooks

- [`usePaginatedQuery`](/template/hooks/use-paginated-query-reference) -- Paginated data fetching with built-in React Query retry
- [`useInfiniteLoading`](/template/hooks/use-infinite-loading-reference) -- Infinite scroll with automatic retry on failure
