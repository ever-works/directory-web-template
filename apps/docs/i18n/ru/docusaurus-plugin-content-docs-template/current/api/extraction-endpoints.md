---
id: extraction-endpoints
title: "提取和验证端点"
sidebar_label: "提取与验证"
sidebar_position: 19
---

# 提取和验证端点

这些端点提供 URL 元数据提取（通过 Ever Works Platform API）和 Google reCAPTCHA 令牌验证。两者都充当安全的服务器端代理，以防止 API 密钥和机密暴露在客户端代码之外。

**源文件：**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## 端点摘要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|后处理|`/api/extract`|无|从 URL 中提取项目元数据|
|后处理|`/api/verify-recaptcha`|无|验证 reCAPTCHA 令牌|

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

## 发布 `/api/verify-recaptcha`

通过与 Google 的 `siteverify` API 通信来验证 Google reCAPTCHA 令牌。支持 reCAPTCHA v2 和 v3 令牌。开发模式下，未配置密钥时，终端可以绕过验证。

### 请求正文

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`token`|字符串|**是**|来自客户端验证的 reCAPTCHA 令牌|

### 请求示例

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### 它是如何运作的

该处理程序使用 URL 编码的表单数据将令牌发送到 Google 的验证端点：

```ts
const response = await externalClient.postForm(
  "https://www.google.com/recaptcha/api/siteverify",
  {
    secret: secretKey,
    response: token,
  }
);
```

### 回复：200（已验证）

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

### 响应：200（验证失败）

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

### 开发模式绕过

当`RECAPTCHA_SECRET_KEY`未配置且`NODE_ENV`为`"development"`时，端点绕过验证并返回成功：

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

### 错误响应

|状态|描述|
|--------|-------------|
| 400 |`token` 字段缺失或为空|
| 500 |未配置密钥（仅限生产）|
| 500 |Google API 请求失败|
| 500 |验证过程中出现意外错误|

### 响应字段

|领域|类型|描述|
|-------|------|-------------|
|`success`|布尔值|验证是否通过|
|`score`|数字（0.0-1.0）|reCAPTCHA v3 分数（1.0 = 可能是人类，0.0 = 可能是机器人）|
|`action`|字符串|来自 reCAPTCHA 的操作名称|
|`hostname`|字符串|进行验证的主机名|
|`challenge_ts`|字符串|挑战的时间戳|
|`error_codes`|字符串[]|来自 Google API 的错误代码|

### 环境变量

|变量|必填|描述|
|----------|----------|-------------|
|`RECAPTCHA_SECRET_KEY`|是（生产）|Google reCAPTCHA 密钥|

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

## 相关源文件

|文件|目的|
|------|---------|
|`template/app/api/extract/route.ts`|URL提取代理|
|`template/app/api/verify-recaptcha/route.ts`|reCAPTCHA 验证代理|
|`template/lib/api/server-api-client.ts`|支持 `postForm` 的外部 API 客户端|
|`template/lib/config/config-service.ts`|环境变量的配置服务|
