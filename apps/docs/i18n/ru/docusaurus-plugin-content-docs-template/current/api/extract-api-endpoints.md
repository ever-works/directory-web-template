---
id: extract-api-endpoints
title: 提取API端点
sidebar_label: 提取API
sidebar_position: 61
---

# 提取API端点

Extract API 提供了一个安全代理端点，用于从给定 URL 中提取项目元数据（名称、描述、类别等）。它将请求转发到 Ever Works Platform API，以进行人工智能驱动的内容提取。

**来源：** `template/app/api/extract/route.ts`

---

## Extract Metadata from URL

Extracts item metadata from a given URL by proxying the request to the Platform API.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/extract` |
| **Auth** | None (public, but requires `PLATFORM_API_URL` to be configured) |

### Request Body

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | `string` (URI) | Yes | The URL to extract metadata from |
| `existingCategories` | `string[]` | No | Existing category names to help with AI categorization |

### Responses

**Status 200** -- Extraction successful.

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description extracted from the page.",
    "category": "Productivity",
    "tags": ["automation", "workflow"]
  }
}
```

The shape of `data` depends on the Platform API response -- it typically includes `name`, `description`, and suggested categorization fields.

**Status 200** -- Feature disabled (Platform API not configured).

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

:::note
When `PLATFORM_API_URL` is not set, the endpoint returns a `200` status with `featureDisabled: true` rather than an error. This allows the frontend to gracefully hide the extraction feature.
:::

**Status 400** -- Invalid request.

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Status 500** -- Server error during extraction.

```json
{
  "success": false,
  "error": "Internal server error during extraction"
}
```

### Validation

The request body is validated with Zod:

- `url` must be a valid URL string.
- `existingCategories` is an optional array of strings.

### curl Examples

```bash
# Extract metadata from a URL
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/some-project",
    "existingCategories": ["Developer Tools", "Open Source"]
  }'

# Minimal request (URL only)
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/product" }'
```

### TypeScript Usage

```typescript
interface ExtractRequest {
  url: string;
  existingCategories?: string[];
}

interface ExtractSuccessResponse {
  success: true;
  data: {
    name: string;
    description: string;
    category?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

interface ExtractDisabledResponse {
  success: false;
  featureDisabled: true;
  message: string;
}

interface ExtractErrorResponse {
  success: false;
  error: string;
}

type ExtractResponse = ExtractSuccessResponse | ExtractDisabledResponse | ExtractErrorResponse;

async function extractMetadata(
  url: string,
  existingCategories?: string[]
): Promise<ExtractResponse> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, existingCategories }),
  });
  return res.json();
}

// Usage
const result = await extractMetadata('https://example.com/tool', ['Productivity']);

if ('featureDisabled' in result && result.featureDisabled) {
  console.log('Extraction feature is not available');
} else if (result.success) {
  console.log('Extracted:', result.data.name, result.data.description);
} else {
  console.error('Extraction failed:', result.error);
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PLATFORM_API_URL` | No | Base URL of the Ever Works Platform API. If not set, the feature is disabled gracefully. |
| `PLATFORM_API_SECRET_TOKEN` | No | Optional Bearer token for authenticating with the Platform API. |

### Implementation Notes

- This endpoint acts as a **secure proxy** -- the Platform API URL and token are never exposed to the client.
- The endpoint strips trailing slashes from `PLATFORM_API_URL` before constructing the extraction URL.
- The Platform API endpoint called is `<PLATFORM_API_URL>/extract-item-details`.
- The `existingCategories` field is forwarded as `existing_data` in the Platform API request body.
- Non-JSON error responses from the Platform API (e.g., HTML error pages) are handled gracefully with a fallback to `statusText`.
