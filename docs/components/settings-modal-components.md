---
id: settings-modal-components
title: "Settings Modal Reference"
sidebar_label: "Settings Modal"
sidebar_position: 54
---

# Settings Modal

## Overview

The settings modal system consists of two components: `SettingsButton`, a memoized icon button that opens the modal via the `useSettingsModal` hook, and `SettingsModal`, a portal-rendered dialog that presents application-wide configuration options including layout selection, container width, pagination type, and (in demo mode) database and checkout provider settings. The modal uses focus trapping, Escape-to-close, and backdrop-click-to-dismiss patterns.

## Architecture

```
template/components/
  settings-button.tsx   # Memoized trigger button with tooltip
  settings-modal.tsx    # Portal-rendered modal dialog with settings sections
```

---

## SettingsButton

### Import

```typescript
import { SettingsButton } from "@/components/settings-button";
```

### Props

This component takes no props. It uses the `useSettingsModal` hook for modal state management and `useTranslations("settings")` for i18n.

### Usage Examples

#### Basic Usage

```tsx
<SettingsButton />
```

#### In a Navigation Bar

```tsx
<nav className="flex items-center gap-3">
  <ThemeToggler />
  <LanguageSwitcher />
  <SettingsButton />
</nav>
```

### Behavior

- Renders a `Settings` gear icon (Lucide) inside a button.
- On hover/focus, a portal-based tooltip appears below the button showing the translated "Settings" label.
- Clicking opens the `SettingsModal` via `openModal()` from the `useSettingsModal` hook.
- The component is wrapped in `React.memo` to prevent unnecessary re-renders. It has `displayName = "SettingsButton"` for DevTools identification.

### Tooltip Implementation

The tooltip is rendered using `createPortal` to `document.body` to avoid clipping by parent overflow containers. Position is calculated from the button's `getBoundingClientRect()` and centered horizontally using `transform: translateX(-50%)`.

---

## SettingsModal

### Import

```typescript
import { SettingsModal } from "@/components/settings-modal";
```

### Props

This component takes no props. It reads modal state from `useSettingsModal()` hook and demo mode from `isDemoMode()`.

### Usage Examples

#### In Root Layout

```tsx
// Place once in the application root
<SettingsModal />
```

The modal is controlled entirely through the `useSettingsModal` hook:

```tsx
const { openModal, closeModal, isOpen } = useSettingsModal();

// Open from anywhere
<button onClick={openModal}>Open Settings</button>
```

### Modal Sections

The modal content is composed of several select/configuration components:

| Section | Component | Condition | Description |
|---------|-----------|-----------|-------------|
| Layout | `SelectLayout` | Always | Choose between Home 1 and Home 2 page layouts. |
| Container Width | `SelectContainerWidth` | Always | Toggle between fixed and fluid container modes. |
| Pagination | `SelectPaginationType` | Always | Choose between standard pagination and infinite scroll. |
| Database Mode | `SelectDatabaseMode` | Demo only | Toggle database features on/off for demo purposes. |
| Checkout Provider | `SelectCheckoutProvider` | Demo only | Select between payment providers (demo only). |
| Database Status | `DatabaseStatusWarning` | Demo only | Shows database connection status warning. |

### Behavior

1. **Open/Close**: Controlled by `useSettingsModal` hook state. Returns `null` when `isOpen` is `false` or during SSR (`typeof window === 'undefined'`).
2. **Portal rendering**: Both backdrop and modal are rendered via `createPortal(_, document.body)` at z-index `9998` (backdrop) and `9999` (modal).
3. **Focus management**: Uses `useFocusManagement` hook for:
   - Auto-focusing the modal container 100ms after opening.
   - Trapping focus within the modal using Tab/Shift+Tab cycling.
4. **Close triggers**: Clicking the backdrop, clicking the X button, or pressing Escape (via focus trap keyboard handler).

## Styling

### SettingsButton

- Icon button with responsive sizing: `h-4 w-4 lg:h-5 lg:w-5`.
- Hover effect: `hover:text-theme-primary` and `hover:scale-105`.
- Tooltip: `z-[9999]` with glassmorphic dark/light styling and `pointer-events-none`.

### SettingsModal

- **Backdrop**: Gradient from `black/50` to `black/70` (light) / `black/70` to `black/90` (dark) with `backdrop-blur-2xl backdrop-saturate-150`.
- **Modal container**: Centered (`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`) with:
  - Maximum width: `max-w-2xl`
  - Maximum height: `max-h-[90vh]`
  - Glassmorphic background: `bg-white/70 dark:bg-gray-900/70` with `backdrop-blur-2xl backdrop-saturate-200`
  - Border: `border-white/20 dark:border-white/10` with a subtle theme ring
  - Entrance animation: `animate-fade-in-up`
- **Header**: Gradient background with a themed icon container, bold title, and X close button with hover scale.
- **Content area**: Scrollable with thin custom scrollbar, `space-y-5` between sections.

## Accessibility

- **SettingsButton**: Has `aria-label` set to the translated "Open Settings" string. Tooltip appears on both hover and focus for keyboard users.
- **SettingsModal**:
  - `role="dialog"` and `aria-modal="true"` on the modal container.
  - `aria-labelledby="settings-title"` linking to the heading element.
  - `tabIndex={-1}` on the modal for programmatic focus.
  - Focus is automatically moved to the modal on open.
  - Focus is trapped within the modal: Tab cycles through focusable elements, Shift+Tab cycles backward.
  - Close button has `aria-label` set to the translated "Close Settings" string.
  - Backdrop has `aria-hidden="true"` to prevent screen readers from announcing it.

## Related Components

- [Context Providers](/docs/template/components/context-providers) - `SettingsModalContext` that powers the `useSettingsModal` hook.
- [Layout Settings](/docs/template/components/layout-settings-components) - Alternative inline layout controls.
- [UI Primitives](/docs/template/components/ui-primitives) - `SelectLayout`, `SelectContainerWidth`, `SelectPaginationType` components used inside the modal.
