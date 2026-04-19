---
id: extraction-endpoints
title: "Конечные точки извлечения и проверки"
sidebar_label: "Извлечение и проверка"
sidebar_position: 19
---

# Конечные точки извлечения и проверки

Эти конечные точки обеспечивают извлечение метаданных URL-адреса (через API платформы Ever Works) и проверку токена Google reCAPTCHA. Оба действуют как безопасные прокси-серверы на стороне сервера, защищая ключи и секреты API от кода на стороне клиента.

**Исходные файлы:**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## Сводка конечных точек

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|ПОСТ|`/api/extract`|Нет|Извлечение метаданных элемента из URL-адреса|
|ПОСТ|`/api/verify-recaptcha`|Нет|Проверьте токен reCAPTCHA|

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

## ПОСТ `/api/verify-recaptcha`

Проверяет токен Google reCAPTCHA, взаимодействуя с API Google `siteverify`. Поддерживает токены reCAPTCHA v2 и v3. В режиме разработки конечная точка может обходить проверку, если секретный ключ не настроен.

### Тело запроса

|Поле|Тип|Требуется|Описание|
|-------|------|----------|-------------|
|`token`|строка|**Да**|Токен reCAPTCHA от проверки на стороне клиента|

### Пример запроса

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### Как это работает

Обработчик отправляет токен в конечную точку проверки Google, используя данные формы в URL-кодировке:

```ts
const response = await externalClient.postForm(
  "https://www.google.com/recaptcha/api/siteverify",
  {
    secret: secretKey,
    response: token,
  }
);
```

### Ответ: 200 (Проверено)

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

### Ответ: 200 (неудачная проверка)

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

### Обход режима разработки

Если `RECAPTCHA_SECRET_KEY` не настроен и `NODE_ENV` имеет значение `"development"`, конечная точка обходит проверку и возвращает успех:

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

### Реакции на ошибки

|Статус|Описание|
|--------|-------------|
| 400 |Поле `token` отсутствует или пусто.|
| 500 |Секретный ключ не настроен (только рабочая версия)|
| 500 |Запрос API Google не выполнен|
| 500 |Неожиданная ошибка во время проверки|

### Поля ответа

|Поле|Тип|Описание|
|-------|------|-------------|
|`success`|логическое значение|Прошла ли проверка|
|`score`|число (0,0-1,0)|Оценка reCAPTCHA v3 (1,0 = вероятно человек, 0,0 = вероятно бот)|
|`action`|строка|Название действия из reCAPTCHA|
|`hostname`|строка|Имя хоста, на котором произошла проверка|
|`challenge_ts`|строка|Временная метка вызова|
|`error_codes`|строка[]|Коды ошибок API Google|

### Переменные среды

|Переменная|Требуется|Описание|
|----------|----------|-------------|
|`RECAPTCHA_SECRET_KEY`|Да (производство)|Секретный ключ Google reCAPTCHA|

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

## Связанные исходные файлы

|Файл|Цель|
|------|---------|
|`template/app/api/extract/route.ts`|Прокси-сервер для извлечения URL-адресов|
|`template/app/api/verify-recaptcha/route.ts`|Прокси-сервер проверки reCAPTCHA|
|`template/lib/api/server-api-client.ts`|Внешний API-клиент с поддержкой `postForm`|
|`template/lib/config/config-service.ts`|Служба настройки для переменных окружения|
