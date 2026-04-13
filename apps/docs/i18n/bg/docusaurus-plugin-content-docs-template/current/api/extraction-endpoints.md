---
id: extraction-endpoints
title: "Крайни точки за извличане и проверка"
sidebar_label: "Извличане и проверка"
sidebar_position: 19
---

# Крайни точки за извличане и проверка

Тези крайни точки осигуряват извличане на URL метаданни (чрез API на Ever Works Platform) и проверка на Google reCAPTCHA токен. И двете действат като защитени проксита от страна на сървъра, за да предпазят API ключовете и тайните от кода от страна на клиента.

**Изходни файлове:**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## Крайна точка Резюме

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|ПУБЛИКУВАНЕ|`/api/extract`|Няма|Извличане на метаданни за елемент от URL адрес|
|ПУБЛИКУВАНЕ|`/api/verify-recaptcha`|Няма|Проверете reCAPTCHA токен|

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

## ПУБЛИКУВАНЕ `/api/verify-recaptcha`

Потвърждава токен на Google reCAPTCHA чрез комуникация с `siteverify` API на Google. Поддържа reCAPTCHA v2 и v3 токени. В режим на разработка крайната точка може да заобиколи проверката, когато секретният ключ не е конфигуриран.

### Тяло на заявката

|Поле|Тип|Задължително|Описание|
|-------|------|----------|-------------|
|`token`|низ|**Да**|reCAPTCHA токен от проверка от страна на клиента|

### Пример за заявка

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### Как работи

Манипулаторът изпраща токена до крайната точка за потвърждение на Google, използвайки кодирани с URL данни на формуляр:

```ts
const response = await externalClient.postForm(
  "https://www.google.com/recaptcha/api/siteverify",
  {
    secret: secretKey,
    response: token,
  }
);
```

### Отговор: 200 (потвърдено)

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

### Отговор: 200 (Неуспешна проверка)

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

### Байпас на режим на разработка

Когато `RECAPTCHA_SECRET_KEY` не е конфигуриран и `NODE_ENV` е `"development"`, крайната точка заобикаля проверката и връща успех:

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

### Отговори за грешки

|Статус|Описание|
|--------|-------------|
| 400 |Липсващо или празно поле `token`|
| 500 |Тайният ключ не е конфигуриран (само за производство)|
| 500 |Неуспешна заявка за API на Google|
| 500 |Неочаквана грешка по време на проверката|

### Полета за отговор

|Поле|Тип|Описание|
|-------|------|-------------|
|`success`|булево|Дали проверката е преминала|
|`score`|число (0,0-1,0)|reCAPTCHA v3 резултат (1,0 = вероятно човек, 0,0 = вероятно бот)|
|`action`|низ|Име на действие от reCAPTCHA|
|`hostname`|низ|Име на хост, където е извършена проверката|
|`challenge_ts`|низ|Времево клеймо на предизвикателството|
|`error_codes`|низ []|Кодове за грешки от API на Google|

### Променливи на средата

|Променлива|Задължително|Описание|
|----------|----------|-------------|
|`RECAPTCHA_SECRET_KEY`|Да (производство)|Google reCAPTCHA секретен ключ|

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

## Свързани изходни файлове

|Файл|Цел|
|------|---------|
|`template/app/api/extract/route.ts`|Прокси за извличане на URL|
|`template/app/api/verify-recaptcha/route.ts`|reCAPTCHA прокси за проверка|
|`template/lib/api/server-api-client.ts`|Външен API клиент с `postForm` поддръжка|
|`template/lib/config/config-service.ts`|Конфигурационна услуга за env vars|
