---
id: submit-components
title: Submit Components
sidebar_label: Submit Components
sidebar_position: 37
---

# Submit Components

The submit flow components live in `components/submit/` and handle the client-side form for submitting new directory items. The primary component wraps the shared `DetailsForm` with API submission logic.

## File Structure

```
components/submit/
  submit-form-client.tsx   # Main client-side submit form wrapper
```

## SubmitFormClient

This is the main component for the item submission page. It wraps the `DetailsForm` component (from `components/directory/details-form`) and handles form data transformation and API communication.

### Props

```ts
interface SubmitFormClientProps {
    initialData: {
        items?: ItemData[];
        categories?: Category[];
        tags?: TagType[];
    };
    locale: string;
}
```

- `initialData` -- Pre-loaded categories, tags, and optionally existing items. These are passed to the `DetailsForm` as `listingProps` so the form can render category and tag selectors.
- `locale` -- The current locale string, used for building redirect paths after submission.

### Usage

```tsx
import { SubmitFormClient } from "@/components/submit/submit-form-client";

// Typically used in a page component
function SubmitPage({ categories, tags, locale }) {
    return (
        <SubmitFormClient
            initialData={{ categories, tags }}
            locale={locale}
        />
    );
}
```

### Form Submission Flow

When the user fills out the `DetailsForm` and submits, the `handleFormSubmit` callback processes the data:

1. **Extract the main URL:** Looks for a link with `type === "main"` in the `links` array, falling back to `data.link`.
2. **Validate:** Shows an error toast if no URL is provided.
3. **Build the API payload:**

```ts
const payload: ClientCreateItemRequest = {
    name: data.name,
    description: data.description,
    source_url: sourceUrl,
    category: data.category,
    tags: data.tags || [],
};
```

4. **POST to `/api/client/items`:** Sends the payload as JSON.
5. **Handle response:** On success, shows a success toast and redirects to the submissions page (`/{locale}/client/submissions`). On error, displays the error message in a toast.

### Submission State

The component tracks submission state with a `isSubmitting` flag that:

- Prevents double submissions (early return if already submitting).
- Is passed to `DetailsForm` as `isSubmitting` to disable the submit button during the request.
- Resets in the `finally` block regardless of success or failure.

### Navigation

Two navigation paths are used:

- **Back:** Navigates to `/{locale}/pricing` (the pricing/plan selection page).
- **After success:** Navigates to `/{locale}/client/submissions` (the user's submission history).

Both use Next.js `useRouter().push()` for client-side navigation.

### Error Handling

Errors are caught and displayed via `sonner` toasts:

```ts
try {
    // ... API call
} catch (error) {
    const errorMessage = error instanceof Error
        ? error.message
        : "Error submitting form. Please try again.";
    toast.error(errorMessage);
}
```

Server-side errors from the API response are extracted from `result.error`.

### Types

The component uses two types from `@/lib/types/client-item`:

```ts
// Request payload sent to the API
interface ClientCreateItemRequest {
    name: string;
    description: string;
    source_url: string;
    category: string;
    tags: string[];
}

// Response from the API
interface ClientCreateItemResponse {
    message?: string;
    error?: string;
    // ... other fields
}
```

### Integration with DetailsForm

The `DetailsForm` component (from `components/directory/details-form`) handles all the UI concerns: form fields, validation, category/tag selection, link management, and step navigation. `SubmitFormClient` provides:

- `onSubmit` -- The async handler that processes and sends the data.
- `onBack` -- A navigation callback for the back button.
- `listingProps` -- Initial data for populating selectors.
- `isSubmitting` -- Controls button disabled state.

---

## Key Dependencies

- **DetailsForm:** `@/components/directory/details-form` -- The shared multi-field form component
- **sonner:** Toast notifications for success and error feedback
- **next/navigation:** `useRouter` for programmatic navigation
- **@/lib/types/client-item:** TypeScript types for the API contract
- **@/lib/content:** `Category`, `ItemData`, `Tag` content types

---

## API Endpoint

The form submits to `POST /api/client/items`. This endpoint validates the authenticated session, creates the item record in the database, and returns a JSON response with a success message or error details. See the API documentation for request/response schema details.

## Related Pages

The submit flow is part of a multi-step user journey:

1. **Pricing page** (`/pricing`) -- User selects a plan
2. **Submit page** (`/submit`) -- User fills out the item details (this component)
3. **Submissions page** (`/client/submissions`) -- User reviews their submitted items
