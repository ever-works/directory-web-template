---
id: architecture
title: 架构概述
sidebar_label: 概述
sidebar_position: 0
---

# 架构概述

此页面提供了 Ever Works 模板架构的高级地图。在深入了解接下来的详细页面之前，请先将其作为起点。

## 技术基础

该模板是一个 **Next.js 16** 应用程序，使用 **App Router** 和 **React 19**。它为容器化部署生成 `standalone` 输出，并在 `next.config.ts` 中应用多个框架级优化：

|图层|技术|目的|
|---|---|---|
|**框架**|Next.js 16（应用程序路由器）|服务器和客户端渲染、路由、API 路由|
|**用户界面**|React 19、HeroUI、Radix UI、Tailwind CSS 4|组件库、基元、样式|
|**数据库**|Drizzle ORM + PostgreSQL（或本地 SQLite）|模式管理、迁移、查询|
|**身份验证**|NextAuth.js v5（测试版）|具有会话缓存的多提供商身份验证|
|**国际化**|下一个国际|区域设置感知路由和消息包|
|**付款**|Stripe、Polar、LemonSqueezy、Solidgate|订阅和一次性付款流程|
|**内容**|基于 Git 的 CMS（`.content/` 目录）|从数据存储库克隆的 Markdown/YAML 内容|
|**监控**|Sentry、PostHog、Vercel 分析|错误跟踪、产品分析、性能|
|**电子邮件**|重新发送|交易电子邮件传送|
|**富文本**|提普塔普|用于管理内容的所见即所得编辑器|

## 项目结构

该模板遵循分层的、基于功能的组织。以下是顶级目录及其职责：

```text
template/
  app/              # Next.js App Router -- routes and layouts
    [locale]/       # Locale-prefixed pages (i18n)
      admin/        # Admin dashboard pages
      auth/         # Authentication flows
      dashboard/    # Client dashboard
      items/        # Item detail pages
      categories/   # Category browsing
      ...
    api/            # API route handlers
  components/       # Shared React components (UI, layout, features)
  lib/              # Core logic -- the heart of the application
    auth/           # Authentication providers, guards, session caching
    db/             # Drizzle schema, migrations, seed, queries
    middleware/     # Permission checks and middleware utilities
    repositories/  # Data-access layer (database queries)
    services/      # Business logic services
    payment/       # Payment provider integrations
    mail/           # Email templates and sending
    analytics/     # Analytics tracking layer
    config/        # Centralized configuration service
    validations/   # Zod schemas for input validation
    utils/         # General utility functions
    ...
  hooks/            # Custom React hooks (React Query wrappers, UI logic)
  constants/        # Application-wide constants
  types/            # Shared TypeScript type definitions
  i18n/             # Internationalization setup and locale request config
  messages/         # Translation message files (JSON per locale)
  e2e/              # Playwright end-to-end tests
  scripts/          # Build, seed, migration, and utility scripts
  public/           # Static assets
```

有关完整的目录演练，请参阅[项目结构](/architecture/project-struct) 页面。

## 分层架构

代码库在三个层之间强制明确关注点分离：

### 表示层

`components/` 中的 React 组件和 `app/[locale]/` 中的页面文件处理渲染和用户交互。服务器组件直接获取数据；客户端组件使用 `hooks/` 中的 React Query 挂钩来获取客户端状态。

### 业务逻辑层

`lib/services/` 中的服务包含核心业务规则。该模板附带 30 多个服务文件，涵盖分析、订阅、审核、CRM 同步、地理编码、通知等。服务由 API 路由处理程序和服务器组件调用，但绝不会直接由浏览器中的 UI 代码调用。

### 数据访问层

`lib/repositories/` 中的存储库使用 Drizzle ORM 封装所有数据库查询。每个域实体（项目、类别、集合、用户、角色、标签、赞助商广告）都有自己的存储库文件。这使得 SQL 级别的详细信息远离服务层。

要更深入地了解这些层之间的数据流，请参阅[数据流](/architecture/data-flow)。

## Next.js 应用程序路由器和路由

所有面向用户的路由都位于 `app/[locale]/` 下，这可以通过 `next-intl` 开箱即用地启用区域设置前缀 URL。该应用程序使用多个 App Router 功能：

- **布局** -- 用于管理、客户端仪表板和公共区域的嵌套 `layout.tsx` 文件。
- **路由组** -- `(listing)` 组处理主目录列表和标签浏览，而不影响 URL 结构。
- **动态路由** -- `[page]`、`[...tag]` 以及项目、类别和集合的命名段。
- **重写** - 在 `next.config.ts` 中定义，将裸类别路径重定向到其分页发现视图。

有关完整的路线图，请参阅[路由](/architecture/routing)。

## 认证系统

身份验证基于 **NextAuth.js v5** 构建，并在 `lib/auth/` 中提供提供程序配置系统。项目根目录下的 `auth.config.ts` 文件编排：

- **OAuth 提供程序** - Google 和 GitHub，通过环境变量进行配置并动态启用/禁用。
- **凭证提供者** -- 使用 bcrypt 哈希进行电子邮件/密码身份验证。
- **Supabase 适配器** -- 可选的 Supabase 支持的会话存储。
- **会话缓存** -- `lib/auth/cached-session.ts` 减少了冗余会话查找。
- **警卫系统** -- `lib/auth/guards.ts` 和 `lib/guards/` 在路由级别强制实施基于角色的访问。

有关警卫系统和基于角色的权限的详细信息，请参阅[警卫系统](/architecture/guards-system)和[权限系统](/architecture/permissions-system)。

## Drizzle ORM 和数据库

数据库层使用**Drizzle ORM**以及`lib/db/schema.ts`中定义的模式。关键方面：

- **迁移**使用 `drizzle-kit generate` 生成并使用 `drizzle-kit migrate` 应用。
- `lib/db/seed.ts` 和`scripts/cli-seed.ts` 中的**播种**脚本填充初始数据，包括角色。
- **配置**位于项目根目录的`drizzle.config.ts` 中。
- 生产环境需要 PostgreSQL；支持 SQLite 进行本地开发。

有关数据访问层的结构，请参阅[存储库模式](/architecture/repository-patterns)。

## 中间件链

该模板使用 Next.js 中间件（通过 `next.config.ts` 中应用的 `next-intl` 插件）与 `lib/middleware/permission-check.ts` 中的自定义权限检查相结合。中间件管道处理：

- 区域设置检测和路由
- 认证状态验证
- 基于角色的路由保护
- 安全标头（HSTS、CSP、X-Frame-Options 等 - 在 `next.config.ts` 中配置）

有关详细信息，请参阅[中间件](/architecture/middleware) 和[中间件深入探究](/architecture/middleware-deep-dive)。

## 配置和安全

`next.config.ts` 文件设置了多个安全和性能默认值：

- **独立输出**适用于 Docker 友好的部署。
- **安全标头**包括 Content-Security-Policy、HSTS、X-Content-Type-Options 和 X-Frame-Options。
- **图像优化**，具有远程模式支持和 SVG 安全策略。
- **Sentry 集成** 用作最外层的配置包装器以进行错误跟踪。
- **HeroUI 和 Lucide React 的包优化**，以减少包的大小。

## 详细架构页面

浏览这些页面以更深入地了解各个系统：

|页面|它涵盖什么|
|---|---|
|[技术堆栈](/architecture/tech-stack)|完整的依赖项清单和版本详细信息|
|[项目结构](/architecture/project-struct)|逐个目录演练|
|[数据流](/架构/数据流)|从浏览器到数据库的请求生命周期|
|[路由](/架构/路由)|App Router 结构和 URL 模式|
|[组件模式](/architecture/component-patterns)|服务器与客户端组件、组合模式|
|[状态管理](/architecture/state-management)|React 查询、Zustand 和服务器状态|
|[API层](/architecture/api-layer)|REST API 设计和路由处理程序模式|
|[中间件](/架构/中间件)|中间件管道和请求处理|
|[警卫系统](/architecture/guards-system)|路由级别基于角色的访问控制|
|[权限系统](/architecture/permissions-system)|细粒度的权限定义|
|[存储库模式](/architecture/repository-patterns)|数据访问层约定|
|[验证模式](/architecture/validation-patterns)|Zod 模式和输入验证|
|[主题系统](/architecture/theme-system)|主题架构和色彩管理|
|[色彩系统](/architecture/color-system)|动态颜色生成管道|
|[SEO系统](/architecture/seo-system)|元数据、站点地图和结构化数据|
|[支付库](/architecture/ payment-library)|多提供商支付集成|
|[内容库](/architecture/content-library)|基于 Git 的 CMS 内容管道|
|[编辑器系统](/architecture/editor-system)|Tiptap 富文本编辑器集成|
|[映射器模式](/architecture/mapper-patterns)|层间数据转换|
|[错误边界](/architecture/error-boundaries)|错误处理和恢复|
|[分析层](/architecture/analytics-layer)|事件跟踪和分析管道|
|[Swagger 系统](/architecture/swagger-system)|OpenAPI 文档生成|

## 下一步去哪里

- **项目新手？** 从[入门](/getting-started)开始安装并运行模板。
- **准备好自定义了吗？** 跳转到[指南](/guides) 部分以获取分步教程。
- **想要完整的技术清单吗？** 请参阅[技术堆栈](/architecture/tech-stack)。

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
