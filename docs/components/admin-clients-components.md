---
id: admin-clients-components
title: Admin Clients Components
sidebar_label: Admin Clients
sidebar_position: 41
---

# Admin Clients Components

The clients module provides a full-featured admin interface for managing user accounts. It includes a multi-step creation/editing form, advanced search with saved filter presets, and skeleton loading states.

## Component Hierarchy

```
clients/
  client-form.tsx                  # Multi-step create/edit form (orchestrator)
  form-steps/
    basic-info-step.tsx            # Step 1 -- email, display name, username
    profile-step.tsx               # Step 2 -- bio, job title, company, industry
    contact-step.tsx               # Step 3 -- phone, website, location
    preferences-step.tsx           # Step 4 -- account type, timezone, language
    form-field.tsx                 # Reusable polymorphic field renderer
    types.ts                       # Shared StepProps type
    constants.ts                   # Shared STYLE_CLASSES and input classes
  advanced-search-panel.tsx        # Modal-based advanced filtering
  saved-filters.tsx                # Persist and recall filter presets
  client-filters-skeleton.tsx      # Skeleton for the filters/stats area
  client-table-skeleton.tsx        # Skeleton for the client table rows
```

## ClientForm

The main orchestrator component. It manages a four-step wizard with per-step and cross-step validation, step navigation, and final submission.

### Props Interface

```typescript
interface ClientFormProps {
  client?: ClientProfileWithAuth;
  onSubmit: (data: CreateClientRequest | UpdateClientRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}
```

### Step Flow

| Step | Component | Fields |
|------|-----------|--------|
| 1 | `BasicInfoStep` | email (create only), displayName, username |
| 2 | `ProfileStep` | bio, jobTitle, company, industry |
| 3 | `ContactStep` | phone, website, location |
| 4 | `PreferencesStep` | accountType, timezone, language |

### State Management

```typescript
type FormStep = 1 | 2 | 3 | 4;

const [currentStep, setCurrentStep] = useState<FormStep>(1);
const [formData, setFormData] = useState<FormData>(() => defaultsFor(mode, client));
const [errors, setErrors] = useState<Record<string, string>>({});
```

Navigation uses `handleNext` (validates current step before advancing) and `handlePrevious` (clears errors, steps back). On final submission, `validateForm` aggregates errors across all four steps and jumps to the first invalid step.

### Validation Strategy

Each step has dedicated validation logic inside `collectStepErrors`. The validation constants come from `CLIENT_VALIDATION` in `@/lib/types/client`. Errors are per-field strings stored in a flat `Record<string, string>`.

### Step Indicator

A visual progress bar at the top renders numbered circles for each step. Completed steps show a green background; the active step uses `bg-theme-primary`; future steps are grey. Connecting lines between steps transition colour as the user progresses.

## FormField

A polymorphic form field renderer used by all step components. It supports three field types through a discriminated union:

```typescript
type FormFieldProps =
  | TextFieldProps    // type: 'text' | 'email' | 'tel' | 'url'
  | TextAreaFieldProps // type: 'textarea'
  | SelectFieldProps;  // type: 'select'
```

Each variant renders the appropriate HTML element, with consistent error display, help text, required indicators, and optional character counts.

## AdvancedSearchPanel

A modal-based filter interface with 30+ filter parameters organised into sections.

### Props Interface

```typescript
interface AdvancedSearchPanelProps {
  filters: AdvancedSearchFilters;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  onClearFilters: () => void;
}
```

### Filter Sections

| Section | Fields |
|---------|--------|
| Basic Search | Global text search |
| Status and Plan | status, plan, accountType |
| Provider and Sorting | provider, sortBy, sortOrder |
| Date Filters | createdAfter/Before, updatedAfter/Before |
| Field-Specific | emailDomain, companySearch, locationSearch, industrySearch |
| Numeric | minSubmissions, maxSubmissions |
| Boolean | hasAvatar, hasWebsite, hasPhone, emailVerified, twoFactorEnabled |

The panel uses local state that syncs with parent filters via `useEffect`. Filters are applied only when the user clicks **Apply Filters**, allowing them to configure multiple criteria before executing the search.

### Active Filter Badge

When filters are active, a `Chip` appears next to the toggle button showing the count of active filters, with a close button to clear them all.

## SavedFilters

Allows users to save the current filter configuration as a named preset and recall it later.

### Props Interface

```typescript
interface SavedFiltersProps {
  currentFilters: SavedFilter['filters'];
  onApplyFilter: (filters: SavedFilter['filters']) => void;
  onSaveFilter: (filter: Omit<SavedFilter, 'id' | 'createdAt'>) => void;
  onDeleteFilter: (id: string) => void;
  savedFilters: SavedFilter[];
}
```

Up to three saved filters are displayed as clickable chips in the toolbar. Additional presets appear in a card grid below. Each preset card shows the filter name, description, active filter chips (status, plan, provider), creation date, and last-used date.

## Skeleton Components

### ClientFiltersSkeleton

Renders a loading placeholder for the stats cards (4-card grid) and filter controls area. Uses `aria-hidden="true"` to hide the skeleton from screen readers.

### ClientTableSkeleton

Renders a configurable number of placeholder table rows (default 10). Each row mimics the 12-column grid layout of the real table, with skeleton elements for client info, status badge, plan badge, provider icon, stats, and action buttons.

```typescript
interface ClientTableSkeletonProps {
  rows?: number; // default: 10
}
```

## Usage Example

```tsx
import { ClientForm } from '@/components/admin/clients/client-form';
import { AdvancedSearchPanel } from '@/components/admin/clients/advanced-search-panel';
import { SavedFilters } from '@/components/admin/clients/saved-filters';

function ClientsPage() {
  return (
    <>
      <SavedFilters
        currentFilters={filters}
        savedFilters={presets}
        onApplyFilter={applyFilter}
        onSaveFilter={savePreset}
        onDeleteFilter={deletePreset}
      />
      <AdvancedSearchPanel
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />
      {/* Table or form depending on route */}
      {showForm && (
        <ClientForm
          mode={editingClient ? 'edit' : 'create'}
          client={editingClient}
          isLoading={isPending}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}
    </>
  );
}
```

## Accessibility Features

- Multi-step form uses semantic `<form>` with native submit (Enter key on last step).
- Step indicator communicates progress visually through colour and number.
- `FormField` links `<label>` to input via `htmlFor`/`id`, shows required indicators, and positions error messages directly after inputs.
- Modal-based advanced search uses HeroUI `Modal` with built-in focus trap and `aria-modal`.
- Skeleton components set `aria-hidden="true"` to prevent screen reader noise during loading.
- Toast notifications via `sonner` for save/apply/delete confirmations in SavedFilters.
- Delete confirmation uses `window.confirm` for a native accessible dialog.

## Related Hooks and APIs

| Hook / API | Purpose |
|------------|---------|
| `useAdminClients` | Fetches paginated client list with all filter parameters |
| `useCreateClient` | Mutation for `POST /api/admin/clients` |
| `useUpdateClient` | Mutation for `PUT /api/admin/clients/:id` |
| `ClientProfileWithAuth` | Combined profile + auth type from `@/lib/db/queries` |
| `CLIENT_VALIDATION` | Shared validation constants from `@/lib/types/client` |

## File Reference

| File | Path |
|------|------|
| ClientForm | `template/components/admin/clients/client-form.tsx` |
| BasicInfoStep | `template/components/admin/clients/form-steps/basic-info-step.tsx` |
| ProfileStep | `template/components/admin/clients/form-steps/profile-step.tsx` |
| ContactStep | `template/components/admin/clients/form-steps/contact-step.tsx` |
| PreferencesStep | `template/components/admin/clients/form-steps/preferences-step.tsx` |
| FormField | `template/components/admin/clients/form-steps/form-field.tsx` |
| AdvancedSearchPanel | `template/components/admin/clients/advanced-search-panel.tsx` |
| SavedFilters | `template/components/admin/clients/saved-filters.tsx` |
| ClientFiltersSkeleton | `template/components/admin/clients/client-filters-skeleton.tsx` |
| ClientTableSkeleton | `template/components/admin/clients/client-table-skeleton.tsx` |
