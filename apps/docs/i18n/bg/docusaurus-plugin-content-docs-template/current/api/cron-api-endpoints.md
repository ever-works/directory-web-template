---
id: cron-api-endpoints
title: Крайни точки на Cron API
sidebar_label: Cron API
sidebar_position: 59
---

# Крайни точки на Cron API

API на Cron предоставя планирани крайни точки на задачи, които се задействат от Vercel Cron, външни програмисти за планиране или вътрешни `BackgroundJobManager`. Всички крайни точки на cron изискват удостоверяване чрез променливата на средата `CRON_SECRET` с помощта на токен `Bearer` в заглавката `Authorization`.

**Директория източник:** `template/app/api/cron/`

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

## Конфигурация на Vercel Cron

Графикът на cron е дефиниран в `vercel.json`:

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

|работа|График|Описание|
|-----|----------|-------------|
|Синхронизиране на съдържанието|Всеки ден в 3:00 ч. UTC|Синхронизира съдържание от базираната на Git CMS|
|Напомняния за абонамент|Всеки ден в 9:00 ч. UTC|Изпраща имейли за напомняне за подновяване|
|Изтичане на абонамента|Всеки ден в полунощ UTC|Обработва изтекли абонаменти|

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

## Изтичане на абонамента

Намира и обработва изтекли абонаменти, като актуализира статуса им от `active` на `expired` и изпраща имейли с известия.

|Собственост|Стойност|
|----------|-------|
|**Методи**|`GET`, `POST`|
|**Пътека**|`/api/cron/subscription-expiration`|
|**Удостоверяване**|`CRON_SECRET` (токен на носителя)|
|**Източник**|`cron/subscription-expiration/route.ts`|

### Отговор

**Състояние 200** -- Обработено успешно.

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
|`data.processed`|`number`|Брой абонаменти, актуализирани до изтекли|
|`data.affectedUsers`|`array`|Списък на засегнатите абонаменти (без PII)|
|`data.errors`|`string[]`|Всички нефатални грешки (напр. неуспешна доставка на имейл)|
|`data.timestamp`|`string`|Времево клеймо на обработка|

### Стъпки на обработка

1. Намира активни абонаменти след тяхната крайна дата.
2. Актуализира състоянието от `active` на `expired`.
3. Изпраща имейли с известия за изтичане чрез имейл услугата.
4. Връща обобщение -- неуспешните имейли не причиняват неуспех на цялата работа.

### къдря Пример

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

## Инициализация на фонови задачи

Модулът за фонови задания (`cron/jobs/background-jobs-init.ts`) не е крайна точка на API, а модул за инициализация на един елемент, използван за конфигуриране на режима на планиране при стартиране на приложението.

**Източник:** `cron/jobs/background-jobs-init.ts`

### Режими на планиране

|Режим|Описание|
|------|-------------|
|`vercel`|Задачи, обработвани от Vercel Cron чрез `/api/cron/*` крайни точки|
|`local`|Вътрешен планировчик (за самостоятелно хоствани внедрявания)|
|`trigger-dev`|Интеграция на Trigger.dev за управлявани фонови задания|
|`disabled`|Синхронизирането във фонов режим е деактивирано (`DISABLE_AUTO_SYNC=true`)|

### Използване

```typescript
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';

// Called once from layout.tsx -- safe to call multiple times
await ensureBackgroundJobsInitialized();
```

### Ключови характеристики

- Използва `globalThis` за сингълтон състояние, като гарантира, че инициализацията се изпълнява само веднъж на процес.
- Пропуска инициализацията по време на тестове (`NODE_ENV=test`) и компилации (`NEXT_PHASE=phase-production-build`).
- Неуспешна инициализация нулира състоянието, за да позволи автоматичен повторен опит при следващото повикване.

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
