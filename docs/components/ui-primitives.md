---
id: ui-primitives
title: UI Primitives
sidebar_label: UI Primitives
sidebar_position: 38
---

# UI Primitives

The `components/ui/` directory contains the foundational UI building blocks used throughout the template. These primitives wrap HeroUI and Radix UI components, applying the project's design system through `class-variance-authority` (cva) variants and Tailwind CSS utility classes.

## Architecture Overview

```
components/ui/
  button.tsx              # Button with 7 variants and 5 sizes
  input.tsx               # Text input wrapping HeroUI Input
  modal.tsx               # Portal-based modal with animations
  select.tsx              # Custom dropdown with portal support
  skeleton.tsx            # Loading placeholders (card, grid, table, detail)
  toast.tsx               # Toast notification primitives
  toaster.tsx             # Toast container and manager
  badge.tsx               # Status and category badges
  label.tsx               # Form labels
  textarea.tsx            # Multi-line text input
  switch.tsx              # Toggle switch
  popover.tsx             # Floating popover container
  accordion.tsx           # Collapsible content sections
  alert.tsx               # Alert banners
  separator.tsx           # Visual divider
  pagination.tsx          # Page navigation
  rating.tsx              # Star rating display
  search-input.tsx        # Search with icon and clear button
  searchable-select.tsx   # Filterable dropdown
  segmented-toggle.tsx    # Segmented control
  toggle-group.tsx        # Multi-option toggle
  password-strength.tsx   # Password strength indicator
  infinity-scroll.tsx     # Infinite scroll wrapper
  sticky-header.tsx       # Scroll-aware sticky header
  responsive-container.tsx # Breakpoint-aware container
  top-loading-bar.tsx     # Route-change loading indicator
  distance-badge.tsx      # Location distance display
  container.tsx           # Width-aware page container
  accessibility.tsx       # Skip links and focus management
  animations.tsx          # Shared animation utilities
  stripe-components.tsx   # Stripe Elements wrappers
  multi-step-form/        # Multi-step form system
```

## Button

The Button component maps `class-variance-authority` variants to HeroUI's `Button` under the hood.

```ts
// Variants: default, destructive, outline, outline-solid, secondary, ghost, link
// Sizes: default (h-9), xs (h-7), sm (h-8), lg (h-10), icon (h-9 w-9)

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  // All HeroUI Button props minus variant/size (remapped)
}
```

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default" size="lg">Submit</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost" size="icon"><TrashIcon /></Button>
```

The component internally maps shadcn-style variants (`default`, `destructive`, `outline`) to HeroUI equivalents (`solid`, `bordered`, `ghost`) while preserving the original Tailwind class styling.

## Modal

A portal-based modal with smooth scale and fade animations, backdrop blur, and full keyboard support.

```ts
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  subtitle?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  backdrop?: 'blur' | 'opaque' | 'transparent';
  isDismissable?: boolean;
  hideCloseButton?: boolean;
  animationDuration?: number;  // Default: 200ms
  customHeader?: React.ReactNode;
  showHeaderBorder?: boolean;
}
```

The modal uses a double `requestAnimationFrame` technique to ensure the DOM paints before triggering CSS transitions. Sub-components (`ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`) enable flexible composition:

```tsx
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";

<Modal isOpen={open} onClose={() => setOpen(false)} title="Confirm Action" size="md">
  <ModalBody>Are you sure you want to proceed?</ModalBody>
  <ModalFooter>
    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
    <Button onClick={handleConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

## Select

A custom dropdown with portal support for rendering inside scroll containers or modals.

```ts
interface SelectProps {
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  onChange?: (e: { target: { value: string } }) => void;
  size?: "sm" | "md" | "lg";
  variant?: "flat" | "bordered" | "faded" | "underlined";
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  usePortal?: boolean;            // Render dropdown in document.body
  isInvalid?: boolean;
  errorMessage?: string;
  classNames?: { trigger?, value?, popover?, listbox?, listboxWrapper? };
}
```

The `usePortal` mode renders the dropdown via `createPortal` to avoid clipping inside overflow containers. It automatically closes on scroll to prevent misalignment.

## Multi-Step Form System

Located in `components/ui/multi-step-form/`, this system provides three composable components:

### StepIndicator

Displays a horizontal progress bar with numbered step circles, completion checkmarks, and optional click-to-navigate.

```ts
interface StepIndicatorStep {
  id: string;
  title: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: StepIndicatorStep[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (step: number) => void;
}
```

### StepContainer

Wraps each step's content with a title and optional description.

### StepNavigation

Renders Previous/Next/Submit buttons with a step counter. The submit button turns green on the final step.

```tsx
import { StepIndicator, StepContainer, StepNavigation } from "@/components/ui/multi-step-form";

<StepIndicator steps={steps} currentStep={current} completedSteps={completed} />
<StepContainer title="Basic Info" description="Enter your details">
  {/* form fields */}
</StepContainer>
<StepNavigation
  currentStep={current}
  totalSteps={steps.length}
  isFirstStep={current === 1}
  isLastStep={current === steps.length}
  canGoNext={isValid}
  canGoPrevious={true}
  onNext={goNext}
  onPrevious={goPrevious}
/>
```

## Skeleton System

Five skeleton variants for different loading states:

| Component | Use Case |
|---|---|
| `Skeleton` | Generic pulsing placeholder (wraps HeroUI Skeleton) |
| `CardSkeleton` | Single card placeholder with title, description, tags |
| `GridSkeleton` | 18-card responsive grid placeholder |
| `TableSkeleton` | Configurable rows/columns table placeholder |
| `ItemDetailSkeleton` | Full item detail page placeholder |
| `ListingSkeleton` | Listing page with search bar, stats, and grid |

## Toast System

The toast primitives follow a compound component pattern with `ToastProvider`, `ToastViewport`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastAction`, and `ToastClose`. Toasts support `default` and `destructive` variants and use `role="status"` with `aria-live="polite"` for screen reader announcements.

## Accessibility

- All interactive components include `focus-visible:outline` and keyboard navigation.
- The Modal traps focus, handles Escape key, and uses `role="dialog"` with `aria-modal="true"`.
- Select items are keyboard-navigable with Enter/Space activation.
- StepIndicator circles use `aria-current="step"` and `aria-label` for navigation.
- Skip links and focus management utilities are in `accessibility.tsx`.
- Password strength indicators provide both visual and screen-reader feedback.

## Related Documentation

- [Multi-Step Forms](/docs/template/features/multi-step-forms) -- Full form workflow documentation
- [Shared Card Components](/docs/template/components/shared-card-components) -- Uses skeleton loaders
- [Context Providers](/docs/template/components/context-providers) -- Theme and layout context
- [Auth Components](/docs/template/components/auth-components) -- Uses button, input, modal primitives
