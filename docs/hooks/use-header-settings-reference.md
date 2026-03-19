---
id: use-header-settings-reference
title: "useHeaderSettings Reference"
sidebar_label: "useHeaderSettings"
sidebar_position: 47
---

# useHeaderSettings

## Overview

`useHeaderSettings` provides client-side access to header configuration from the `SettingsProvider` context. Like its footer counterpart, the data is server-rendered into the context provider, so the hook returns instantly with no loading delay. Use it to control which header features are visible -- such as the submit button, pricing link, layout switcher, language selector, and theme toggle -- along with default values for layout, pagination, and theme.

## Import

```typescript
import { useHeaderSettings } from "@/hooks/use-header-settings";
```

## API Reference

### Parameters

This hook takes no parameters.

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `settings` | `HeaderSettings` | The header configuration object from the settings provider. |
| `loading` | `boolean` | Always `false` since data is sourced from server-rendered context. Included for interface consistency. |
| `error` | `Error \| null` | Always `null` since data is sourced from server-rendered context. Included for interface consistency. |

### `HeaderSettings` Type

```typescript
interface HeaderSettings {
  submitEnabled: boolean;
  pricingEnabled: boolean;
  layoutEnabled: boolean;
  languageEnabled: boolean;
  themeEnabled: boolean;
  moreEnabled: boolean;
  settingsEnabled: boolean;
  layoutDefault: string;
  paginationDefault: string;
  themeDefault: string;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `submitEnabled` | `boolean` | Whether the "Submit" / "Add Item" button is shown in the header. |
| `pricingEnabled` | `boolean` | Whether the pricing page link is shown in the header navigation. |
| `layoutEnabled` | `boolean` | Whether the layout switcher (grid/list/table) is available in the header. |
| `languageEnabled` | `boolean` | Whether the language selector dropdown is shown. |
| `themeEnabled` | `boolean` | Whether the light/dark theme toggle is shown in the header. |
| `moreEnabled` | `boolean` | Whether the "More" dropdown menu is shown in the header. |
| `settingsEnabled` | `boolean` | Whether the settings icon/link is shown in the header. |
| `layoutDefault` | `string` | The default layout mode (e.g., `"grid"`, `"list"`, `"table"`). |
| `paginationDefault` | `string` | The default pagination style (e.g., `"infinite"`, `"paginated"`). |
| `themeDefault` | `string` | The default theme (e.g., `"light"`, `"dark"`, `"system"`). |

## Usage Examples

### Basic Usage

```typescript
import { useHeaderSettings } from "@/hooks/use-header-settings";

function HeaderNav() {
  const { settings } = useHeaderSettings();

  return (
    <nav className="flex items-center gap-4">
      {settings.submitEnabled && (
        <Link href="/submit">Submit</Link>
      )}
      {settings.pricingEnabled && (
        <Link href="/pricing">Pricing</Link>
      )}
      {settings.languageEnabled && <LanguageSelector />}
      {settings.themeEnabled && <ThemeToggle />}
      {settings.moreEnabled && <MoreMenu />}
    </nav>
  );
}
```

### Advanced Usage

```typescript
import { useHeaderSettings } from "@/hooks/use-header-settings";

function LayoutControls() {
  const { settings } = useHeaderSettings();
  const [layout, setLayout] = useState(settings.layoutDefault);
  const [pagination, setPagination] = useState(settings.paginationDefault);

  // Initialize with defaults from settings
  useEffect(() => {
    setLayout(settings.layoutDefault);
    setPagination(settings.paginationDefault);
  }, [settings.layoutDefault, settings.paginationDefault]);

  if (!settings.layoutEnabled) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        className={layout === "grid" ? "active" : ""}
        onClick={() => setLayout("grid")}
      >
        Grid
      </button>
      <button
        className={layout === "list" ? "active" : ""}
        onClick={() => setLayout("list")}
      >
        List
      </button>
      {settings.settingsEnabled && (
        <button onClick={() => openSettings()}>
          Settings
        </button>
      )}
    </div>
  );
}
```

## Integration Patterns

`useHeaderSettings` reads from the same `SettingsProvider` context as `useFooterSettings`, via the `useSettings` hook from `@/components/providers/settings-provider`. The provider receives all settings during server-side rendering, so the data is available immediately on the client without any fetch or hydration mismatch. The default values (`layoutDefault`, `paginationDefault`, `themeDefault`) are used to initialize UI state before the user makes any selections.

## Best Practices

- **Use the `*Enabled` booleans to conditionally render header elements** rather than hiding them with CSS. This keeps the header clean and avoids rendering unnecessary components.
- **Initialize layout and pagination state from the defaults** provided by `settings.layoutDefault` and `settings.paginationDefault` to ensure the UI reflects the configured defaults on first render.
- **Coordinate with `useFooterSettings`** to avoid showing the same controls (like theme toggle) in both the header and footer simultaneously.
- **Keep header components performant** -- the header renders on every page, so avoid expensive operations in components that consume these settings.
- **Handle the `loading` and `error` states defensively** even though they are currently inert, to future-proof the component.

## Related Hooks

- [useFooterSettings](./use-footer-settings-reference.md) -- Companion hook for footer configuration, following the same pattern.
- [useTheme](./use-theme-reference.md) -- Theme management hook, controlled by `themeEnabled` and initialized with `themeDefault`.
- [useStickyState](./use-sticky-state-reference.md) -- Sticky header detection, often used alongside header settings.
