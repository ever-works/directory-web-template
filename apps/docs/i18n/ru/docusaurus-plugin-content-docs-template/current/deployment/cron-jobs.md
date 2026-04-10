---
id: cron-jobs
title: Настройка Cron Jobs
sidebar_label: Cron Jobs
sidebar_position: 8
---

# Настройка Cron Jobs

Шаблон Ever Works поддерживает три механизма планирования фоновых задач, которые автоматически выбираются в зависимости от среды выполнения.

## Принцип работы

### Приоритет механизмов

```typescript
// Priority order (highest to lowest):
// 1. Trigger.dev  — when TRIGGER_SECRET_KEY is set
// 2. Vercel Crons — when VERCEL=1 (auto-set by Vercel platform)
// 3. Local setInterval — fallback for development
```

### Автоопределение среды

Система автоматически определяет подходящий механизм:

- **Trigger.dev**: когда задана переменная `TRIGGER_SECRET_KEY`
- **Vercel Crons**: когда `VERCEL=1` (автоматически устанавливается Vercel)
- **Local setInterval**: во всех остальных случаях (локальная разработка)

## Зарегистрированные задания

В системе зарегистрировано три задания cron:

| Задание | Endpoint | Расписание | Назначение |
|---------|----------|-----------|-----------|
| Синхронизация репозитория | `/api/cron/sync` | `*/5 * * * *` | Синхронизирует контент каждые 5 минут |
| Напоминания о продлении | `/api/cron/subscription-reminders` | `0 9 * * *` | Отправляет email-напоминания в 9:00 ежедневно |
| Очистка истёкших подписок | `/api/cron/subscription-expiration` | `0 0 * * *` | Обрабатывает истёкшие подписки в полночь |

## Конфигурация Vercel Crons

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
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

### Переменная окружения CRON_SECRET

Для безопасности Vercel подписывает каждый вызов cron заголовком `Authorization`. Задайте одинаковый секрет с обеих сторон:

```bash
# In Vercel project settings (Environment Variables)
CRON_SECRET=your-secret-here  # openssl rand -base64 32
```

Каждый API-эндпоинт проверяет секрет:

```typescript
// app/api/cron/sync/route.ts
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

## Проверка

### Шаг 1: Панель управления Vercel

```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

Убедиться, что отображаются все 3 задания cron с корректным расписанием.

### Шаг 2: Логи вызовов

```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```

### Шаг 3: Логи приложения

При запуске приложения:
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

При каждой синхронизации:
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

### Шаг 4: Ручное тестирование

```bash
curl -X GET https://yourdomain.com/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

Ожидаемый ответ:
```json
{
  "success": true,
  "message": "Sync completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": 1234
}
```

## Устранение неполадок

### Задания не выполняются

1. Убедиться, что `vercel.json` содержит все 3 задания cron
2. Убедиться, что `CRON_SECRET` задан в переменных окружения Vercel
3. Убедиться, что переменные Trigger.dev **не заданы** (иначе они имеют приоритет)

### Ошибки 401 Unauthorized

```bash
# Генерация нового секрета
openssl rand -base64 32

# Добавление в Vercel
vercel env add CRON_SECRET

# Повторный деплой
vercel --prod
```

### Слишком частое выполнение

Проверить, нет ли дублирующихся записей в `vercel.json` — каждый путь должен встречаться только один раз.

## Руководство по миграции

### Local → Vercel Crons

1. Добавить записи cron в `vercel.json`
2. Сгенерировать и задать `CRON_SECRET`
3. Повторно развернуть на Vercel

### Vercel → Trigger.dev

```bash
# Install Trigger.dev
pnpm add @trigger.dev/sdk

# Set the environment variable
TRIGGER_SECRET_KEY=your-trigger-secret

# Deploy your trigger jobs
npx trigger.dev@latest deploy
```

### Trigger.dev → Vercel Crons

```bash
# Remove Trigger.dev environment variables
vercel env rm TRIGGER_SECRET_KEY
vercel env rm TRIGGER_API_KEY

# Redeploy
vercel --prod
```
