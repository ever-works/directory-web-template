---
id: category-endpoints
title: Конечные точки API категорий (подробно)
sidebar_label: Конечная точка категорий
sidebar_position: 10
---

# Конечные точки API категорий (подробно)

Публичный REST API для работы с категориями справочника.

## Маршрут

| Метод | Путь | Аутентификация | Описание |
|--------|------|-------|-------------|
| `GET` | `/api/categories/exists` | Нет | Проверить наличие категорий |

## Проверка наличия категорий

```
GET /api/categories/exists
```

**Параметр запроса:** `locale` (необязательный) — код локали.

### Как работает

1. Вызывает `fetchItems` (функция загрузки категорий из CMS).
2. Считает количество загруженных категорий.
3. Возвращает `{ exists: boolean, count: number }`.

### Формы ответа

**Успех:**

```json
{ "exists": true, "count": 12 }
```

**Ошибка загрузки:**

```json
{ "exists": false, "count": 0 }
```

:::note
В случае ошибки API возвращает `200` с `{ exists: false, count: 0 }`, чтобы не прерывать рендеринг. В отличие от `/api/collections/exists`, который возвращает `500`.
:::

## Связанные файлы

| Файл | Назначение |
|------|----------|
| `app/api/categories/exists/route.ts` | Обработчик маршрута |
| `lib/repositories/category.repository.ts` | Доступ к данным |
| `lib/services/category.service.ts` | Бизнес-логика |

## Связанная документация

- [Конечные точки API категорий (кратко)](./categories-api-endpoints.md)
- [Конечные точки API коллекций](./collection-endpoints.md)
