---
id: theme-system-deep-dive
title: "Theme System Deep Dive"
sidebar_label: "Theme System Deep Dive"
sidebar_position: 46
---

# Theme System Deep Dive

## Overview

The Theme System provides a comprehensive, multi-layered theming infrastructure that powers dynamic color palettes, pre-built theme presets, CSS utility classes, and theme metadata for UI selectors. It spans three modules: `theme-color-manager.ts` for runtime palette application, `theme-utils.ts` for Tailwind utility classes and helper functions, and `themes.tsx` for theme definitions with React preview components.

## Architecture

The theme system is layered on top of the [Color Generator](./color-generator-system) and consumed by the `LayoutThemeContext`:

```
themes.tsx                    -- Theme definitions, metadata, previews
  |
theme-color-manager.ts        -- Runtime palette application (DOM manipulation)
  |-- EXTENDED_THEME_CONFIGS  -- Full color configs per theme
  |-- applyColorPalette()     -- Apply single color palette to DOM
  |-- applyThemeWithPalettes()-- Apply full theme to DOM
  |-- generateThemeCss()      -- Generate CSS string
  |-- applyCustomTheme()      -- Apply arbitrary colors
  |-- useThemeWithPalettes()  -- React hook wrapper
  |
theme-utils.ts                -- Utility classes, color lookups, builders
  |-- themeClasses            -- Pre-built Tailwind class maps
  |-- tailwindColors          -- Full Tailwind color palette reference
  |-- animationClasses        -- Animation utility classes
  |-- responsiveClasses       -- Responsive layout classes
  |-- THEME_PRESETS           -- Simple color presets
  |
color-generator.ts            -- Mathematical palette generation (see separate doc)
```

All three modules reference `ThemeKey` and `ThemeConfig` from `@/components/context/LayoutThemeContext`, ensuring type consistency across the theme system.

### Available Themes

| Key | Label | Primary | Secondary |
|-----|-------|---------|-----------|
| `everworks` | Default | `#3d70ef` | `#00c853` |
| `corporate` | Corporate | `#00c853` | `#e74c3c` |
| `material` | Material | `#673ab7` | `#ff9800` |
| `funny` | Funny | `#ff4081` | `#ffeb3b` |

## API Reference

### Exports from `lib/theme-color-manager.ts`

#### `EXTENDED_THEME_CONFIGS: Record<ThemeKey, ThemeConfig>`

Complete color configurations for each theme, including primary, secondary, accent, background, surface, text, and textSecondary values.

#### `applyColorPalette(colorName: string, baseColor: string): void`

Generates a full palette from `baseColor` and applies it to `document.documentElement` as CSS custom properties. Also sets an `-rgb` variable for opacity support.

#### `applyThemeWithPalettes(themeKey: ThemeKey): void`

Applies a complete theme by calling `applyColorPalette()` for primary, secondary, and accent colors, plus setting background, surface, and text variables. Falls back to `everworks` if the specified theme fails.

#### `generateThemeCss(themeKey: ThemeKey): string`

Generates a CSS string containing all custom property declarations for a theme, suitable for injection into a `<style>` tag or stylesheet.

#### `useThemeWithPalettes(themeKey: ThemeKey): void`

A simple wrapper that calls `applyThemeWithPalettes()` on the client side (checks `typeof window`). Suitable for use in React effects.

#### `applyCustomTheme(colors: { primary: string; secondary: string; accent: string }): void`

Applies arbitrary colors (not from preset themes) by generating palettes for each provided color.

#### `previewThemeColors(baseColor: string): void`

Debug utility that logs all palette shades to the console with colored backgrounds for visual inspection.

### Exports from `lib/theme-utils.ts`

#### `themeClasses`

Pre-built Tailwind CSS class maps organized by component type:

```typescript
themeClasses.button.primary    // "bg-theme-primary hover:bg-theme-accent text-white"
themeClasses.button.secondary  // "bg-theme-secondary hover:bg-theme-secondary/80 text-white"
themeClasses.button.outline    // "border-2 border-theme-primary ..."
themeClasses.button.ghost      // "text-theme-primary hover:bg-theme-primary/10"
themeClasses.text.primary      // "text-theme-text"
themeClasses.text.secondary    // "text-theme-text-secondary"
themeClasses.text.accent       // "text-theme-primary"
themeClasses.background.*      // Background variants
themeClasses.border.*          // Border variants
```

#### `tailwindColors`

Complete Tailwind CSS color palette reference object containing all standard colors (slate, gray, zinc, neutral, stone, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose) with shades 50 through 950.

#### `opacities`

Opacity value map from 5 to 95 as string decimals.

#### `animationClasses`

Pre-built animation class combinations: `fadeIn`, `slideIn`, `scaleIn`, `hover`, `press`.

#### `responsiveClasses`

Pre-built responsive layout classes: `container`, `grid.responsive`, `grid.auto`, `flex.center`, `flex.between`, `flex.start`.

#### `getCssVariable(name: string): string`

Returns a `var(--name)` CSS variable reference string.

#### `withOpacity(colorClass: string, opacity: number | string): string`

Appends Tailwind opacity modifier to a class (e.g., `"bg-blue-500/50"`).

#### `getThemeColor(themeKey: ThemeKey, colorType: 'primary' | 'secondary'): string`

Returns the hex color value for a specific theme and color type.

#### `generateThemeCSS(themeKey: ThemeKey): Record<string, string>`

Returns an object with `--theme-primary` and `--theme-secondary` CSS property values for a theme.

#### `cn(...classes: (string | undefined | null | false)[]): string`

Utility to conditionally join class names, filtering out falsy values.

#### `buildThemeClasses(baseClasses: string, themeClasses: string, conditionalClasses?: Record<string, boolean>): string`

Combines base classes, theme classes, and conditional classes into a single class string.

#### `THEME_PRESETS`

Simple two-color preset records for each theme key (primary + secondary only).

### Exports from `lib/themes.tsx`

#### `ThemeMetadata` (Interface)

```typescript
interface ThemeMetadata {
  readonly key: ThemeKey;
  readonly label: string;
  readonly description: string;
  readonly preview: React.ReactNode;
  readonly config: ThemeConfig;
}
```

#### `ThemePreviews: Record<ThemeKey, React.ReactNode>`

React elements rendering small colored preview thumbnails for each theme.

#### `THEME_DEFINITIONS: Record<ThemeKey, Omit<ThemeMetadata, 'config'>>`

Theme metadata without config, including labels, descriptions, and preview components.

#### `getThemeMetadata(themeKey: ThemeKey, config: ThemeConfig): ThemeMetadata`

Merges theme definitions with a config to produce complete metadata.

#### `getAllThemeMetadata(configs: Record<ThemeKey, ThemeConfig>): ThemeMetadata[]`

Returns an array of complete theme metadata for all themes, useful for rendering theme selectors.

## Implementation Details

**DOM manipulation**: `applyColorPalette()` directly modifies `document.documentElement.style` to set CSS custom properties. This enables instant theme switching without page reload.

**RGB variable for opacity**: Each color palette also sets a `--{name}-rgb` variable containing comma-separated RGB values (e.g., `59, 130, 246`), enabling `rgba()` usage with opacity in CSS.

**Fallback strategy**: `applyThemeWithPalettes()` catches errors and falls back to the `everworks` theme. If even the fallback fails, it logs the error and exits gracefully.

**Immutable presets**: `THEME_PRESETS` and `EXTENDED_THEME_CONFIGS` are declared `as const` to prevent accidental mutation.

## Configuration

Theme selection is managed by the `LayoutThemeContext` React context. The four built-in themes are configured directly in `EXTENDED_THEME_CONFIGS`. Custom themes can be applied at runtime using `applyCustomTheme()`.

## Usage Examples

```typescript
// Apply a preset theme
import { applyThemeWithPalettes } from '@/lib/theme-color-manager';
applyThemeWithPalettes('material');

// Apply custom brand colors
import { applyCustomTheme } from '@/lib/theme-color-manager';
applyCustomTheme({
  primary: '#1a73e8',
  secondary: '#34a853',
  accent: '#ea4335',
});

// Use theme-aware utility classes
import { themeClasses, cn } from '@/lib/theme-utils';

function Button({ variant = 'primary', className, ...props }) {
  return (
    <button
      className={cn(themeClasses.button[variant], className)}
      {...props}
    />
  );
}

// Build a theme selector UI
import { getAllThemeMetadata } from '@/lib/themes';
import { EXTENDED_THEME_CONFIGS } from '@/lib/theme-color-manager';

function ThemeSelector() {
  const themes = getAllThemeMetadata(EXTENDED_THEME_CONFIGS);

  return (
    <div className={responsiveClasses.grid.responsive}>
      {themes.map((theme) => (
        <button key={theme.key} onClick={() => applyThemeWithPalettes(theme.key)}>
          {theme.preview}
          <span>{theme.label}</span>
          <p>{theme.description}</p>
        </button>
      ))}
    </div>
  );
}

// Generate theme CSS for server-side rendering
import { generateThemeCss } from '@/lib/theme-color-manager';

const css = generateThemeCss('everworks');
// Inject into <style> tag in document head
```

## Best Practices

- Use `themeClasses` from `theme-utils.ts` for consistent component styling rather than writing theme-aware classes manually.
- Always apply themes through `applyThemeWithPalettes()` to ensure all color palettes (primary, secondary, accent) and non-palette variables (background, surface, text) are set together.
- Use `generateThemeCss()` for server-side rendering to avoid a flash of unstyled content before client-side JavaScript applies the theme.
- When adding a new theme, update all three files: `EXTENDED_THEME_CONFIGS` in `theme-color-manager.ts`, `THEME_PRESETS` in `theme-utils.ts`, and `THEME_DEFINITIONS` in `themes.tsx`.
- Use the `cn()` utility for conditional class composition to keep JSX clean and readable.

## Related Modules

- [Color Generator System](./color-generator-system) -- Mathematical foundation for palette generation
- [Color System](/docs/template/architecture/color-system) -- Higher-level color system overview
