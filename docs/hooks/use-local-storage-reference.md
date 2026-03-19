---
id: use-local-storage-reference
title: useLocalStorage
sidebar_label: useLocalStorage
sidebar_position: 80
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useLocalStorage

A generic React hook for reading and writing values to `localStorage` with SSR safety, cross-tab synchronization, and custom serialization support. Also exports a specialized `usePaymentFlowStorage` hook for persisting the selected payment flow.

## Import

```typescript
import { useLocalStorage, usePaymentFlowStorage } from '@/template/hooks/use-local-storage';
```

## API Reference

### Parameters

```typescript
function useLocalStorage<T = string>(
  key: string,
  options?: UseLocalStorageOptions
): readonly [T | null, (value: T | ((val: T | null) => T)) => void, () => void];
```

#### `key`

| Type | Description |
|---|---|
| `string` | The localStorage key to read from and write to. |

#### `UseLocalStorageOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` | `undefined` | Fallback value returned when the key does not exist in localStorage. |
| `serialize` | `(value: any) => string` | `JSON.stringify` | Custom function to convert the value to a string before storing. |
| `deserialize` | `(value: string) => any` | `JSON.parse` | Custom function to convert the stored string back to the desired type. |

### Return Value

The hook returns a readonly tuple with three elements:

| Index | Type | Description |
|---|---|---|
| `[0]` | `T \| null` | The current stored value, deserialized. `null` when no value exists and no default was provided. |
| `[1]` | `(value: T \| ((val: T \| null) => T)) => void` | Setter function. Accepts a direct value or an updater function (same API as `useState`). Setting `null` removes the key from localStorage. |
| `[2]` | `() => void` | Removes the value from both state and localStorage. |

### Types

```typescript
interface UseLocalStorageOptions {
  defaultValue?: string;
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}
```

## Usage Examples

### Basic String Storage

```tsx
function ThemeSelector() {
  const [theme, setTheme, removeTheme] = useLocalStorage<string>('app-theme', {
    defaultValue: 'light',
  });

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
      <button onClick={() => setTheme('light')}>Light Mode</button>
      <button onClick={() => removeTheme()}>Reset to Default</button>
    </div>
  );
}
```

### Storing Complex Objects

```tsx
interface UserPreferences {
  language: string;
  notifications: boolean;
  fontSize: number;
}

function PreferencesPanel() {
  const [prefs, setPrefs] = useLocalStorage<UserPreferences>('user-prefs', {
    defaultValue: JSON.stringify({
      language: 'en',
      notifications: true,
      fontSize: 14,
    }),
  });

  const toggleNotifications = () => {
    setPrefs((current) => ({
      ...current!,
      notifications: !current?.notifications,
    }));
  };

  return (
    <div>
      <p>Language: {prefs?.language}</p>
      <button onClick={toggleNotifications}>
        {prefs?.notifications ? 'Disable' : 'Enable'} Notifications
      </button>
    </div>
  );
}
```

### Using the Payment Flow Preset Hook

```tsx
import { usePaymentFlowStorage } from '@/template/hooks/use-local-storage';

function PaymentFlowSelector() {
  const [flow, setFlow] = usePaymentFlowStorage();

  return (
    <select value={flow ?? ''} onChange={(e) => setFlow(e.target.value as any)}>
      <option value="PAY_AT_END">Pay at End</option>
      <option value="PAY_NOW">Pay Now</option>
    </select>
  );
}
```

### Custom Serialization

```tsx
function DateStorage() {
  const [date, setDate] = useLocalStorage<Date>('last-visit', {
    serialize: (value: Date) => value.toISOString(),
    deserialize: (value: string) => new Date(value),
  });

  return (
    <div>
      <p>Last visit: {date?.toLocaleDateString()}</p>
      <button onClick={() => setDate(new Date())}>Update Visit Time</button>
    </div>
  );
}
```

## Implementation Details

- **SSR Safety**: The hook checks `typeof window !== 'undefined'` before any `localStorage` access. During server-side rendering, it returns the `defaultValue` and all write operations are no-ops.
- **Cross-tab Synchronization**: Listens for the `storage` event on `window`, which fires when another tab or window modifies the same localStorage key. The state is automatically updated with the new value.
- **Error Handling**: All `localStorage` operations are wrapped in try/catch blocks. Failures (e.g., storage quota exceeded, private browsing restrictions) are logged as warnings and do not crash the component.
- **Updater Function**: The setter supports both direct values and updater functions (`(currentValue) => newValue`), mirroring the `useState` API.
- **Null Removal**: Setting a value to `null` calls `localStorage.removeItem()`, effectively deleting the key.

## `usePaymentFlowStorage`

A pre-configured wrapper around `useLocalStorage` for the payment flow selection:

```typescript
function usePaymentFlowStorage(): readonly [
  PaymentFlow | null,
  (value: PaymentFlow | ((val: PaymentFlow | null) => PaymentFlow)) => void,
  () => void
];
```

- **Key**: `selectedPaymentFlow`
- **Default**: `PaymentFlow.PAY_AT_END`
- **Serialization**: Identity functions (stores the enum value as-is since `PaymentFlow` values are strings).

## Edge Cases and Gotchas

- **Private Browsing**: Some browsers throw errors when accessing `localStorage` in private/incognito mode. The hook handles this gracefully by catching exceptions and falling back to the default value.
- **Storage Quota**: If the browser's storage quota is exceeded, the `setValue` call will fail silently (with a console warning). The in-memory state will still update, but the value will not persist across page reloads.
- **Cross-tab Sync Limitation**: The `storage` event only fires in _other_ tabs/windows, not the one that triggered the change. Within the same tab, state updates are handled by React state.
- **Hydration Mismatch**: Because the initial state reads from `localStorage` during the `useState` initializer, there can be a hydration mismatch between SSR (which uses `defaultValue`) and the client (which uses the stored value). Wrap dependent UI in a client-only boundary if needed.

## Related Hooks

- [usePaymentFlowStorage](#usepaymentflowstorage) -- Specialized localStorage hook for payment flow selection.
- [useTheme](./use-theme-reference.md) -- Theme management which may persist theme preference.
- [useStickyState](./use-sticky-state-reference.md) -- Similar persistent state concept with different storage strategies.
