---
id: features
title: 平台特色
sidebar_label: 特点
sidebar_position: 3
---

# 平台特色

本文档按功能区域组织，全面概述了 Ever Works 平台中可用的所有功能。

## 用户认证和账户管理

### 用户注册

**说明**：允许新用户在平台上创建帐户。

**它是如何工作的**：

- 用户可以通过电子邮件/密码或 OAuth 提供商（Google、GitHub、Facebook、Twitter）进行注册
- 注册时发送电子邮件验证
- 密码在存储之前使用 bcrypt 进行哈希处理
- 成功注册后，将自动创建客户资料

**用户流程**：

1. 用户点击主页上的“注册”
2. 选择注册方法（电子邮件或 OAuth）
3. 填写必填信息（姓名、电子邮件、密码）
4. 收到验证邮件
5. 点击验证链接激活帐户
6. 重定向至客户端仪表板

**关键文件**：`/lib/auth/index.ts`、`/app/[locale]/auth/`

[了解有关身份验证设置的更多信息 →](/authentication/setup-guide)

---

### User Login

**Description**: Authenticates existing users to access their accounts.

**How it works**:

- Supports credential-based login (email/password)
- Supports OAuth login via multiple providers
- Creates JWT session token valid for 30 days
- Session refreshes automatically after 24 hours of activity
- Admins are redirected to admin portal; clients to client portal

**Security features**:

- Password hashing with bcrypt
- ReCAPTCHA integration for bot prevention
- Session invalidation on logout
- Automatic session expiration

**Key files**: `/lib/auth/index.ts`, `/app/[locale]/auth/signin/`

---

### 密码管理

**说明**：允许用户更改或重置其密码。

**特点**：

- **更改密码**：经过身份验证的用户可以从设置中更新其密码
- **忘记密码**：用户收到带有重置链接的电子邮件
- **重置令牌**：用于安全密码重置的限时令牌

**它是如何工作的**：

1. 用户请求重置密码
2. 系统生成存储在`passwordResetTokens`表中的安全令牌
3. 发送带有包含令牌的重置链接的电子邮件
4. 用户单击链接并输入新密码
5. Token使用后失效

**关键文件**：`/app/api/auth/change-password/`、`/lib/db/schema.ts`

---

## Item Listing & Discovery

### Item Browsing

**Description**: The core feature allowing users to browse and discover items on the platform.

**How it works**:

- Items are loaded from Git-based CMS (`.content` folder)
- Supports pagination with configurable page sizes
- Two view modes: "classic" grid and "alternative" layout
- Real-time filtering without page reload

**Display options**:

- Grid layout with thumbnails
- List layout with descriptions
- Sorting by popularity, date, or name

**Key files**: `/app/[locale]/(listing)/listing.tsx`, `/components/globals-client.tsx`

---

### 搜索和过滤

**描述**：使用户能够使用各种条件查找特定项目。

**过滤器类型**：

- **文本搜索**：跨项目名称和描述的全文搜索
- **类别过滤器**：按单个或多个类别过滤
- **标签过滤器**：按分配给项目的标签进行过滤
- **组合过滤器**：同时应用多个过滤器

**它是如何工作的**：

1. 过滤器存储在 URL 参数中以实现共享
2. `FilterProvider` 上下文管理过滤器状态
3. `FilterURLParser` 将 URL 与过滤器状态同步
4. 项目在服务器端过滤并返回给客户端

**用户体验**：

- 过滤器保留在 URL 中（可添加书签/可共享）
- 实时结果更新
- 清除所有过滤选项

**关键文件**：`/components/filter-provider.tsx`、`/components/filter-url-parser.tsx`

---

### Category Navigation

**Description**: Hierarchical organization of items into categories.

**Features**:

- Nested category structure (parent/child)
- Category pages with item listings
- Category icons and descriptions
- Breadcrumb navigation

**How it works**:

- Categories stored in `.content/categories/` as markdown files
- Support for multi-level hierarchy
- Can be enabled/disabled via admin settings
- Reorderable via admin panel

**Key files**: `/app/[locale]/categories/`, `/lib/services/category-git.service.ts`

---

### 标签系统

**描述**：跨类别项目组织的平面分类法。

**特点**：

- 每个项目有多个标签
- 标签云展示
- 基于标签的过滤
- 可以通过管理设置启用/禁用

**它是如何工作的**：

- 标签作为 Markdown 文件存储在 `.content/tags/` 中
- 与项目的多对多关系
- 可点击的标签过滤项目列表

**关键文件**：`/app/[locale]/tags/`、`/lib/services/tag-git.service.ts`

---

## Item Engagement Features

### Voting System

**Description**: Allows users to upvote or downvote items.

**How it works**:

1. User clicks vote button on item
2. System checks if user is authenticated
3. Checks for existing vote and updates or creates new vote
4. Vote count updates in real-time
5. Stores vote in `votes` table with timestamp

**Rules**:

- One vote per user per item
- Users can change vote direction
- Users can remove their vote
- Vote counts displayed on item cards

**Key files**: `/hooks/use-item-vote.ts`, `/app/api/items/[slug]/votes/`

---

### 评级系统

**描述**：用户可以按 1-5 星等级对项目进行评分。

**它是如何工作的**：

- 评分是评论系统的一部分
- 每条评论都可以包含评级
- 计算并显示平均评分
- 显示评级分布（5 星级、4 星级等的数量）

**显示**：

- 显示平均评分的星形图标
- 星星旁边的评分计数
- 项目详细信息页面中的评级细分

**关键文件**：`/hooks/use-item-rating.ts`、`/lib/db/schema.ts`（注释表）

---

### Comments System

**Description**: Users can leave comments and reviews on items.

**Features**:

- Text comments with optional rating
- Edit own comments
- Delete own comments
- Admin moderation capabilities
- Threaded replies (if enabled)

**How it works**:

1. User writes comment on item detail page
2. Optionally selects star rating (1-5)
3. Comment stored in `comments` table linked to user's client profile
4. Comments displayed in chronological or relevance order
5. Admin can delete inappropriate comments

**Moderation**:

- Admin can view all comments in admin panel
- Delete functionality for inappropriate content
- Report system triggers admin notification

**Key files**: `/hooks/use-comments.ts`, `/app/api/items/[slug]/comments/`

---

### 收藏夹系统

**说明**：用户可以将项目保存到自己的收藏夹列表中以便快速访问。

**它是如何工作的**：

1. 用户点击项目上的心形/最喜欢的图标
2. 项目已添加到 `favorites` 表
3. 可从用户的个人资料访问收藏夹
4. 切换操作（再次单击可删除）

**特点**：

- 客户端门户中的收藏夹列表
- 快速不喜欢的动作
- 收藏夹计数项目（可选）
- 导出收藏夹列表

**关键文件**：`/hooks/use-favorites.ts`、`/app/api/favorites/`、`/app/[locale]/favorites/`

---

## Featured Items

**Description**: Admin-curated items displayed prominently on the homepage.

**How it works**:

1. Admin selects items to feature from admin panel
2. Sets display order for featured items
3. Featured items appear in dedicated section on homepage
4. Can set expiration date for featured status

**Features**:

- Manual ordering/ranking
- Separate from algorithmic popularity
- Highlighted display on homepage
- Configurable number of featured items

**Key files**: `/hooks/use-admin-featured-items.ts`, `/app/api/admin/featured-items/`

---

## 项目提交

**描述**：允许用户向平台提交新项目。

**它是如何工作的**：

1. 用户导航到提交页面
2. 填写项目详细信息（名称、描述、URL、徽标）
3. 选择类别和标签
4. 提交审核
5. 管理员收到新提交的通知
6. 管理员审核并批准/拒绝
7. 批准的项目出现在平台上

**表单字段**：

- 商品名称（必填）
- 描述（必填）
- 网站网址
- 标志/图片上传
- 品类选择
- 标签选择
- 附加元数据

**工作流程状态**：

- 草案 → 待审核 → 批准/拒绝

**关键文件**：`/app/[locale]/submit/`、`/app/api/admin/items/[id]/review/`

---

## Survey System

**Description**: Create and manage surveys for collecting user feedback.

**Types**:

- **Global surveys**: Available to all users
- **Item-specific surveys**: Attached to specific items

**Question types** (via SurveyJS):

- Multiple choice
- Text input
- Rating scales
- Matrix questions
- File upload

**Features**:

- Survey preview before publishing
- Response analytics
- Export to CSV/Excel
- Anonymous or authenticated responses

**Key files**: `/lib/services/survey.service.ts`, `/app/api/surveys/`

[Learn more about surveys →](/guides/survey-system)

---

## 订阅及支付系统

**描述**：通过基于订阅的访问或高级功能获利。

**支持的提供商**：

- **Stripe**：完整的订阅管理、发票、客户门户
- **LemonSqueezy**：具有税务合规性的替代支付处理器

**它是如何工作的**：

1. 支付提供商 (Stripe/LemonSqueezy) 中定义的计划
2. 用户在定价页面上选择计划
3. 重定向至支付提供商结帐
4. Webhook处理成功支付
5. 在数据库中创建订阅记录
6. 用户可以使用高级功能

**关键文件**：`/app/api/stripe/`、`/app/api/lemonsqueezy/`

[了解有关支付集成的更多信息 →](/ payment)

---

## User Profile Management

**Description**: Users can manage their personal information and preferences.

**Basic Profile Information**:

- Name, email, avatar
- Bio and social links
- Notification preferences
- Privacy settings

**Features**:

- Profile editing
- Avatar upload
- Email change with verification
- Account deletion

**Key files**: `/app/[locale]/profile/`, `/app/api/profile/`

---

## 通知系统

**描述**：系统生成的重要事件通知。

**通知类型**：

- 对用户项目的新评论
- 订阅更新
- 管理员公告
- 项目批准/拒绝

**发货渠道**：

- 应用内通知
- 电子邮件通知（通过 Resend/Novu）
- 推送通知（可选）

**关键文件**：`/lib/services/notification.service.ts`、`/app/api/notifications/`

---

## Company Profiles

**Description**: Manage company entities associated with items.

**Features**:

- Company name, logo, description
- Link multiple items to a company
- Company detail pages
- Company directory

**Key files**: `/app/[locale]/companies/`, `/lib/services/company.service.ts`

---

## CRM集成（二十个CRM）

**描述**：与 Twenty CRM 同步平台数据以进行客户关系管理。

**特点**：

- 根据用户注册自动创建联系人
- 同步用户活动和交互
- 跟踪订阅和付款
- 自定义字段映射
- 基于Webhook的同步

**关键文件**：`/lib/services/crm.service.ts`、`/app/api/webhooks/crm/`

---

## Analytics & Reporting

**Description**: Track platform usage and generate reports.

**Analytics providers**:

- **PostHog**: Product analytics, feature flags, session recording
- **Sentry**: Error tracking, performance monitoring
- **Vercel Analytics**: Core Web Vitals

**Tracked events**:

- Page views
- Item interactions (views, votes, favorites)
- User registrations and logins
- Subscription events
- Error occurrences

**Key files**: `/lib/analytics/`, `/lib/error-tracking/`

---

## 国际化（i18n）

**描述**：平台的多语言支持。

**支持的语言**：超过 13 种语言，包括英语、法语、西班牙语、中文、德语、阿拉伯语 (RTL) 等。

**特点**：

- 自动区域设置检测
- 基于 URL 的区域设置切换
- 对阿拉伯语的 RTL 支持
- 每个区域设置的日期/数字格式
- 复数规则

**关键文件**：`/messages/`、`/lib/i18n/`、`/middleware.ts`

[了解更多关于国际化的信息 →](/国际化)

---

## Content Management

**Description**: Git-based CMS for managing items, categories, and tags.

**How it works**:

- Content stored in `.content` folder
- Synced from external Git repository
- Markdown files with frontmatter
- Version control via Git
- Collaborative editing

**Content types**:

- Items (`.content/items/`)
- Categories (`.content/categories/`)
- Tags (`.content/tags/`)
- Pages (`.content/pages/`)

**Key files**: `/lib/services/*-git.service.ts`, `/lib/git/`

---

## 管理仪表板

**描述**：管理员监控和管理平台的中央枢纽。

**仪表板小部件**：

- 用户、项目、订阅总数
- 最近的活动提要
- 待提交的内容
- 系统健康状态
- 分析概述

**主要特点**：

- 实时统计
- 快速行动
- 系统通知
- 绩效指标

**关键文件**：`/app/[locale]/admin/dashboard/`

---

## User & Role Management

**Description**: Admin management of user accounts and permissions.

**User Management**:

- View all users
- Edit user profiles
- Suspend/activate accounts
- Reset passwords
- View user activity

**Role Management**:

- Admin role (full access)
- Client role (standard user)
- Custom roles (extensible)

**Key files**: `/app/[locale]/admin/users/`, `/lib/auth/roles.ts`

---

## 客户管理

**描述**：客户档案的管理员管理。

**特点**：

- 查看所有客户资料
- 编辑客户信息
- 将客户与公司联系起来
- 查看客户提交的内容
- 管理客户订阅

**关键文件**：`/app/[locale]/admin/clients/`、`/app/api/admin/clients/`

---

## Content Moderation

**Description**: Admin tools for reviewing and moderating user-generated content.

**Item Review**:

- Approve/reject submitted items
- Edit item details
- Feature/unfeature items
- Delete items

**Comment Moderation**:

- View all comments
- Delete inappropriate comments
- Ban users for violations

**Key files**: `/app/[locale]/admin/moderation/`, `/app/api/admin/items/[id]/review/`

---

## 设置管理

**描述**：平台范围的配置选项。

**设置类别**：

- **一般**：网站名称、描述、徽标
- **功能**：启用/禁用功能（类别、标签、投票等）
- **电子邮件**：SMTP 配置、电子邮件模板
- **付款**：Stripe/LemonSqueezy API 密钥
- **分析**：PostHog、Sentry 配置
- **安全**：ReCAPTCHA、速率限制

**关键文件**：`/app/[locale]/admin/settings/`、`/lib/config/`

---

## Data Export

**Description**: Export platform data for analysis or backup.

**Export formats**:

- CSV
- JSON
- Excel

**Exportable data**:

- Users
- Items
- Comments
- Subscriptions
- Survey responses

**Key files**: `/app/api/admin/export/`

---

## 附加功能

### 电子邮件模板

可定制的电子邮件模板用于：

- 欢迎电子邮件
- 密码重置
- 邮箱验证
- 订阅确认
- 时事通讯

[了解有关电子邮件模板的更多信息 →](/guides/email-templates)

### 主题系统

多个预建主题：

- EverWorks（默认）
- 企业
- 材质
- 搞笑

[了解有关主题的更多信息 →](/guides/theming)

### 动态色彩系统

从基色自动生成调色板（色调 50-950）。

[了解有关动态颜色的更多信息 →](/guides/dynamic-colors)

### 响应式测试

跨设备测试指南和最佳实践。

[了解有关测试的更多信息→](/开发/测试)

---

## Feature Summary

| Category | Features |
|----------|----------|
| **Authentication** | Registration, Login, OAuth, Password Reset |
| **Discovery** | Browsing, Search, Filtering, Categories, Tags |
| **Engagement** | Voting, Rating, Comments, Favorites |
| **Submission** | User submissions, Admin review, Approval workflow |
| **Monetization** | Stripe, LemonSqueezy, Subscriptions |
| **User Management** | Profiles, Notifications, Preferences |
| **Admin Tools** | Dashboard, Moderation, Settings, Export |
| **Integrations** | CRM, Analytics, Email, Surveys |
| **Customization** | Themes, Colors, i18n, Email templates |

---

## 下一步

- [Tech Stack](./tech-stack) - 探索技术堆栈
- [架构概述](./overview) - 了解架构

## 资源

- [开发设置](/development/local-setup) - 设置您的环境
- [部署指南](/deployment/overview) - 部署到生产环境
- [API 文档](/development/api-documentation) - API 参考
