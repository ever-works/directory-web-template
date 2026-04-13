---
id: overview
title: API 路由概述
sidebar_label: 概述
sidebar_position: 0
---

# API 路由概述

该模板公开了`app/api/` 目录下跨 29 个路由组组织的大约 151 个 API 路由处理程序。所有路由均使用 Next.js App Router 约定，其中 `route.ts` 文件导出 HTTP 方法处理程序（`GET`、`POST`、`PUT`、`PATCH`、`DELETE`）。

## 路线组

|集团|路径|描述|大约。路线|
|-------|------|-------------|---------------|
|**管理员**|`/api/admin/*`|管理面板CRUD操作| ~60 |
|**授权**|`/api/auth/*`|NextAuth 处理程序 + 密码管理| 2 |
|**类别**|`/api/categories/*`|公共类别查询| 1 |
|**客户**|`/api/client/*`|客户仪表板和项目管理| ~7 |
|**收藏**|`/api/collections/*`|公共收藏查询| 1 |
|**配置**|`/api/config/*`|功能标志配置| 1 |
|**计划任务**|`/api/cron/*`|预定的后台作业| 3 |
|**当前用户**|`/api/current-user`|当前已验证的用户信息| 1 |
|**摘录**|`/api/extract`|URL元数据提取| 1 |
|**收藏夹**|`/api/favorites/*`|用户最喜欢的物品| 2 |
|**特色项目**|`/api/featured-items`|特色商品清单| 1 |
|**地理编码**|`/api/geocode`|地址地理编码| 1 |
|**健康**|`/api/health/*`|系统健康检查| 1 |
|**内部**|`/api/internal/*`|内部操作（DB初始化）| 1 |
|**项目**|`/api/items/*`|公共项目端点（评论、投票、观点）| ~12 |
|**挤柠檬**|`/api/lemonsqueezy/*`|Lemon Squeezy 支付集成| 7 |
|**地点**|`/api/location/*`|位置搜索和数据| 4 |
|**付款**|`/api/payment/*`|通用支付/订阅管理| 3 |
|**极地**|`/api/polar/*`|Polar 支付集成| 5 |
|**参考**|`/api/reference`|参考数据端点| 1 |
|**报告**|`/api/reports`|公开报告提交| 1 |
|**实体门**|`/api/solidgate/*`|Solidgate 支付集成| 2 |
|**赞助商广告**|`/api/sponsor-ads/*`|赞助商广告管理| 7 |
|**条纹**|`/api/stripe/*`|条纹支付集成| ~17 |
|**调查**|`/api/surveys/*`|调查 CRUD 和回复| 4 |
|**用户**|`/api/user/*`|用户个人资料和订阅| 5 |
|**验证-recaptcha**|`/api/verify-recaptcha`|reCAPTCHA 验证| 1 |
|**版本**|`/api/version/*`|应用程序版本信息| 2 |

## 架构模式

### 路由处理程序结构

路由处理程序遵循一致的精简处理程序模式：

```typescript
// app/api/admin/items/route.ts
import { withAdminAuth } from '@/lib/auth/admin-guard';

export const GET = withAdminAuth(async (request: NextRequest) => {
  // 1. Parse and validate input (query params, body)
  // 2. Call service or repository
  // 3. Return JSON response
  return NextResponse.json({ success: true, data: result });
});
```

### 身份验证模式

路由使用不同的身份验证级别：

|级别|方法|用途|
|-------|--------|-------|
|**公开**|没有授权检查|项目列表、健康检查、版本信息|
|**已验证**|`auth()` 或 `getCachedSession()`|用户个人资料、收藏夹、客户端端点|
|**管理员**|`withAdminAuth()` 或 `checkAdminAuth()`|所有 `/api/admin/*` 路线|
|**克朗**|`CRON_SECRET` 标头检查|`/api/cron/*`路线|

### 错误处理

API 路由使用一致的错误响应格式：

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: 'Human-readable error message' }
```

HTTP 状态代码遵循 REST 约定：

|状态|用途|
|--------|-------|
| `200` |成功的 GET、PUT、PATCH|
| `201` |成功 POST（已创建资源）|
| `400` |请求正文或参数无效|
| `401` |身份验证缺失或无效|
| `403` |已验证但权限不足|
| `404` |找不到资源|
| `409` |冲突（重复资源）|
| `500` |服务器内部错误|

### 分页

列表端点通常支持光标或基于偏移的分页：

```
GET /api/admin/items?page=1&limit=20&sort=createdAt&order=desc
```

常用查询参数：

|参数|类型|默认|描述|
|-----------|------|---------|-------------|
|`page`|数量| `1` |页码（从 1 开始）|
|`limit`|数量| `20` |每页项目数|
|`sort`|字符串|`createdAt`|排序字段|
|`order`|字符串|`desc`|排序方向（`asc` 或`desc`）|
|`search`|字符串| - |全文搜索查询|

### 响应信封

分页响应包括元数据：

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

## 目录结构

```
app/api/
  admin/               # Admin-only endpoints (19 resource groups)
  auth/                # NextAuth + password management
  categories/          # Public category data
  client/              # Client-facing dashboard + items
  collections/         # Public collection data
  config/              # Feature configuration
  cron/                # Scheduled jobs (sync, subscriptions)
  current-user/        # Current user session info
  extract/             # URL metadata extraction
  favorites/           # Favorite item management
  featured-items/      # Featured item listings
  geocode/             # Geocoding service
  health/              # Health checks (database)
  internal/            # Internal operations
  items/               # Public item interactions
  lemonsqueezy/        # Lemon Squeezy payments
  location/            # Location data (countries, cities)
  payment/             # Generic payment management
  polar/               # Polar payments
  reference/           # Reference data
  reports/             # Content reports
  solidgate/           # Solidgate payments
  sponsor-ads/         # Sponsor advertisement management
  stripe/              # Stripe payments
  surveys/             # Survey management
  user/                # User profile endpoints
  verify-recaptcha/    # reCAPTCHA verification
  version/             # App version info
```
