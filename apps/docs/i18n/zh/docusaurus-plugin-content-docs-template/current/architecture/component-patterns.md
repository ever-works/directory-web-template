---
id: component-patterns
title: 组件架构和模式
sidebar_label: 组件模式
sidebar_position: 7
---

# 组件架构和模式

Ever Works 模板使用基于功能的目录结构来组织其 React 组件，功能组件、共享组件和基本 UI 原语之间有明确的分离。

## 目录组织

`components/` 目录遵循功能优先的组织，其中每个主要域都有自己的子目录，以及共享和 UI 级组件。

```
components/
├── admin/              # Admin panel feature components
├── auth/               # Authentication feature components
├── billing/            # Billing and payment components
├── collections/        # Collection display components
├── context/            # React context providers
├── dashboard/          # Dashboard feature components
├── directory/          # Directory listing components
├── favorites/          # Favorites feature components
├── featured-items/     # Featured items display
├── filters/            # Search and filter components
├── footer/             # Footer components
├── header/             # Header and navigation
├── home-two/           # Alternate homepage layout
├── icons/              # Custom icon components
├── item-detail/        # Item detail page components
├── layout/             # Layout wrapper components
├── layouts/            # Layout variant components
├── maps/               # Map integration components
├── newsletter/         # Newsletter components
├── payment/            # Payment flow components
├── pricing/            # Pricing display components
├── profile/            # User profile components
├── profile-button/     # Profile button dropdown
├── providers/          # Provider wrapper components
├── settings/           # Settings panel components
├── shared/             # Shared reusable components
├── shared-card/        # Shared card components
├── sponsor-ads/        # Sponsor ad components
├── sponsorships/       # Sponsorship management components
├── submissions/        # Submission form components
├── submit/             # Item submit components
├── surveys/            # Survey components
├── tracking/           # Analytics tracking components
├── ui/                 # Base UI primitives
└── version/            # Version display components
```

## 基于特征的组件

每个功能目录包含与该域相关的所有组件。这使相关代码保持在同一位置，并且可以轻松找到给定功能的组件。

### 管理员/

包含所有管理面板组件，包括数据表、表单、模式和管理界面。这些是使用 `hooks/use-admin-*.ts` 中特定于管理员的挂钩的客户端组件。

### 授权/

身份验证组件包括登录表单、注册表单、密码重置流程、OAuth 按钮和电子邮件验证屏幕。

### 计费/

计费和订阅管理组件包括计划选择、付款方式表单、发票显示和订阅状态指示器。

### 过滤器/

跨列表页面使用的搜索和过滤组件。它们与 URL 搜索参数和 Zustand 过滤器状态交互以提供实时过滤。

### 定价/

定价页面组件包括计划比较卡、功能矩阵和结帐集成。

## 共享组件

### 共享/

`shared/` 目录包含跨多个功能使用的可重用组件。这些是与领域无关的构建块，将 UI 原语组合成功能模式。

### 共享卡/

共享卡片组件，用于在整个应用程序中以卡片布局显示项目、集合和其他内容。

## 根级组件

`components/` 的根目录下存在几个独立的组件文件：

|组件|目的|
|-----------|---------|
|`categories-grid.tsx`|类别的网格显示|
|`custom-hero.tsx`|可定制的英雄部分|
|`error-boundary.tsx`|带有后备 UI 的错误边界|
|`error-provider.tsx`|错误上下文提供者|
|`favorite-button.tsx`|最喜欢的切换按钮|
|`hero.tsx`|默认英雄部分|
|`item.tsx`|物品卡组件|
|`items-categories.tsx`|按类别组织的项目|
|`item-skeleton.tsx`|加载物品骨架|
|`item-tags.tsx`|项目的标签显示|
|`language-switcher.tsx`|区域设置切换组件|
|`layout-switcher.tsx`|网格/列表布局切换|
|`report-button.tsx`|内容报告按钮|
|`sort-menu.tsx`|排序选项下拉列表|
|`tags-cards.tsx`|标签卡展示|
|`tags-items.tsx`|按标签显示的项目|
|`theme-toggler.tsx`|浅色/深色主题切换|
|`universal-pagination.tsx`|可重用的分页组件|
|`view-toggle.tsx`|查看模式切换|

## UI 基元（组件/ui/）

`ui/` 目录包含提供设计系统基础的基础级 UI 组件。它们构建在 HeroUI（以前称为 NextUI）和 Tailwind CSS 之上。

关键 UI 原语包括：

|组件|描述|
|-----------|-------------|
|`button.tsx`|具有变体的按钮（主要、次要、幽灵等）|
|`card.tsx`|带有页眉、正文、页脚部分的卡片容器|
|`input.tsx`|支持验证的文本输入|
|`label.tsx`|表单标签组件|
|`modal.tsx`|带覆盖层的模态对话框|
|`select.tsx`|选择具有搜索功能的下拉菜单|
|`pagination.tsx`|页面导航组件|
|`badge.tsx`|状态徽章组件|
|`accordion.tsx`|可扩展的内容部分|
|`alert.tsx`|警报/通知横幅|
|`breadcrumb.tsx`|面包屑导航|
|`loading-spinner.tsx`|加载指示器|
|`password-strength.tsx`|密码强度计|
|`rating.tsx`|星级显示/输入|
|`infinity-scroll.tsx`|无限滚动包装|
|`searchable-select.tsx`|通过搜索过滤选择|
|`animations.tsx`|动画实用组件|
|`auth-illustrations.tsx`|授权页面插图|

## 服务器与客户端组件

该模板遵循服务器和客户端组件分离的 Next.js 约定：

### 服务器组件

服务器组件是 App Router 中的默认组件。它们用于：
- 页面布局和包装器
- 页面级别的数据获取
- 静态内容渲染
- SEO 关键内容

服务器组件主要存在于 `app/[locale]/` 页面和布局文件中。他们可以直接导入数据库查询函数和存储库方法。

### 客户端组件

客户端组件标有`'use client'`，用于：
- 交互式 UI 元素（表单、按钮、切换开关）
- 使用 React hooks 的组件（useState、useEffect、自定义 hooks）
- 使用浏览器 API 的组件
- 依赖于 React Query 或 Zustand 的组件

`components/` 目录中的大多数组件都是客户端组件，因为它们处理用户交互和状态。

## 上下文提供者

### 组件/上下文/

用于跨组件树共享状态的 React 上下文提供程序：
- 错误边界状态的错误上下文
- 用于运行时功能门控的功能标志上下文

### 组件/提供商/

组成多个提供者的提供者包装组件：
- 查询客户端提供商（TanStack Query）
- 主题提供者
- 会话提供者 (NextAuth)
- 吐司提供者

`app/[locale]/providers.tsx` 处的根提供程序包装器组成了应用程序所需的所有提供程序。

## 组件约定

1. **文件命名**：组件使用短横线大小写的文件名（例如`favorite-button.tsx`）
2. **导出模式**：组件使用命名导出，功能目录中的桶文件 (`index.ts`)
3. **挂钩共置**：特定于功能的挂钩位于顶级 `hooks/` 目录中，而不是在组件目录中
4. **样式**：组件使用 Tailwind CSS 实用程序类；有些使用 SCSS 模块来实现复杂的样式
5. **类型**：组件属性类型在 `types/` 目录内内联或相邻类型文件中定义
6. **图标**：自定义图标集中在`components/icons/`；标准图标使用`lucide-react`
