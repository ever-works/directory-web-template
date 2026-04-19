---
id: routing
title: 路由架构
sidebar_label: 路由
sidebar_position: 6
---

# 路由架构

Ever Works 模板使用 Next.js App Router 通过 `next-intl` 进行国际化，提供区域设置前缀的路由、用于逻辑组织的路由组以及全面的 API 层。

## 具有区域设置段的应用程序路由器

所有面向用户的页面都嵌套在 `[locale]` 动态段下，从而支持 6 种语言环境的多语言支持：`en`、`fr`、`es`、`de`、`ar` 和 `zh`。

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

URL 遵循 `/{locale}/path` 模式，例如：
- `/en/pricing` -- 英文定价页面
- `/fr/admin/items` -- 法语管理项目页面
- `/de/categories` -- 德语类别页面

## Next.js 配置

`next.config.ts` 配置多种路由行为：

### 重写

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

这些重写将根区域设置路径和 `/discover` 重定向到发现列表的第一页 (`/discover/1`)，从而提供干净的默认 URL。

### 安全标头

所有路由都会接收安全标头，包括：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` 最大年龄为 2 年
- `Content-Security-Policy` 具有限制性默认值
- `Referrer-Policy: strict-origin-when-cross-origin`

### 下一个国际插件

`next-intl` 插件应用于 Next.js 配置，指向 `./i18n/request.ts` 进行语言环境解析：

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## 路线组

`[locale]` 目录使用多个逻辑分组来组织页面：

### （列表）--主要列表页面

`(listing)` 路由组是一个带括号的组（无 URL 段），它使用共享布局包装主目录列表页面。

### admin/ -- 管理面板

管理部分提供完整的后台界面：

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ -- 身份验证页面

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### client/ -- 客户端仪表板

客户端部分提供经过身份验证的用户功能，用于管理自己的提交和帐户。

### 仪表板/ -- 用户仪表板

包含帐户概述、活动和设置的一般用户仪表板。

## API路由（29组）

API 路由位于 `app/api/` 处的 `[locale]` 段之外，并且没有区域设置前缀。它们充当客户端数据获取的后端。

|航线组|目的|关键端点|
|-------------|---------|---------------|
|`admin/`|管理操作|项目、用户、类别、设置|
|`auth/`|认证|会话、OAuth 回调|
|`categories/`|类别数据|列表、搜索|
|`client/`|客户运营|个人资料、提交内容、仪表板|
|`collections/`|采集数据|清单、详细信息|
|`config/`|站点配置|功能标志、设置|
|`cron/`|计划任务|订阅检查、清理|
|`current-user/`|当前用户信息|个人资料、会话数据|
|`extract/`|网址提取|从 URL 中提取元数据|
|`favorites/`|收藏夹|添加、删除、列表|
|`featured-items/`|特色商品|列出活跃的特色项目|
|`geocode/`|地理编码|地址查找、反向地理编码|
|`health/`|健康检查|数据库和服务状态|
|`internal/`|内部运作|系统级端点|
|`items/`|项目数据|列表、详细信息、搜索|
|`lemonsqueezy/`|挤柠檬|Webhook 处理程序|
|`location/`|位置数据|附近商品、位置搜索|
|`payment/`|支付操作|结帐、付款方式|
|`polar/`|极地|Webhook 处理程序|
|`reference/`|参考数据|枚举、查找值|
|`reports/`|内容报告|提交、审核报告|
|`solidgate/`|固体门|Webhook 处理程序|
|`sponsor-ads/`|赞助商广告|增删改查、激活|
|`stripe/`|条纹|Webhook 处理程序、结账|
|`surveys/`|调查|列出、回应、结果|
|`user/`|用户操作|个人资料、设置|
|`verify-recaptcha/`|验证码|令牌验证|
|`version/`|版本信息|应用程序版本和构建信息|

## 中间件

该应用程序使用 `next-intl` 中间件进行区域设置检测和路由。中间件处理：

1. **区域设置检测**：从 URL 路径、cookie 或 `Accept-Language` 标头确定用户的区域设置
2. **区域设置重定向**：将没有区域设置前缀的请求重定向到适当的区域设置
3. **默认区域设置**：当未检测到区域设置首选项时，回退为英语 (`en`)

中间件在`i18n/` 目录中进行配置，区域设置路由规则在`i18n/routing.ts` 中定义，请求处理在`i18n/request.ts` 中。

## 静态生成和动态路由

该模板使用多种数据获取策略：

- **静态生成**：隐私政策、服务条款、关于等页面都是静态生成的
- **动态渲染**：管理页面、仪表板和经过身份验证的页面动态渲染
- **ISR（增量静态再生）**：类别和标签列表页面使用 ISR 进行重新验证
- **站点地图生成**：`app/sitemap.ts` 从内容数据动态生成站点地图

`staticPageGenerationTimeout` 在 `next.config.ts` 中设置为 180 秒，以在构建期间容纳大型内容存储库。
