---
id: internal-endpoints
title: "Вътрешни и системни крайни точки"
sidebar_label: "Вътрешни и системни"
sidebar_position: 17
---

# Вътрешни и системни крайни точки

Тези крайни точки осигуряват операции на системно ниво: инициализация на база данни, конфигуриране на флаг на функция, проверки на състоянието, информация за версията и синхронизиране на хранилище. Повечето се използват от самата платформа, а не от крайни потребители.

**Изходни файлове:**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## Крайна точка Резюме

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|ВЗЕМЕТЕ|`/api/internal/db-init`|Само за разработчици|Задействайте инициализация на база данни|
|ВЗЕМЕТЕ|`/api/config/features`|Няма|Получаване на флагове за наличност на функции|
|ВЗЕМЕТЕ|`/api/health/database`|Няма|Проверка на състоянието на базата данни|
|ВЗЕМЕТЕ|`/api/version`|Няма|Получете информация за версията на приложението|
|ВЗЕМЕТЕ|`/api/version/sync`|Няма|Получете състояние на синхронизиране|
|ПУБЛИКУВАНЕ|`/api/version/sync`|Няма|Задействайте ръчно синхронизиране на хранилището|

---

## GET `/api/internal/db-init`

Triggers automatic database migration and seeding if the database is not yet initialized.

### Security

This endpoint is **only available in development mode**. In production, it returns 403:

```ts
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json(
    { error: 'Not available in production' },
    { status: 403 }
  );
}
```

### Runtime Configuration

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Response: 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Response: 403 (Production)

```json
{
  "error": "Not available in production"
}
```

---

## ВЗЕМЕТЕ `/api/config/features`

Връща флагове за текуща наличност на функция въз основа на системната конфигурация (основно наличност на база данни). Това е **обществена крайна точка**, използвана от интерфейса за грациозна обработка на липсващи функции.

### Отговор: 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### Отговор: 200 (няма база данни)

Когато базата данни не е конфигурирана, всички функции са деактивирани:

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### Кеширане

Успешните отговори се кешират за 5 минути с остаряло повторно потвърждаване:

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

Отговорите за грешка използват `Cache-Control: no-cache`.

### Поведение при грешка

При грешка крайната точка връща всички функции като деактивирани (със състояние 500), за да гарантира, че интерфейсът се влошава елегантно.

---

## GET `/api/health/database`

A lightweight health check that tests the database connection by executing `SELECT 1`.

### Response: 200 (Healthy)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Response: 500 (Unhealthy)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Use Cases

- Kubernetes/Docker liveness and readiness probes
- Monitoring dashboards
- Deployment verification scripts
- Load balancer health checks

---

## ВЗЕМЕТЕ `/api/version`

Извлича изчерпателна информация за версията от хранилището за съдържание на Git, включително най-новите подробности за ангажимент, информация за автора, разклонение и състояние на синхронизация.

### Как работи

1. Потвърждава дали Git директорията съществува в пътя на съдържанието
2. Ако директорията `.git` липсва, прави опити за синхронизиране (полезно за студено стартиране на Vercel)
3. Чете последния комит с помощта на `isomorphic-git`
4. Връща форматирана информация за версията с кеширащи заглавки

### Отговор: 200

```json
{
  "commit": "a1b2c3d",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new feature for user management",
  "author": "John Doe",
  "repository": "https://github.com/user/repo.git",
  "lastSync": "2024-01-15T10:35:00.000Z",
  "branch": "main"
}
```

### Заглавки на отговорите

|Заглавка|Стойност|Описание|
|--------|-------|-------------|
|`Cache-Control`|`public, max-age=60, stale-while-revalidate=300`|1-минутен клиентски кеш|
|`ETag`|`"a1b2c3d-1705312200000"`|Въз основа на хеш за извършване|
|`Last-Modified`|`Mon, 15 Jan 2024 10:30:00 GMT`|Дата на ангажиране|

### Отговори за грешки

Всички грешки включват структуриран формат с код на грешка:

|Статус|Код|Състояние|
|--------|------|-----------|
| 404 |`REPOSITORY_NOT_FOUND`|Git директорията не съществува|
| 404 |`NO_COMMITS`|Хранилището няма ангажименти|
| 500 |`GIT_ERROR`|Неуспешно четене на информацията за ангажиране|
| 500 |`VALIDATION_ERROR`|В данните за ангажимент липсват задължителни полета|
| 500 |`INTERNAL_ERROR`|Неочаквана грешка|

```json
{
  "error": "Data repository not found",
  "code": "REPOSITORY_NOT_FOUND",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "details": "Git directory not found at: /path/to/content/.git"
}
```

---

## GET `/api/version/sync`

Returns the current synchronization status including whether a sync is in progress, when the last sync occurred, and server uptime.

### Response: 200

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": 300000,
  "timeSinceLastSyncHuman": "300s ago",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Response: 200 (Never Synced)

```json
{
  "syncInProgress": false,
  "lastSyncTime": null,
  "timeSinceLastSync": null,
  "timeSinceLastSyncHuman": "never",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## ПУБЛИКУВАНЕ `/api/version/sync`

Ръчно задейства фонова синхронизация на хранилището на Git съдържание. Предотвратява едновременни операции за синхронизиране (ако синхронизирането вече се изпълнява, то връща успех с информационно съобщение).

### Тяло на заявката

Не е задължително. Запазено за бъдеща употреба:

```json
{}
```

### Отговор: 200 (синхронизирането е завършено)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 1250,
  "message": "Repository synchronized successfully",
  "details": "Updated 5 files, 3 commits ahead"
}
```

### Отговор: 200 (Вече в ход)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 50,
  "message": "Sync was already in progress",
  "details": "Another sync operation is currently running"
}
```

### Отговор: 500

```json
{
  "success": false,
  "error": "Manual sync request failed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 800,
  "details": "Git fetch failed: network timeout"
}
```

Отговорите GET и POST включват `Cache-Control: no-cache, no-store, must-revalidate` за предотвратяване на остаряло състояние на синхронизиране.

---

## Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/internal/db-init/route.ts` | Database initialization endpoint |
| `template/app/api/config/features/route.ts` | Feature flags endpoint |
| `template/app/api/health/database/route.ts` | Database health check |
| `template/app/api/version/route.ts` | Version info endpoint |
| `template/app/api/version/sync/route.ts` | Sync trigger and status |
| `template/lib/db/initialize.ts` | Database initialization logic |
| `template/lib/config/feature-flags.ts` | Feature flag resolution |
| `template/lib/services/sync-service.ts` | Repository sync service |
| `template/lib/lib.ts` | Content path and filesystem utilities |
