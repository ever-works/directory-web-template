---
id: categories-api-endpoints
title: Конечные точки API категорий
sidebar_label: Конечные точки API категорий
sidebar_position: 56
---

# Конечные точки API категорий

Публичный API категорий, позволяющий проверять наличие категорий в базе данных.

## Маршрут

| Метод | Путь | Аутентификация | Описание |
|--------|------|-------|-------------|
| `GET` | `/api/categories/exists` | Нет | Проверить наличие категорий |

## Проверка наличия категорий

```
GET /api/categories/exists
```

**Параметры запроса:**

| Параметр | Тип | Обязательный | Описание |
|-----------|------|----------|-------------|
| `locale` | string | Нет | Код локали (`en`, `fr`, `es`, ...) |

**Пример запроса:**

```
GET /api/categories/exists?locale=en
```

**Ответ (успех):**

```json
{ "exists": true, "count": 24 }
```

**Ответ (ошибка):**

```json
{ "exists": false, "count": 0 }
```

:::note
В случае ошибки базы данных конечная точка возвращает `200` с `{ exists: false, count: 0 }`, а не `500`.
:::

## Пример на TypeScript

```typescript
const res = await fetch('/api/categories/exists?locale=en');
const { exists, count } = await res.json();
if (exists) {
  console.log(`Найдено ${count} категорий`);
}
```

## Связанная документация

- [Конечные точки API категорий (подробно)](./category-endpoints.md)
