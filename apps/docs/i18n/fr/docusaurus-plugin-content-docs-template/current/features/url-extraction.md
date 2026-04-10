---
id: url-extraction
title: Système d'extraction d'URL
sidebar_label: Extraction d'URL
sidebar_position: 13
---

# Système d'extraction d'URL

The Ever Works Template includes an AI-powered URL extraction system that automatically extracts metadata from URLs, including product names, descriptions, categories, tags, brand information, and images. This feature streamlines the item submission process by auto-populating form fields from a provided URL.

## Architecture Overview

| Component | Path | Purpose |
|---|---|---|
| `useUrlExtraction` hook | `hooks/use-url-extraction.ts` | Client-side React hook for triggering extraction |
| `/api/extract` endpoint | `app/api/extract/` | Server-side API route that performs the actual extraction |

## How It Works

1. The user provides a URL in the submission form
2. The `useUrlExtraction` hook sends the URL to the `/api/extract` endpoint
3. The server extracts metadata (name, description, category, tags, brand, images)
4. The extracted data is returned and can be used to auto-fill form fields

## The `useUrlExtraction` Hook

### Interface

```tsx
interface ExtractionResult {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  brand?: string;
  brand_logo_url?: string;
  images?: string[];
}

interface UseUrlExtractionReturn {
  isLoading: boolean;
  extractFromUrl: (url: string, existingCategories?: string[]) => Promise<ExtractionResult | null>;
}
```

### Usage

```tsx
import { useUrlExtraction } from '@/hooks/use-url-extraction';

function SubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();

  const handleUrlSubmit = async (url: string) => {
    const existingCategories = ['Project Management', 'Time Tracking', 'CRM'];
    const result = await extractFromUrl(url, existingCategories);

    if (result) {
      // Auto-fill form fields with extracted data
      setFormData({
        name: result.name,
        description: result.description,
        category: result.category || '',
        tags: result.tags || [],
      });
    }
  };

  return (
    <div>
      <input
        type="url"
        placeholder="Enter product URL..."
        onBlur={(e) => handleUrlSubmit(e.target.value)}
      />
      {isLoading && <span>Extracting data...</span>}
    </div>
  );
}
```

## Extracted Data Fields

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Product or service name extracted from the page |
| `description` | `string` | Product description or meta description |
| `category` | `string?` | Suggested category, matched against existing categories when provided |
| `tags` | `string[]?` | Relevant tags extracted from the page content |
| `brand` | `string?` | Brand or company name |
| `brand_logo_url` | `string?` | URL to the brand logo image |
| `images` | `string[]?` | Array of relevant image URLs found on the page |

## Category Matching

The `extractFromUrl` function accepts an optional `existingCategories` parameter. When provided, the extraction API attempts to match the extracted content against these categories, ensuring the suggested category aligns with the site's taxonomy:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## Error Handling

The hook implements multiple layers of error handling:

| Scenario | Behavior |
|---|---|
| Empty URL | Throws an error with "No URL provided" |
| HTTP request failure | Logs error, shows toast notification |
| Feature disabled | Returns `null` silently (graceful degradation) |
| API failure | Logs error, shows toast with message |
| Unexpected error | Catches all errors, shows generic toast, returns `null` |

### Graceful Degradation

The system supports graceful degradation when the extraction feature is not configured:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

This allows the submission form to work normally even if the AI extraction service is not configured, simply skipping the auto-fill step.

## React Query Integration

The hook uses TanStack Query's `useMutation` for managing the extraction request:

```tsx
const mutation = useMutation({
  mutationFn: async ({ url, existingCategories }) => {
    const response = await serverClient.post('/api/extract', {
      url,
      existingCategories
    });
    // ... validation and error handling
    return response.data.data;
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to extract data from URL');
  }
});
```

Benefits of using `useMutation`:
- Automatic loading state management via `isPending`
- Built-in error handling with `onError` callback
- Promise-based API via `mutateAsync`

## Integration with Submit Form

The URL extraction is typically integrated into the item submission flow:

```tsx
function ItemSubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', tags: []
  });

  const handleUrlChange = async (url: string) => {
    if (!url) return;

    const result = await extractFromUrl(url, availableCategories);
    if (result) {
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        description: result.description || prev.description,
        category: result.category || prev.category,
        tags: result.tags?.length ? result.tags : prev.tags,
      }));
    }
  };

  return (
    <form>
      <input
        name="url"
        placeholder="Product URL"
        onBlur={(e) => handleUrlChange(e.target.value)}
        disabled={isLoading}
      />
      {/* Form fields auto-populated from extraction */}
    </form>
  );
}
```

## API Client

The hook uses the template's `serverClient` for HTTP communication:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## Key Files

| File | Path |
|---|---|
| URL Extraction Hook | `hooks/use-url-extraction.ts` |
| Extract API Route | `app/api/extract/route.ts` |
| Server API Client | `lib/api/server-api-client.ts` |