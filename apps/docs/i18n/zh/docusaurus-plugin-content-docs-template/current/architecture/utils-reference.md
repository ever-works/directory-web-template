---
id: utils-reference
title: "实用工具参考"
sidebar_label: "实用程序参考"
sidebar_position: 24
---

# 实用工具参考

该模板提供跨两个目录的实用程序函数：`utils/` 用于通用帮助程序，`lib/utils/` 用于框架集成实用程序。本参考记录了每个实用程序模块、其导出和使用模式。

## 目录结构

```
utils/                              # General-purpose utilities
├── date.ts                         # Date formatting
├── pagination.ts                   # Pagination helpers
└── profile-button.utils.ts         # Profile UI helpers

lib/utils/                          # Framework-integrated utilities
├── index.ts                        # cn() class name merger
├── api-error.ts                    # Safe API error responses
├── bot-detection.ts                # User-Agent bot detection
├── checkout-utils.ts               # Payment checkout helpers
├── client-auth.ts                  # Client-side auth utilities
├── currency-format.ts              # Currency formatting
├── custom-navigation.ts            # Navigation helpers
├── database-check.ts               # Database connectivity check
├── email-validation.ts             # ReDoS-safe email validation
├── error-handler.ts                # Error handling utilities
├── featured-items.ts               # Featured item sorting/filtering
├── footer-utils.ts                 # Footer content utilities
├── image-domains.ts                # Image domain whitelist
├── pagination-validation.ts        # Server-side pagination validation
├── payment-provider.ts             # Payment provider detection
├── plan-expiration.utils.ts        # Plan expiration calculations
├── rate-limit.ts                   # In-memory rate limiter
├── request-body.ts                 # Request body parsing
├── server-url.ts                   # Server URL resolution
├── settings.ts                     # Settings helpers
├── slug.ts                         # URL slug utilities
├── url-cleaner.ts                  # URL cleaning and validation
├── url-filter-sync.ts              # URL/filter state synchronization
├── twenty-crm-client.utils.ts      # Twenty CRM client utils
└── twenty-crm-validation.ts        # Twenty CRM validation
```

## 日期实用程序 (`utils/date.ts`)

### 格式化日期

设置包含长月、日和年的日期格式。

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### 格式化日期时间

使用长月、日、年、小时和分钟格式化日期。

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### 格式化日期短格式

带有短月份的格式。对于 null/未定义值，返回 `'-'`。

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## 分页 (`utils/pagination.ts`)

### 夹住并滚动到顶部

将页码限制在有效范围内并将窗口滚动到顶部。

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

|参数|类型|描述|
|---|---|---|
|`newPage`|`number`|请求的页码|
|`total`|`number`|总页数|
|`setPage`|`(page: number) => void`|状态设定器功能|

行为：钳制范围 `[1, total]`，通过默认值 1 处理 `NaN`，并执行平滑滚动到顶部。

## 配置文件按钮实用程序 (`utils/profile-button.utils.ts`)

### 格式显示名称

根据长度智能地格式化显示名称：

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### 获取缩写

从姓名中提取缩写：

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### 获取配置文件路径

构建 URL 安全的配置文件路径：

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### 获取主题颜色

返回 UI 叠加层的当前主题颜色：

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## 类名合并 (`lib/utils/index.ts`)

### 中文

将 Tailwind CSS 类与冲突解决结合起来：

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

使用 `clsx` 进行条件类，使用 `tailwind-merge` 进行冲突解决。

## API 错误处理 (`lib/utils/api-error.ts`)

### 安全错误响应

创建错误响应以防止生产中的信息泄漏：

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

|环境|响应包含|
|---|---|
|发展|实际`error.message`|
|生产|仅通用`fallbackMessage`|

无论环境如何，完整的错误详细信息始终记录在服务器端。

### 安全错误消息

提取安全的错误消息字符串而不创建响应：

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## 电子邮件验证 (`lib/utils/email-validation.ts`)

### 有效电子邮件

使用手动解析进行 ReDoS 安全电子邮件验证（无易受攻击的正则表达式）：

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

验证规则：
- 长度介于 5 到 254 个字符之间
- 本地部分：1-64 个字符，字母数字 + 允许的特殊字符
- 域：至少有一个点的有效结构
- 每个域标签：1-63 个字符，以字母数字开头/结尾

### isValidEmail正则表达式

基于正则表达式的替代验证（也是 ReDoS 安全的）：

```typescript
isValidEmailRegex('user@example.com')  // true
```

## 货币格式 (`lib/utils/currency-format.ts`)

### 格式货币

将小单位金额（美分）格式化为本地化货币字符串：

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### 格式货币金额

将主要单位金额（美元）格式化为本地化货币字符串：

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### 获取货币符号

返回货币代码的符号：

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

支持 22 种货币，包括美元、欧元、英镑、日元、人民币、加元、澳元、瑞士法郎、印度卢比、巴西雷亚尔、墨西哥比索、韩元等。

## Slug 实用程序 (`lib/utils/slug.ts`)

### slugify

将文本转换为 URL 友好的 slugs：

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### 消除粘连

将 slugs 转换回可读文本：

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## URL 实用程序 (`lib/utils/url-cleaner.ts`)

### 干净的网址

清理并规范化 URL 字符串：

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

使用协议和主机名验证 URL 是否是绝对的：

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### 获取BaseUrl

返回带有后备链的规范化应用程序基 URL：

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### 构建网址

从路径段构造完整的 URL：

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## 速率限制 (`lib/utils/rate-limit.ts`)

### 速率限制

API端点的内存中速率限制器：

```typescript
import { ratelimit } from '@/lib/utils/rate-limit';

const result = await ratelimit(
  `api:${clientIP}`,  // Unique key
  100,                // Max requests
  60 * 1000           // Window: 1 minute
);

if (!result.success) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': String(result.retryAfter) }
  });
}
```

返回类型：

```typescript
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // Seconds until reset (only when limited)
}
```

### 重置速率限制/获取速率限制状态

```typescript
resetRateLimit('api:192.168.1.1');     // Clear rate limit for key

const status = getRateLimitStatus('api:192.168.1.1', 100);
// { remaining: 95, resetTime: 1706000000000 }
```

商店每 5 分钟自动清洁一次。

## 分页验证 (`lib/utils/pagination-validation.ts`)

### 验证分页参数

API 路由的服务器端分页参数验证：

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

验证规则：
- `page`：必须是正整数（默认值：1）
- `limit`：必须介于 1 到 100 之间（默认值：10）

## 机器人检测 (`lib/utils/bot-detection.ts`)

### 是机器人

通过用户代理字符串检测机器人：

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

检测到的类别：搜索引擎、社交媒体爬虫、性能工具、自动化框架、HTTP 客户端。

## 特色项目 (`lib/utils/featured-items.ts`)

### 排序项目与精选

将特色项目放在列表的开头，按特色顺序排序：

```typescript
const sorted = sortItemsWithFeatured(allItems, featuredItems);
// Featured items first (by order), then remaining items
```

### isItemFeatured / getFeaturedItemData

```typescript
const featured = isItemFeatured('my-item', featuredItems);  // boolean
const data = getFeaturedItemData('my-item', featuredItems);  // FeaturedItem | undefined
```

### 过滤活动特色项目

根据 `featuredUntil` 日期删除过期的特色项目。

### 特色商品即将到期

检查特色商品是否在 7 天内过期。

## 服务器网址 (`lib/utils/server-url.ts`)

### 获取前端Url

从当前请求上下文解析前端 URL：

```typescript
const url = await getFrontendUrl();
```

决议顺序：
1. `window.location.origin`（客户端）
2. `x-forwarded-host` / `host` 标头（服务器端，根据配置进行验证）
3. 配置`WEB_URL` 后备

## 汇总表

|模块|主要出口产品|类别|
|---|---|---|
|`utils/date`|`formatDate`、`formatDateTime`、`formatDateShort`|格式化|
|`utils/pagination`|`clampAndScrollToTop`|用户界面助手|
|`utils/profile-button.utils`|`formatDisplayName`、`getInitials`、`getProfilePath`|用户界面助手|
|`lib/utils/index`|`cn`|造型|
|`lib/utils/api-error`|`safeErrorResponse`、`safeErrorMessage`|错误处理|
|`lib/utils/bot-detection`|`isBot`|安全性|
|`lib/utils/currency-format`|`formatCurrency`、`formatCurrencyAmount`、`getCurrencySymbol`|格式化|
|`lib/utils/email-validation`|`isValidEmail`、`isValidEmailRegex`|验证|
|`lib/utils/featured-items`|`sortItemsWithFeatured`、`filterActiveFeaturedItems`|数据|
|`lib/utils/pagination-validation`|`validatePaginationParams`|验证|
|`lib/utils/rate-limit`|`ratelimit`、`resetRateLimit`|安全性|
|`lib/utils/server-url`|`getFrontendUrl`|基础设施|
|`lib/utils/slug`|`slugify`、`deslugify`|格式化|
|`lib/utils/url-cleaner`|`cleanUrl`、`getBaseUrl`、`buildUrl`|基础设施|
