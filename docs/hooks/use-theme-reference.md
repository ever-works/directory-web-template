---
id: use-theme-reference
title: useTheme Hook Reference
sidebar_label: useTheme
sidebar_position: 37
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useTheme

Manages theme selection and provides metadata for all available themes. Supports multiple color themes with full color configuration details. Theme state is persisted through the `LayoutThemeContext`.

**Source:** `template/hooks/use-theme.ts`

## Return Values

```ts
const {
  // Current theme data
  themeKey,          // ThemeKey -- Current active theme identifier
  currentTheme,      // Theme object from LayoutThemeContext
  currentThemeInfo,  // ThemeInfo -- Full metadata for the active theme

  // Available themes
  availableThemes,   // ThemeInfo[] -- Array of all theme options

  // Actions
  changeTheme,       // (newThemeKey: ThemeKey) => void -- Switch to a different theme
  isThemeActive,     // (checkThemeKey: ThemeKey) => boolean -- Check if a theme is active
  getThemeInfo,      // (key: ThemeKey) => ThemeInfo -- Get metadata for any theme
} = useTheme();
```

## Types

```ts
type ThemeKey = 'everworks' | 'corporate' | 'material' | 'funny';

interface ThemeInfo {
  key: ThemeKey;
  label: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
}
```

## Available Themes

| Key | Label | Description | Primary | Secondary |
|-----|-------|-------------|---------|-----------|
| `everworks` | Default | Modern and professional with blue and green accents | `#3d70ef` | `#00c853` |
| `corporate` | Corporate | Professional business with dark gray and red accents | `#2c3e50` | `#e74c3c` |
| `material` | Material | Google Material Design inspired with purple and orange | `#673ab7` | `#ff9800` |
| `funny` | Funny | Playful and vibrant with pink and yellow colors | `#ff4081` | `#ffeb3b` |

All theme metadata is available via the exported `THEME_INFO` constant:

```ts
import { THEME_INFO } from '@/hooks/use-theme';
```

## Usage: Theme Switcher

```tsx
function ThemeSwitcher() {
  const { availableThemes, themeKey, changeTheme } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-3">
      {availableThemes.map((theme) => (
        <button
          key={theme.key}
          onClick={() => changeTheme(theme.key)}
          className={`p-4 rounded-lg border-2 ${
            theme.key === themeKey ? 'border-primary' : 'border-transparent'
          }`}
        >
          <div className="flex gap-2 mb-2">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: theme.colors.secondary }}
            />
          </div>
          <p className="font-medium">{theme.label}</p>
          <p className="text-sm text-muted">{theme.description}</p>
        </button>
      ))}
    </div>
  );
}
```

## Usage: Theme-Aware Component

```tsx
function ThemedCard({ children }) {
  const { currentThemeInfo } = useTheme();
  const { colors } = currentThemeInfo;

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        color: colors.text,
        borderColor: colors.primary,
      }}
      className="p-6 rounded-lg border"
    >
      {children}
    </div>
  );
}
```

## Usage: Active Theme Indicator

```tsx
function ThemeIndicator() {
  const { currentThemeInfo, isThemeActive } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: currentThemeInfo.colors.primary }}
      />
      <span>Theme: {currentThemeInfo.label}</span>
      {isThemeActive('corporate') && <Badge>Business</Badge>}
    </div>
  );
}
```

## Theme Persistence

Theme selection is persisted through the `LayoutThemeContext` provider, which stores the chosen theme key. The context manages:

- **Initial load:** Theme is read from the persisted store (e.g., localStorage or server preference)
- **Theme change:** `setThemeKey` updates both the context and the persisted store
- **No-op protection:** `changeTheme` skips the update if the requested theme is already active

## Performance

The hook uses `useMemo` and `useCallback` for optimization:

- `currentThemeInfo` -- Memoized, only recomputes when `themeKey` changes
- `availableThemes` -- Memoized once (static data, never changes)
- `changeTheme` -- Stable reference via `useCallback`
- `isThemeActive` -- Stable reference via `useCallback`
- `getThemeInfo` -- Stable reference via `useCallback` (no dependencies)

## Requirements

| Dependency | Purpose |
|------------|---------|
| `LayoutThemeContext` | Provides `themeKey`, `setThemeKey`, and `currentTheme` |

The hook must be used within a component tree that has the `LayoutThemeProvider` mounted.

## Related Hooks

- [`useLayoutTheme`](/docs/template/hooks/settings-hooks) - Lower-level context hook for theme and layout settings
- [`useFeatureFlagsWithSimulation`](/docs/template/hooks/use-feature-flags-reference) - Uses `LayoutThemeContext` for simulation mode
