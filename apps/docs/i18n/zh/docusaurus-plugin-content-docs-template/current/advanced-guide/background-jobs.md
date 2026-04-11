---
id: background-jobs
title: 后台工作
sidebar_label: 后台工作
sidebar_position: 4
---

# 后台作业

Ever Works Template 包括一个强大的后台作业系统，具有支持多个调度后端的可插拔架构。作业会自动运行以执行存储库同步、订阅管理和分析缓存预热等任务。

## 架构概述

后台作业系统遵循 **策略模式**，具有通用的 0 接口和三个可互换的实现：

|组件|文件|目的|
|---|---|---|
| 1 | 2 |所有管理人员的接口合同|
| 3 | 4 |基于5的开发调度|
| 6 | 7 |用于生产的 Trigger.dev SDK v4 集成 |
| 8 | 9 |针对禁用环境的静默无操作 |
| 10 | 11 |工厂+单例创建逻辑 |
| 12 | 13 |调度模式解析|
| 14 | 15 |集中职位登记 |

### 调度模式解析

系统根据环境配置确定使用哪个管理器，遵循严格的优先级顺序：

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

解析逻辑位于0：

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

##BackgroundJobManager 接口

所有管理器都实现 0 中定义的相同接口：

```typescript
interface BackgroundJobManager {
  scheduleJob(id: string, name: string, job: () => void | Promise<void>, interval: number): void;
  scheduleCronJob(id: string, name: string, job: () => void | Promise<void>, cronExpression: string): void;
  triggerJob(id: string): Promise<void>;
  stopJob(id: string): void;
  stopAllJobs(): void;
  getJobStatus(id: string): JobStatus | undefined;
  getAllJobStatuses(): JobStatus[];
  getJobMetrics(): JobMetrics;
}
```

### 关键类型

```typescript
type JobStatusType = 'running' | 'completed' | 'failed' | 'scheduled' | 'stopped';

interface JobStatus {
  id: string;
  name: string;
  status: JobStatusType;
  lastRun: Date | null;
  nextRun: Date | null;
  duration: number;
  error?: string;
}

interface JobMetrics {
  totalExecutions: number;
  successfulJobs: number;
  failedJobs: number;
  averageJobDuration: number;
  lastCleanup: Date;
}
```

## 作业工厂和单例

0 中的工厂创建适当的管理器并公开一个单例：

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

单例确保每个进程仅存在一个管理器实例。在测试中使用 0 来清除实例。

## LocalJobManager（开发）

1使用23进行调度。它提供：

- **重叠预防**：如果同一作业的先前运行仍在进行中，则跳过执行。
- **指标跟踪**：跟踪总执行次数、成功/失败计数和平均持续时间。
- **Cron 到间隔转换**：将常见的 cron 表达式转换为毫秒间隔，以进行近似的本地调度。
- **安静开发模式**：降低 4 时的记录噪音。

支持的 cron 转换：

| cron 表达式 |间隔|
|---|---|
| 5 | 30 秒 |
| 6 | 2 分钟 |
| 7 | 5 分钟 |
| 8 | 15 分钟 |
| 9 | 1小时|
| 10 | 24小时|

## TriggerDevJobManager（生产）

11 使用 Trigger.dev SDK v4 注册计划。关键行为：

- **没有本地计时器**：不运行 12 - 实际执行由 Trigger.dev 工作进程处理。
- **延迟 SDK 加载**：动态导入 13 以防止捆绑问题。
- **间隔到 cron 转换**：将毫秒间隔转换为 Trigger.dev API 的 cron 表达式。
- **指标记录**：当工作线程调用运行处理程序时记录执行指标。

### 配置

设置以下环境变量以启用 Trigger.dev：

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

仅当满足所有这些条件时，管理器才会激活：
1. 0和1均已设置 (22)
2.3为4
3.56

## NoOpJobManager（已禁用）

当在开发中设置7时，8默默地忽略所有调度调用。每个方法都是空操作，并且指标保持为零。这对于：

- 在没有背景噪音的情况下运行开发服务器
- 调试仅限前端的功能
- 减少UI开发过程中的资源使用

## 已注册职位

职位集中登记在9中。该模块在应用程序启动期间通过检测挂钩运行。

### 核心工作

|职位编号 |名称 |日程 |描述 |
|---|---|---|---|
| 10 |存储库同步 |每 5 分钟 |同步基于 Git 的 CMS 存储库中的内容 |
| 11 |订阅续订提醒 |每日上午 9:00 |发送电子邮件提醒 7 天后到期的订阅 |
| 12 |订阅过期清理 |每天午夜|处理超过结束日期的订阅并使其过期 |

### 分析工作

由13在14注册：

|职位编号 |名称 |间隔|
|---|---|---|
| 15 |用户增长聚合| 10 分钟 |
| 16 |活动趋势聚合| 5 分钟 |
| 17 |热门商品排行榜 | 15 分钟 |
| 18 |近期活动更新 | 2 分钟 |
| 19 |性能指标更新 | 30 秒 |
| 20 |缓存清理| 1小时|

### 触发任务 ID 定义

任务 ID 和 cron 计划在 21 中定义：

|文件|任务 ID |目的|
|---|---|---|
| 22 | 23 |分析缓存预热和清理|
| 24 | 25 |存储库同步 |
| 26 | 27 |订阅生命周期管理 |
| 28 | 29 |预定报告生成|

## Vercel Cron 集成

部署到 Vercel 时，还可以通过 30 中配置的 Vercel Cron Jobs 触发后台作业：

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

这些端点命中执行相同作业逻辑的 API 路由，从而在 Vercel 上提供平台本机调度机制。

## 添加新的后台作业

### 第 1 步：定义任务 ID（可选）

在0中创建或更新文件：

```typescript
// lib/background-jobs/triggers/my-feature.ts
export const MyFeatureTaskIds = {
  cleanup: 'my-feature-cleanup',
  notify: 'my-feature-notify',
} as const;

export const MyFeatureCrons: Record<keyof typeof MyFeatureTaskIds, string> = {
  cleanup: '0 2 * * *',   // Daily at 2 AM
  notify: '*/30 * * * *', // Every 30 minutes
};
```

### 第 2 步：实施工作职能

在0中创建作业逻辑：

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### 步骤3：在initialize-jobs.ts中注册

将作业添加到0：

```typescript
manager.scheduleCronJob(
  'my-feature-cleanup',
  'My Feature Cleanup',
  async () => {
    const { myFeatureCleanupJob } = await import('@/lib/services/my-feature-jobs');
    await myFeatureCleanupJob();
  },
  '0 2 * * *'
);
```

**重要**：在作业回调中使用动态 0 可以防止 webpack 在构建阶段捆绑 Node.js 模块。

### 步骤 4：添加 Vercel Cron（可选）

如果在 Vercel 上部署，请将 cron 端点添加到 1 并创建相应的 API 路由：

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## 监控与调试

### 检查作业状态

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### 手动作业触发

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### 禁用开发中的作业

设置环境变量以跳过所有后台作业：

```bash
DISABLE_AUTO_SYNC=true
```

这会激活0，它会默默地忽略所有调度调用。

## 最佳实践

1. **始终在 1 中注册的作业回调中使用动态导入**，以防止 webpack 捆绑问题。
2. **保持作业功能幂等** - 如果存在时间重叠或重试，作业可能会运行多次。
3. **使用带有 `[JobName]` 前缀的结构化日志记录**，以便更轻松地进行日志过滤。
4. **从工作职能中返回结果对象**（如 4 中的3）以实现可观察性。
5. **优雅地处理错误**——管理器捕获并记录错误，但您的作业逻辑应该处理部分失败。
6. **在部署到 Trigger.dev 之前，使用开发中的 LocalJobManager 进行测试。
