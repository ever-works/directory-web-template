---
id: background-jobs-system
title: 后台作业系统
sidebar_label: 后台工作
sidebar_position: 38
---

# 后台作业系统

该模板包括一个可扩展的后台作业系统，具有三个可互换的实现：用于开发的基于本地 `setInterval` 的管理器、用于生产的 Trigger.dev 集成以及用于完全禁用作业的无操作管理器。

## 文件结构

```
lib/background-jobs/
  index.ts                      # Public API - exports types, factory, config
  types.ts                      # BackgroundJobManager interface, types
  config.ts                     # Trigger.dev configuration, scheduling mode
  job-factory.ts                # Factory function and singleton management
  local-job-manager.ts          # Local setInterval-based implementation
  trigger-dev-job-manager.ts    # Trigger.dev SDK integration
  noop-job-manager.ts           # No-op implementation for disabled mode
  initialize-jobs.ts            # Centralized job registration
  triggers/                     # Job-specific trigger definitions
    analytics.ts
    reports.ts
    subscriptions.ts
    sync.ts
```

## `BackgroundJobManager` 界面

所有实现共享一个公共接口：

```ts
export interface BackgroundJobManager {
  // Schedule by interval (milliseconds)
  scheduleJob(
    id: string,
    name: string,
    job: () => void | Promise<void>,
    interval: number
  ): void;

  // Schedule by cron expression
  scheduleCronJob(
    id: string,
    name: string,
    job: () => void | Promise<void>,
    cronExpression: string
  ): void;

  // Manually trigger a job
  triggerJob(id: string): Promise<void>;

  // Stop a specific job
  stopJob(id: string): void;

  // Stop all jobs
  stopAllJobs(): void;

  // Get status of a specific job
  getJobStatus(id: string): JobStatus | undefined;

  // Get all job statuses
  getAllJobStatuses(): JobStatus[];

  // Get execution metrics
  getJobMetrics(): JobMetrics;
}
```

### 状态和指标类型

```ts
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

## 工作工厂 (`job-factory.ts`)

工厂根据环境创建合适的管理者：

```ts
import { getJobManager, resetJobManager } from '@/lib/background-jobs';

// Get the singleton manager (created on first call)
const manager = getJobManager();

// Register a job
manager.scheduleJob(
  'cleanup',
  'Daily Cleanup',
  async () => { /* ... */ },
  24 * 60 * 60 * 1000 // 24 hours
);

// Reset (useful for testing)
resetJobManager();
```

### 选择逻辑

工厂遵循以下优先顺序：

1. **NoOpJobManager** - 如果 `DISABLE_AUTO_SYNC=true` 正在开发中
2. **TriggerDevJobManager** - 如果 Trigger.dev 在生产中已完全配置并启用
3. **LocalJobManager** - 所有其他环境的后备

```ts
export function createJobManager(): BackgroundJobManager {
  if (coreConfig.NODE_ENV === 'development' && process.env.DISABLE_AUTO_SYNC === 'true') {
    return new NoOpJobManager();
  }

  if (shouldUseTriggerDev()) {
    return new TriggerDevJobManager(getTriggerDevConfig());
  }

  return new LocalJobManager();
}
```

## 本地作业管理器

使用 `setInterval` 进行调度。非常适合开发和自托管部署：

```ts
const manager = new LocalJobManager();

// Interval-based scheduling
manager.scheduleJob('sync', 'Repository Sync', async () => {
  await syncRepository();
}, 5 * 60 * 1000); // Every 5 minutes

// Cron-based scheduling (converted to interval internally)
manager.scheduleCronJob('cleanup', 'Nightly Cleanup', async () => {
  await runCleanup();
}, '0 0 * * *'); // Daily at midnight
```

### Cron 到间隔的转换

`LocalJobManager` 将常见的 cron 表达式转换为近似间隔：

|计划模式|间隔|
|-------------|----------|
| `*/30 * * * * *` |30秒|
| `*/2 * * * *` |2分钟|
| `*/5 * * * *` |5分钟|
| `*/10 * * * *` |10分钟|
| `*/15 * * * *` |15分钟|
| `0 * * * *` |1小时|
| `0 9 * * *` |24小时|
|其他|1 分钟（默认）|

### 行刑卫士

本地管理器可以防止重叠执行。如果作业在其间隔触发时已经在运行，则跳过执行：

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## 触发开发作业管理器

使用 Trigger.dev SDK 注册作业以进行基于云的执行。在生产中，实际的调度和执行由 Trigger.dev 工作线程处理，而不是本地计时器。

```ts
const config: TriggerDevConfig = {
  enabled: true,
  apiKey: 'tr_dev_...',
  apiUrl: 'https://api.trigger.dev',
  environment: 'production',
  isFullyConfigured: true,
  isPartiallyConfigured: false,
};

const manager = new TriggerDevJobManager(config);

// Jobs are registered with Trigger.dev schedules
manager.scheduleCronJob('sync', 'Repository Sync', async () => {
  await syncRepository();
}, '*/5 * * * *');
```

### 它是如何运作的

1. `scheduleJob` 将间隔转换为 cron 表达式
2. `registerTask` 延迟加载 `@trigger.dev/sdk` 并调用 `schedules.task()`
3. 运行处理程序在 Trigger.dev 工作线程执行时记录指标
4. `stopJob` 仅清除本地状态（远程计划通过 Trigger.dev 仪表板管理）

## 无操作作业管理器

所有操作均为空操作。当后台作业被禁用时使用：

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## 配置（`config.ts`）

### 触发器.dev 配置

```ts
import { getTriggerDevConfig, shouldUseTriggerDev } from '@/lib/background-jobs';

const config = getTriggerDevConfig();
// => {
//   enabled: boolean,
//   apiKey: string | undefined,
//   apiUrl: string,           // default: 'https://api.trigger.dev'
//   environment: string,      // default: 'development'
//   isFullyConfigured: boolean, // apiKey AND apiUrl present
//   isPartiallyConfigured: boolean,
// }

if (shouldUseTriggerDev()) {
  // Use Trigger.dev (fully configured + enabled + production)
}
```

### 调度方式

`getSchedulingMode` 函数决定使用哪个系统：

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

优先顺序：

1. **已禁用** - `DISABLE_AUTO_SYNC` 是真的
2. **trigger-dev** - 在生产中完全配置并启用
3. **vercel** - 在 Vercel 平台上运行
4. **本地** - 后备

## 职位登记 (`initialize-jobs.ts`)

所有后台作业均通过 `initializeBackgroundJobs` 集中注册：

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### 已注册职位

|职位编号|名称|时间表|描述|
|--------|------|----------|-------------|
|`repository-sync`|存储库同步|每5分钟一班|同步基于 Git 的 CMS 内容|
|`subscription-renewal-reminder`|订阅续订提醒|每天上午 9:00|发送订阅到期提醒|
|`subscription-expired-cleanup`|订阅过期清理|每天午夜|处理过期订阅并使其过期|

### 单例守卫

初始化函数包含一个单例防护以防止双重注册：

```ts
let isInitialized = false;

export async function initializeBackgroundJobs(): Promise<void> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (isInitialized) return;
  isInitialized = true;

  const { getJobManager } = await import('@/lib/background-jobs');
  const manager = getJobManager();

  // Register jobs with dynamic imports to prevent webpack bundling issues
  manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
    const { syncManager } = await import('@/lib/services/sync-service');
    await syncManager.performSync();
  }, 5 * 60 * 1000);

  // ... more jobs
}
```

作业回调内的动态导入会阻止 webpack 在构建时分析完整的依赖链。

## 环境变量

|变量|必填|描述|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|对于触发器.dev|Trigger.dev 的 API 密钥|
|`TRIGGER_DEV_API_URL`|否|自定义 API URL（默认：`https://api.trigger.dev`）|
|`TRIGGER_DEV_ENABLED`|否|启用 Trigger.dev（默认：`false`）|
|`TRIGGER_DEV_ENVIRONMENT`|否|环境名称（默认：`development`）|
|`DISABLE_AUTO_SYNC`|否|设置为 `true` 以禁用所有后台作业|
|`VERCEL`|自动设置|通过Vercel平台设置为`1`|

## 相关文件

- `lib/background-jobs/index.ts` - 公共 API 导出
- `lib/background-jobs/types.ts` - 接口和类型定义
- `lib/background-jobs/config.ts` - 配置助手
- `lib/background-jobs/job-factory.ts` - 工厂和单例
- `lib/background-jobs/local-job-manager.ts` - 本地实施
- `lib/background-jobs/trigger-dev-job-manager.ts` - Trigger.dev 实现
- `lib/background-jobs/noop-job-manager.ts` - 无操作实施
- `lib/background-jobs/initialize-jobs.ts` - 职位登记
- `lib/services/sync-service.ts` - 存储库同步服务
- `lib/services/subscription-jobs.ts` - 订阅作业实施
