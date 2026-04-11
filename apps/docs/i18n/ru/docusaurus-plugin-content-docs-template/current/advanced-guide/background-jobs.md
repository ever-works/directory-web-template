---
id: background-jobs
title: Фоновые задания
sidebar_label: Фоновые задания
sidebar_position: 4
---

# Фоновые задания

Шаблон Ever Works включает в себя надежную систему фоновых заданий с подключаемой архитектурой, которая поддерживает несколько серверов планирования. Задания выполняются автоматически для таких задач, как синхронизация репозитория, управление подписками и разогрев кэша аналитики.

## Обзор архитектуры

Система фоновых заданий соответствует **шаблону стратегии** с общим интерфейсом `BackgroundJobManager` и тремя взаимозаменяемыми реализациями:

| Компонент | Файл | Цель |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | Контракт на интерфейс для всех менеджеров |
| `LocalJobManager` | `lib/background-jobs/local-job-manager.ts` | `setInterval` планирование разработки |
| `TriggerDevJobManager` | `lib/background-jobs/trigger-dev-job-manager.ts` | Интеграция Trigger.dev SDK v4 для производства |
| `NoOpJobManager` | `lib/background-jobs/noop-job-manager.ts` | Тихий режим бездействия для сред с ограниченными возможностями |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | Логика создания фабрики + синглтона |
| `config.ts` | `lib/background-jobs/config.ts` | Разрешение режима планирования |
| `initialize-jobs.ts` | `lib/background-jobs/initialize-jobs.ts` | Централизованная регистрация рабочих мест |

### Разрешение режима планирования

Система определяет, какой менеджер использовать, на основе конфигурации среды, соблюдая строгий порядок приоритетов:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

Логика разрешения находится в `lib/background-jobs/config.ts` :

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## Интерфейс BackgroundJobManager

Все менеджеры реализуют один и тот же интерфейс, определенный в `lib/background-jobs/types.ts` :

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

### Типы клавиш

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

## Фабрика заданий и синглтон

Фабрика в `lib/background-jobs/job-factory.ts` создаёт соответствующий менеджер и предоставляет синглтон:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

Синглтон гарантирует, что для каждого процесса существует только один экземпляр менеджера. Используйте `resetJobManager()` в тестах, чтобы очистить экземпляр.

## LocalJobManager (Разработка) `LocalJobManager` использует `setInterval` и `setTimeout` для планирования. Он обеспечивает:

- **Предотвращение перекрытия**: выполнение пропускается, если предыдущий запуск того же задания все еще выполняется.
- **Отслеживание показателей**: отслеживает общее количество выполнений, количество успешных/неудачных действий и среднюю продолжительность.
- **Преобразование хрона в интервал**: преобразует общие выражения хрона в миллисекундные интервалы для приблизительного локального планирования.
- **Тихий режим разработки**: уменьшает шум записи при нажатии `NODE_ENV=development` .

Поддерживаемые преобразования cron:

| Выражение Крон | Интервал |
|---|---|
| `*/30 * * * * *` | 30 секунд |
| `*/2 * * * *` | 2 минуты |
| `*/5 * * * *` | 5 минут |
| `*/15 * * * *` | 15 минут |
| `0 * * * *` | 1 час |
| `0 9 * * *` | 24 часа |

## TriggerDevJobManager (производство) `TriggerDevJobManager` регистрирует расписания с помощью Trigger.dev SDK v4. Ключевые модели поведения:

- **Нет локальных таймеров**: не запускается `setInterval` — фактическое выполнение обрабатывается рабочим процессом Trigger.dev.
- **Отложенная загрузка SDK**: динамически импортирует `@trigger.dev/sdk` для предотвращения проблем с объединением.
- **Преобразование интервала в cron**: преобразует миллисекундные интервалы в выражения cron для API Trigger.dev.
- **Запись показателей**: записывает показатели выполнения, когда исполнитель вызывает обработчик выполнения.

### Конфигурация

Установите следующие переменные среды, чтобы включить Trigger.dev:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

Менеджер активируется только при выполнении всех этих условий:
1. `TRIGGER_DEV_API_KEY` и `TRIGGER_DEV_API_URL` установлены ( `isFullyConfigured` )
2. `TRIGGER_DEV_ENABLED` — это `true` 3. `NODE_ENV` — это `production` ## NoOpJobManager (отключено)

Когда `DISABLE_AUTO_SYNC=true` находится в режиме разработки, `NoOpJobManager` молча игнорирует все вызовы планирования. Каждый метод является пустым, а метрики остаются на нуле. Это полезно для:

- Запуск сервера разработки без фонового шума.
- Отладка функций, предназначенных только для внешнего интерфейса.
- Сокращение использования ресурсов при разработке пользовательского интерфейса.

## Зарегистрированные вакансии

Рабочие места регистрируются централизованно в `lib/background-jobs/initialize-jobs.ts` . Этот модуль запускается во время запуска приложения через инструментарий.

### Основные вакансии

| Идентификатор вакансии | Имя | Расписание | Описание |
|---|---|---|---|
| `repository-sync` | Синхронизация репозитория | Каждые 5 минут | Синхронизирует содержимое из репозитория CMS на базе Git |
| `subscription-renewal-reminder` | Напоминание о продлении подписки | Ежедневно в 9:00 | Отправляет напоминания по электронной почте о подписках, срок действия которых истекает через 7 дней |
| `subscription-expired-cleanup` | Очистка срока действия подписки | Ежедневно в полночь | Обрабатывает и истекает срок действия подписок после даты окончания |

### Аналитические задания

Зарегистрировано `AnalyticsBackgroundProcessor` в `lib/services/analytics-background-processor.ts` :

| Идентификатор вакансии | Имя | Интервал |
|---|---|---|
| `analytics-user-growth` | Агрегация роста пользователей | 10 минут |
| `analytics-activity-trends` | Агрегация тенденций активности | 5 минут |
| `analytics-top-items` | Рейтинг лучших товаров | 15 минут |
| `analytics-recent-activity` | Обновление недавней активности | 2 минуты |
| `analytics-performance-metrics` | Обновление показателей производительности | 30 секунд |
| `analytics-cache-cleanup` | Очистка кэша | 1 час |

### Определения идентификаторов задач-триггеров

Идентификаторы задач и расписания cron определены в `lib/background-jobs/triggers/` :

| Файл | Идентификаторы задач | Цель |
|---|---|---|
| `analytics.ts` | `AnalyticsTaskIds` | Прогрев и очистка кэша аналитики |
| `sync.ts` | `SyncTaskIds` | Синхронизация репозитория |
| `subscriptions.ts` | `SubscriptionTaskIds` | Управление жизненным циклом подписки |
| `reports.ts` | `ReportTaskIds` | Генерация отчетов по расписанию |

## Интеграция Vercel Cron

При развертывании в Vercel фоновые задания также можно запускать с помощью заданий Vercel Cron, настроенных в `vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

Эти конечные точки обращаются к маршрутам API, которые выполняют одну и ту же логику заданий, обеспечивая встроенный в платформу механизм планирования Vercel.

## Добавление нового фонового задания

### Шаг 1. Определите идентификаторы задач (необязательно)

Создайте или обновите файл в `lib/background-jobs/triggers/` :

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

### Шаг 2. Реализация функции задания

Создайте логику задания в `lib/services/` :

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### Шаг 3. Зарегистрируйтесь в Initialize-jobs.ts

Добавьте задание в `lib/background-jobs/initialize-jobs.ts` :

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

**Важно**: используйте динамический `import()` внутри обратного вызова задания, чтобы предотвратить объединение веб-пакетом модулей Node.js на этапе сборки.

### Шаг 4. Добавьте Vercel Cron (необязательно)

При развертывании на Vercel добавьте конечную точку cron в `vercel.json` и создайте соответствующий маршрут API:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## Мониторинг и отладка

### Проверка статуса задания

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### Запуск задания вручную

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### Отключение заданий в разработке

Установите переменную среды, чтобы пропустить все фоновые задания:

```bash
DISABLE_AUTO_SYNC=true
```

Это активирует `NoOpJobManager` , который молча игнорирует все вызовы планирования.

## Лучшие практики

1. **Всегда используйте динамический импорт** в обратных вызовах заданий, зарегистрированных в `initialize-jobs.ts` , чтобы предотвратить проблемы с объединением веб-пакетов.
2. **Сохраняйте идемпотентность функций заданий** – задания могут выполняться более одного раза, если есть совпадения по времени или повторные попытки.
3. **Используйте структурированное ведение журнала** с префиксом `[JobName]` для упрощения фильтрации журналов.
4. **Возвращайте объекты результатов** из функций задания (например, `JobResult` в `subscription-jobs.ts` ) для удобства наблюдения.
5. **Обрабатывайте ошибки корректно** — менеджер выявляет и регистрирует ошибки, но логика вашего задания должна обрабатывать частичные сбои.
6. **Протестируйте с помощью LocalJobManager**, находящегося в стадии разработки, перед развертыванием на Trigger.dev.
