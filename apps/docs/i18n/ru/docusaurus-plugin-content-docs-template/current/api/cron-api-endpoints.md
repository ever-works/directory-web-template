---
id: cron-api-endpoints
title: Cron API 端点
sidebar_label: 定时任务API
sidebar_position: 59
---

# Cron API 端点

Cron API 提供由 Vercel Cron、外部调度程序或内部 `BackgroundJobManager` 触发的计划作业端点。所有 cron 端点都需要使用 `Authorization` 标头中的 `Bearer` 令牌通过 `CRON_SECRET` 环境变量进行身份验证。

**源码目录：** `template/app/api/cron/`

---

## Authentication

Cron endpoints use a shared secret for authorization:

- **Production:** The `CRON_SECRET` environment variable must be set. Requests must include `Authorization: Bearer <CRON_SECRET>`.
- **Development:** If `CRON_SECRET` is not configured, access is allowed without authentication for a frictionless local development experience.
- **Security:** All cron endpoints use `crypto.timingSafeEqual()` for constant-time comparison to prevent timing attacks.

**Unauthorized response (401):**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## Vercel Cron 配置

cron 计划在 `vercel.json` 中定义：

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
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

|职位|时间表|描述|
|-----|----------|-------------|
|内容同步|世界标准时间 (UTC) 每天凌晨 3:00|同步来自基于 Git 的 CMS 的内容|
|订阅提醒|世界标准时间 (UTC) 每天上午 9:00|发送续订提醒电子邮件|
|订阅到期|世界标准时间 (UTC) 每日午夜|处理过期的订阅|

---

## Content Sync

Triggers a content synchronization from the Git-based CMS repository.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/cron/sync` |
| **Auth** | `CRON_SECRET` (Bearer token) |
| **Source** | `cron/sync/route.ts` |

### Response

**Status 200** -- Sync completed successfully.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Status 500** -- Sync failed.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the sync succeeded |
| `timestamp` | `string` (ISO 8601) | When the sync completed |
| `duration` | `number` | Duration in milliseconds |
| `message` | `string` | Human-readable status message |
| `details` | `string` (optional) | Additional details on failure |

### Response Headers

All responses include `Cache-Control: no-cache, no-store, must-revalidate` to prevent caching of sync results.

### curl Example

```bash
curl -s http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## 订阅到期

通过将过期订阅的状态从 `active` 更新为 `expired` 并发送通知电子邮件来查找和处理过期订阅。

|财产|价值|
|----------|-------|
|**方法**|`GET`、`POST`|
|**路径**|`/api/cron/subscription-expiration`|
|**授权**|`CRON_SECRET`（不记名代币）|
|**来源**|`cron/subscription-expiration/route.ts`|

### 回应

**状态 200** -- 处理成功。

```json
{
  "success": true,
  "message": "Processed 3 expired subscriptions",
  "data": {
    "processed": 3,
    "affectedUsers": [
      {
        "subscriptionId": "sub_abc123",
        "userId": "user_456",
        "planId": "standard"
      }
    ],
    "errors": [],
    "timestamp": "2024-01-20T00:00:05.123Z"
  }
}
```

|领域|类型|描述|
|-------|------|-------------|
|`data.processed`|`number`|更新为过期的订阅数量|
|`data.affectedUsers`|`array`|受影响的订阅列表（无 PII）|
|`data.errors`|`string[]`|任何非致命错误（例如电子邮件发送失败）|
|`data.timestamp`|`string`|处理时间戳|

### 加工步骤

1. 查找超过结束日期的有效订阅。
2. 将状态从 `active` 更新为 `expired`。
3. 通过电子邮件服务发送到期通知电子邮件。
4. 返回摘要 - 电子邮件失败不会导致整个作业失败。

### 卷曲示例

```bash
# Via GET
curl -s http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"

# Via POST (also supported for manual triggers)
curl -s -X POST http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Subscription Reminders

Sends renewal reminder emails to users with subscriptions nearing their renewal date.

| Property | Value |
|----------|-------|
| **Methods** | `GET`, `POST` |
| **Path** | `/api/cron/subscription-reminders` |
| **Auth** | `CRON_SECRET` (Bearer token) |
| **Source** | `cron/subscription-reminders/route.ts` |

### Response

**Status 200** -- Job completed successfully.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Status 207** -- Job completed with partial errors (Multi-Status).

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

### curl Example

```bash
curl -s http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## 后台作业初始化

后台作业模块 (`cron/jobs/background-jobs-init.ts`) 不是 API 端点，而是用于在应用程序启动时配置调度模式的单例初始化模块。

**来源：** `cron/jobs/background-jobs-init.ts`

### 调度方式

|模式|描述|
|------|-------------|
|`vercel`|Vercel Cron 通过 `/api/cron/*` 端点处理的作业|
|`local`|内部调度程序（用于自托管部署）|
|`trigger-dev`|用于托管后台作业的 Trigger.dev 集成|
|`disabled`|后台同步已禁用 (`DISABLE_AUTO_SYNC=true`)|

### 用途

```typescript
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';

// Called once from layout.tsx -- safe to call multiple times
await ensureBackgroundJobsInitialized();
```

### 主要特点

- 使用 `globalThis` 作为单例状态，确保每个进程只运行一次初始化。
- 在测试 (`NODE_ENV=test`) 和构建 (`NEXT_PHASE=phase-production-build`) 期间跳过初始化。
- 失败的初始化会重置状态以允许在下次调用时自动重试。

---

## TypeScript Usage

```typescript
// Trigger content sync programmatically
async function triggerSync(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/sync', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();

  if (data.success) {
    console.log(`Sync completed in ${data.duration}ms`);
  } else {
    console.error('Sync failed:', data.message, data.details);
  }
}

// Check subscription expiration
async function processExpirations(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/subscription-expiration', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();
  console.log(`Processed ${data.data.processed} expirations`);

  if (data.data.errors.length > 0) {
    console.warn('Non-fatal errors:', data.data.errors);
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Production: Yes, Dev: No | Shared secret for cron endpoint authentication |
| `DISABLE_AUTO_SYNC` | No | Set to `true` to disable automatic content sync |
