---
id: overview
title: 部署概述
sidebar_label: 部署概述
sidebar_position: 1
---

# 部署概述

Ever Works 模板经过优化，可以部署到 **Vercel**，同时也支持任何 Node.js 兼容的平台。本指南涵盖生产就绪部署从准备到上线的全过程。

## 快速开始（Vercel 部署）

### 1. 先决条件

在部署之前，请确认以下内容：

- [ ] PostgreSQL 数据库（推荐 Neon 或 Supabase）
- [ ] 包含内容数据的 GitHub 数据仓库
- [ ] Vercel 账户（免费版即可开始）
- [ ] 已配置的环境变量（参考 [环境变量](./environment-variables) 指南）

### 2. 连接 Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Deploy to production
vercel --prod
```

或直接通过 Vercel 控制台连接 GitHub 仓库，以实现自动部署。

### 3. 必要的环境变量

```bash
# Core
AUTH_SECRET=<openssl rand -base64 32>
DATABASE_URL=postgresql://user:pass@host/db
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Cookies
COOKIE_SECRET=<openssl rand -base64 32>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# Cron
CRON_SECRET=<openssl rand -base64 32>
```

完整变量列表请参见 [环境变量](./environment-variables) 指南。

### 4. 数据库初始化

数据库会在应用首次启动时自动初始化。也可手动触发：

```bash
cd apps/web
pnpm db:migrate
pnpm db:seed
```

## 架构概览

```
┌─────────────────────────────────────────┐
│           Vercel Edge Network           │
│         (CDN + Load Balancing)          │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Next.js Application           │
│                                         │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  App Router │  │   API Routes     │  │
│  │  (RSC/ISR)  │  │  /api/**         │  │
│  └─────────────┘  └──────────────────┘  │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼────┐      ┌───────▼──────┐
│  Neon  │      │  Git CMS Repo │
│  (DB)  │      │  (Content)   │
└────────┘      └──────────────┘
```

## 部署模式

### 生产（Vercel）

- **CI/CD**：每次推送到主分支时自动部署
- **预览**：每个 Pull Request 自动创建预览 URL
- **Cron Jobs**：通过 `vercel.json` 管理的原生 Vercel Crons
- **Edge 网络**：全球内容分发和负载均衡

### 自托管

模板同样支持独立 Node.js 部署：

```bash
# Build
pnpm build

# Start
pnpm start
```

需要额外配置：Node.js >= 20.19.0、PostgreSQL、进程管理器（PM2 等）和反向代理（Nginx 等）。

## 关键服务

| 服务 | 用途 | 推荐 |
|------|------|------|
| **PostgreSQL** | 主数据库 | Neon、Supabase |
| **内容仓库** | Git CMS 数据 | GitHub（公开或私有）|
| **邮件** | 事务邮件 | Postmark、Resend |
| **支付** | 订阅 | Stripe、Lemon Squeezy |
| **错误追踪** | 监控 | Sentry |
| **分析** | 用户分析 | PostHog |

## 部署检查清单

### 首次部署

- [ ] 所有必要的环境变量皆已设置
- [ ] 数据库 URL 正确，数据库可访问
- [ ] `DATA_REPOSITORY` 指向有效的内容仓库
- [ ] `AUTH_SECRET` 已用强随机值设置
- [ ] `CRON_SECRET` 已设置用于保护 cron 端点
- [ ] `COOKIE_SECURE=true` 已为生产设置
- [ ] 支付 webhook 已配置（如使用支付功能）

### 每次部署

- [ ] 数据库迁移会在首次请求时自动运行
- [ ] Cron Jobs 出现在 Vercel 控制台
- [ ] 错误追踪（Sentry）工作正常
- [ ] 应用健康检查 `/api/health` 返回 200

## 详细指南

| 主题 | 文档 |
|------|------|
| 环境变量设置 | [环境变量](./environment-variables) |
| 数据库设置与迁移 | [数据库管理](./database-management) |
| Cron Jobs 设置 | [Cron Jobs](./cron-jobs) |
| Cron Jobs 验证 | [Cron 验证](./cron-verification) |
| 监控与告警 | [监控](./monitoring) |

## 快速参考

```bash
# Production deploy
vercel --prod

# Check logs
vercel logs

# Run DB migration (if needed)
cd apps/web && pnpm db:migrate

# Check environment variables
vercel env ls

# Health check
curl https://yourdomain.com/api/health
```
