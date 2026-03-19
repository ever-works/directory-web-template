---
id: use-footer-settings-reference
title: "useFooterSettings Reference"
sidebar_label: "useFooterSettings"
sidebar_position: 46
---

# useFooterSettings

## Overview

`useFooterSettings` provides client-side access to footer configuration from the `SettingsProvider` context. Because the settings are server-rendered into the context provider, this hook returns data instantly with no loading delay or additional network requests. Use it to conditionally render footer features such as the newsletter subscribe form, version badge, and theme selector.

## Import

```typescript
import { useFooterSettings } from "@/hooks/use-footer-settings";
```

## API Reference

### Parameters

This hook takes no parameters.

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `settings` | `FooterSettings` | The footer configuration object from the settings provider. |
| `loading` | `boolean` | Always `false` since data is sourced from server-rendered context. Included for interface consistency with other settings hooks. |
| `error` | `Error \| null` | Always `null` since data is sourced from server-rendered context. Included for interface consistency. |

### `FooterSettings` Type

```typescript
interface FooterSettings {
  subscribeEnabled: boolean;
  versionEnabled: boolean;
  themeSelectorEnabled: boolean;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `subscribeEnabled` | `boolean` | Whether the newsletter subscription form should be displayed in the footer. |
| `versionEnabled` | `boolean` | Whether the application version badge should be shown in the footer. |
| `themeSelectorEnabled` | `boolean` | Whether the theme selector (light/dark/system toggle) should appear in the footer. |

## Usage Examples

### Basic Usage

```typescript
import { useFooterSettings } from "@/hooks/use-footer-settings";

function Footer() {
  const { settings } = useFooterSettings();

  return (
    <footer className="border-t py-8">
      <div className="container mx-auto">
        {settings.subscribeEnabled && <NewsletterForm />}
        <div className="flex items-center justify-between">
          {settings.themeSelectorEnabled && <ThemeSelector />}
          {settings.versionEnabled && <VersionBadge />}
        </div>
      </div>
    </footer>
  );
}
```

### Advanced Usage

```typescript
import { useFooterSettings } from "@/hooks/use-footer-settings";

function FooterSection() {
  const { settings, loading, error } = useFooterSettings();

  // While loading/error are always false/null for this hook,
  // handling them makes the component resilient to future changes
  if (loading) return <FooterSkeleton />;
  if (error) return <FooterFallback />;

  const hasAnyFeature =
    settings.subscribeEnabled ||
    settings.versionEnabled ||
    settings.themeSelectorEnabled;

  if (!hasAnyFeature) {
    return <MinimalFooter />;
  }

  return (
    <footer>
      {settings.subscribeEnabled && (
        <section className="py-6 border-b">
          <h3>Stay Updated</h3>
          <NewsletterForm />
        </section>
      )}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          {settings.themeSelectorEnabled && <ThemeSelector />}
        </div>
        {settings.versionEnabled && (
          <span className="text-xs text-muted-foreground">
            v{appVersion}
          </span>
        )}
      </div>
    </footer>
  );
}
```

## Integration Patterns

`useFooterSettings` reads from the `SettingsProvider` context (via `useSettings` from `@/components/providers/settings-provider`), which receives its data during server-side rendering. This means the settings are available on the very first client render with no hydration mismatch risk. The hook is intentionally thin -- it extracts only the `footerSettings` slice from the broader settings context and wraps it in a consistent `{ settings, loading, error }` shape.

## Best Practices

- **Use feature flags from settings to conditionally render footer sections** rather than hard-coding which features appear. This allows site administrators to toggle footer features without code changes.
- **Maintain the `loading`/`error` checks** even though they are currently always `false`/`null`. This defensive pattern protects against future refactors that might introduce asynchronous data sources.
- **Pair with `useHeaderSettings`** for consistent feature toggling across the header and footer (e.g., ensuring the theme selector appears in one place or the other, but not both).
- **Keep footer components lightweight** since they appear on every page. Avoid expensive computations inside footer components that consume these settings.

## Related Hooks

- [useHeaderSettings](./use-header-settings-reference.md) -- Companion hook for header configuration, following the same pattern.
- [useTheme](./use-theme-reference.md) -- Theme management hook used by the theme selector that `themeSelectorEnabled` controls.
