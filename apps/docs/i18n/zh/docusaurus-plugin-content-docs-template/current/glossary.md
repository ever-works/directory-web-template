---
id: glossary
title: 术语表
sidebar_label: 术语表
---

# 术语表

Directory Web Template 文档中使用的关键术语和概念。

## 核心领域概念

### 目录

围绕特定主题或细分领域的有组织条目（项目）集合。目录是顶级实体。示例："SaaS 工具目录"、"开发者资源目录"或"本地商业目录"。

### 项目

目录中的单个条目或列表。项目代表一个被编目的实体（工具、业务、资源或服务）。项目具有结构化字段（名称、描述、URL、徽标），属于类别，并可以被打标签。

### 类别

用于组织项目的层级分类。类别形成树状结构（父/子关系），并提供主要的导航和过滤机制。

### 标签

附加到项目上用于横向分类的平面、非层级标签。标签用于次要过滤和发现。一个项目可以有多个标签，如"open-source"、"freemium"或"API-available"。

### 集合

不依赖类别或标签的精选项目分组。集合是用户定义或编辑精选的集合，例如"精选 Top 10"或"本月新品"。

### 分类体系

目录的整体分类系统，涵盖类别、标签和任何其他组织结构。

### Slug

从实体名称派生的 URL 友好型、人类可读的标识符。Slug 在 URL 中代替数字 ID 使用。例如，"Visual Studio Code" 变为 `visual-studio-code`。

## 架构模式

### Repository（仓储）

封装特定实体数据库查询和变更的数据访问层类。Repository 抽象了 Drizzle ORM 并为服务提供干净的接口。位于 `lib/repositories/`。

### Service（服务）

跨仓储、外部 API 和其他服务编排操作的业务逻辑层类。服务包含核心应用逻辑，由 API 路由处理器调用。位于 `lib/services/`。

### Webhook

由事件触发的 HTTP 回调。Template 使用 webhook 接收支付提供商通知（Stripe、LemonSqueezy、Polar）和部署状态更新。Webhook 端点使用签名或共享密钥验证传入请求。

## 内容管理

### 基于 Git 的 CMS

Template 使用的内容管理方式。目录数据（项目、类别、元数据）以结构化文件（YAML、Markdown）存储在 Git 仓库中。Template 在构建时克隆此仓库并从本地文件系统读取内容。更改通过提交和 pull request 进行。

### Community PR（社区 PR）

社区成员提交的用于在目录的 Git CMS 仓库中添加或更新项目的 pull request。社区 PR 在合并前需经过审查流程。

## 数据库

### Drizzle ORM

Template 使用的轻量级、TypeScript 优先的 ORM。Drizzle 提供具有完整类型安全性的类 SQL 查询构建器。架构定义以 TypeScript 代码编写，迁移通过 Drizzle Kit 生成为纯 SQL 文件。

### 迁移

版本化的数据库架构更改。迁移通过 `pnpm db:generate` 生成，通过 `pnpm db:migrate` 应用。迁移文件存储在 `lib/db/migrations/` 中。

## 身份验证

### NextAuth.js

Template 使用的身份验证库（v5）。它通过会话管理和 JWT 令牌为多个提供商（Google、GitHub、Facebook、Twitter、Microsoft）提供 OAuth 支持。

### Supabase Auth

Template 支持的替代身份验证后端。Supabase Auth 通过 Supabase 的托管服务提供邮箱/密码身份验证、魔法链接和社交 OAuth。

## 支付

### 订阅

通过受支持的支付提供商之一（Stripe、LemonSqueezy 或 Polar）管理的定期付款安排。Template 处理订阅的创建、管理和 webhook 处理。

## 部署

### Vercel

Template 的主要部署平台。Vercel 为 Next.js 应用提供零配置部署，包括自动预览部署、边缘函数和 CDN 分发。

### Docker

替代部署方法。Template 可以容器化并部署到任何兼容 Docker 的托管环境。
