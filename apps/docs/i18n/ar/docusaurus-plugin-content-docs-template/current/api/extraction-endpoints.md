---
id: extraction-endpoints
title: "نقاط نهاية الاستخراج والتحقق"
sidebar_label: "الاستخراج والتحقق"
sidebar_position: 19
---

# نقاط نهاية الاستخراج والتحقق

توفر نقاط النهاية هذه استخراج البيانات التعريفية لعنوان URL (عبر واجهة برمجة تطبيقات Ever Works Platform) والتحقق من رمز Google reCAPTCHA المميز. يعمل كلاهما كوكلاء آمنين من جانب الخادم للحفاظ على مفاتيح وأسرار واجهة برمجة التطبيقات (API) بعيدًا عن التعليمات البرمجية من جانب العميل.

**الملفات المصدرية:**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## ملخص نقطة النهاية

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|بريد|`/api/extract`|لا شيء|استخراج البيانات التعريفية للعنصر من عنوان URL|
|بريد|`/api/verify-recaptcha`|لا شيء|التحقق من رمز reCAPTCHA|

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

## نشر `/api/verify-recaptcha`

التحقق من رمز Google reCAPTCHA المميز من خلال التواصل مع `siteverify` API الخاص بـ Google. يدعم كلا من رموز reCAPTCHA v2 وv3. في وضع التطوير، يمكن لنقطة النهاية تجاوز التحقق عندما لا يتم تكوين المفتاح السري.

### هيئة الطلب

|الميدان|اكتب|مطلوب|الوصف|
|-------|------|----------|-------------|
|`token`|سلسلة|** نعم **|رمز reCAPTCHA المميز من التحقق من جانب العميل|

### طلب مثال

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### كيف يعمل

يرسل المعالج الرمز المميز إلى نقطة نهاية التحقق في Google باستخدام بيانات النموذج المرمزة بعنوان URL:

```ts
const response = await externalClient.postForm(
  "https://www.google.com/recaptcha/api/siteverify",
  {
    secret: secretKey,
    response: token,
  }
);
```

### الرد: 200 (تم التحقق)

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

### الرد: 200 (فشل التحقق)

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

### تجاوز وضع التطوير

عندما لا يتم تكوين `RECAPTCHA_SECRET_KEY` ويكون `NODE_ENV` هو `"development"`، تتجاوز نقطة النهاية عملية التحقق وتعيد النجاح:

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

### ردود الأخطاء

|الحالة|الوصف|
|--------|-------------|
| 400 |حقل `token` مفقود أو فارغ|
| 500 |لم يتم تكوين المفتاح السري (الإنتاج فقط)|
| 500 |فشل طلب Google API|
| 500 |خطأ غير متوقع أثناء التحقق|

### مجالات الاستجابة

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`success`|منطقية|ما إذا كان التحقق قد تم|
|`score`|الرقم (0.0-1.0)|نتيجة reCAPTCHA v3 (1.0 = بشري محتمل، 0.0 = روبوت محتمل)|
|`action`|سلسلة|اسم الإجراء من reCAPTCHA|
|`hostname`|سلسلة|اسم المضيف الذي حدث فيه التحقق|
|`challenge_ts`|سلسلة|الطابع الزمني للتحدي|
|`error_codes`|سلسلة []|رموز الخطأ من واجهة برمجة تطبيقات Google|

### متغيرات البيئة

|متغير|مطلوب|الوصف|
|----------|----------|-------------|
|`RECAPTCHA_SECRET_KEY`|نعم (الإنتاج)|مفتاح جوجل reCAPTCHA السري|

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

## ملفات المصدر ذات الصلة

|ملف|الغرض|
|------|---------|
|`template/app/api/extract/route.ts`|وكيل استخراج URL|
|`template/app/api/verify-recaptcha/route.ts`|وكيل التحقق reCAPTCHA|
|`template/lib/api/server-api-client.ts`|عميل API خارجي بدعم `postForm`|
|`template/lib/config/config-service.ts`|خدمة التكوين لـ env vars|
