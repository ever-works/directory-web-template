---
id: use-featured-item-form-reference
title: useFeaturedItemForm Hook Reference
sidebar_label: useFeaturedItemForm
sidebar_position: 92
---

# useFeaturedItemForm

## Overview

`useFeaturedItemForm` is a React hook that manages form state, validation, and submission logic for creating and editing featured items in the admin panel. It handles item selection from a dropdown, input changes with automatic error clearing, form validation, and modal open/close lifecycle for both create and edit workflows.

**Source:** `template/hooks/use-featured-item-form.ts`

## Signature

```typescript
function useFeaturedItemForm(options: UseFeaturedItemFormOptions): UseFeaturedItemFormReturn
```

## Parameters

### `UseFeaturedItemFormOptions`

| Property   | Type                                              | Required | Description                                                    |
|-----------|---------------------------------------------------|----------|----------------------------------------------------------------|
| `allItems` | `ItemData[]`                                      | Yes      | Array of all available items for the selection dropdown         |
| `onSubmit` | `(data: FeaturedItemFormData) => Promise<boolean>` | Yes      | Async callback invoked on valid form submission. Return `true` to reset the form after success. |
| `onCancel` | `() => void`                                      | No       | Optional callback invoked when the modal is closed via `closeModal` |

### `FeaturedItemFormData`

The shape of the form data managed by this hook:

| Field              | Type      | Default   | Description                                         |
|-------------------|-----------|-----------|-----------------------------------------------------|
| `itemSlug`        | `string`  | `""`      | Slug identifier for the selected item               |
| `itemName`        | `string`  | `""`      | Display name of the selected item                   |
| `itemIconUrl`     | `string`  | `""`      | URL for the item's icon image                       |
| `itemCategory`    | `string`  | `""`      | Primary category of the item                        |
| `itemDescription` | `string`  | `""`      | Short description, limited to 200 characters        |
| `featuredOrder`   | `number`  | `0`       | Display order for the featured item                 |
| `featuredUntil`   | `string`  | `""`      | ISO datetime string for when featuring expires      |
| `isActive`        | `boolean` | `true`    | Whether the featured item is currently active       |

## Return Values

### `UseFeaturedItemFormReturn`

#### Form State

| Property       | Type                   | Description                                    |
|---------------|------------------------|------------------------------------------------|
| `formData`    | `FeaturedItemFormData` | Current form field values                      |
| `isEditMode`  | `boolean`              | `true` when editing an existing featured item  |
| `isSubmitting` | `boolean`             | `true` while the `onSubmit` callback is running |

#### Form Actions

| Method              | Signature                                                         | Description                                                                 |
|--------------------|-------------------------------------------------------------------|-----------------------------------------------------------------------------|
| `setFormData`      | `React.Dispatch<React.SetStateAction<FeaturedItemFormData>>`      | Direct state setter for the form data                                       |
| `handleInputChange`| `(field: keyof FeaturedItemFormData, value: any) => void`         | Updates a single field and clears its validation error                      |
| `handleItemSelect` | `(itemSlug: string) => void`                                     | Selects an item by slug, auto-populating name, icon, category, and description |
| `handleSubmit`     | `(e: React.FormEvent) => Promise<void>`                          | Validates the form, calls `onSubmit`, and resets on success                 |
| `resetForm`        | `() => void`                                                     | Resets the form to initial empty state and clears errors                    |

#### Modal Actions

| Method            | Signature                        | Description                                                   |
|------------------|----------------------------------|---------------------------------------------------------------|
| `openCreateModal`| `() => void`                     | Resets the form to prepare for creating a new featured item   |
| `openEditModal`  | `(item: FeaturedItem) => void`   | Populates the form with the given `FeaturedItem` and sets edit mode |
| `closeModal`     | `() => void`                     | Resets the form and calls the optional `onCancel` callback    |

#### Validation

| Property      | Type                      | Description                                                     |
|--------------|---------------------------|-----------------------------------------------------------------|
| `isFormValid` | `boolean`                 | `true` when `itemSlug` and `itemName` are present and no errors exist |
| `errors`     | `Record<string, string>`  | Map of field names to error messages                            |

## Implementation Details

- **Item auto-population:** When `handleItemSelect` is called, the hook looks up the item by slug in `allItems` and fills in `itemName`, `itemIconUrl`, `itemCategory`, and `itemDescription` (truncated to 200 characters).
- **Validation rules:** `itemSlug` must be set, `itemName` must be non-empty, `itemDescription` cannot exceed 200 characters, and `featuredOrder` must be non-negative.
- **Error clearing:** Changing a field via `handleInputChange` automatically clears that field's validation error.
- **Edit mode date handling:** When opening in edit mode, `featuredUntil` is converted to an ISO datetime-local string (`YYYY-MM-DDTHH:mm`) suitable for `<input type="datetime-local">`.
- **Boolean coercion:** The `isActive` field is always coerced through `Boolean()` in `handleInputChange`.

## Usage Examples

### Creating a featured item

```tsx
import { useFeaturedItemForm } from '@/hooks/use-featured-item-form';

function FeaturedItemDialog({ allItems, onSave }) {
  const {
    formData,
    isSubmitting,
    isFormValid,
    errors,
    handleInputChange,
    handleItemSelect,
    handleSubmit,
    openCreateModal,
    closeModal,
  } = useFeaturedItemForm({
    allItems,
    onSubmit: async (data) => {
      const success = await onSave(data);
      return success;
    },
    onCancel: () => console.log('Dialog closed'),
  });

  return (
    <form onSubmit={handleSubmit}>
      <select
        value={formData.itemSlug}
        onChange={(e) => handleItemSelect(e.target.value)}
      >
        <option value="">Select an item</option>
        {allItems.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
          </option>
        ))}
      </select>
      {errors.itemSlug && <span className="error">{errors.itemSlug}</span>}

      <input
        type="number"
        value={formData.featuredOrder}
        onChange={(e) => handleInputChange('featuredOrder', Number(e.target.value))}
      />

      <input
        type="datetime-local"
        value={formData.featuredUntil}
        onChange={(e) => handleInputChange('featuredUntil', e.target.value)}
      />

      <button type="submit" disabled={!isFormValid || isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Create Featured Item'}
      </button>
    </form>
  );
}
```

### Editing an existing featured item

```tsx
import { useFeaturedItemForm } from '@/hooks/use-featured-item-form';

function EditFeaturedItemButton({ featuredItem, allItems, onUpdate }) {
  const { openEditModal, formData, handleSubmit, isEditMode } =
    useFeaturedItemForm({
      allItems,
      onSubmit: async (data) => {
        return await onUpdate(featuredItem.id, data);
      },
    });

  return (
    <button onClick={() => openEditModal(featuredItem)}>
      Edit
    </button>
  );
}
```

## Related Hooks

- [`useAdminCategories`](./use-admin-categories-reference.md) -- Category management in the admin panel.
- [`useAdminItems`](./use-admin-items-reference.md) -- Item CRUD operations; items are the entities being featured.
- [`useFeaturedItemsClient`](./use-featured-items-client-reference.md) -- Client-side fetching of featured items for public display.
