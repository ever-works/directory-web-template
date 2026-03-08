---
id: admin-roles-components
title: Admin Roles Components
sidebar_label: Admin Roles
sidebar_position: 43
---

# Admin Roles Components

The roles module provides the UI for creating, editing, and deleting roles in the admin panel. Roles control access permissions across the application by combining a name, description, active/inactive status, and an admin/client type flag.

## Component Hierarchy

```
roles/
  role-form.tsx              # Create/edit role form with validation
  delete-role-dialog.tsx     # Confirmation dialog for role deletion
```

## RoleForm

A single-page form for creating or editing a role. It collects the role name, description, status toggle, and role type (admin vs client).

### Props Interface

```typescript
interface RoleFormProps {
  /** Existing role to edit (undefined for create mode) */
  role?: RoleData;
  /** Called with validated form data on submit */
  onSubmit: (data: CreateRoleRequest | UpdateRoleRequest) => void;
  /** Called when the user clicks Cancel */
  onCancel: () => void;
  /** Disables all inputs and shows loading state */
  isLoading?: boolean;
  /** Controls create vs edit mode */
  mode: 'create' | 'edit';
}
```

### Form State

```typescript
interface RoleFormState {
  name: string;
  description: string;
  status: 'active' | 'inactive';
  isAdmin: boolean;
}
```

The form initialises from the `role` prop in edit mode via `useEffect`. Input changes use a generic typed handler:

```typescript
const handleInputChange = <K extends keyof RoleFormState>(
  field: K,
  value: RoleFormState[K]
) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

### Validation Rules

| Field | Rule |
|-------|------|
| `name` | Required, 3-100 characters |
| `description` | Required, max 500 characters |
| `status` | Always valid (toggle) |
| `isAdmin` | Always valid (select) |

Errors are stored in a `Partial<Record<keyof RoleFormState, string>>` and cleared per-field as the user types.

### Form Fields

#### Role Name

An `@heroui/react` `Input` component with `isInvalid` and `errorMessage` props for inline validation feedback.

#### Description

A `Textarea` from `@/components/ui/textarea`. Error styling is applied via conditional `clsx` class merging (`border-red-500` when invalid).

#### Status Toggle

A `Switch` from `@heroui/react`. The label next to the switch dynamically reads "Active" or "Inactive". A help text paragraph (`aria-describedby`) explains what each state means.

```tsx
<Switch
  id="roleStatus"
  aria-describedby="roleStatusHelp"
  isSelected={formData.status === 'active'}
  onValueChange={(checked) =>
    handleInputChange('status', checked ? 'active' : 'inactive')
  }
/>
```

#### Role Type

A native `<select>` with two options: **Client Role** and **Admin Role**. The selection maps to the `isAdmin` boolean. A help text explains the difference between the two types.

### Usage Example

```tsx
import { RoleForm } from '@/components/admin/roles/role-form';
import { useCreateRole, useUpdateRole } from '@/hooks/use-admin-roles';

function RoleEditor({ role, onClose }: { role?: RoleData; onClose: () => void }) {
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const mode = role ? 'edit' : 'create';
  const mutation = mode === 'create' ? createMutation : updateMutation;

  return (
    <RoleForm
      role={role}
      mode={mode}
      isLoading={mutation.isPending}
      onSubmit={(data) => mutation.mutate(data, { onSuccess: onClose })}
      onCancel={onClose}
    />
  );
}
```

## DeleteRoleDialog

A confirmation dialog for deleting a role. It always performs a soft delete (the `hardDelete` parameter is set to `false`).

### Props Interface

```typescript
interface DeleteRoleDialogProps {
  /** Role to be deleted */
  role: RoleData;
  /** Controls dialog visibility */
  isOpen: boolean;
  /** Called with hardDelete flag (always false) on confirmation */
  onConfirm: (hardDelete: boolean) => void;
  /** Called when the user cancels */
  onCancel: () => void;
}
```

### Dialog Layout

The dialog renders as a fixed overlay with three sections:

1. **Header** -- Warning icon and title ("Delete Role"), with an X close button.
2. **Body** -- Role information card (name, description, id, permission count, admin/client badge) plus a yellow warning banner explaining the consequences.
3. **Footer** -- Cancel and Delete buttons. The delete button uses a red gradient (`from-red-500 to-red-600`) with a shadow effect.

### Role Information Display

The body shows a summary card with:
- Role name and description
- Role ID
- Permission count (from `role.permissions` array length)
- Type badge: orange for admin roles, blue for client roles

### Keyboard and Focus Management

- **Escape key** closes the dialog (via `onKeyDown` handler on the dialog container).
- **Focus trap**: The dialog container receives `tabIndex={-1}` and is focused on mount via `useEffect` with `setTimeout`.
- **Body scroll lock**: `document.body.style.overflow = 'hidden'` is set on open and restored on close.
- Backdrop click dismisses the dialog.

### Accessibility Features

```tsx
<div
  ref={dialogRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby="delete-role-title"
  tabIndex={-1}
>
```

- `role="dialog"` and `aria-modal="true"` for screen reader semantics.
- `aria-labelledby` references the dialog title.
- Warning icon uses `aria-hidden="true"` and `focusable="false"`.
- Both action buttons have explicit `aria-label` attributes describing their purpose.
- Loading state button label changes from "Delete Role" to "Deleting..." with a corresponding `aria-label` update.

### Usage Example

```tsx
import { DeleteRoleDialog } from '@/components/admin/roles/delete-role-dialog';

function RolesPage() {
  const [roleToDelete, setRoleToDelete] = useState<RoleData | null>(null);
  const deleteMutation = useDeleteRole();

  return (
    <>
      {/* Role list... */}
      {roleToDelete && (
        <DeleteRoleDialog
          role={roleToDelete}
          isOpen={!!roleToDelete}
          onConfirm={(hardDelete) => {
            deleteMutation.mutate({ id: roleToDelete.id, hardDelete });
            setRoleToDelete(null);
          }}
          onCancel={() => setRoleToDelete(null)}
        />
      )}
    </>
  );
}
```

## State Management Patterns

Both components follow a consistent pattern:
- Local `useState` for form data and loading state.
- `useEffect` to sync with incoming props (role data, open state).
- `useTranslations` from `next-intl` for all user-visible strings.
- Error state cleared on input change to provide immediate feedback.

## Internationalisation

| Component | Namespace |
|-----------|-----------|
| RoleForm | `admin.ROLE_FORM` |
| DeleteRoleDialog | `admin.DELETE_ROLE_DIALOG` |

All labels, placeholders, error messages, button text, and status descriptions are resolved from translation files.

## UI Library Dependencies

| Library | Components Used |
|---------|----------------|
| `@heroui/react` | Button, Input, Switch |
| `@/components/ui/textarea` | Textarea |
| `lucide-react` | Save, X, AlertTriangle, Trash2, Shield |
| `clsx` | Conditional class merging |

## Related Hooks and APIs

| Hook / API | Purpose |
|------------|---------|
| `useAdminRoles` | Fetches all roles with React Query |
| `useCreateRole` | Mutation for `POST /api/admin/roles` |
| `useUpdateRole` | Mutation for `PUT /api/admin/roles/:id` |
| `useDeleteRole` | Mutation for `DELETE /api/admin/roles/:id` |
| `RoleData` | Role shape from `@/hooks/use-admin-roles` |
| `CreateRoleRequest` | Create payload type |
| `UpdateRoleRequest` | Update payload type |

## Design Decisions

1. **Soft delete only** -- The dialog always passes `hardDelete: false` to protect against accidental permanent data loss. Hard delete can be added as a future admin-only option.
2. **No permission matrix UI** -- Permission assignment is managed separately. The role form focuses on role metadata; permissions are attached via the role management page or API.
3. **Native select for role type** -- Only two options (admin/client), so a native `<select>` is simpler and more accessible than a custom dropdown.

## File Reference

| File | Path |
|------|------|
| RoleForm | `template/components/admin/roles/role-form.tsx` |
| DeleteRoleDialog | `template/components/admin/roles/delete-role-dialog.tsx` |
| Role hooks | `template/hooks/use-admin-roles.ts` |
