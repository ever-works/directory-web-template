---
id: provider-setup
title: "Provider Setup Guide"
sidebar_label: "Provider Setup"
sidebar_position: 32
---

# Provider Setup Guide

The template uses a layered provider architecture to supply global state, theming, error boundaries, and feature contexts to the entire application. All providers live in `components/providers/` and are composed together in the root layout.

## Provider Architecture Overview

Providers wrap the application in nested React contexts. The barrel export at `components/providers/index.ts` re-exports:

- `QueryClientProvider` -- React Query cache and devtools
- `ErrorProvider` -- global error boundary
- `FilterProvider` -- filter state for listing pages
- `ThemeProvider` -- dark/light/system theme
- `LayoutProvider` -- layout view state and editor context
- `ConfirmProvider` -- imperative confirmation dialogs
- `NavigationProvider` -- initial-load detection

Two additional providers (`SettingsProvider` and `SettingsModalProvider`) are used in specific subtrees rather than at the root.

## ThemeProvider

**File:** `components/providers/theme-provider.tsx`

Wraps the app in `next-themes` with system-preference support:

```tsx
import { ThemeProvider as NextThemeProvider } from 'next-themes';

export function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <NextThemeProvider
      enableSystem={true}
      attribute="class"
      defaultTheme="system"
    >
      {children}
    </NextThemeProvider>
  );
}
```

### Key Behaviour

- **`attribute="class"`** -- toggles a `dark` class on the root element so Tailwind `dark:` variants work.
- **`defaultTheme="system"`** -- respects the user's OS preference on first visit.
- **`enableSystem={true}`** -- listens for `prefers-color-scheme` media-query changes at runtime.

No configuration props are required; the provider reads from `localStorage` automatically.

## QueryClientProvider

**File:** `components/providers/query-provider.tsx`

Initialises a shared `QueryClient` with React Query and adds dev tools in development:

```tsx
export function QueryClientProvider({ children, dehydratedState }: QueryProviderProps) {
  const queryClientRef = React.useRef<QueryClient>(
    getQueryClient() || new QueryClient()
  );

  return (
    <ReactQueryClientProvider client={queryClientRef.current}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </ReactQueryClientProvider>
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Child components |
| `dehydratedState` | `unknown` | Optional server-side prefetched cache state |

### Hydration Support

Pass `dehydratedState` from a server component to hydrate the client-side cache with data already fetched on the server, avoiding a duplicate request on mount.

## SettingsProvider

**File:** `components/providers/settings-provider.tsx`

Provides site-wide feature flags, header/footer configuration, and location settings through a single context.

### Context Value

```typescript
interface SettingsContextValue {
  // Feature flags from config
  categoriesEnabled: boolean;
  tagsEnabled: boolean;
  companiesEnabled: boolean;
  surveysEnabled: boolean;
  // Data existence flags from the database
  hasCategories: boolean;
  hasTags: boolean;
  hasCollections: boolean;
  hasGlobalSurveys: boolean;
  // Header controls
  headerSettings: HeaderSettings;
  // Footer controls
  footerSettings: FooterSettings;
  // Location / map settings (camelCase runtime type)
  locationSettings: LocationSettings;
}
```

### Default Header Settings

When no configuration overrides are provided the header defaults to:

| Setting | Default |
|---------|---------|
| `submitEnabled` | `true` |
| `pricingEnabled` | `true` |
| `layoutEnabled` | `true` |
| `languageEnabled` | `true` |
| `themeEnabled` | `true` |
| `moreEnabled` | `true` |
| `settingsEnabled` | `true` |
| `layoutDefault` | `'home1'` |
| `paginationDefault` | `'standard'` |
| `themeDefault` | `'light'` |

### Using the Hook

```tsx
import { useSettings } from '@/components/providers/settings-provider';

function MyComponent() {
  const { categoriesEnabled, headerSettings, locationSettings } = useSettings();

  if (!categoriesEnabled) return null;
  // ...
}
```

The hook provides a fallback object when called outside the provider tree, so components render safely during server-side rendering or in isolated tests.

## FilterProvider

**File:** `components/providers/filter-provider.tsx`

A thin wrapper that delegates to `FilterContextProvider` from `components/filters/context/filter-context`. It manages the active category, tag, search query, and sort state for the main listing pages.

```tsx
export function FilterProvider({ children }: PropsWithChildren) {
  return <FilterContextProvider>{children}</FilterContextProvider>;
}
```

Place this provider above any page that uses filter or search components.

## ConfirmProvider

**File:** `components/providers/confirm-provider.tsx`

Exposes an imperative `confirm()` function that returns a `Promise<boolean>`, replacing the native `window.confirm` with a styled modal dialog.

### Usage

```tsx
import { useConfirm } from '@/components/providers/confirm-provider';

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const { confirm } = useConfirm();

  const handleClick = async () => {
    const ok = await confirm({
      title: 'Delete Item',
      message: 'This action cannot be undone. Continue?',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) onDelete();
  };

  return <button onClick={handleClick}>Delete</button>;
}
```

### Confirm Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | -- | Optional heading above the message |
| `message` | `string` | *required* | Body text of the dialog |
| `confirmText` | `string` | `'Confirm'` | Label for the primary button |
| `cancelText` | `string` | `'Cancel'` | Label for the secondary button |
| `variant` | `'danger' \| 'warning' \| 'info'` | `'info'` | Controls icon and button colour |

The dialog renders at `z-index: 9999` with a semi-transparent backdrop and includes an animated entrance.

## ErrorProvider

**File:** `components/providers/error-provider.tsx`

Wraps children in the global `ErrorBoundary` component:

```tsx
export function ErrorProvider({ children }: PropsWithChildren) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
```

If any child component throws during rendering the boundary catches the error and displays a recovery UI.

## LayoutProvider

**File:** `components/providers/layout-provider.tsx`

Composes two inner providers:

1. **`LayoutThemeProvider`** -- manages the active listing layout (grid, list, card, etc.) and persists the user's choice.
2. **`EditorContextProvider`** -- provides editor state for the rich-text editing feature.

```tsx
export function LayoutProvider({ children, configDefaults }: LayoutProviderProps) {
  return (
    <LayoutThemeProvider configDefaults={configDefaults}>
      <EditorContextProvider>{children}</EditorContextProvider>
    </LayoutThemeProvider>
  );
}
```

The optional `configDefaults.defaultView` prop sets the initial layout key before the user makes a selection.

## NavigationProvider

**File:** `components/providers/navigation-provider.tsx`

Tracks whether the current render is the very first page load or a subsequent client-side navigation. This lets components (e.g. hero animations) run intro effects only once.

```tsx
const { isInitialLoad } = useNavigation();
```

Internally it watches `usePathname()` and flips `isInitialLoad` to `false` on the first path change.

## SettingsModalProvider

**File:** `components/providers/settings-modal-provider.tsx`

Controls the visibility of a global settings/preferences modal. Features include:

- **Focus management** -- stores the previously focused element and restores it on close.
- **Escape key** -- pressing Escape closes the modal.
- **Scroll lock** -- `document.body.style.overflow` is set to `hidden` while the modal is open.

### API

```tsx
const { isOpen, openModal, closeModal, toggleModal } = useContext(SettingsModalContext);
```

## Composing Providers in the Root Layout

A typical root layout nests the providers in this order:

```tsx
<ThemeProvider>
  <QueryClientProvider>
    <ErrorProvider>
      <NavigationProvider>
        <SettingsProvider {...settingsProps}>
          <ConfirmProvider>
            <FilterProvider>
              <LayoutProvider>
                {children}
              </LayoutProvider>
            </FilterProvider>
          </ConfirmProvider>
        </SettingsProvider>
      </NavigationProvider>
    </ErrorProvider>
  </QueryClientProvider>
</ThemeProvider>
```

**Order matters:** ThemeProvider must be outermost so dark-mode classes are available to all children. QueryClientProvider should wrap anything that calls `useQuery`. ErrorProvider should be high enough to catch rendering errors from any inner provider.

## Related Pages

- [Theming Guide](../guides/theming.md) -- customising dark mode and colour tokens
- [Configuration System](../configuration/config-system.md) -- how settings flow from YAML to providers
- [Feature Flags](../configuration/feature-config.md) -- toggling features consumed by SettingsProvider
