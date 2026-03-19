---
id: use-url-extraction-reference
title: useUrlExtraction
sidebar_label: useUrlExtraction
sidebar_position: 36
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useUrlExtraction

A React hook for extracting structured metadata from URLs via an API endpoint. It fetches a URL, processes its content server-side, and returns extracted details such as name, description, category, tags, brand information, and images.

## Import

```typescript
import { useUrlExtraction } from '@/hooks/use-url-extraction';
```

## API Reference

### Parameters

```typescript
function useUrlExtraction(): UseUrlExtractionReturn;
```

This hook takes no parameters.

### Return Value

#### `UseUrlExtractionReturn`

| Property | Type | Description |
|---|---|---|
| `isLoading` | `boolean` | `true` while an extraction request is in progress. |
| `extractFromUrl` | `(url: string, existingCategories?: string[]) => Promise<ExtractionResult \| null>` | Extracts metadata from the given URL. Returns the result or `null` on failure. |

### Types

```typescript
interface ExtractionResult {
  /** Extracted item name */
  name: string;
  /** Extracted description text */
  description: string;
  /** Suggested category for the item */
  category?: string;
  /** Extracted or suggested tags */
  tags?: string[];
  /** Brand name, if detected */
  brand?: string;
  /** URL to the brand's logo */
  brand_logo_url?: string;
  /** Array of image URLs found on the page */
  images?: string[];
}
```

## Usage Examples

### Auto-Fill Form from URL

```tsx
function ItemForm() {
  const { extractFromUrl, isLoading } = useUrlExtraction();
  const [url, setUrl] = useState('');
  const [formData, setFormData] = useState<Partial<ExtractionResult>>({});

  const handleExtract = async () => {
    const result = await extractFromUrl(url, ['Software', 'Hardware', 'Services']);
    if (result) {
      setFormData({
        name: result.name,
        description: result.description,
        category: result.category,
        tags: result.tags,
      });
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a URL to auto-fill..."
        />
        <button onClick={handleExtract} disabled={isLoading || !url}>
          {isLoading ? 'Extracting...' : 'Extract'}
        </button>
      </div>
      <input value={formData.name || ''} placeholder="Name" />
      <textarea value={formData.description || ''} placeholder="Description" />
    </div>
  );
}
```

### URL Preview Card

```tsx
function UrlPreview({ url }: { url: string }) {
  const { extractFromUrl, isLoading } = useUrlExtraction();
  const [preview, setPreview] = useState<ExtractionResult | null>(null);

  useEffect(() => {
    if (url) {
      extractFromUrl(url).then(setPreview);
    }
  }, [url]);

  if (isLoading) return <Skeleton className="h-32" />;
  if (!preview) return null;

  return (
    <div className="border rounded-lg p-4">
      {preview.images?.[0] && (
        <img src={preview.images[0]} alt={preview.name} className="w-full h-32 object-cover" />
      )}
      <h3 className="font-semibold">{preview.name}</h3>
      <p className="text-sm text-gray-600">{preview.description}</p>
      {preview.brand && (
        <div className="flex items-center gap-2 mt-2">
          {preview.brand_logo_url && (
            <img src={preview.brand_logo_url} alt={preview.brand} className="w-4 h-4" />
          )}
          <span className="text-xs">{preview.brand}</span>
        </div>
      )}
      {preview.tags && (
        <div className="flex gap-1 mt-2">
          {preview.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Batch URL Processing

```tsx
function BatchImport() {
  const { extractFromUrl, isLoading } = useUrlExtraction();
  const [urls, setUrls] = useState<string[]>([]);
  const [results, setResults] = useState<(ExtractionResult | null)[]>([]);

  const handleBatchExtract = async () => {
    const extracted = [];
    for (const url of urls) {
      const result = await extractFromUrl(url);
      extracted.push(result);
    }
    setResults(extracted);
  };

  return (
    <div>
      <textarea
        placeholder="Enter URLs, one per line"
        onChange={(e) => setUrls(e.target.value.split('\n').filter(Boolean))}
      />
      <button onClick={handleBatchExtract} disabled={isLoading}>
        Extract All ({urls.length} URLs)
      </button>
      {results.map((result, i) => (
        result && <div key={i}>{result.name} - {result.description}</div>
      ))}
    </div>
  );
}
```

## Configuration

### API Endpoint

The hook calls `POST /api/extract` with the following request body:

```typescript
{
  url: string;
  existingCategories?: string[];
}
```

The `existingCategories` parameter helps the server assign extracted items to existing categories rather than creating new ones.

### Feature Toggle

The API endpoint supports graceful degradation. If the extraction feature is disabled server-side (e.g., missing API keys for the AI extraction service), the response includes `{ featureDisabled: true }`. In this case, the hook returns `null` silently without showing an error toast.

### Required Dependencies

- `@tanstack/react-query` -- Provides the `useMutation` hook for request state management.
- `sonner` -- Displays error toasts when extraction fails.
- `@/lib/api/server-api-client` -- Makes authenticated API requests.

## Edge Cases and Gotchas

- **Empty URL**: Passing an empty string to `extractFromUrl` throws an error immediately with the message "No URL provided".
- **Feature Disabled**: If the server responds with `featureDisabled: true`, the hook returns `null` without error. Your UI should handle `null` results gracefully and not treat them as failures.
- **Double Error Handling**: The mutation's `onError` handler shows a toast, and the `extractFromUrl` wrapper also catches errors and shows a toast. If you see duplicate error toasts, this is the reason.
- **No Retry Logic**: Unlike other mutation hooks in the template, this hook does not configure retries. Failed extractions fail immediately.
- **Sequential Batch Processing**: When processing multiple URLs, they are extracted sequentially (one at a time). The `isLoading` state reflects only the currently active extraction.
- **Server-Side Extraction**: The actual URL fetching and content analysis happen server-side. The client only sends the URL and receives structured results. This avoids CORS issues and keeps extraction logic secure.

## Related Hooks

- [useDebouncedSearch](./use-debounced-search-reference.md) -- Debounce URL input before triggering extraction.
- [useToast](./use-toast-reference.md) -- The underlying toast system used for error notifications.
