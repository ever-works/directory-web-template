---
id: background-jobs-system
title: Система фоновых заданий
sidebar_label: Фоновые задания
sidebar_position: 38
---

# Система фоновых заданий

Шаблон включает в себя расширяемую систему фоновых заданий с тремя взаимозаменяемыми реализациями: локальный менеджер разработки на базе `setInterval`, интеграцию Trigger.dev для производства и неактивный менеджер для полного отключения заданий.

## Структура файла

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

## Интерфейс `BackgroundJobManager`

Все реализации имеют общий интерфейс:

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

### Типы статуса и показателей

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

## Фабрика заданий (`job-factory.ts`)

Фабрика создает соответствующего менеджера на основе среды:

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

### Логика выбора

Фабрика следует такому приоритетному порядку:

1. **NoOpJobManager** - Если `DISABLE_AUTO_SYNC=true` в разработке
2. **TriggerDevJobManager** – если Trigger.dev полностью настроен и включен в рабочую среду.
3. **LocalJobManager** – резервный вариант для всех остальных сред.

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

## ЛокальныйJobManager

Использует `setInterval` для планирования. Идеально подходит для разработки и самостоятельного развертывания:

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

### Преобразование хрона в интервал

`LocalJobManager` преобразует общие выражения cron в приблизительные интервалы:

|Шаблон Крон|Интервал|
|-------------|----------|
| `*/30 * * * * *` |30 секунд|
| `*/2 * * * *` |2 минуты|
| `*/5 * * * *` |5 минут|
| `*/10 * * * *` |10 минут|
| `*/15 * * * *` |15 минут|
| `0 * * * *` |1 час|
| `0 9 * * *` |24 часа|
|Другое|1 минута (по умолчанию)|

### Стражи казни

Локальный менеджер предотвращает перекрытие выполнения. Если задание уже запущено, когда срабатывает его интервал, выполнение пропускается:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## Триггердевджобменеджер

Регистрирует задания с помощью Trigger.dev SDK для выполнения в облаке. В рабочей среде фактическим планированием и выполнением занимается исполнитель Trigger.dev, а не локальные таймеры.

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

### Как это работает

1. `scheduleJob` преобразует интервал в выражение cron
2. `registerTask` лениво загружает `@trigger.dev/sdk` и вызывает `schedules.task()`
3. Обработчик запуска записывает метрики при выполнении обработчиком Trigger.dev.
4. `stopJob` очищает только локальное состояние (удаленные расписания управляются через панель управления Trigger.dev)

## NoOpJobManager

Все операции являются нулевыми. Используется, когда фоновые задания отключены:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## Конфигурация (`config.ts`)

### Конфигурация Trigger.dev

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

### Режим планирования

Функция `getSchedulingMode` определяет, какую систему использовать:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

Приоритетный порядок:

1. **отключено** - `DISABLE_AUTO_SYNC` правдиво
2. **trigger-dev** — полностью настроено и включено в производство.
3. **vercel** – работа на платформе Vercel.
4. **локальный** – резервный вариант

## Регистрация вакансии (`initialize-jobs.ts`)

Все фоновые задания регистрируются централизованно через `initializeBackgroundJobs`:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### Зарегистрированные вакансии

|Идентификатор вакансии|Имя|Расписание|Описание|
|--------|------|----------|-------------|
|`repository-sync`|Синхронизация репозитория|Каждые 5 минут|Синхронизирует контент CMS на основе Git.|
|`subscription-renewal-reminder`|Напоминание о продлении подписки|Ежедневно в 9:00|Отправляет напоминания об истекающих подписках|
|`subscription-expired-cleanup`|Очистка срока действия подписки|Ежедневно в полночь|Обрабатывает и истекает срок действия просроченных подписок|

### Синглтон Страж

Функция инициализации включает в себя одноэлементную защиту для предотвращения двойной регистрации:

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

Динамический импорт внутри обратных вызовов заданий не позволяет веб-пакету анализировать полную цепочку зависимостей во время сборки.

## Переменные среды

|Переменная|Требуется|Описание|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|Для Trigger.dev|Ключ API для Trigger.dev|
|`TRIGGER_DEV_API_URL`|Нет|URL-адрес пользовательского API (по умолчанию: `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|Нет|Включить Trigger.dev (по умолчанию: `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|Нет|Имя среды (по умолчанию: `development`)|
|`DISABLE_AUTO_SYNC`|Нет|Установите значение `true`, чтобы отключить все фоновые задания.|
|`VERCEL`|Автоустановка|Установлено на `1` платформой Vercel.|

## Связанные файлы

- `lib/background-jobs/index.ts` — экспорт общедоступных API
- `lib/background-jobs/types.ts` - Определения интерфейса и типов
- `lib/background-jobs/config.ts` - Помощники по настройке
- `lib/background-jobs/job-factory.ts` - Фабрика и синглтон
- `lib/background-jobs/local-job-manager.ts` - Локальная реализация
- `lib/background-jobs/trigger-dev-job-manager.ts` - реализация Trigger.dev
- `lib/background-jobs/noop-job-manager.ts` - Пустая реализация
- `lib/background-jobs/initialize-jobs.ts` - Регистрация вакансии
- `lib/services/sync-service.ts` - Служба синхронизации репозитория
- `lib/services/subscription-jobs.ts` - Реализация заданий по подписке
