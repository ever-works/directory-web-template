---
id: cron-jobs
title: Cron 任务配置
sidebar_label: Cron 任务
sidebar_position: 8
---

# Cron 任务配置

Ever Works 模板支持三种后台任务调度机制，根据运行环境自动选择。

## 工作原理

### 机制优先级

```typescript
// Priority order (highest to lowest):
// 1. Trigger.dev  — when TRIGGER_SECRET_KEY is set
// 2. Vercel Crons — when VERCEL=1 (auto-set by Vercel platform)
// 3. Local setInterval — fallback for development
```

### 环境自动检测

系统会自动检测正确的机制：

- **Trigger.dev**：当 `TRIGGER_SECRET_KEY` 已设置时
- **Vercel Crons**：当 `VERCEL=1` 时（由 Vercel 自动设置）
- **Local setInterval**：其他所有情况（本地开发）

## 已注册的任务

系统中注册了三个 cron 任务：

| 任务 | Endpoint | 调度 | 用途 |
|------|----------|------|------|
| 仓库同步 | `/api/cron/sync` | `*/5 * * * *` | 每 5 分钟同步内容 |
| 续订提醒 | `/api/cron/subscription-reminders` | `0 9 * * *` | 每天 9:00 发送提醒邮件 |
| 过期清理 | `/api/cron/subscription-expiration` | `0 0 * * *` | 午夜处理过期订阅 |

## Vercel Crons 配置

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### CRON_SECRET 环境变量

为了安全起见，Vercel 会使用 `Authorization` 请求头对每次 cron 调用进行签名。两端使用相同的密钥：

```bash
# In Vercel project settings (Environment Variables)
CRON_SECRET=your-secret-here  # openssl rand -base64 32
```

每个 API 端点都会验证密钥：

```typescript
// app/api/cron/sync/route.ts
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

## 验证

### 第 1 步：Vercel 控制台

```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

确认 3 个 cron 任务均显示正确的调度。

### 第 2 步：调用日志

```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```

### 第 3 步：应用日志

应用启动时：
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

每次同步时：
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

### 第 4 步：手动测试

```bash
curl -X GET https://yourdomain.com/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

预期响应：
```json
{
  "success": true,
  "message": "Sync completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": 1234
}
```

## 故障排除

### 任务未运行

1. 确认 `vercel.json` 列出了全部 3 个 cron 任务
2. 确认 `CRON_SECRET` 已在 Vercel 环境变量中设置
3. 确认 Trigger.dev 变量**未设置**（否则将优先使用）

### 401 未授权错误

```bash
# 生成新密钥
openssl rand -base64 32

# 添加到 Vercel
vercel env add CRON_SECRET

# 重新部署
vercel --prod
```

### 执行频率过高

检查 `vercel.json` 中是否有重复条目——每个路径只能出现一次。

## 迁移指南

### 本地 → Vercel Crons

1. 在 `vercel.json` 中添加 cron 条目
2. 生成并设置 `CRON_SECRET`
3. 重新部署到 Vercel

### Vercel → Trigger.dev

```bash
# Install Trigger.dev
pnpm add @trigger.dev/sdk

# Set the environment variable
TRIGGER_SECRET_KEY=your-trigger-secret

# Deploy your trigger jobs
npx trigger.dev@latest deploy
```

### Trigger.dev → Vercel Crons

```bash
# Remove Trigger.dev environment variables
vercel env rm TRIGGER_SECRET_KEY
vercel env rm TRIGGER_API_KEY

# Redeploy
vercel --prod
```
