---
id: cron-api-endpoints
title: Конечные точки API Cron
sidebar_label: Крон API
sidebar_position: 59
---

# Конечные точки API Cron

API Cron предоставляет конечные точки запланированных заданий, которые запускаются Vercel Cron, внешними планировщиками или внутренним `BackgroundJobManager`. Все конечные точки cron требуют аутентификации через переменную среды `CRON_SECRET` с использованием токена `Bearer` в заголовке `Authorization`.

**Исходный каталог:** `template/app/api/cron/`

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

## Конфигурация Vercel Cron

Расписание cron определено в `vercel.json`:

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

|Работа|Расписание|Описание|
|-----|----------|-------------|
|Синхронизация контента|Ежедневно в 3:00 утра по всемирному координированному времени|Синхронизирует контент из CMS на базе Git.|
|Напоминания о подписке|Ежедневно в 9:00 UTC|Отправляет электронные письма с напоминанием о продлении|
|Срок действия подписки|Ежедневно в полночь UTC|Обрабатывает просроченные подписки|

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

## Срок действия подписки

Находит и обрабатывает просроченные подписки, обновляя их статус с `active` на `expired` и отправляя уведомления по электронной почте.

|Недвижимость|Значение|
|----------|-------|
|**Методы**|`GET`, `POST`|
|**Путь**|`/api/cron/subscription-expiration`|
|**Аутентификация**|`CRON_SECRET` (токен на предъявителя)|
|**Источник**|`cron/subscription-expiration/route.ts`|

### Ответ

**Статус 200** – обработано успешно.

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

|Поле|Тип|Описание|
|-------|------|-------------|
|`data.processed`|`number`|Количество подписок, срок действия которых истек|
|`data.affectedUsers`|`array`|Список затронутых подписок (без идентификационных данных)|
|`data.errors`|`string[]`|Любые нефатальные ошибки (например, сбои доставки электронной почты).|
|`data.timestamp`|`string`|Временная метка обработки|

### Этапы обработки

1. Находит активные подписки после даты их окончания.
2. Обновляет статус с `active` на `expired`.
3. Отправляет электронные письма с уведомлением об истечении срока действия через службу электронной почты.
4. Возвращает сводку: сбои электронной почты не приводят к сбою всего задания.

### Пример завитка

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

## Инициализация фоновых заданий

Модуль фоновых заданий (`cron/jobs/background-jobs-init.ts`) не является конечной точкой API, а представляет собой одноэлементный модуль инициализации, используемый для настройки режима планирования при запуске приложения.

**Источник:** `cron/jobs/background-jobs-init.ts`

### Режимы планирования

|Режим|Описание|
|------|-------------|
|`vercel`|Задания, обрабатываемые Vercel Cron через конечные точки `/api/cron/*`|
|`local`|Внутренний планировщик (для локальных развертываний)|
|`trigger-dev`|Интеграция Trigger.dev для управляемых фоновых заданий|
|`disabled`|Фоновая синхронизация отключена (`DISABLE_AUTO_SYNC=true`)|

### Использование

```typescript
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';

// Called once from layout.tsx -- safe to call multiple times
await ensureBackgroundJobsInitialized();
```

### Ключевые особенности

- Использует `globalThis` для одноэлементного состояния, гарантируя, что инициализация выполняется только один раз для каждого процесса.
- Пропускает инициализацию во время тестов (`NODE_ENV=test`) и сборки (`NEXT_PHASE=phase-production-build`).
- Неудачная инициализация сбрасывает состояние, чтобы разрешить автоматическую повторную попытку следующего вызова.

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
