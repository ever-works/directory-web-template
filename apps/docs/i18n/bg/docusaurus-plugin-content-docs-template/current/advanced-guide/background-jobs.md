---
id: background-jobs
title: Фонови задачи
sidebar_label: Фонови задачи
sidebar_position: 4
---

# Фонови задачи

Шаблонът Ever Works включва стабилна система за работа във фонов режим с включена архитектура, която поддържа множество бекендове за планиране. Задачите се изпълняват автоматично за задачи като синхронизиране на хранилище, управление на абонаменти и затопляне на кеша за анализи.

## Преглед на архитектурата

Системата за работа във фонов режим следва **Стратегически модел** с общ интерфейс `BackgroundJobManager` и три взаимозаменяеми реализации:

| Компонент | Файл | Цел |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | Договор за интерфейс за всички мениджъри |
| `LocalJobManager` | `lib/background-jobs/local-job-manager.ts` | `setInterval` базирано планиране за разработка |
| `TriggerDevJobManager` | `lib/background-jobs/trigger-dev-job-manager.ts` | Trigger.dev SDK v4 интеграция за производство |
| `NoOpJobManager` | `lib/background-jobs/noop-job-manager.ts` | Безшумен режим без работа за среди с увреждания |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | Логика за създаване на фабрика + сингълтън |
| `config.ts` | `lib/background-jobs/config.ts` | Разделителна способност на режима на планиране |
| `initialize-jobs.ts` | `lib/background-jobs/initialize-jobs.ts` | Централизирана регистрация на работа |

### Резолюция на режим на планиране

Системата определя кой мениджър да използва въз основа на конфигурацията на средата, следвайки строг приоритетен ред:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

Логиката на разделителната способност живее в `lib/background-jobs/config.ts` :

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## Интерфейсът BackgroundJobManager

Всички мениджъри прилагат един и същ интерфейс, дефиниран в `lib/background-jobs/types.ts` :

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

### Типове ключове

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

## Job Factory и Singleton

Фабриката в `lib/background-jobs/job-factory.ts` създава подходящия мениджър и излага сингълтън:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

Единичният елемент гарантира, че съществува само един екземпляр на мениджър за процес. Използвайте `resetJobManager()` в тестове, за да изчистите екземпляра.

## LocalJobManager (разработка) `LocalJobManager` използва `setInterval` и `setTimeout` за планиране. Той осигурява:

- **Предотвратяване на припокриване**: Пропуска изпълнението, ако все още е в ход предишно изпълнение на същата задача.
- **Проследяване на показатели**: Проследява общите изпълнения, броя на успехите/неуспехите и средната продължителност.
- **Cron-to-interval conversion**: Преобразува често срещани cron изрази в интервали от милисекунди за приблизително локално планиране.
- **Тих режим на разработка**: Намалява шума при регистриране, когато `NODE_ENV=development` .

Поддържани cron реализации:

| Cron израз | Интервал |
|---|---|
| `*/30 * * * * *` | 30 секунди |
| `*/2 * * * *` | 2 минути |
| `*/5 * * * *` | 5 минути |
| `*/15 * * * *` | 15 минути |
| `0 * * * *` | 1 час |
| `0 9 * * *` | 24 часа |

## TriggerDevJobManager (Производство) `TriggerDevJobManager` регистрира графици с Trigger.dev SDK v4. Ключови поведения:

- **Без локални таймери**: Не се изпълнява `setInterval` -- действителното изпълнение се управлява от работния процес Trigger.dev.
- **Мързеливо зареждане на SDK**: Динамично импортира `@trigger.dev/sdk` за предотвратяване на проблеми с групирането.
- **Преобразуване от интервал към cron**: Преобразува интервали от милисекунди в изрази на cron за API на Trigger.dev.
- **Запис на показатели**: Записва показателите за изпълнение, когато работникът извиква манипулатора за изпълнение.

### Конфигурация

Задайте следните променливи на средата, за да активирате Trigger.dev:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

Мениджърът се активира само когато са изпълнени всички тези условия:
1. `TRIGGER_DEV_API_KEY` и `TRIGGER_DEV_API_URL` са зададени ( `isFullyConfigured` )
2. `TRIGGER_DEV_ENABLED` е `true` 3. `NODE_ENV` е `production` ## NoOpJobManager (деактивирано)

Когато `DISABLE_AUTO_SYNC=true` е зададен в процес на разработка, `NoOpJobManager` тихо игнорира всички повиквания за планиране. Всеки метод е без операция и показателите остават на нула. Това е полезно за:

- Изпълнение на сървъра за разработка без фонов шум
- Дебъгване на функции само за интерфейса
- Намаляване на използването на ресурси по време на разработването на потребителския интерфейс

## Регистрирани работни места

Работните места се регистрират централно в `lib/background-jobs/initialize-jobs.ts` . Този модул работи по време на стартиране на приложението чрез инструменталната кука.

### Основни задачи

| ID на работа | Име | График | Описание |
|---|---|---|---|
| `repository-sync` | Синхронизиране на хранилище | На всеки 5 минути | Синхронизира съдържание от базираното на Git CMS хранилище |
| `subscription-renewal-reminder` | Напомняне за подновяване на абонамент | Всеки ден в 9:00 ч. | Изпраща напомняния по имейл за абонаменти, изтичащи след 7 дни |
| `subscription-expired-cleanup` | Почистване на изтичането на абонамента | Всеки ден в полунощ | Обработва и изтича абонаменти след тяхната крайна дата |

### Работа в Анализ

Регистриран от `AnalyticsBackgroundProcessor` в `lib/services/analytics-background-processor.ts` :

| ID на работа | Име | Интервал |
|---|---|---|
| `analytics-user-growth` | Обединяване на растежа на потребителите | 10 минути |
| `analytics-activity-trends` | Агрегиране на тенденции в дейността | 5 минути |
| `analytics-top-items` | Класиране на най-добрите елементи | 15 минути |
| `analytics-recent-activity` | Актуализация на скорошна дейност | 2 минути |
| `analytics-performance-metrics` | Актуализация на показателите за ефективност | 30 секунди |
| `analytics-cache-cleanup` | Почистване на кеша | 1 час |

### Дефиниции на ID на задействане на задача

Идентификаторите на задачи и графици на cron са дефинирани в `lib/background-jobs/triggers/` :

| Файл | ID на задачи | Цел |
|---|---|---|
| `analytics.ts` | `AnalyticsTaskIds` | Загряване и почистване на кеша на Google Анализ |
| `sync.ts` | `SyncTaskIds` | Синхронизиране на хранилище |
| `subscriptions.ts` | `SubscriptionTaskIds` | Управление на жизнения цикъл на абонамента |
| `reports.ts` | `ReportTaskIds` | Генериране на отчет по график |

## Vercel Cron интеграция

Когато се разположат във Vercel, фоновите задания могат да се задействат и чрез Vercel Cron Jobs, конфигурирани в `vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

Тези крайни точки достигат API маршрути, които изпълняват една и съща логика на заданието, осигурявайки собствен механизъм за планиране на платформата на Vercel.

## Добавяне на ново фоново задание

### Стъпка 1: Дефиниране на идентификатори на задачи (по избор)

Създайте или актуализирайте файл в `lib/background-jobs/triggers/` :

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

### Стъпка 2: Внедрете длъжността

Създайте логиката на работата в `lib/services/` :

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### Стъпка 3: Регистрирайте се в initialize-jobs.ts

Добавете работата към `lib/background-jobs/initialize-jobs.ts` :

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

**Важно**: Използвайте динамичен `import()` вътре в обратното извикване на заданието, за да попречите на webpack да обединява Node.js модули по време на фазата на изграждане.

### Стъпка 4: Добавете Vercel Cron (по избор)

Ако внедрявате на Vercel, добавете крайна точка на cron към `vercel.json` и създайте съответния API маршрут:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## Наблюдение и отстраняване на грешки

### Проверка на състоянието на заданието

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### Ръчно стартиране на задание

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### Деактивиране на работни места в разработка

Задайте променливата на средата да пропуска всички фонови задачи:

```bash
DISABLE_AUTO_SYNC=true
```

Това активира `NoOpJobManager` , който безшумно игнорира всички насрочени повиквания.

## Най-добри практики

1. **Винаги използвайте динамично импортиране** в обратни извиквания на задания, регистрирани в `initialize-jobs.ts` , за да предотвратите проблеми с групирането на уебпакети.
2. **Поддържайте идемпотентни функции на заданието** -- заданията могат да се изпълняват повече от веднъж, ако има припокриване на времето или повторни опити.
3. **Използвайте структурирано регистриране** с префикс `[JobName]` за по-лесно филтриране на журнали.
4. **Върнете резултатни обекти** от работни функции (като `JobResult` в `subscription-jobs.ts` ) за видимост.
5. **Обработвайте грешките елегантно** -- мениджърът улавя и регистрира грешки, но логиката на вашата работа трябва да се справя с частични грешки.
6. **Тествайте с LocalJobManager** в процес на разработка преди внедряване в Trigger.dev.
