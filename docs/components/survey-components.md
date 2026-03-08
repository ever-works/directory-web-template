---
id: survey-components
title: Survey Components
sidebar_label: Surveys
sidebar_position: 3
---

# Survey Components

The survey system provides a complete set of components for creating, managing, previewing, and responding to surveys. It supports two survey types (global and item-specific), integrates with SurveyJS for rendering, and includes admin CRUD operations and response analytics.

## Architecture Overview

```
template/components/surveys/
  admin/
    create-edit-survey-client.tsx   # Client page for survey creation/editing
  admin-survey-creation-button.tsx  # Quick-create button for admin UI
  forms/
    admin-survey-form.tsx           # Full survey creation/edit form
    import-surveyjs-dialog.tsx      # Import survey from SurveyJS by ID
    item-selector.tsx               # Item picker for item-type surveys
    survey-form-no-ssr.tsx          # SSR-disabled form wrapper
    survey-form-wrapper.tsx         # Survey rendering wrapper
    survey-form.tsx                 # Core SurveyJS form renderer
    survey-preview-dialog.tsx       # Modal preview of survey JSON
  lists/
    admin-surveys-list.tsx          # Admin survey management table
    item-surveys-list.tsx           # Surveys listed on item pages
    surveys-list-client.tsx         # Client-side survey list with actions
  pages/
    public-survey-page.tsx          # Public-facing survey page
  preview/
    preview-client.tsx              # Preview rendering client component
    PreviewWarningBanner.tsx        # Warning banner for preview mode
  responses/
    response-detail-dialog.tsx      # Individual response detail modal
    survey-responses-client.tsx     # Response list with export controls
  survey-dialog.tsx                 # Modal dialog wrapper for surveys
  user-survey-section.tsx           # User-facing survey section
  utils/
    survey-helpers.ts               # CSV export, formatting, clipboard utils
```

## Survey Types

The system supports two survey types defined in `SurveyTypeEnum`:

| Type | Value | Description |
|------|-------|-------------|
| Global | `'global'` | Site-wide surveys shown to all users |
| Item | `'item'` | Surveys associated with a specific directory item |

## Survey Statuses

Defined in `SurveyStatusEnum`:

| Status | Value | Color Badge |
|--------|-------|-------------|
| Draft | `'draft'` | Gray |
| Published | `'published'` | Green |
| Closed | `'closed'` | Red |

## SurveyDialog

The primary entry point for displaying surveys to users. Wraps a `SurveyFormWrapper` inside a modal dialog.

```tsx
import { SurveyDialog } from '@/components/surveys/survey-dialog';

<SurveyDialog
  survey={surveyData}
  open={isOpen}
  onClose={() => setIsOpen(false)}
  itemSlug="my-product"
  onCompleted={handleCompleted}
/>
```

### SurveyDialogProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `survey` | `Survey \| null` | required | Survey data object from database |
| `open` | `boolean` | required | Dialog open state |
| `onClose` | `() => void` | required | Close handler |
| `itemSlug` | `string` | - | Associated item slug (for item surveys) |
| `onCompleted` | `() => void` | - | Callback when survey is submitted |

The dialog auto-closes 1500ms after completion via an internal timer, cleaned up on unmount.

## AdminSurveyForm

The comprehensive form for creating and editing surveys. Supports JSON editing with format/minify tools, SurveyJS import, and live preview.

```tsx
import { AdminSurveyForm } from '@/components/surveys/forms/admin-survey-form';

<AdminSurveyForm
  survey={existingSurvey}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  isLoading={false}
  mode="create"
  defaultType="global"
/>
```

### SurveyFormProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `survey` | `Survey` | - | Existing survey data for edit mode |
| `onSubmit` | `(data: SurveyFormData) => Promise<void>` | required | Form submission handler |
| `onCancel` | `() => void` | required | Cancel callback |
| `isLoading` | `boolean` | `false` | Loading state for the form |
| `mode` | `'create' \| 'edit'` | required | Form mode (affects validation) |
| `defaultType` | `SurveyTypeEnum` | - | Default survey type for creation |
| `defaultItemId` | `string` | - | Pre-selected item ID |

### SurveyFormData

The data shape submitted by the form:

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Survey title (required) |
| `description` | `string` | Optional description |
| `type` | `SurveyTypeEnum` | Global or item survey |
| `itemId` | `string` | Required when type is "item" |
| `status` | `SurveyStatusEnum` | Draft, published, or closed |
| `surveyJson` | `any` | SurveyJS-compatible JSON definition |

### Form Features

- **JSON Editor**: Textarea with syntax validation, format/minify buttons
- **Import from SurveyJS**: Dialog to import by SurveyJS survey ID
- **Live Preview**: Opens a preview dialog rendering the survey JSON
- **Item Selector**: Searchable item picker shown only for item-type surveys
- **Type Lock**: Survey type cannot be changed after creation

## Survey Form Components

### SurveyFormWrapper

Wraps the SurveyJS form renderer with error boundaries and loading states. Handles survey response submission to the API.

### SurveyFormNoSSR

A dynamically imported wrapper that disables server-side rendering for the SurveyJS library, which requires browser APIs.

### ImportSurveyJsDialog

Modal dialog for importing survey definitions from SurveyJS by survey ID:

1. User enters a SurveyJS survey ID
2. Component fetches the survey JSON from the SurveyJS API
3. On success, populates the form's survey JSON field

### SurveyPreviewDialog

Modal that renders a live preview of the survey JSON, allowing admins to test the survey appearance before publishing.

### ItemSelector

A searchable dropdown for selecting directory items when creating item-specific surveys:

```tsx
<ItemSelector
  selectedItemId={formData.itemId}
  onItemSelect={(itemId) => setFormData(prev => ({ ...prev, itemId }))}
  disabled={false}
  required
  label="Select Item"
  placeholder="Choose item for survey"
/>
```

## List Components

### AdminSurveysList

Admin-facing table with columns for title, type, status, responses count, and actions (edit, delete, view responses). Supports sorting and filtering.

### ItemSurveysList

Displays surveys associated with a specific directory item. Used on item detail pages to show available surveys.

### SurveysListClient

Client-side list component with real-time actions like status toggling and survey deletion with confirmation dialogs.

## Response Components

### SurveyResponsesClient

Lists all responses for a specific survey with export capability. Shows response ID, user ID, completion date, and response data summary.

### ResponseDetailDialog

Modal that displays the complete response data for a single submission in a formatted, readable layout.

## Utility Functions

The `survey-helpers.ts` file provides essential utilities:

### exportResponsesToCSV

```typescript
exportResponsesToCSV(responses: SurveyCSVResponse[], filename: string): void
```

Exports survey responses to a CSV file with proper escaping, BOM for Excel compatibility, and auto-download. Columns include Response ID, User ID, Completed At, and all dynamic response data fields.

### Formatting Helpers

| Function | Input | Output |
|----------|-------|--------|
| `formatSurveyStatusLabel(status)` | `'published'` | `'Published'` |
| `formatSurveyTypeLabel(type)` | `'global'` | `'Global Survey'` |
| `getStatusColor(status)` | `'published'` | Tailwind class string (green) |
| `getTypeColor(type)` | `'item'` | Tailwind class string (purple) |

### Link Generation

```typescript
getPublicSurveyLink(slug: string, itemId?: string): string
// Global: "/surveys/{slug}"
// Item:   "/items/{itemId}/surveys/{slug}"
```

### Clipboard

```typescript
copyToClipboard(text: string): Promise<boolean>
```

Wraps `navigator.clipboard.writeText` with error handling and returns success boolean.

## Integration Example

```tsx
// Admin: Create a new survey
import { AdminSurveyForm, SurveyFormData } from '@/components/surveys/forms/admin-survey-form';

function CreateSurveyPage() {
  const handleSubmit = async (data: SurveyFormData) => {
    await fetch('/api/admin/surveys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return (
    <AdminSurveyForm
      mode="create"
      defaultType="global"
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}

// User: Display a survey dialog
import { SurveyDialog } from '@/components/surveys/survey-dialog';

function ItemPage({ survey }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Take Survey</button>
      <SurveyDialog
        survey={survey}
        open={open}
        onClose={() => setOpen(false)}
        onCompleted={() => toast.success('Thank you!')}
      />
    </>
  );
}
```

## Internationalization

Survey components use `next-intl` with the `'survey'` namespace for survey-specific translations and `'common'` for shared strings. Key translation keys include `CREATE_SURVEY_BTN`, `UPDATE_SURVEY_BTN`, `SURVEY_TYPE`, `STATUS`, `IMPORT_FROM_SURVEYJS`, and `PREVIEW_SURVEY`.
