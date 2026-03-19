---
id: context-providers
title: Context Providers
sidebar_label: Context Providers
sidebar_position: 30
---

# Context Providers

The template uses a layered context architecture with two categories of providers: **global contexts** in `components/context/` that manage application-wide state, and **utility providers** in `components/providers/` that supply specific cross-cutting concerns like error handling, confirmations, and navigation tracking.

## Architecture Overview

```
components/context/
  LayoutThemeContext.tsx    # Layout, theme, pagination, checkout, container, map state
  currency-provider.tsx    # Currency and country detection
  index.ts                 # Barrel exports

components/providers/
  theme-provider.tsx       # Dark/light/system theme (next-themes)
  filter-provider.tsx      # Filter context bridge
  settings-provider.tsx    # Feature flags and site settings
  confirm-provider.tsx     # Promise-based confirmation dialogs
  error-provider.tsx       # Error boundary wrapper
  navigation-provider.tsx  # Route change detection
  query-provider.tsx       # React Query client provider
  layout-provider.tsx      # Layout composition provider
  settings-modal-provider.tsx  # Settings modal state
  index.ts                 # Barrel exports
```

## LayoutThemeContext

The central context managing all user-configurable display preferences. Each preference is stored in `localStorage` with SSR-safe hydration.

### Provided Values

```ts
interface LayoutThemeContextType {
  layoutKey: LayoutKey;                    // "classic" | "grid" | "compact" | "list"
  setLayoutKey: (key: LayoutKey) => void;
  themeKey: ThemeKey;                      // "everworks" | "corporate" | "material" | "funny"
  setThemeKey: (key: ThemeKey) => void;
  currentTheme: ThemeConfig;               // Computed color config for active theme
  layoutHome: LayoutHome;                  // HOME_ONE | HOME_TWO | HOME_THREE
  setLayoutHome: (key: LayoutHome) => void;
  paginationType: PaginationType;          // "standard" | "infinite"
  setPaginationType: (type: PaginationType) => void;
  itemsPerPage: number;                    // 1-100, default 12
  setItemsPerPage: (count: number) => void;
  databaseSimulationMode: DatabaseSimulationMode;
  setDatabaseSimulationMode: (mode: DatabaseSimulationMode) => void;
  containerWidth: ContainerWidth;          // "fixed" | "fluid"
  setContainerWidth: (width: ContainerWidth) => void;
  checkoutProvider: CheckoutProvider;      // "stripe" | "lemonsqueezy" | "polar" | "solidgate"
  setCheckoutProvider: (provider: CheckoutProvider) => void;
  configuredProviders: CheckoutProvider[]; // Auto-detected from env vars
  isMapView: boolean;
  setIsMapView: (isMap: boolean) => void;
  isInitialized: boolean;                  // True after localStorage hydration
}
```

### Theme System

Four built-in color themes are defined with CSS custom properties applied to `document.documentElement`:

| Theme | Primary | Secondary | Accent |
|---|---|---|---|
| `everworks` | `#0070f3` | `#00c853` | `#0056b3` |
| `corporate` | `#2c3e50` | `#e74c3c` | `#34495e` |
| `material` | `#673ab7` | `#ff9800` | `#9c27b0` |
| `funny` | `#ff4081` | `#ffeb3b` | `#e91e63` |

Theme changes call `applyThemeWithPalettes()` which generates full color palettes (50-950 shades) and applies them as CSS variables.

### Hydration Strategy

All state initializes with defaults on the server. After mount, a `useEffect` in each sub-manager reads from `localStorage` and updates state. The `isInitialized` flag turns `true` after a 300ms delay, allowing skeleton loaders to display during hydration. Each setter validates input before persisting.

### Usage

```tsx
import { useLayoutTheme } from "@/components/context";

function MyComponent() {
  const { layoutKey, setLayoutKey, themeKey, paginationType } = useLayoutTheme();
  return <button onClick={() => setLayoutKey("grid")}>Grid View</button>;
}
```

## CurrencyProvider

Provides auto-detected currency based on the user's country, with manual override support.

```ts
interface CurrencyContextType {
  currency: string;       // ISO 4217 code (e.g., "USD", "EUR")
  country: string | null; // ISO 3166 country code
  isLoading: boolean;
  updateCurrency: (currency: string, options?: UpdateCurrencyOptions) => void;
}
```

```tsx
import { useCurrencyContext } from "@/components/context";

const { currency, updateCurrency } = useCurrencyContext();
```

## SettingsProvider

Provides feature flags and site configuration read from the content repository's config file. Values are server-rendered and do not change at runtime.

```ts
interface SettingsContextValue {
  categoriesEnabled: boolean;
  tagsEnabled: boolean;
  companiesEnabled: boolean;
  surveysEnabled: boolean;
  hasCategories: boolean;
  hasTags: boolean;
  hasCollections: boolean;
  hasGlobalSurveys: boolean;
  headerSettings: HeaderSettings;
  footerSettings: FooterSettings;
  locationSettings: LocationSettings;
}
```

The `useSettings()` hook returns a safe fallback object when called outside the provider, enabling backward compatibility.

## ConfirmProvider

Provides a promise-based confirmation dialog that can be awaited anywhere in the component tree.

```tsx
import { useConfirm } from "@/components/providers";

function DeleteButton() {
  const { confirm } = useConfirm();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete Item",
      message: "This action cannot be undone.",
      variant: "danger",          // "danger" | "warning" | "info"
      confirmText: "Delete",
      cancelText: "Keep",
    });
    if (confirmed) performDelete();
  };
}
```

The dialog renders as a fixed overlay with variant-specific colors (red for danger, orange for warning, blue for info).

## ThemeProvider

A thin wrapper around `next-themes` that enables system-preference detection and class-based dark mode.

```tsx
<ThemeProvider>  {/* enableSystem={true} attribute="class" defaultTheme="system" */}
  {children}
</ThemeProvider>
```

## NavigationProvider

Tracks whether the current page load is the initial load or a client-side navigation. Components can use this to skip entrance animations on subsequent navigations.

```tsx
import { useNavigation } from "@/components/providers";

const { isInitialLoad } = useNavigation();
// isInitialLoad is true on first render, false after any route change
```

## FilterProvider

A bridge component that wraps `FilterContextProvider` from the filter system, making it available through the providers barrel export.

## Provider Composition Order

Providers must be nested in a specific order in the root layout:

```tsx
<ThemeProvider>
  <QueryProvider>
    <ErrorProvider>
      <NavigationProvider>
        <SettingsProvider {...settings}>
          <LayoutThemeProvider>
            <CurrencyProvider>
              <ConfirmProvider>
                <FilterProvider>
                  {children}
                </FilterProvider>
              </ConfirmProvider>
            </CurrencyProvider>
          </LayoutThemeProvider>
        </SettingsProvider>
      </NavigationProvider>
    </ErrorProvider>
  </QueryProvider>
</ThemeProvider>
```

## Accessibility

- The `ConfirmProvider` dialog uses `focus` management to trap focus within the dialog.
- Theme changes are applied to the document root, ensuring all components update simultaneously.
- The `isInitialized` flag prevents layout shifts during hydration by showing skeleton loaders.
- All context hooks throw descriptive errors when used outside their provider boundary.

## Related Documentation

- [Filter System](/template/components/filter-system) -- Filter context details
- [Dark Mode](/template/features/dark-mode) -- Theme switching feature
- [Layout Components](/template/components/layout-components) -- Layout variants
- [Provider Components](/template/components/provider-components) -- Additional provider docs
