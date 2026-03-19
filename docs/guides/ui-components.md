---
id: ui-components
title: UI Component Library Reference
sidebar_label: UI Components
sidebar_position: 13
---

# UI Component Library Reference

The Ever Works template includes a comprehensive UI component library located in `components/ui/`. These are shared, reusable components used across public pages, client dashboard, and admin interfaces. Many are built on top of [shadcn/ui](https://ui.shadcn.com/) primitives and styled with Tailwind CSS.

## Component Inventory

The library contains over 40 components organized by function:

### Form Inputs

| Component | File | Description |
|-----------|------|-------------|
| `Input` | `input.tsx` | Standard text input with variants |
| `Textarea` | `textarea.tsx` | Multi-line text input |
| `Label` | `label.tsx` | Form field label with required indicator |
| `Select` | `select.tsx` | Dropdown select built on shadcn/ui Select |
| `SearchableSelect` | `searchable-select.tsx` | Select with search/filter functionality |
| `SearchInput` | `search-input.tsx` | Input with search icon and debounced onChange |
| `Switch` | `switch.tsx` | Toggle switch for boolean values |
| `PasswordStrength` | `password-strength.tsx` | Visual password strength indicator |

### Multi-Step Form System

Located in `components/ui/multi-step-form/`:

| Component | File | Description |
|-----------|------|-------------|
| `StepContainer` | `step-container.tsx` | Wrapper for individual form steps |
| `StepIndicator` | `step-indicator.tsx` | Visual progress showing completed/active/pending steps |
| `StepNavigation` | `step-navigation.tsx` | Previous/Next/Submit navigation buttons |

Used by the admin item form and client form for multi-step creation workflows.

### Layout & Container

| Component | File | Description |
|-----------|------|-------------|
| `Card` | `card.tsx` | Card container with header, content, and footer sections |
| `Container` | `container.tsx` | Responsive content container with configurable max-width |
| `ResponsiveContainer` | `responsive-container.tsx` | Container with element-level responsive queries |
| `Separator` | `separator.tsx` | Horizontal or vertical visual separator |
| `StickyHeader` | `sticky-header.tsx` | Header that sticks to top on scroll |

### Feedback & Status

| Component | File | Description |
|-----------|------|-------------|
| `Alert` | `alert.tsx` | Alert banner with variant styles (default, destructive) |
| `Badge` | `badge.tsx` | Small status badge with color variants |
| `Toast` | `toast.tsx` | Temporary notification toast |
| `Toaster` | `toaster.tsx` | Toast container and management |
| `LoadingSpinner` | `loading-spinner.tsx` | Animated loading indicator |
| `Skeleton` | `skeleton.tsx` | Content placeholder for loading states |
| `TopLoadingBar` | `top-loading-bar.tsx` | Thin progress bar at page top during navigation |
| `DatabaseStatusWarning` | `database-status-warning.tsx` | Warning banner when DATABASE_URL is missing |

### Navigation & Interaction

| Component | File | Description |
|-----------|------|-------------|
| `Button` | `button.tsx` | Button with multiple variants (default, destructive, outline, secondary, ghost, link) and sizes |
| `Breadcrumb` | `breadcrumb.tsx` | Hierarchical navigation breadcrumb trail |
| `Pagination` | `pagination.tsx` | Page navigation with numbered pages and prev/next |
| `InfinityScroll` | `infinity-scroll.tsx` | Infinite scroll trigger using Intersection Observer |
| `ToggleGroup` | `toggle-group.tsx` | Group of toggle buttons (single or multi-select) |
| `SegmentedToggle` | `segmented-toggle.tsx` | Segmented control for switching between options |

### Overlay & Modal

| Component | File | Description |
|-----------|------|-------------|
| `Modal` | `modal.tsx` | Dialog overlay with title, content, and action buttons |
| `Popover` | `popover.tsx` | Floating content panel triggered by a button |
| `Accordion` | `accordion.tsx` | Collapsible content sections |

### Data Display

| Component | File | Description |
|-----------|------|-------------|
| `Rating` | `rating.tsx` | Star rating display and input component |
| `DistanceBadge` | `distance-badge.tsx` | Location distance indicator badge |

### Specialized Selectors

| Component | File | Description |
|-----------|------|-------------|
| `SelectLayout` | `select-layout.tsx` | Content layout selector (classic, grid, cards, masonry) |
| `SelectContainerWidth` | `select-container-width.tsx` | Container width configuration |
| `SelectPaginationType` | `select-pagination-type.tsx` | Pagination style selector |
| `SelectDatabaseMode` | `select-database-mode.tsx` | Database mode configuration |
| `SelectCheckoutProvider` | `select-checkout-provider.tsx` | Payment provider selector |

### Accessibility

| Component | File | Description |
|-----------|------|-------------|
| `Accessibility` | `accessibility.tsx` | Accessibility utility components and helpers |

### Animation & Visual

| Component | File | Description |
|-----------|------|-------------|
| `Animations` | `animations.tsx` | Reusable animation wrappers (fade, slide, scale) |
| `AuthIllustrations` | `auth-illustrations.tsx` | SVG illustrations for auth pages |

### Payment

| Component | File | Description |
|-----------|------|-------------|
| `StripeComponents` | `stripe-components.tsx` | Stripe Elements wrappers for payment forms |

## shadcn/ui Integration

The component library extends shadcn/ui primitives with project-specific styling and behavior. The integration approach:

1. **Base components from shadcn/ui** -- Button, Card, Input, Select, Switch, Badge, Alert, Accordion, Popover, Separator, Skeleton, Label, Textarea, Toggle Group
2. **Custom extensions** -- Components like SearchableSelect, InfinityScroll, Rating, MultiStepForm add functionality beyond the base library
3. **Consistent theming** -- All components use CSS variables for theming, supporting both light and dark modes

## Tailwind CSS Configuration

The template uses Tailwind CSS with the following customizations:

- **Dark mode** -- Class-based dark mode (`darkMode: 'class'`)
- **CSS variables** -- Colors are defined as CSS variables for theme switching
- **Custom utilities** -- Extended spacing, typography, and animation utilities
- **Responsive breakpoints** -- Standard Tailwind breakpoints with mobile-first approach

### Color System

Colors are defined as CSS variables and mapped to Tailwind utility classes:

```css
/* Light mode */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 222.2 47.4% 11.2%;
--secondary: 210 40% 96.1%;
--destructive: 0 84.2% 60.2%;
--muted: 210 40% 96.1%;
--accent: 210 40% 96.1%;

/* Dark mode */
--background: 222.2 84% 4.9%;
--foreground: 210 40% 98%;
/* ... */
```

## Usage Patterns

### Basic Component Usage

```tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function MyComponent() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Item Title</Card.Title>
      </Card.Header>
      <Card.Content>
        <Badge variant="secondary">Published</Badge>
        <p>Item description here.</p>
      </Card.Content>
      <Card.Footer>
        <Button variant="outline">Edit</Button>
        <Button>Save</Button>
      </Card.Footer>
    </Card>
  );
}
```

### Multi-Step Form

```tsx
import {
  StepContainer,
  StepIndicator,
  StepNavigation,
} from '@/components/ui/multi-step-form';

function CreateItemForm() {
  const [step, setStep] = useState(0);
  const steps = ['Basic Info', 'Classification', 'Location', 'Media', 'Review'];

  return (
    <div>
      <StepIndicator steps={steps} currentStep={step} />
      <StepContainer>
        {step === 0 && <BasicInfoStep />}
        {step === 1 && <ClassificationStep />}
        {/* ... */}
      </StepContainer>
      <StepNavigation
        currentStep={step}
        totalSteps={steps.length}
        onPrevious={() => setStep(s => s - 1)}
        onNext={() => setStep(s => s + 1)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

### Infinite Scroll

```tsx
import { InfinityScroll } from '@/components/ui/infinity-scroll';

function ItemList() {
  return (
    <div>
      {items.map(item => <ItemCard key={item.id} item={item} />)}
      <InfinityScroll
        hasMore={hasNextPage}
        isLoading={isFetchingNextPage}
        onLoadMore={fetchNextPage}
      />
    </div>
  );
}
```

## Related Files

- `components/ui/` -- All shared UI components
- `components/ui/multi-step-form/` -- Multi-step form system
- `tailwind.config.ts` -- Tailwind CSS configuration
- `app/globals.css` -- Global CSS with theme variables
