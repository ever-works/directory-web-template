---
id: dynamic-colors
title: Dynamic Color System
sidebar_label: Dynamic Colors
sidebar_position: 4
---

# Dynamic Color System

Ever Works includes a powerful dynamic color system that automatically generates complete color palettes (shades 50-950) from base colors.

## Overview

The dynamic color system provides:
- 🎨 **Automatic palette generation** - From single base color to full palette
- 🌈 **11 shades per color** - From 50 (lightest) to 950 (darkest)
- 🔄 **Tailwind integration** - All shades available as Tailwind classes
- 💾 **CSS variables** - Use in any CSS or inline styles
- ⚡ **Real-time updates** - Changes apply instantly

## Color Palette Structure

Each theme color (primary, secondary, accent) has 11 shades:

| Shade | Lightness | Use Case |
|-------|-----------|----------|
| **50** | Lightest | Light backgrounds, subtle highlights |
| **100-200** | Very light | Hover states, light backgrounds |
| **300-400** | Light | Borders, secondary elements |
| **500** | Base color | Primary buttons, main elements |
| **600-700** | Dark | Hover states, emphasis |
| **800-900** | Very dark | Text, dark mode elements |
| **950** | Darkest | Maximum contrast, deep backgrounds |

## Configuration

### CSS Variables

The system automatically injects CSS variables in `globals.css`:

```css
:root {
  /* Primary color with all shades */
  --theme-primary: #4d88ca;
  --theme-primary-50: #eff6ff;
  --theme-primary-100: #dbeafe;
  --theme-primary-200: #bfdbfe;
  --theme-primary-300: #93c5fd;
  --theme-primary-400: #60a5fa;
  --theme-primary-500: #3b82f6;
  --theme-primary-600: #2563eb;
  --theme-primary-700: #1d4ed8;
  --theme-primary-800: #1e40af;
  --theme-primary-900: #1e3a8a;
  --theme-primary-950: #172554;

  /* Secondary color */
  --theme-secondary: #00c853;
  --theme-secondary-50: #e8f5e9;
  /* ... all shades ... */

  /* Accent color */
  --theme-accent: #0056b3;
  --theme-accent-50: #e3f2fd;
  /* ... all shades ... */
}
```

### Tailwind Configuration

In `tailwind.config.ts`, colors are mapped to CSS variables:

```typescript
colors: {
  'theme-primary': {
    DEFAULT: "var(--theme-primary)",
    50: "var(--theme-primary-50)",
    100: "var(--theme-primary-100)",
    200: "var(--theme-primary-200)",
    300: "var(--theme-primary-300)",
    400: "var(--theme-primary-400)",
    500: "var(--theme-primary-500)",
    600: "var(--theme-primary-600)",
    700: "var(--theme-primary-700)",
    800: "var(--theme-primary-800)",
    900: "var(--theme-primary-900)",
    950: "var(--theme-primary-950)",
  },
  // Same for theme-secondary and theme-accent
}
```

## Usage

### Tailwind Classes

All these classes are automatically available:

#### Backgrounds

```jsx
<div className="bg-theme-primary-50">Lightest background</div>
<div className="bg-theme-primary-500">Main color background</div>
<div className="bg-theme-primary-900">Dark background</div>
```

#### Text Colors

```jsx
<p className="text-theme-primary-600">Colored text</p>
<h1 className="text-theme-secondary-700">Heading</h1>
```

#### Borders

```jsx
<div className="border-2 border-theme-primary-300">Bordered element</div>
```

#### Interactive States

```jsx
<button className="
  bg-theme-primary-500 
  hover:bg-theme-primary-600 
  active:bg-theme-primary-700
  focus:ring-4 
  focus:ring-theme-primary-300
  text-white
">
  Interactive Button
</button>
```

#### Gradients

```jsx
<div className="bg-gradient-to-r from-theme-primary-400 to-theme-primary-600">
  Gradient Background
</div>
```

### Programmatic Usage

```typescript
import { applyThemeWithPalettes, applyCustomTheme } from '@/lib/theme-color-manager';

// Apply a predefined theme
applyThemeWithPalettes('modern');

// Apply custom colors
applyCustomTheme({
  primary: '#6366f1',
  secondary: '#10b981',
  accent: '#8b5cf6'
});
```

### Preview Colors

```typescript
import { previewThemeColors } from '@/lib/theme-color-manager';

// Preview palette in browser console
previewThemeColors('#3b82f6');
```

### Integration with Theme Context

```typescript
import { useLayoutTheme } from '@/components/context/LayoutThemeContext';

const { setThemeKey } = useLayoutTheme();

// Changing theme automatically applies color palettes
setThemeKey('corporate');
```

## Practical Examples

### Card Component

```jsx
<div className="
  bg-theme-primary-50 
  border border-theme-primary-200 
  rounded-lg 
  p-6
  hover:bg-theme-primary-100
  transition-colors
">
  <h3 className="text-theme-primary-900 text-xl font-bold mb-2">
    Card Title
  </h3>
  <p className="text-theme-primary-700 mb-4">
    Card description with lighter text color.
  </p>
  <button className="
    bg-theme-primary-500 
    hover:bg-theme-primary-600 
    text-white 
    px-4 py-2 
    rounded
  ">
    Action
  </button>
</div>
```

### Alert Component

```jsx
// Success alert
<div className="bg-theme-secondary-50 border-l-4 border-theme-secondary-500 p-4">
  <p className="text-theme-secondary-900">Success message</p>
</div>

// Warning alert
<div className="bg-theme-accent-50 border-l-4 border-theme-accent-500 p-4">
  <p className="text-theme-accent-900">Warning message</p>
</div>
```

### Navigation

```jsx
<nav className="bg-theme-primary-900">
  <a className="
    text-theme-primary-100 
    hover:text-white 
    hover:bg-theme-primary-800
    px-4 py-2
  ">
    Home
  </a>
</nav>
```

## Dark Mode Support

```jsx
<div className="
  bg-theme-primary-50 
  dark:bg-theme-primary-900
  text-theme-primary-900
  dark:text-theme-primary-50
">
  Adapts to dark mode
</div>
```

## Best Practices

### 1. Consistent Shade Usage
- Use **50-200** for light backgrounds
- Use **300-400** for borders and subtle elements
- Use **500-600** for primary actions
- Use **700-900** for text and emphasis
- Use **950** for maximum contrast

### 2. Accessibility
- Ensure sufficient contrast ratios (WCAG AA: 4.5:1 for text)
- Test with color blindness simulators
- Don't rely on color alone for information

### 3. Performance
- CSS variables are performant
- Tailwind purges unused classes in production
- Minimal runtime overhead

### 4. Consistency
- Stick to the palette for all UI elements
- Use semantic naming (primary, secondary, accent)
- Document custom color usage

## Troubleshooting

### Colors Not Updating

**Issue**: Theme colors don't change

**Solution**: Check CSS variable injection

```javascript
// In browser console
getComputedStyle(document.documentElement).getPropertyValue('--theme-primary-500')
```

### Tailwind Classes Not Working

**Issue**: `bg-theme-primary-500` not applying

**Solution**: Verify Tailwind configuration includes theme colors

```typescript
// tailwind.config.ts
extend: {
  colors: {
    'theme-primary': { /* ... */ }
  }
}
```

### Palette Generation Issues

**Issue**: Generated shades look incorrect

**Solution**: Use valid hex colors as base

```typescript
// ✅ Good
applyCustomTheme({ primary: '#3b82f6' });

// ❌ Bad
applyCustomTheme({ primary: 'blue' });
```

## Next Steps

- [Theming](./theming) - Learn about the theme system
- [Customization](./customization) - General customization guide
- [Development](/docs/development/local-setup) - Set up your development environment

## Resources

- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

