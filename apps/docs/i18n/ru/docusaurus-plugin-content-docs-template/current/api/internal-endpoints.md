---
id: internal-endpoints
title: "Внутренние и системные конечные точки"
sidebar_label: "Внутренние и системные"
sidebar_position: 17
---

# Внутренние и системные конечные точки

Эти конечные точки обеспечивают операции на уровне системы: инициализацию базы данных, настройку флагов функций, проверки работоспособности, информацию о версии и синхронизацию репозитория. Большинство из них используются самой платформой, а не конечными пользователями.

**Исходные файлы:**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## Сводка конечных точек

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|ПОЛУЧИТЬ|`/api/internal/db-init`|только для разработчиков|Инициализация базы данных триггера|
|ПОЛУЧИТЬ|`/api/config/features`|Нет|Получить флаги доступности функций|
|ПОЛУЧИТЬ|`/api/health/database`|Нет|Проверка работоспособности базы данных|
|ПОЛУЧИТЬ|`/api/version`|Нет|Получить информацию о версии приложения|
|ПОЛУЧИТЬ|`/api/version/sync`|Нет|Получить статус синхронизации|
|ПОСТ|`/api/version/sync`|Нет|Запустить синхронизацию репозитория вручную|

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

## ПОЛУЧИТЬ `/api/config/features`

Возвращает текущие флаги доступности функций на основе конфигурации системы (в первую очередь доступности базы данных). Это **публичная конечная точка**, используемая интерфейсом для корректной обработки отсутствующих функций.

### Ответ: 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### Ответ: 200 (нет базы данных)

Если база данных не настроена, все функции отключены:

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### Кэширование

Успешные ответы кэшируются на 5 минут с устаревшей ревалидацией:

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

В ответах об ошибках используйте `Cache-Control: no-cache`.

### Поведение при ошибке

В случае ошибки конечная точка возвращает все функции как отключенные (со статусом 500), чтобы обеспечить корректное ухудшение работы внешнего интерфейса.

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

## ПОЛУЧИТЬ `/api/version`

Извлекает полную информацию о версии из репозитория содержимого Git, включая последние сведения о фиксации, информацию об авторе, ветке и статусе синхронизации.

### Как это работает

1. Проверяет, существует ли каталог Git по пути к содержимому.
2. Если каталог `.git` отсутствует, предпринимаются попытки синхронизации (полезно для холодного запуска на Vercel)
3. Считывает последний коммит, используя `isomorphic-git`.
4. Возвращает отформатированную информацию о версии с кеширующими заголовками.

### Ответ: 200

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

### Заголовки ответов

|Заголовок|Значение|Описание|
|--------|-------|-------------|
|`Cache-Control`|`public, max-age=60, stale-while-revalidate=300`|1-минутный кэш клиента|
|`ETag`|`"a1b2c3d-1705312200000"`|На основе хеша коммита|
|`Last-Modified`|`Mon, 15 Jan 2024 10:30:00 GMT`|Временная метка фиксации|

### Реакции на ошибки

Все ошибки имеют структурированный формат с кодом ошибки:

|Статус|Код|Состояние|
|--------|------|-----------|
| 404 |`REPOSITORY_NOT_FOUND`|Каталог Git не существует|
| 404 |`NO_COMMITS`|В репозитории нет коммитов|
| 500 |`GIT_ERROR`|Не удалось прочитать информацию о фиксации.|
| 500 |`VALIDATION_ERROR`|В данных фиксации отсутствуют обязательные поля|
| 500 |`INTERNAL_ERROR`|Неожиданная ошибка|

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

## ПОСТ `/api/version/sync`

Вручную запускает фоновую синхронизацию репозитория содержимого Git. Предотвращает одновременные операции синхронизации (если синхронизация уже запущена, она возвращает успех с информационным сообщением).

### Тело запроса

Необязательно. Зарезервировано для будущего использования:

```json
{}
```

### Ответ: 200 (синхронизация завершена)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 1250,
  "message": "Repository synchronized successfully",
  "details": "Updated 5 files, 3 commits ahead"
}
```

### Ответ: 200 (уже в процессе)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 50,
  "message": "Sync was already in progress",
  "details": "Another sync operation is currently running"
}
```

### Ответ: 500

```json
{
  "success": false,
  "error": "Manual sync request failed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 800,
  "details": "Git fetch failed: network timeout"
}
```

Ответы GET и POST включают `Cache-Control: no-cache, no-store, must-revalidate`, чтобы предотвратить устаревший статус синхронизации.

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
