---
id: collection-endpoints
title: Конечные точки API коллекций (подробно)
sidebar_label: Коллекции
sidebar_position: 11
---

# Конечные точки API коллекций (подробно)

Публичный API коллекций позволяет проверять наличие активных коллекций в базе данных.

**Источник:** `template/app/api/collections/exists/route.ts`

## Маршрут

| Метод | Путь | Аутентификация | Описание |
|--------|------|-------|-------------|
| `GET` | `/api/collections/exists` | Нет | Проверить наличие коллекций |

---

## GET `/api/collections/exists`

Проверяет, есть ли активные коллекции. Используется фронтендом для условного отображения элементов навигации коллекций.

### Как работает

```ts
const collections = await collectionRepository.findAll({ includeInactive: false });
const hasCollections = Array.isArray(collections) && collections.length > 0;
return NextResponse.json({ exists: hasCollections, count: collections?.length || 0 });
```

### Формы ответа

**200 — Коллекции найдены:**

```json
{ "exists": true, "count": 5 }
```

**200 — Коллекций нет:**

```json
{ "exists": false, "count": 0 }
```

**500 — Ошибка сервера:**

```json
{ "exists": false, "count": 0, "error": "Failed to check collections existence" }
```

:::warning
В отличие от `/api/categories/exists`, эта конечная точка возвращает статус `500` при ошибке.
:::

## Отличия от API категорий

| Аспект | Категории | Коллекции |
|--------|-----------|----------|
| Источник данных | CMS (файловая система) | База данных |
| Ошибка | 200 + `exists: false` | 500 |
| Фильтр | Параметр locale | Только активные |
| Обращение к БД | Нет | Да |

## Связанные файлы

| Файл | Назначение |
|------|----------|
| `app/api/collections/exists/route.ts` | Обработчик маршрута |
| `lib/repositories/collection.repository.ts` | Доступ к данным |

## Связанная документация

- [Конечные точки API коллекций (кратко)](./collections-api-endpoints.md)
- [Конечные точки API категорий](./category-endpoints.md)
