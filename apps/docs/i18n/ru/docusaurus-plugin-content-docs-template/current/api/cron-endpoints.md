---
id: cron-endpoints
title: Cron 作业 API 端点
sidebar_label: Cron 端点
sidebar_position: 6
---

# Cron 作业 API 端点

该模板包括三个 cron 作业端点，它们通过 Vercel Cron 按计划的时间间隔运行。这些端点处理内容同步、订阅提醒和订阅过期处理。

## 计划任务配置

Cron 计划在 `vercel.json` 中定义：

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

## 内容同步 (`/api/cron/sync`)

|方法|路径|时间表|描述|
|--------|------|----------|-------------|
|`GET`|`/api/cron/sync`|世界标准时间 (UTC) 每天凌晨 3:00|同步基于 Git 的内容存储库|

### 它的作用

同步 cron 作业从配置的 Git 数据存储库 (`DATA_REPOSITORY`) 中提取最新内容并更新本地内容缓存。这确保应用程序反映直接对内容存储库所做的任何更改（例如，通过 GitHub PR 合并）。

### 同步过程

```
1. Verify CRON_SECRET authorization
2. Check if sync is already in progress (mutex lock)
3. Pull latest changes from remote Git repository
4. Parse and validate updated YAML content files
5. Update local content cache
6. Return sync result with duration
```

### 关键行为

- **互斥锁**：一次只能运行一个同步。并发请求被拒绝并显示状态消息
- **超时**：同步操作有 5 分钟超时，以防止进程失控
- **重试逻辑**：失败的同步重试最多 3 次
- **开发模式**：可以通过 `DISABLE_AUTO_SYNC=true` 环境变量禁用自动同步

### 回应

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## 订阅提醒 (`/api/cron/subscription-reminders`)

|方法|路径|时间表|描述|
|--------|------|----------|-------------|
|`GET`|`/api/cron/subscription-reminders`|世界标准时间 (UTC) 每天上午 9:00|发送订阅续订提醒|

### 它的作用

查询临近续订日期的订阅并向订阅者发送电子邮件提醒。这有助于通过在处理付款之前提醒用户来减少非自愿流失。

### 提醒逻辑

```
1. Verify CRON_SECRET authorization
2. Query subscriptions renewing within reminder window
3. Filter out already-notified subscriptions
4. Send reminder emails via email notification service
5. Mark subscriptions as notified
6. Return count of reminders sent
```

### 提醒窗口

典型的提醒窗口：
- **续订前 7 天**：第一次提醒
- **续订前 1 天**：最后提醒

### 回应

```json
{
  "success": true,
  "message": "Subscription reminders sent",
  "data": {
    "reminders_sent": 15,
    "errors": 0
  }
}
```

## 订阅到期 (`/api/cron/subscription-expiration`)

|方法|路径|时间表|描述|
|--------|------|----------|-------------|
|`GET`|`/api/cron/subscription-expiration`|世界标准时间 (UTC) 每日午夜|处理过期的订阅|

### 它的作用

识别已过期的订阅并更新其状态。这会处理已取消但仍有剩余时间的订阅，以及未能续订的订阅。

### 过期流程

```
1. Verify CRON_SECRET authorization
2. Query subscriptions with expiration date in the past
3. Update subscription status to 'expired'
4. Revoke associated access/permissions
5. Send expiration notification emails
6. Log expiration events for audit trail
7. Return count of processed expirations
```

### 回应

```json
{
  "success": true,
  "message": "Subscription expirations processed",
  "data": {
    "expired": 3,
    "errors": 0
  }
}
```

## 后台作业 (`/api/cron/jobs`)

cron 作业目录中的`background-jobs-init.ts` 文件初始化后台作业处理。这会设置需要在应用程序运行时内运行的任何重复任务。

## 安全性

### CRON_SECRET验证

所有 cron 端点都会验证 `CRON_SECRET` 标头或查询参数以防止未经授权的执行：

```typescript
// Typical cron authorization check
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Vercel Cron 授权

当部署在 Vercel 上时，Vercel 的 cron 调度程序会使用正确的 `CRON_SECRET` 标头自动调用 cron 作业。该秘密在 Vercel 仪表板的项目设置下进行配置。

|环境变量|描述|
|---------------------|-------------|
|`CRON_SECRET`|cron 作业授权的共享秘密|

### 手动执行

可以通过在授权标头中包含 `CRON_SECRET` 来手动触发 Cron 端点以进行调试：

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/sync
```

## 监控

### 同步状态

可以通过以下方式监控同步 cron 作业状态：
- `/api/version/sync` - 返回上次同步时间和结果
- 服务器日志 - 同步操作以 `[SYNC_MANAGER]` 前缀记录

### 错误处理

所有 cron 作业都实现全面的错误处理：
- 失败的操作会记录完整的错误详细信息
- 部分故障不会阻止剩余项目的处理
- 错误计数包含在响应中以进行监控
- 严重故障会触发日志聚合警报的控制台错误

## 时间表参考

|克朗表达式|含义|
|----------------|---------|
| `0 3 * * *` |世界标准时间每天凌晨 3:00|
| `0 9 * * *` |世界标准时间每天上午 9:00|
| `0 0 * * *` |世界标准时间 (UTC) 每天午夜|

所有时间均采用 UTC 时间。调整这些时间表时，请考虑您的用户群时区分布。
