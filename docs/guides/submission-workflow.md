---
id: submission-workflow
title: "Submission Workflow"
sidebar_label: "Submission Workflow"
sidebar_position: 35
---

# Submission Workflow

This guide walks through the entire item submission lifecycle -- from the user filling out the form, through API validation, admin review, and final publication.

## Workflow Overview

```
User fills form --> POST /api/client/items --> Item stored as PENDING
                                                     |
                                            Admin reviews item
                                                     |
                                      POST /api/admin/items/[id]/review
                                                     |
                                         Approved? --+--> Published
                                                     |
                                                  Rejected (with reason)
```

## Submission Statuses

Items move through a defined set of statuses, declared in `lib/constants/payment.ts`:

```typescript
export enum SubmissionStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}
```

| Status | Meaning |
|--------|---------|
| `draft` | Saved by user but not yet submitted |
| `pending` | Submitted and waiting for admin review |
| `approved` | Passed review, ready for publication |
| `rejected` | Declined by admin (reason stored) |
| `published` | Live and visible on the directory |
| `archived` | Removed from public view but still in the database |

## Payment Flows

Submissions can follow one of two payment flows configured in `lib/config/payment-flows.ts`:

### Pay at Start

```typescript
{
  id: PaymentFlow.PAY_AT_START,
  title: "Pay First",
  subtitle: "Instant Publication",
  description: "Pay upfront and get published immediately",
  features: [
    "Immediate payment required",
    "Instant publication",
    "No review delays",
    "Guaranteed listing"
  ],
}
```

The user pays before submitting details. Once payment is confirmed the item is published immediately without admin review.

### Pay at End (Default)

```typescript
{
  id: PaymentFlow.PAY_AT_END,
  title: "Pay Later",
  subtitle: "Review First",
  description: "Submit details first, pay after approval",
  features: [
    "Submit without payment",
    "Review before payment",
    "Pay only if approved",
    "Save your work"
  ],
  isDefault: true,
}
```

The user submits first. An admin reviews and approves the item. Payment is collected only after approval.

Use `getDefaultPaymentFlow()` and `getPaymentFlowConfig(flowId)` to read the active configuration.

## Submit Form Component

The client-side form is in `components/submit/submit-form-client.tsx`. It wraps the shared `DetailsForm` component and handles submission:

```tsx
export function SubmitFormClient({ initialData, locale }: SubmitFormClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (data: FormData) => {
    const payload: ClientCreateItemRequest = {
      name: data.name,
      description: data.description,
      source_url: sourceUrl,
      category: data.category,
      tags: data.tags || [],
    };

    const response = await fetch('/api/client/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // ...handle response
  };

  return (
    <DetailsForm
      onSubmit={handleFormSubmit}
      onBack={handleBack}
      listingProps={initialData}
      isSubmitting={isSubmitting}
    />
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `initialData.items` | `ItemData[]` | Existing items (for duplicate detection) |
| `initialData.categories` | `Category[]` | Available categories for the dropdown |
| `initialData.tags` | `Tag[]` | Available tags for multi-select |
| `locale` | `string` | Current locale for redirect URLs |

### Form Fields

The `DetailsForm` component collects:

- **Name** -- item title (required)
- **Description** -- rich text description (required)
- **Source URL** -- primary link (extracted from `links` array or `link` field)
- **Category** -- single selection from available categories
- **Tags** -- multi-select from available tags
- **Links** -- additional links with type classification

### Submission Payload

The form data is transformed into a `ClientCreateItemRequest`:

```typescript
interface ClientCreateItemRequest {
  name: string;
  description: string;
  source_url: string;
  category: string;
  tags: string[];
}
```

## API Route: Create Item

`POST /api/client/items` receives the payload, validates it, and creates a new item record:

1. Authenticate the user via `auth()`.
2. Validate the request body.
3. Insert the item with status `pending`.
4. Return the created item.

The route enforces that only authenticated users can submit items.

## Admin Review Process

Admins review pending items through the admin dashboard:

1. Navigate to `/admin/items` and filter by status `pending`.
2. Click an item to view details.
3. Use the review endpoint to approve or reject.

### Review API

`POST /api/admin/items/[id]/review`

```json
{
  "action": "approve"
}
```

or

```json
{
  "action": "reject",
  "reason": "Duplicate entry - this tool is already listed."
}
```

The endpoint updates the item status and triggers a notification to the submitter.

## Post-Submission Redirect

After a successful submission the user is redirected to their submissions list:

```tsx
router.push(`/${locale}/client/submissions`);
```

This page shows all items the user has submitted, grouped by status.

## Error Handling

The submit form handles errors at multiple levels:

1. **Validation** -- the `DetailsForm` uses Zod schemas to validate fields before submission.
2. **API errors** -- non-2xx responses display the error message in a toast notification.
3. **Network errors** -- caught in the try/catch block with a generic fallback message.

```tsx
catch (error) {
  const errorMessage = error instanceof Error
    ? error.message
    : 'Error submitting form. Please try again.';
  toast.error(errorMessage);
}
```

## Item Lifecycle After Publication

Once published, items can be:

- **Edited** by the owner via `PUT /api/client/items/[id]`
- **Soft-deleted** via `DELETE /api/client/items/[id]`
- **Restored** via `POST /api/client/items/[id]/restore`
- **Archived** by an admin via the admin items API

## Related Pages

- [Item Submissions](../features/item-submissions.md) -- feature overview
- [Payment Configuration](../configuration/payment-config.md) -- payment provider setup
- [Client Portal Guide](../guides/client-portal-guide.md) -- client-facing pages
- [Admin Dashboard Architecture](../guides/admin-dashboard-guide.md) -- admin review interface
- [Item Categories](../features/item-categories.md) -- category management
