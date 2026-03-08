---
id: dark-mode
title: "Dark Mode & Theme Switching"
sidebar_label: "Dark Mode"
sidebar_position: 25
---

# Dark Mode & Theme Switching

The template supports a dual-layer theming system: **dark/light mode** powered by `next-themes`, and **color themes** (e.g., Everworks, Corporate, Material, Funny) managed through a custom `LayoutThemeContext`. Both systems work together -- dark mode toggles the color scheme, while color themes change the primary, secondary, and accent palettes.

## Architecture Overview

```
components/
  theme-toggler.tsx                     -- Dark/light mode toggle component
  context/LayoutThemeContext.tsx         -- Color theme context and provider
  settings-modal.tsx                    -- Full settings modal (includes theme)

hooks/
  use-theme.ts                          -- Theme metadata and helpers

lib/
  themes.tsx                            -- Theme preview components
  theme-color-manager.ts               -- CSS variable application
  theme-utils.ts                        -- Theme utility functions
```

## Dark/Light Mode Toggle

The `ThemeToggler` component at `components/theme-toggler.tsx` uses `next-themes` to switch between dark and light modes:

```tsx
// components/theme-toggler.tsx
import { useTheme } from "next-themes";

export function ThemeToggler({ compact, openUp, iconOnly }: ThemeTogglerProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  // Icon-only mode: single toggle button
  if (iconOnly) {
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun /> : <Moon />}
      </button>
    );
  }

  // Compact mode: pill-style toggle switch
  if (compact) {
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="relative h-10 w-20 rounded-full ..."
      >
        <span className={`transform rounded-full ${theme === "dark" ? "translate-x-11" : "translate-x-1"}`}>
          {theme === "dark" ? <Moon /> : <Sun />}
        </span>
      </button>
    );
  }

  // Default: dropdown with Light/Dark options
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        {theme === "light" ? <Sun /> : <Moon />}
      </button>
      {isOpen && (
        <div className="absolute bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl ...">
          <button onClick={() => handleThemeChange("light")}>
            <Sun /> Light
          </button>
          <button onClick={() => handleThemeChange("dark")}>
            <Moon /> Dark
          </button>
        </div>
      )}
    </div>
  );
}
```

### Component Variants

| Prop | Behavior |
|------|----------|
| `iconOnly` | Single toggle button (sun/moon icon), used in the header |
| `compact` | Pill-style switch for inline use |
| Default | Dropdown menu with Light and Dark options |

### Hydration Safety

The component returns `null` until after mount (`mounted` state) to prevent hydration mismatches between server and client, since the theme depends on `localStorage` or system preferences that are only available on the client.

### Accessibility

- `aria-label` on toggle buttons describes the target state
- `aria-expanded` and `aria-controls` on the dropdown trigger
- Escape key closes the dropdown
- Focus and hover tooltips use `createPortal` to avoid layout issues

### Internationalization

Labels use `next-intl` translations:

```tsx
const t = useTranslations("common");
const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");
```

## Color Theme System

### Theme Configuration

Color themes are defined in `components/context/LayoutThemeContext.tsx`:

```tsx
// components/context/LayoutThemeContext.tsx
export type ThemeKey = "everworks" | "corporate" | "material" | "funny";

export const THEME_CONFIGS: Record<ThemeKey, ThemeConfig> = {
  everworks: {
    primary: "#0070f3",
    secondary: "#00c853",
    accent: "#0056b3",
    background: "#ffffff",
    surface: "#f8f9fa",
    text: "#1a1a1a",
    textSecondary: "#6c757d",
  },
  corporate: {
    primary: "#2c3e50",
    secondary: "#e74c3c",
    accent: "#34495e",
    // ...
  },
  material: {
    primary: "#673ab7",
    secondary: "#ff9800",
    accent: "#9c27b0",
    // ...
  },
  funny: {
    primary: "#ff4081",
    secondary: "#ffeb3b",
    accent: "#e91e63",
    // ...
  },
};
```

### CSS Custom Properties

When a color theme is selected, CSS custom properties are applied to `document.documentElement`:

```tsx
const CSS_VARIABLES = {
  "--theme-primary": "primary",
  "--theme-secondary": "secondary",
  "--theme-accent": "accent",
  "--theme-background": "background",
  "--theme-surface": "surface",
  "--theme-text": "text",
  "--theme-text-secondary": "textSecondary",
};

const applyThemeVariables = (theme: ThemeConfig) => {
  const root = document.documentElement;
  Object.entries(CSS_VARIABLES).forEach(([cssVar, configKey]) => {
    root.style.setProperty(cssVar, theme[configKey]);
  });
};
```

Components reference these variables via Tailwind classes like `text-theme-primary`, `bg-theme-accent`, etc.

### Theme Persistence

Theme selection is persisted to `localStorage` and hydrated on mount:

```tsx
const useThemeManager = () => {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>("everworks");

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem('themeKey');
    if (saved && isValidThemeKey(saved)) {
      setThemeKeyState(saved);
    }
  }, []);

  const setThemeKey = useCallback((key: ThemeKey) => {
    setThemeKeyState(key);
    safeLocalStorage.setItem('themeKey', key);
    applyThemeWithPalettes(key);
  }, []);
};
```

The `safeLocalStorage` wrapper handles errors gracefully (e.g., when localStorage is disabled or full).

### Theme Palette Generation

The `applyThemeWithPalettes` function from `lib/theme-color-manager.ts` generates a full color palette (shades 50 through 950) from each base color and applies them as CSS variables. This enables classes like `bg-theme-primary-100` and `text-theme-primary-800`.

## useTheme Hook

The `hooks/use-theme.ts` hook provides theme metadata and actions for the settings UI:

```tsx
// hooks/use-theme.ts
export const useTheme = () => {
  const { themeKey, setThemeKey, currentTheme } = useLayoutTheme();

  const currentThemeInfo = useMemo(() => THEME_INFO[themeKey], [themeKey]);
  const availableThemes = useMemo(() => Object.values(THEME_INFO), []);

  const changeTheme = useCallback((newThemeKey: ThemeKey) => {
    if (newThemeKey === themeKey) return;
    setThemeKey(newThemeKey);
  }, [themeKey, setThemeKey]);

  return {
    themeKey,
    currentTheme,
    currentThemeInfo,
    availableThemes,
    changeTheme,
    isThemeActive,
    getThemeInfo,
  };
};
```

The `THEME_INFO` map includes human-readable labels and descriptions:

```tsx
export const THEME_INFO: Record<ThemeKey, ThemeInfo> = {
  everworks: {
    key: "everworks",
    label: "Default",
    description: "Modern and professional theme with blue and green accents",
    colors: { primary: "#3d70ef", secondary: "#00c853", accent: "#0056b3", ... },
  },
  corporate: {
    key: "corporate",
    label: "Corporate",
    description: "Professional business theme with dark gray and red accents",
    colors: { ... },
  },
  // ...
};
```

## Dark Mode in CSS

The template uses Tailwind CSS dark mode with the `class` strategy. Dark variants are applied using the `dark:` prefix:

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

The `next-themes` provider adds a `dark` class to the `<html>` element when dark mode is active.

## System Preference Detection

`next-themes` automatically detects the system color scheme preference via `prefers-color-scheme` media query. Users can override this with an explicit light or dark selection, which is persisted in `localStorage` under the `theme` key.

## Integration Points

The theme system connects to several parts of the application:

| Component | Integration |
|-----------|-------------|
| `ThemeToggler` | Header and footer dark/light toggle |
| `SettingsModal` | Full theme selection UI in the floating settings panel |
| `LayoutThemeProvider` | Wraps the app tree, manages all UI preferences |
| `ContainerWidthProvider` | Nested inside LayoutThemeProvider for container width |

## File Reference

| File | Purpose |
|------|---------|
| `components/theme-toggler.tsx` | Dark/light mode toggle (3 variants) |
| `components/context/LayoutThemeContext.tsx` | Color theme context, CSS variable sync, localStorage |
| `hooks/use-theme.ts` | Theme metadata, available themes, change handler |
| `lib/themes.tsx` | Theme preview components for the settings UI |
| `lib/theme-color-manager.ts` | Full palette generation and CSS variable application |
| `lib/theme-utils.ts` | Theme utility functions |
