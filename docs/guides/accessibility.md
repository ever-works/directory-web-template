---
id: accessibility
title: "Accessibility"
sidebar_label: "Accessibility"
sidebar_position: 17
---

# Accessibility

The template is built with accessibility as a first-class concern. This guide documents the accessibility components, patterns, and techniques used throughout the application to ensure WCAG compliance.

## Accessibility Component Library

The `components/admin/admin-accessibility.tsx` module provides a set of reusable accessibility primitives used across the admin dashboard and available for use in any part of the application.

### AdminSkipLink

A skip navigation link that is visually hidden until focused. Allows keyboard users to bypass repetitive navigation and jump to main content:

```tsx
import { AdminSkipLink } from '@/components/admin/admin-accessibility';

<AdminSkipLink href="#main-content">
  Skip to main content
</AdminSkipLink>
```

The skip link uses `sr-only` by default and becomes visible on focus with absolute positioning at the top-left of the viewport:

```
sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white
focus:rounded-sm focus:shadow-lg
```

### AdminLandmark

A semantic landmark wrapper that renders the appropriate HTML element with ARIA attributes:

```tsx
import { AdminLandmark } from '@/components/admin/admin-accessibility';

<AdminLandmark as="main" label="Dashboard content">
  <DashboardContent />
</AdminLandmark>

<AdminLandmark as="nav" label="Primary navigation" describedBy="nav-help">
  <NavItems />
</AdminLandmark>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `'main'` \| `'section'` \| `'nav'` \| `'aside'` \| `'header'` \| `'footer'` | `'section'` | HTML landmark element |
| `label` | `string` | -- | Sets `aria-label` |
| `describedBy` | `string` | -- | Sets `aria-describedby` |

All landmarks include `scroll-mt-16` to prevent content from being hidden behind sticky headers when navigated via anchor links.

### AdminHeading

Provides proper heading hierarchy with optional visual level override:

```tsx
import { AdminHeading } from '@/components/admin/admin-accessibility';

// Semantic h2, visually styled as h3
<AdminHeading level={2} visualLevel={3}>
  Section Title
</AdminHeading>

// Screen-reader-only heading for sections that need semantic structure
<AdminHeading level={2} screenReaderOnly>
  Filter Controls
</AdminHeading>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `level` | `1` through `6` | -- | Semantic heading level (required) |
| `visualLevel` | `1` through `6` | Same as `level` | Visual styling level |
| `screenReaderOnly` | `boolean` | `false` | Visually hidden, available to screen readers |

This pattern solves a common issue where visual design requires smaller headings but the document outline needs proper nesting.

### AdminStatusAnnouncer

Announces status changes to screen readers using an ARIA live region:

```tsx
import { AdminStatusAnnouncer } from '@/components/admin/admin-accessibility';

// Polite announcement (waits for current speech to finish)
<AdminStatusAnnouncer message="3 items updated" />

// Assertive announcement (interrupts current speech)
<AdminStatusAnnouncer message="Error saving changes" priority="assertive" />
```

The component renders a visually hidden `<output>` element with `aria-live` and `aria-atomic="true"`:

```tsx
<output aria-live={priority} aria-atomic="true" className="sr-only">
  {message}
</output>
```

### AdminFocusTrap

Traps keyboard focus within a container, useful for modals and dialogs:

```tsx
import { AdminFocusTrap } from '@/components/admin/admin-accessibility';

<AdminFocusTrap active={isModalOpen}>
  <ModalContent />
</AdminFocusTrap>
```

The focus trap handles:

- **Tab** -- cycles focus from last focusable element back to first
- **Shift+Tab** -- cycles focus from first focusable element back to last
- **Escape** -- blurs the currently focused element (allows breaking out)

Focusable elements detected: `button`, `[href]`, `input`, `select`, `textarea`, `[tabindex]:not([tabindex="-1"])`.

### AdminAccessibleButton

A button component with built-in focus ring styles, loading state, and ARIA support:

```tsx
import { AdminAccessibleButton } from '@/components/admin/admin-accessibility';

<AdminAccessibleButton
  variant="primary"
  size="md"
  loading={isSubmitting}
  onClick={handleSubmit}
>
  Save Changes
</AdminAccessibleButton>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary'` \| `'secondary'` \| `'ghost'` | `'primary'` | Visual style |
| `size` | `'sm'` \| `'md'` \| `'lg'` | `'md'` | Button size |
| `loading` | `boolean` | `false` | Shows spinner, sets `aria-disabled` |

When `loading` is true, the button:

- Displays an animated spinner icon with `aria-hidden="true"`
- Renders a screen-reader-only loading status message
- Sets `aria-describedby` pointing to the loading status element
- Disables pointer events

## Focus Management

### Focus Ring Design System

The template uses a consistent focus ring style across interactive elements:

```
focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
dark:focus:ring-blue-400 dark:focus:ring-offset-gray-900
```

This ensures visible focus indicators in both light and dark modes with sufficient contrast against backgrounds.

### Keyboard Navigation Patterns

Interactive elements throughout the template follow standard keyboard patterns:

**Category grid items** use `tabIndex={0}` with Enter and Space key handlers:

```tsx
<div
  className="focus:outline-hidden focus:ring-2 focus:ring-theme-primary"
  role="button"
  aria-label={`View ${category.name} category`}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(category);
    }
  }}
  onClick={() => handleClick(category)}
/>
```

**Notification items** follow the same pattern for keyboard-accessible list navigation.

**Map popups** handle Escape key to close and manage focus restoration:

```tsx
onKeyDown={(e) => {
  if (e.key === 'Escape') {
    onClose();
  }
}}
```

## ARIA Patterns

### Live Regions

Toast notifications use `role="status"` with `aria-live="polite"` to announce messages without interrupting the user:

```tsx
<Toast role="status" aria-live="polite">
  <ToastTitle>{title}</ToastTitle>
  <ToastDescription>{description}</ToastDescription>
</Toast>
```

Alert banners (such as the expired plan banner) use `role="alert"` with `aria-live="polite"` for important but non-critical announcements.

### Decorative Elements

Icons and visual decorations are hidden from assistive technology using `aria-hidden="true"`:

```tsx
<TrendingUp className="h-5 w-5 text-blue-600" aria-hidden="true" />
<div className="w-3 h-3 bg-blue-500 rounded-full" aria-hidden="true" />
```

### Charts and Data Visualization

The admin activity chart implements comprehensive chart accessibility:

```tsx
<Card
  role="img"
  aria-label={chartSummary}
  aria-describedby="activity-chart-details"
>
  {/* Visual chart */}
  <div id="activity-chart-details" className="sr-only">
    {/* Screen-reader-only data table */}
  </div>
</Card>
```

Chart bars include `focus:opacity-100 focus:ring-2 focus:ring-blue-500` for keyboard-navigable data points. Each day's data includes a detailed `aria-label` with submission counts.

The chart legend uses `aria-label` to provide context:

```tsx
<ul aria-label={t('ARIA_LABELS.CHART_LEGEND')}>
  <div className="w-3 h-3 bg-blue-500 rounded-full" aria-hidden="true" />
  <span>Submissions</span>
</ul>
```

### Dashboard Cards

Stats cards use `aria-labelledby` linking to their title and optional `aria-describedby` for descriptions:

```tsx
<div
  aria-labelledby={titleId}
  aria-describedby={description ? descId : undefined}
>
  <div aria-hidden="true">{icon}</div>
  <h3 id={titleId}>{title}</h3>
  <p id={descId}>{description}</p>
</div>
```

Loading states include `aria-busy="true"` and screen-reader-only loading text:

```tsx
<div aria-busy="true" aria-live="polite">
  <span className="sr-only">Loading {title} statistic</span>
</div>
```

### Dialogs and Modals

The map item popup implements dialog accessibility:

```tsx
<div
  role="dialog"
  aria-label={translatedLabel}
>
  {/* Auto-focus close button on open */}
  {/* Escape key to close */}
  {/* Click-outside to close */}
</div>
```

Report modals use `tabIndex={-1}` on the wrapper for programmatic focus management and `onKeyDown` handlers for Escape key support.

### Navigation

Breadcrumb navigation uses the `nav` element with `aria-label`:

```tsx
<nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
  {/* Breadcrumb items */}
</nav>
```

The theme selector uses `role="radiogroup"` with `aria-label`:

```tsx
<div role="radiogroup" aria-label="Theme selection">
  {themes.map(theme => (
    <button aria-label={`Select ${theme.label} theme`} />
  ))}
</div>
```

## Screen Reader Support

### Visually Hidden Content

The `sr-only` utility class is used throughout to provide context visible only to screen readers:

- **Loading states** -- `<span className="sr-only">Loading collections...</span>`
- **Trend descriptions** -- `<span className="sr-only">{trendDescription}</span>`
- **Chart data** -- Hidden data tables alongside visual charts
- **Button context** -- Additional context for icon-only buttons

### Descriptive Labels

Interactive elements include descriptive `aria-label` attributes:

```tsx
// Favorite button with state-dependent label
<button
  aria-label={
    isFav
      ? `Remove ${itemName} from favorites`
      : `Add ${itemName} to favorites`
  }
/>

// Theme switch with current state
<button aria-label={`Current theme: ${currentThemeInfo.label}`} />

// Settings button
<button aria-label={t("OPEN_SETTINGS")} />
```

## Color and Contrast

### Dark Mode Support

All components support both light and dark modes with appropriate contrast ratios:

```
text-gray-900 dark:text-white          /* Primary text */
text-gray-600 dark:text-gray-300       /* Secondary text */
text-gray-500 dark:text-gray-400       /* Muted text */
bg-gray-100 dark:bg-gray-800           /* Subtle backgrounds */
```

Focus indicators adapt to the dark theme:

```
focus:ring-blue-500 dark:focus:ring-blue-400
focus:ring-offset-2 dark:focus:ring-offset-gray-900
```

### Error States

Destructive toast variants use semantic color and styling to communicate errors beyond color alone:

```
border-destructive bg-destructive text-destructive-foreground
```

Error boundaries include both icon (AlertTriangle) and text to communicate the error state.

## Accessibility Checklist

When adding new components, follow this checklist:

1. **Keyboard access** -- all interactive elements reachable via Tab and operable via Enter/Space
2. **Focus indicators** -- use the design system focus ring styles
3. **ARIA labels** -- all interactive elements have descriptive labels
4. **Headings** -- maintain proper heading hierarchy using `AdminHeading`
5. **Landmarks** -- wrap content sections in semantic elements or `AdminLandmark`
6. **Live regions** -- use `AdminStatusAnnouncer` for dynamic content updates
7. **Color independence** -- information is not conveyed by color alone
8. **Dark mode** -- components render correctly in both light and dark themes
9. **Screen reader text** -- use `sr-only` for additional context where needed
10. **Decorative elements** -- mark non-informative elements with `aria-hidden="true"`

## Related Files

| Path | Description |
|------|-------------|
| `components/admin/admin-accessibility.tsx` | Accessibility component library |
| `components/admin/admin-activity-chart.tsx` | Accessible chart implementation |
| `components/dashboard/stats-card.tsx` | Accessible stats card with loading states |
| `components/maps/map-item-popup.tsx` | Accessible map popup with focus management |
| `components/ui/toast.tsx` | Toast with ARIA live region |
| `components/categories-grid.tsx` | Keyboard-navigable grid items |
| `components/header/theme-switch.tsx` | Accessible theme selector |
| `components/favorite-button.tsx` | Button with state-dependent ARIA label |
| `components/billing/expired-plan-banner.tsx` | Alert banner with live region |
