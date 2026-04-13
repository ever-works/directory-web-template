---
id: extraction-endpoints
title: "נקודות קצה לחילוץ ואימות"
sidebar_label: "חילוץ ואימות"
sidebar_position: 19
---

# נקודות קצה לחילוץ ואימות

נקודות קצה אלו מספקות חילוץ מטא נתונים של כתובת URL (דרך ה-API של Ever Works Platform) ואימות אסימון reCAPTCHA של Google. שניהם פועלים כפרוקסי מאובטחים בצד השרת כדי לשמור מפתחות וסודות API מחוץ לקוד בצד הלקוח.

**קבצי מקור:**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## סיכום נקודות קצה

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|פוסט|`/api/extract`|אין|חלץ מטא נתונים של פריט מכתובת אתר|
|פוסט|`/api/verify-recaptcha`|אין|אמת אסימון reCAPTCHA|

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

## פרסם `/api/verify-recaptcha`

מאמת אסימון reCAPTCHA של Google על ידי תקשורת עם ה-API של Google `siteverify`. תומך באסימוני reCAPTCHA v2 וגם v3. במצב פיתוח, נקודת הקצה יכולה לעקוף את האימות כאשר המפתח הסודי אינו מוגדר.

### גוף הבקשה

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`token`|מחרוזת|**כן**|אסימון reCAPTCHA מאימות בצד הלקוח|

### בקשה לדוגמא

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### איך זה עובד

המטפל שולח את האסימון לנקודת קצה האימות של Google באמצעות נתוני טופס מקודדים בכתובת URL:

```ts
const response = await externalClient.postForm(
  "https://www.google.com/recaptcha/api/siteverify",
  {
    secret: secretKey,
    response: token,
  }
);
```

### תגובה: 200 (מאומת)

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

### תגובה: 200 (אימות נכשל)

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

### מעקף מצב פיתוח

כאשר `RECAPTCHA_SECRET_KEY` אינו מוגדר ו-`NODE_ENV` הוא `"development"`, נקודת הקצה עוקפת את האימות ומחזירה הצלחה:

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

### תגובות שגיאה

|סטטוס|תיאור|
|--------|-------------|
| 400 |שדה `token` חסר או ריק|
| 500 |מפתח סודי לא מוגדר (הפקה בלבד)|
| 500 |בקשת Google API נכשלה|
| 500 |שגיאה בלתי צפויה במהלך האימות|

### שדות תגובה

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`success`|בוליאני|האם האימות עבר|
|`score`|מספר (0.0-1.0)|ציון reCAPTCHA v3 (1.0 = אנושי סביר, 0.0 = בוט סביר)|
|`action`|מחרוזת|שם הפעולה מ-reCAPTCHA|
|`hostname`|מחרוזת|שם מארח שבו התרחש האימות|
|`challenge_ts`|מחרוזת|חותמת זמן של האתגר|
|`error_codes`|מחרוזת[]|קודי שגיאה מהממשק ה-API של גוגל|

### משתני סביבה

|משתנה|חובה|תיאור|
|----------|----------|-------------|
|`RECAPTCHA_SECRET_KEY`|כן (הפקה)|מפתח סודי של Google reCAPTCHA|

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

## קבצי מקור קשורים

|קובץ|מטרה|
|------|---------|
|`template/app/api/extract/route.ts`|פרוקסי לחילוץ כתובת URL|
|`template/app/api/verify-recaptcha/route.ts`|שרת proxy לאימות reCAPTCHA|
|`template/lib/api/server-api-client.ts`|לקוח API חיצוני עם תמיכה `postForm`|
|`template/lib/config/config-service.ts`|שירות תצורה עבור env vars|
