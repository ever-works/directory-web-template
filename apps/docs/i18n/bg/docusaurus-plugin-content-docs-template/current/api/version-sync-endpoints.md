---
id: version-sync-endpoints
title: "Версия и справка за API за синхронизиране"
sidebar_label: "Версия и синхронизиране"
sidebar_position: 58
---

# Версия и справка за API за синхронизиране

## Преглед

Крайните точки за версия и синхронизиране осигуряват достъп до информацията за версията на съдържанието на приложението и контролите за синхронизиране на хранилището. Крайната точка на версията чете метаданни на Git от хранилището на съдържание, докато крайните точки за синхронизиране позволяват задействане и наблюдение на операции за синхронизиране на фоновото хранилище.

## Крайни точки

### ВЗЕМЕТЕ /api/версия

Извлича изчерпателна информация за версията от хранилището за съдържание на Git, включително най-новите подробности за ангажимент, автор, клон и клеймо за време на синхронизиране. Автоматично се опитва да синхронизира хранилището, ако Git директорията не бъде намерена (полезно за студено стартиране на Vercel).

**Заявка**

Не са необходими параметри.

**Отговор**
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

**Заглавки на отговора**
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag: "<commit-hash>-<timestamp>"`
- `Last-Modified: <commit-date>`

**Пример**
```typescript
const response = await fetch('/api/version');
const version = await response.json();
// { commit: "a1b2c3d", date: "2024-01-15T10:30:00.000Z", message: "Update content", author: "John", ... }
```

### POST /api/версия/синхронизиране

Задейства ръчна фонова синхронизация на хранилището за съдържание на Git. Предотвратява едновременни операции за синхронизиране -- ако синхронизирането вече е в ход, то се връща незабавно със съобщение за състояние.

**Заявка**
```typescript
{
  options?: object;   // Reserved for future use (optional)
}
```

Основният текст на заявката е изцяло незадължителен.

**Отговор**
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

### ВЗЕМЕТЕ /api/версия/синхронизиране

Връща текущото състояние на синхронизиране, включително дали синхронизирането се изпълнява, кога е извършено последното синхронизиране и времето на работа на сървъра.

**Заявка**

Не са необходими параметри.

**Отговор**
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

## Удостоверяване

Всички крайни точки за версия и синхронизация са **публични** -- не се изисква удостоверяване. Тези крайни точки са предназначени за наблюдение на табла за управление и административни инструменти.

## Отговори за грешки

### ВЗЕМЕТЕ /api/версия

|Статус|Код|Описание|
|--------|------|-------------|
| 404 |`REPOSITORY_NOT_FOUND`|Git директория за хранилище на съдържание не е намерена|
| 404 |`NO_COMMITS`|Хранилището съществува, но не съдържа ангажименти|
| 500 |`GIT_ERROR`|Неуспешно четене на Git log или информация за ангажиране|
| 500 |`VALIDATION_ERROR`|В данните за ангажимент липсват задължителни полета|
| 500 |`INTERNAL_ERROR`|Неочаквана грешка по време на изпълнение|

Отговорите за грешки включват структурирано тяло с `error`, `code`, `timestamp` и незадължителни `details` полета.

### POST /api/версия/синхронизиране

|Статус|Описание|
|--------|-------------|
| 200 |Синхронизирането завърши успешно или вече е в ход|
| 500 |Операцията по синхронизиране е неуспешна (включва подробности за продължителността и грешката)|

## Ограничаване на скоростта

- **GET /api/version**: Кеширано за 1 минута от страна на клиента с 5-минутно остаряло повторно валидиране. Включва ETag и Last-Modified хедъри за условни заявки.
- **GET /api/version/sync** и **POST /api/version/sync**: Без кеширане (`Cache-Control: no-cache, no-store, must-revalidate`). Предотвратяването на едновременно синхронизиране гарантира, че само едно синхронизиране се изпълнява в даден момент.

## Свързани крайни точки

- [Крайни точки на изправност](./health-endpoints) -- Проверка на изправността на свързаността на базата данни
- [Конфигуриране на крайни точки на функции](./config-feature-endpoints) -- Флагове за наличност на функции
