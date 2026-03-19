---
id: settings-hooks
title: Settings & Configuration Hooks
sidebar_label: Settings & Configuration Hooks
sidebar_position: 8
---

# Settings & Configuration Hooks

Hooks for accessing application settings (header, footer, location), managing local storage, and reading server-rendered configuration.

## Architecture Overview

The settings hooks follow a consistent pattern: they read from the `SettingsProvider` context, which is populated during server-side rendering. This means settings are available instantly on the client with no loading delay or additional API calls.

Each hook returns a consistent shape:

```ts
{
  settings: SettingsType;
  loading: boolean;   // Always false (server-rendered)
  error: Error | null; // Always null (server-rendered)
}
```

---

## useHeaderSettings

Provides access to header configuration such as logo, navigation items, and display options.

```
useHeaderSettings(): {
  settings: HeaderSettings;
  loading: boolean;
  error: Error | null;
}
```

### HeaderSettings

The `HeaderSettings` type is defined in `@/lib/content` and includes fields controlling header visibility, logo, navigation links, and CTA buttons.

```tsx
import { useHeaderSettings } from '@/hooks/use-header-settings';

function Header() {
  const { settings } = useHeaderSettings();

  return (
    <header>
      {settings.logo && <img src={settings.logo} alt="Logo" />}
      <nav>
        {settings.navItems?.map((item) => (
          <a key={item.href} href={item.href}>{item.label}</a>
        ))}
      </nav>
    </header>
  );
}
```

---

## useFooterSettings

Provides access to footer configuration including links, social media, and copyright text.

```
useFooterSettings(): {
  settings: FooterSettings;
  loading: boolean;
  error: Error | null;
}
```

### FooterSettings

The `FooterSettings` type is defined in `@/lib/content` and controls footer sections, column layout, social links, and copyright information.

```tsx
import { useFooterSettings } from '@/hooks/use-footer-settings';

function Footer() {
  const { settings } = useFooterSettings();

  return (
    <footer>
      {settings.sections?.map((section) => (
        <div key={section.title}>
          <h4>{section.title}</h4>
          {section.links.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </div>
      ))}
    </footer>
  );
}
```

---

## useLocationSettings

Provides access to location/map feature configuration, including whether location features are enabled, the map provider, and submission requirements.

```
useLocationSettings(): {
  settings: LocationSettings;
  loading: boolean;
  error: Error | null;
}
```

### LocationSettings

The `LocationSettings` type is defined in `@/lib/types/location` and includes:

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Whether location features are active |
| `provider` | `'mapbox' \| 'google'` | Map provider to use |
| `mapStyle` | `string` | Map style identifier |
| `requireLocationOnSubmit` | `boolean` | Whether items must have a location |

```tsx
import { useLocationSettings } from '@/hooks/use-location-settings';

function LocationToggle() {
  const { settings } = useLocationSettings();

  if (!settings.enabled) return null;

  return (
    <div>
      <p>Map Provider: {settings.provider}</p>
      <p>Location required: {settings.requireLocationOnSubmit ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

---

## useLocalStorage

A generic hook for reading and writing typed values to `localStorage` with SSR safety, cross-tab synchronization, and custom serialization.

```
useLocalStorage<T>(
  key: string,
  options?: UseLocalStorageOptions
): readonly [T | null, (value: T | ((val: T | null) => T)) => void, () => void]
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `key` | `string` | -- | The localStorage key |
| `options.defaultValue` | `string` | -- | Default value if key does not exist |
| `options.serialize` | `(value: any) => string` | `JSON.stringify` | Custom serializer |
| `options.deserialize` | `(value: string) => any` | `JSON.parse` | Custom deserializer |

### Return Value (Tuple)

| Index | Type | Description |
|-------|------|-------------|
| `[0]` | `T \| null` | Current stored value |
| `[1]` | `(value) => void` | Set value (accepts value or updater function) |
| `[2]` | `() => void` | Remove value from storage |

### Features

- **SSR-safe**: Returns `defaultValue` during server rendering
- **Cross-tab sync**: Listens for `storage` events from other tabs/windows
- **Error resilient**: Catches and warns on serialization/access failures
- **Functional updates**: Setter accepts `(prevValue) => newValue` pattern

```tsx
import { useLocalStorage } from '@/hooks/use-local-storage';

function ThemeToggle() {
  const [theme, setTheme, clearTheme] = useLocalStorage<'light' | 'dark'>(
    'user-theme',
    { defaultValue: 'light' }
  );

  return (
    <div>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Current: {theme}
      </button>
      <button onClick={clearTheme}>Reset</button>
    </div>
  );
}
```

### usePaymentFlowStorage

A specialized wrapper around `useLocalStorage` for persisting the selected payment flow.

```
usePaymentFlowStorage(): readonly [PaymentFlow | null, setter, remover]
```

Stores the `PaymentFlow` enum value under the `selectedPaymentFlow` key with plain string serialization (no JSON wrapping).

```tsx
import { usePaymentFlowStorage } from '@/hooks/use-local-storage';

function PaymentFlowSelector() {
  const [flow, setFlow] = usePaymentFlowStorage();

  return (
    <select value={flow ?? ''} onChange={(e) => setFlow(e.target.value as PaymentFlow)}>
      <option value="PAY_AT_END">Pay at end</option>
      <option value="PAY_FIRST">Pay first</option>
    </select>
  );
}
```

---

## Summary Table

| Hook | Purpose | Source File |
|------|---------|-------------|
| `useHeaderSettings` | Access header configuration | `use-header-settings.ts` |
| `useFooterSettings` | Access footer configuration | `use-footer-settings.ts` |
| `useLocationSettings` | Access location/map configuration | `use-location-settings.ts` |
| `useLocalStorage` | Typed localStorage with cross-tab sync | `use-local-storage.ts` |
| `usePaymentFlowStorage` | Payment flow localStorage wrapper | `use-local-storage.ts` |
