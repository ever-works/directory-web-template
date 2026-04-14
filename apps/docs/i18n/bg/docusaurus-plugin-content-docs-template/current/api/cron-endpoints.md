---
id: cron-endpoints
title: Крайни точки на Cron Job API
sidebar_label: Крайни точки на Cron
sidebar_position: 6
---

# Крайни точки на Cron Job API

Шаблонът включва три крайни точки на задание на cron, които се изпълняват на планирани интервали чрез Vercel Cron. Тези крайни точки обработват синхронизиране на съдържание, напомняния за абонамент и обработка на изтичане на абонамента.

## Конфигурация на Cron

Графиците на Cron са дефинирани в `vercel.json`:

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

## Синхронизиране на съдържание (`/api/cron/sync`)

|Метод|Пътека|График|Описание|
|--------|------|----------|-------------|
|`GET`|`/api/cron/sync`|Всеки ден в 3:00 ч. UTC|Синхронизирайте базирано на Git хранилище за съдържание|

### Какво прави

Заданието за синхронизиране на cron изтегля най-новото съдържание от конфигурираното хранилище на данни Git (`DATA_REPOSITORY`) и актуализира кеша за локално съдържание. Това гарантира, че приложението отразява всички промени, направени директно в хранилището на съдържание (напр. чрез сливане на GitHub PR).

### Процес на синхронизиране

```
1. Verify CRON_SECRET authorization
2. Check if sync is already in progress (mutex lock)
3. Pull latest changes from remote Git repository
4. Parse and validate updated YAML content files
5. Update local content cache
6. Return sync result with duration
```

### Ключови поведения

- **Mutex lock**: Само една синхронизация може да се изпълнява в даден момент. Едновременните заявки се отхвърлят със съобщение за състояние
- **Изчакване**: Синхронизиращите операции имат 5-минутно изчакване, за да се предотвратят неуспешни процеси
- **Логика на повторен опит**: Неуспешните синхронизации се опитват отново до 3 пъти
- **Режим на разработка**: Автоматичното синхронизиране може да бъде деактивирано чрез `DISABLE_AUTO_SYNC=true` променлива на средата

### Отговор

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## Напомняния за абонамент (`/api/cron/subscription-reminders`)

|Метод|Пътека|График|Описание|
|--------|------|----------|-------------|
|`GET`|`/api/cron/subscription-reminders`|Всеки ден в 9:00 ч. UTC|Изпращайте напомняния за подновяване на абонамента|

### Какво прави

Запитва за абонаменти, наближаващи датата на тяхното подновяване, и изпраща напомняния по имейл на абонатите. Това помага за намаляване на неволното оттегляне, като предупреждава потребителите, преди тяхното плащане да бъде обработено.

### Логика за напомняне

```
1. Verify CRON_SECRET authorization
2. Query subscriptions renewing within reminder window
3. Filter out already-notified subscriptions
4. Send reminder emails via email notification service
5. Mark subscriptions as notified
6. Return count of reminders sent
```

### Windows за напомняне

Типични прозорци за напомняне:
- **7 дни преди подновяване**: Първо напомняне
- **1 ден преди подновяване**: Последно напомняне

### Отговор

```json
{
  "success": true,
  "message": "Subscription reminders sent",
  "data": {
    "reminders_sent": 15,
    "errors": 0
  }
}
```

## Изтичане на абонамента (`/api/cron/subscription-expiration`)

|Метод|Пътека|График|Описание|
|--------|------|----------|-------------|
|`GET`|`/api/cron/subscription-expiration`|Всеки ден в полунощ UTC|Обработка на изтекли абонаменти|

### Какво прави

Идентифицира абонаменти с изтекла дата и актуализира статуса им. Това обработва абонаменти, които са били анулирани, но са имали оставащо време, както и абонаменти, които не са успели да бъдат подновени.

### Процес на изтичане

```
1. Verify CRON_SECRET authorization
2. Query subscriptions with expiration date in the past
3. Update subscription status to 'expired'
4. Revoke associated access/permissions
5. Send expiration notification emails
6. Log expiration events for audit trail
7. Return count of processed expirations
```

### Отговор

```json
{
  "success": true,
  "message": "Subscription expirations processed",
  "data": {
    "expired": 3,
    "errors": 0
  }
}
```

## Фонови задачи (`/api/cron/jobs`)

Файлът `background-jobs-init.ts` в директорията за задания на cron инициализира обработката на задания във фонов режим. Това настройва всички повтарящи се задачи, които трябва да се изпълняват в рамките на времето за изпълнение на приложението.

## сигурност

### CRON_SECRET Проверка

Всички крайни точки на cron проверяват `CRON_SECRET` хедър или параметър на заявка, за да предотвратят неоторизирано изпълнение:

```typescript
// Typical cron authorization check
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Разрешаване на Vercel Cron

Когато се внедрят на Vercel, задачите на cron се извикват автоматично от програмата за планиране на cron на Vercel с подходящата заглавка `CRON_SECRET`. Тайната е конфигурирана в таблото за управление на Vercel в настройките на проекта.

|Променлива на средата|Описание|
|---------------------|-------------|
|`CRON_SECRET`|Споделена тайна за оторизация на работа на cron|

### Ръчно изпълнение

Крайните точки на Cron могат да бъдат задействани ръчно за отстраняване на грешки чрез включване на `CRON_SECRET` в заглавката за оторизация:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/sync
```

## Мониторинг

### Състояние на синхронизиране

Състоянието на задачата за синхронизиране на cron може да се наблюдава чрез:
- `/api/version/sync` - Връща времето и резултата за последно синхронизиране
- Сървърни регистрационни файлове – операциите по синхронизиране се записват с префикс `[SYNC_MANAGER]`

### Обработка на грешки

Всички задания на cron прилагат цялостна обработка на грешки:
- Неуспешните операции се регистрират с пълни подробности за грешката
- Частичните грешки не възпрепятстват обработката на останалите елементи
- Броят на грешките е включен в отговора за наблюдение
- Критичните повреди задействат конзолни грешки за предупреждения за агрегиране на регистрационни файлове

## Референтен график

|Cron израз|Значение|
|----------------|---------|
| `0 3 * * *` |Всеки ден в 3:00 ч. UTC|
| `0 9 * * *` |Всеки ден в 9:00 ч. UTC|
| `0 0 * * *` |Всеки ден в полунощ UTC|

Всички времена са в UTC. Вземете под внимание разпределението на часовите зони на вашата потребителска база, когато коригирате тези графици.
