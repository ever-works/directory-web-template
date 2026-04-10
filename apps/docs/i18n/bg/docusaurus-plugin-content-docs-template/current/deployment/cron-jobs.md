---
id: cron-jobs
title: Конфигурация на Cron Jobs
sidebar_label: Cron Jobs
sidebar_position: 8
---

# Конфигурация на Cron Jobs

Шаблонът Ever Works поддържа три механизма за планиране на фонови задачи, които се избират автоматично в зависимост от средата на изпълнение.

## Как работи

### Приоритет на механизмите

```typescript
// Priority order (highest to lowest):
// 1. Trigger.dev  — when TRIGGER_SECRET_KEY is set
// 2. Vercel Crons — when VERCEL=1 (auto-set by Vercel platform)
// 3. Local setInterval — fallback for development
```

### Автоматично определяне на среда

Системата автоматично определя правилния механизъм:

- **Trigger.dev**: когато `TRIGGER_SECRET_KEY` е зададена
- **Vercel Crons**: когато `VERCEL=1` (задава се автоматично от Vercel)
- **Local setInterval**: при всички останали случаи (локална разработка)

## Регистрирани задачи

В системата са регистрирани три cron задачи:

| Задача | Endpoint | График | Предназначение |
|--------|----------|--------|---------------|
| Синхронизация на хранилище | `/api/cron/sync` | `*/5 * * * *` | Синхронизира съдържание на всеки 5 минути |
| Напомняния за подновяване | `/api/cron/subscription-reminders` | `0 9 * * *` | Изпраща имейл напомняния в 9:00 ежедневно |
| Почистване на изтекли абонаменти | `/api/cron/subscription-expiration` | `0 0 * * *` | Обработва изтеклите абонаменти в полунощ |

## Конфигурация на Vercel Crons

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

### Променлива на средата CRON_SECRET

За сигурност Vercel подписва всяко извикване на cron с заглавието `Authorization`. Задайте същия секрет от двете страни:

```bash
# In Vercel project settings (Environment Variables)
CRON_SECRET=your-secret-here  # openssl rand -base64 32
```

Всеки API endpoint проверява секрета:

```typescript
// app/api/cron/sync/route.ts
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

## Верификация

### Стъпка 1: Табло на Vercel

```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

Потвърдете, че се показват и 3-те cron задачи с правилните графици.

### Стъпка 2: Логове на извикванията

```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```

### Стъпка 3: Логове на приложението

При стартиране на приложението:
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

При всяка синхронизация:
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

### Стъпка 4: Ръчно тестване

```bash
curl -X GET https://yourdomain.com/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

Очакван отговор:
```json
{
  "success": true,
  "message": "Sync completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": 1234
}
```

## Отстраняване на проблеми

### Задачите не се изпълняват

1. Проверете, че `vercel.json` изброява и 3-те cron задачи
2. Потвърдете, че `CRON_SECRET` е зададена в променливите на средата на Vercel
3. Проверете, че Trigger.dev променливите **не са** зададени (иначе имат приоритет)

### Грешки 401 Unauthorized

```bash
# Генерирайте нов секрет
openssl rand -base64 32

# Добавете към Vercel
vercel env add CRON_SECRET

# Пуснете повторно
vercel --prod
```

### Твърде честo изпълнение

Проверете дали нямате дублирани записи в `vercel.json` — всеки път трябва да се появи само веднъж.

## Ръководство за миграция

### Local → Vercel Crons

1. Добавете cron записи в `vercel.json`
2. Генерирайте и задайте `CRON_SECRET`
3. Преразпределете в Vercel

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
