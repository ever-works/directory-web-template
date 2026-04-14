---
id: background-jobs-system
title: Система за фонови задачи
sidebar_label: Фонови задачи
sidebar_position: 38
---

# Система за фонови задачи

Шаблонът включва разширяема система за фонови задания с три взаимозаменяеми реализации: локален `setInterval` базиран мениджър за разработка, интеграция на Trigger.dev за производство и мениджър без операции за пълно деактивиране на задания.

## Файлова структура

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

## Интерфейсът `BackgroundJobManager`

Всички реализации споделят общ интерфейс:

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

### Типове статус и показатели

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

## Фабрика за работа (`job-factory.ts`)

Фабриката създава подходящия мениджър въз основа на средата:

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

### Логика на избора

Фабриката следва този приоритетен ред:

1. **NoOpJobManager** - Ако `DISABLE_AUTO_SYNC=true` е в процес на разработка
2. **TriggerDevJobManager** - Ако Trigger.dev е напълно конфигуриран и активиран в производството
3. **LocalJobManager** - Резервен вариант за всички други среди

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

## LocalJobManager

Използва `setInterval` за планиране. Идеален за разработка и самостоятелно хоствани внедрявания:

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

### Преобразуване на Cron в интервал

`LocalJobManager` преобразува обичайните cron изрази в приблизителни интервали:

|Cron модел|Интервал|
|-------------|----------|
| `*/30 * * * * *` |30 секунди|
| `*/2 * * * *` |2 минути|
| `*/5 * * * *` |5 минути|
| `*/10 * * * *` |10 минути|
| `*/15 * * * *` |15 минути|
| `0 * * * *` |1 час|
| `0 9 * * *` |24 часа|
|други|1 минута (по подразбиране)|

### Пазители на екзекуцията

Местният мениджър предотвратява припокриващи се изпълнения. Ако задание вече се изпълнява, когато неговият интервал се задейства, изпълнението се пропуска:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

Регистрира задания с Trigger.dev SDK за изпълнение в облак. В производството действителното планиране и изпълнение се обработват от работника Trigger.dev, а не от локалните таймери.

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

### Как работи

1. `scheduleJob` преобразува интервала в cron израз
2. `registerTask` лениво зарежда `@trigger.dev/sdk` и извиква `schedules.task()`
3. Манипулаторът за изпълнение записва показатели, когато се изпълнява от работника Trigger.dev
4. `stopJob` изчиства само локалното състояние (дистанционните графици се управляват чрез таблото за управление на Trigger.dev)

## NoOpJobManager

Всички операции са без операции. Използва се, когато фоновите задачи са деактивирани:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## Конфигурация (`config.ts`)

### Конфигурация на Trigger.dev

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

### Режим на планиране

Функцията `getSchedulingMode` определя коя система да се използва:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

Приоритетен ред:

1. **забранено** - `DISABLE_AUTO_SYNC` е вярно
2. **trigger-dev** - Напълно конфигуриран и активиран в производството
3. **vercel** - Работи на платформата Vercel
4. **локален** - Резервен

## Регистрация на работа (`initialize-jobs.ts`)

Всички фонови задачи се регистрират централно чрез `initializeBackgroundJobs`:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### Регистрирани работни места

|ID на работа|Име|График|Описание|
|--------|------|----------|-------------|
|`repository-sync`|Синхронизация на хранилището|На всеки 5 минути|Синхронизира базираното на Git CMS съдържание|
|`subscription-renewal-reminder`|Напомняне за подновяване на абонамента|Всеки ден в 9:00ч|Изпраща напомняния за изтичащи абонаменти|
|`subscription-expired-cleanup`|Почистване на изтичане на абонамента|Всеки ден в полунощ|Обработва и изтича просрочените абонаменти|

### Сингълтън Гард

Функцията за инициализация включва единична защита за предотвратяване на двойна регистрация:

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

Динамичните импортирания в обратните извиквания на задания не позволяват на webpack да анализира пълната верига на зависимостите по време на изграждане.

## Променливи на средата

|Променлива|Задължително|Описание|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|За Trigger.dev|API ключ за Trigger.dev|
|`TRIGGER_DEV_API_URL`|не|Персонализиран URL адрес на API (по подразбиране: `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|не|Активиране на Trigger.dev (по подразбиране: `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|не|Име на средата (по подразбиране: `development`)|
|`DISABLE_AUTO_SYNC`|не|Задайте на `true`, за да деактивирате всички фонови задачи|
|`VERCEL`|Автоматична настройка|Задайте `1` от платформата Vercel|

## Свързани файлове

- `lib/background-jobs/index.ts` - Публични експорти на API
- `lib/background-jobs/types.ts` - Дефиниции на интерфейс и тип
- `lib/background-jobs/config.ts` - Помощници за конфигуриране
- `lib/background-jobs/job-factory.ts` - Фабричен и единичен
- `lib/background-jobs/local-job-manager.ts` - Локална реализация
- `lib/background-jobs/trigger-dev-job-manager.ts` - Реализация на Trigger.dev
- `lib/background-jobs/noop-job-manager.ts` - внедряване без операция
- `lib/background-jobs/initialize-jobs.ts` - Регистрация на работа
- `lib/services/sync-service.ts` - Услуга за синхронизиране на хранилище
- `lib/services/subscription-jobs.ts` - Изпълнения на абонаментни задачи
