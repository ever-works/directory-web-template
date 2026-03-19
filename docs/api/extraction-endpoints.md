---
id: extraction-endpoints
title: "Extraction & Verification Endpoints"
sidebar_label: "Extraction & Verification"
sidebar_position: 19
---

# Extraction & Verification Endpoints

These endpoints provide URL metadata extraction (via the Ever Works Platform API) and Google reCAPTCHA token verification. Both act as secure server-side proxies to keep API keys and secrets out of client-side code.

**Source files:**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/extract` | None | Extract item metadata from a URL |
| POST | `/api/verify-recaptcha` | None | Verify a reCAPTCHA token |

---

## POST `/api/extract`

A secure proxy that extracts item metadata (name, description, category suggestions) from a given URL using the Ever Works Platform API. The endpoint keeps the `PLATFORM_API_URL` and `PLATFORM_API_SECRET_TOKEN` credentials server-side.

### Feature Availability

This endpoint requires `PLATFORM_API_URL` to be configured. When not configured, it returns a graceful response indicating the feature is disabled rather than a hard error:

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string (URL) | **Yes** | The URL to extract metadata from |
| `existingCategories` | string[] | No | Existing category names to help with categorization |

Validated using a Zod schema:

```ts
const extractSchema = z.object({
  url: z.string().url('Invalid URL format'),
  existingCategories: z.array(z.string()).optional()
});
```

### Request Example

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

### How It Works

The handler proxies the request to the Platform API's `/extract-item-details` endpoint:

```ts
const extractionEndpoint =
  `${platformApiUrl.replace(/\/+$/, '')}/extract-item-details`;

const response = await fetch(extractionEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(platformApiToken
      ? { Authorization: `Bearer ${platformApiToken}` }
      : {})
  },
  body: JSON.stringify({
    source_url: url,
    existing_data: existingCategories?.length > 0
      ? existingCategories
      : undefined
  })
});
```

### Response: 200 (Success)

The response is passed through directly from the Platform API:

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description",
    "category": "Productivity",
    "tags": ["saas", "tool"],
    "icon_url": "https://example.com/favicon.ico"
  }
}
```

### Response: 200 (Feature Disabled)

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid URL format (Zod validation) |
| Varies | Upstream API error (status code passed through from Platform API) |
| 500 | Internal server error during extraction |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PLATFORM_API_URL` | Yes (for feature) | Base URL of the Ever Works Platform API |
| `PLATFORM_API_SECRET_TOKEN` | No | Bearer token for authenticated Platform API calls |

---

## POST `/api/verify-recaptcha`

Verifies a Google reCAPTCHA token by communicating with Google's `siteverify` API. Supports both reCAPTCHA v2 and v3 tokens. In development mode, the endpoint can bypass verification when the secret key is not configured.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | **Yes** | reCAPTCHA token from client-side verification |

### Request Example

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### How It Works

The handler sends the token to Google's verification endpoint using URL-encoded form data:

```ts
const response = await externalClient.postForm(
  "https://www.google.com/recaptcha/api/siteverify",
  {
    secret: secretKey,
    response: token,
  }
);
```

### Response: 200 (Verified)

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": []
}
```

### Response: 200 (Failed Verification)

```json
{
  "success": false,
  "score": 0.1,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": ["invalid-input-response"]
}
```

### Development Mode Bypass

When `RECAPTCHA_SECRET_KEY` is not configured and `NODE_ENV` is `"development"`, the endpoint bypasses verification and returns success:

```ts
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({
      success: true,
      score: 1.0,
      action: "bypass",
    });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Missing or empty `token` field |
| 500 | Secret key not configured (production only) |
| 500 | Google API request failed |
| 500 | Unexpected error during verification |

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the verification passed |
| `score` | number (0.0-1.0) | reCAPTCHA v3 score (1.0 = likely human, 0.0 = likely bot) |
| `action` | string | Action name from reCAPTCHA |
| `hostname` | string | Hostname where verification occurred |
| `challenge_ts` | string | Timestamp of the challenge |
| `error_codes` | string[] | Error codes from Google's API |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RECAPTCHA_SECRET_KEY` | Yes (production) | Google reCAPTCHA secret key |

---

## Usage Examples

### URL Extraction

```ts
// Extract metadata from a URL for the item submission form
const res = await fetch('/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/product',
    existingCategories: ['Productivity', 'Developer Tools']
  })
});

const data = await res.json();

if (data.featureDisabled) {
  // Feature not available, skip auto-fill
  console.log('Extraction not available');
} else if (data.success) {
  // Auto-fill form fields
  setName(data.data.name);
  setDescription(data.data.description);
}
```

### reCAPTCHA Verification

```ts
// Verify reCAPTCHA token before form submission
const recaptchaToken = await grecaptcha.execute(siteKey, {
  action: 'submit'
});

const res = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: recaptchaToken })
});

const { success, score } = await res.json();

if (success && score >= 0.5) {
  // Proceed with form submission
  submitForm();
} else {
  // Show human verification challenge
  showCaptchaChallenge();
}
```

---

## Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/extract/route.ts` | URL extraction proxy |
| `template/app/api/verify-recaptcha/route.ts` | reCAPTCHA verification proxy |
| `template/lib/api/server-api-client.ts` | External API client with `postForm` support |
| `template/lib/config/config-service.ts` | Configuration service for env vars |
