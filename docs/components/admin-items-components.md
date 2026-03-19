---
id: admin-items-components
title: Admin Items Components
sidebar_label: Admin Items
sidebar_position: 42
---

# Admin Items Components

The items module is the largest admin component group. It handles the full lifecycle of directory entries: creation via single-page or multi-step forms, review workflows (approve/reject), audit history, bulk operations, filtering, sorting, and company assignment.

## Component Hierarchy

```
items/
  item-form.tsx                    # Single-page create/edit form
  multi-step-item-form.tsx         # Multi-step wizard (preferred)
  form-steps/
    basic-info-step.tsx            # Step 1 -- id, name, slug, description
    media-links-step.tsx           # Step 2 -- icon URL, source URL with preview
    classification-step.tsx        # Step 3 -- categories, tags with suggestions
    location-step.tsx              # Step 4 (conditional) -- address, coordinates
    review-step.tsx                # Final step -- featured toggle, status, summary
  item-filters.tsx                 # Status tabs + category/tag popover filter
  active-item-filters.tsx          # Removable filter chips
  item-list-sorting.tsx            # Sort field dropdown + order toggle
  item-actions-menu.tsx            # Per-row dropdown (edit, duplicate, approve...)
  item-history-modal.tsx           # Audit log timeline modal
  item-reject-modal.tsx            # Rejection reason dialog
  bulk-action-bar.tsx              # Fixed bottom bar for bulk operations
  bulk-confirm-dialog.tsx          # Confirmation modal for bulk actions
  item-company-manager.tsx         # Company assignment selector
```

## MultiStepItemForm

The recommended form variant for creating and editing items. It uses the shared `useMultiStepForm` hook and `StepIndicator`/`StepNavigation` UI primitives.

### Props Interface

```typescript
interface MultiStepItemFormProps {
  item?: ItemData;
  mode: 'create' | 'edit';
  onSubmit: (data: CreateItemRequest | UpdateItemRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}
```

### Dynamic Step Configuration

Steps are computed with `useMemo` based on the `useLocationSettings` hook. When location features are enabled, a **Location** step is inserted before the final **Review** step:

| Step | ID | Condition |
|------|----|-----------|
| 1 | `basic-info` | Always |
| 2 | `media-links` | Always |
| 3 | `classification` | Always |
| 4 | `location` | Only if `locationSettings.enabled` |
| N | `review` | Always (last) |

### State Shape

```typescript
interface FormData {
  basicInfo: BasicInfoData;       // id, name, slug, description
  mediaLinks: MediaLinksData;     // icon_url, source_url
  classification: ClassificationData; // category[], tags[]
  location: LocationStepData;     // address, city, country, lat/lng, etc.
  review: ReviewData;             // featured, status
}
```

Each section has a dedicated updater function (`updateBasicInfo`, `updateMediaLinks`, etc.) and per-step validation tracked in a `stepValidation` record. Navigation to a completed step is permitted; forward navigation requires the current step to be valid.

### Form Submission

On the final step, `handleFormSubmit` merges all sections into a flat `CreateItemRequest | UpdateItemRequest` object. Location data is included only when the location feature is enabled and the user has entered meaningful location information.

## ItemForm (Single-Page)

A simpler alternative that renders all fields on one page. It includes id, name, slug (with auto-generate button), description, source URL, categories (comma-separated), tags, icon URL, featured toggle, and status selector.

### Slug Generation

```typescript
const generateSlug = () => {
  const slug = formData.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  handleInputChange('slug', slug);
};
```

## Form Steps (Multi-Step)

### BasicInfoStep

Fields: id (disabled in edit), name, slug (auto-generated from name in create mode), description. Validation runs on every change with a `touchedFields` set to avoid showing errors on pristine fields.

### MediaLinksStep

Fields: source_url (required), icon_url (optional). Validates URLs against a regex pattern. Includes an image preview for the icon URL.

### ClassificationStep

Category and tag management with suggested values, add/remove chip UI, and minimum-one-category validation.

### LocationStep

Conditional step for address, city, state, country, postal code, latitude/longitude, service area, and remote flag. Only rendered when `locationSettings.enabled` is true.

### ReviewStep

Final summary of all entered data plus featured toggle and status selector (Draft, Pending, Approved, Rejected). Integrates the `ItemCompanyManager` when the companies feature is enabled.

## ItemFilters

A compact filter bar with two parts: status tabs and a category/tag popover.

### Status Tabs

Horizontal tab group with counts: All, Approved, Pending, Draft, Rejected. Each tab shows its `itemCounts` value and highlights the active filter.

### Category/Tag Popover

A `@radix-ui/react-popover` dropdown with searchable checkbox lists for categories and tags. A badge on the trigger button shows the count of active advanced filters.

```typescript
interface ItemFiltersProps {
  statusFilter: string;
  categoriesFilter: string[];
  tagsFilter: string[];
  onStatusChange: (status: string) => void;
  onCategoriesChange: (categories: string[]) => void;
  onTagsChange: (tags: string[]) => void;
  onClearAll: () => void;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  itemCounts: { draft: number; pending: number; approved: number; rejected: number };
  activeFilterCount: number;
}
```

## ActiveItemFilters

Renders removable chips for each selected category and tag. A **Clear All** button appears when more than one filter is active. Uses themed chip styles (`bg-theme-primary/10`).

## ItemListSorting

A compound control with a sort-order toggle button (arrow up/down) and a `@radix-ui/react-dropdown-menu` for field selection.

```typescript
type SortField = 'name' | 'updated_at' | 'status' | 'submitted_at';
type SortOrder = 'asc' | 'desc';
```

Selecting the already-active field toggles the sort order.

## ItemActionsMenu

A per-row dropdown menu built on `@radix-ui/react-dropdown-menu`. Available actions depend on item status:

| Action | Condition | Style |
|--------|-----------|-------|
| View Source | Always | Default |
| Edit | Always | Default |
| Duplicate | Always | Default |
| View History | Always | Default |
| Create Survey | Always | Default |
| Approve | `status === 'pending'` | Success (green) |
| Reject | `status === 'pending'` | Danger (red) |
| Delete | Always | Danger (red) |

Each action has individual loading states (`isApproving`, `isRejecting`, etc.) showing a spinner icon.

## ItemHistoryModal

A full-featured audit log viewer rendered as a modal overlay.

### Props

```typescript
interface ItemHistoryModalProps {
  isOpen: boolean;
  itemId: string;
  itemName: string;
  onClose: () => void;
}
```

### Features

- **Action filter** using a `@radix-ui/react-select` dropdown (Created, Updated, Status Changed, Reviewed, Deleted, Restored).
- **Timeline entries** with colour-coded icons, relative timestamps, performer names, change diffs, and expandable field-level change details.
- **Pagination** via `UniversalPagination` component.
- Fetches data through the `useItemHistory` hook with `page`, `limit`, and `actionFilter` parameters.

### Action Colour Map

| Action | Colour | Icon |
|--------|--------|------|
| Created | Green | Plus |
| Updated | Blue | Edit2 |
| Status Changed | Yellow | RefreshCw |
| Reviewed | Purple (or green/red for approved/rejected) | CheckCircle / XCircle |
| Deleted | Red | Trash2 |
| Restored | Teal | RotateCcw |

## ItemRejectModal

A focused dialog for entering a rejection reason. Requires a minimum of 10 characters. Shows an item preview (name, slug, categories) before the textarea.

## BulkActionBar

A fixed-position bottom toolbar that appears when items are selected. Shows the selection count and provides Approve, Reject, and Delete buttons.

```typescript
interface BulkActionBarProps {
  selectedIds: Set<string>;
  items: ItemData[];
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onClear: () => void;
  isProcessing: boolean;
  processingAction: 'approve' | 'reject' | 'delete' | null;
}
```

Approve and Reject are only enabled when the selection contains pending items. The bar animates in/out with opacity and translate transitions.

## BulkConfirmDialog

A confirmation modal for bulk actions with action-specific headers (green for approve, orange for reject, red for delete). The reject variant includes a mandatory reason textarea. Delete shows a warning banner.

## ItemCompanyManager

A thin wrapper that connects the `CompanySelector` component to the `useItemCompany` hook for managing company assignment on a per-item basis.

```typescript
interface ItemCompanyManagerProps {
  itemSlug: string;
  className?: string;
}
```

## Accessibility Features

- All modals handle Escape key to close and click-outside to dismiss.
- `role="dialog"` and `aria-modal="true"` on modal containers.
- `role="toolbar"` and `aria-label` on the BulkActionBar.
- Focus ring styles (`focus:ring-2 focus:ring-theme-primary`) on all interactive elements.
- Filter chips include `aria-label` for the remove button with the filter name.
- Disabled states use `aria-disabled` through HeroUI and Radix primitives.

## Related Hooks and APIs

| Hook / API | Purpose |
|------------|---------|
| `useMultiStepForm` | Step navigation, completion tracking, form submission |
| `useItemHistory` | Paginated audit log fetching |
| `useItemCompany` | Company assignment CRUD |
| `useLocationSettings` | Feature flag for location step |
| `useCompaniesEnabled` | Feature flag for company assignment |
| `ITEM_VALIDATION` | Shared validation constants |
| `ITEM_STATUSES` | Status enum (draft, pending, approved, rejected) |
| `ItemAuditAction` | Audit action enum from DB schema |

## File Reference

| File | Path |
|------|------|
| MultiStepItemForm | `template/components/admin/items/multi-step-item-form.tsx` |
| ItemForm | `template/components/admin/items/item-form.tsx` |
| ItemFilters | `template/components/admin/items/item-filters.tsx` |
| ActiveItemFilters | `template/components/admin/items/active-item-filters.tsx` |
| ItemListSorting | `template/components/admin/items/item-list-sorting.tsx` |
| ItemActionsMenu | `template/components/admin/items/item-actions-menu.tsx` |
| ItemHistoryModal | `template/components/admin/items/item-history-modal.tsx` |
| ItemRejectModal | `template/components/admin/items/item-reject-modal.tsx` |
| BulkActionBar | `template/components/admin/items/bulk-action-bar.tsx` |
| BulkConfirmDialog | `template/components/admin/items/bulk-confirm-dialog.tsx` |
| ItemCompanyManager | `template/components/admin/items/item-company-manager.tsx` |
