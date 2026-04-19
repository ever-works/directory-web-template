---
id: version-sync-endpoints
title: "Справочник по API версий и синхронизации"
sidebar_label: "Версия и синхронизация"
sidebar_position: 58
---

# Справочник по API версий и синхронизации

## Обзор

Конечные точки версии и синхронизации предоставляют доступ к информации о версии контента приложения и элементам управления синхронизацией репозитория. Конечная точка версии считывает метаданные Git из репозитория контента, а конечные точки синхронизации позволяют запускать и отслеживать операции фоновой синхронизации репозитория.

## Конечные точки

### ПОЛУЧИТЬ /api/версию

Извлекает полную информацию о версии из репозитория содержимого Git, включая последние сведения о фиксации, автора, ветку и временную метку синхронизации. Автоматически пытается синхронизировать репозиторий, если каталог Git не найден (полезно для холодного запуска Vercel).

**Запрос**

Никаких параметров не требуется.

**Ответ**
```typescript
{
  commit: string;       // Short commit hash (7 characters), e.g. "a1b2c3d"
  date: string;         // Commit date in ISO 8601 format
  message: string;      // Commit message
  author: string;       // Commit author name
  repository: string;   // DATA_REPOSITORY URL or "unknown"
  lastSync: string;     // Current timestamp (ISO 8601) indicating when this info was fetched
  branch?: string;      // Current Git branch (defaults to "main")
}
```

**Заголовки ответов**
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag: "<commit-hash>-<timestamp>"`
- `Last-Modified: <commit-date>`

**Пример**
```typescript
const response = await fetch('/api/version');
const version = await response.json();
// { commit: "a1b2c3d", date: "2024-01-15T10:30:00.000Z", message: "Update content", author: "John", ... }
```

### POST /api/версия/синхронизация

Запускает ручную фоновую синхронизацию репозитория содержимого Git. Предотвращает одновременные операции синхронизации: если синхронизация уже выполняется, она немедленно возвращается с сообщением о состоянии.

**Запрос**
```typescript
{
  options?: object;   // Reserved for future use (optional)
}
```

Тело запроса совершенно необязательно.

**Ответ**
```typescript
// Successful sync
{
  success: true;
  timestamp: string;    // ISO 8601 completion timestamp
  duration: number;     // Operation duration in milliseconds
  message: string;      // e.g. "Repository synchronized successfully"
  details?: string;     // e.g. "Updated 5 files, 3 commits ahead"
}

// Sync already in progress
{
  success: true;
  timestamp: string;
  duration: number;
  message: "Sync was already in progress";
  details: "Another sync operation is currently running";
}

// Sync failed (status 500)
{
  success: false;
  error: string;        // e.g. "Manual sync request failed"
  timestamp: string;
  duration: number;
  details?: string;     // e.g. "Git fetch failed: network timeout"
}
```

**Пример**
```typescript
const response = await fetch('/api/version/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const result = await response.json();
console.log(`Sync completed in ${result.duration}ms: ${result.message}`);
```

### ПОЛУЧИТЬ /api/версию/синхронизацию

Возвращает текущий статус синхронизации, включая сведения о том, выполняется ли синхронизация, когда произошла последняя синхронизация, а также время работы сервера.

**Запрос**

Никаких параметров не требуется.

**Ответ**
```typescript
{
  syncInProgress: boolean;              // Whether a sync operation is currently running
  lastSyncTime: string | null;          // ISO 8601 timestamp of last successful sync
  timeSinceLastSync: number | null;     // Milliseconds since last sync
  timeSinceLastSyncHuman: string;       // Human-readable, e.g. "300s ago" or "never"
  uptime: number;                       // Server uptime in seconds
  timestamp: string;                    // Current server timestamp (ISO 8601)
}
```

**Пример**
```typescript
const response = await fetch('/api/version/sync');
const status = await response.json();

if (status.syncInProgress) {
  console.log('Sync is currently running...');
} else {
  console.log(`Last synced: ${status.timeSinceLastSyncHuman}`);
}
```

## Аутентификация

Все конечные точки версий и синхронизации являются **общедоступными** – аутентификация не требуется. Эти конечные точки предназначены для мониторинга панелей мониторинга и инструментов администрирования.

## Реакции на ошибки

### ПОЛУЧИТЬ /api/версию

|Статус|Код|Описание|
|--------|------|-------------|
| 404 |`REPOSITORY_NOT_FOUND`|Каталог Git репозитория контента не найден|
| 404 |`NO_COMMITS`|Репозиторий существует, но не содержит коммитов|
| 500 |`GIT_ERROR`|Не удалось прочитать журнал Git или информацию о фиксации.|
| 500 |`VALIDATION_ERROR`|В данных фиксации отсутствуют обязательные поля|
| 500 |`INTERNAL_ERROR`|Неожиданная ошибка времени выполнения|

Ответы на ошибки включают структурированное тело с `error`, `code`, `timestamp` и необязательными полями `details`.

### POST /api/версия/синхронизация

|Статус|Описание|
|--------|-------------|
| 200 |Синхронизация успешно завершена или уже выполняется|
| 500 |Не удалось выполнить операцию синхронизации (включая сведения о продолжительности и ошибке)|

## Ограничение скорости

- **GET /api/version**: кэшируется на стороне клиента в течение 1 минуты с 5-минутной повторной проверкой устаревших данных. Включает заголовки ETag и Last-Modified для условных запросов.
- **GET /api/version/sync** и **POST /api/version/sync**: без кэширования (`Cache-Control: no-cache, no-store, must-revalidate`). Предотвращение одновременной синхронизации гарантирует, что одновременно выполняется только одна синхронизация.

## Связанные конечные точки

- [Health Endpoints](./health-endpoints) — проверка работоспособности подключения к базе данных.
- [Конечные точки функции конфигурации](./config-feature-endpoints) – флаги доступности функции.
