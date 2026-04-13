---
id: extract-api-endpoints
title: "Конечные точки API извлечения"
sidebar_label: "API извлечения"
---

# Конечные точки API извлечения

API извлечения предоставляет защищённый прокси-эндпойнт для извлечения метаданных элемента (название, описание, категории и др.) из заданного URL. Запросы перенаправляются в Platform API Ever Works для извлечения данных с помощью ИИ.

**Источник:** `template/app/api/extract/route.ts`

---

## Извлечение метаданных из URL

Извлекает метаданные элемента из заданного URL, проксируя запрос на Platform API.

| Свойство | Значение |
|----------|-------|
| **Метод** | `POST` |
| **Путь** | `/api/extract` |
| **Аутентификация** | Нет (публичная, но требует `PLATFORM_API_URL`) |

### Тело запроса

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

| Поле | Тип | Обязательное | Описание |
|-------|------|----------|----------|
| `url` | `string` (URI) | Да | URL для извлечения метаданных |
| `existingCategories` | `string[]` | Нет | Существующие категории для улучшения категоризации с помощью ИИ |

### Ответы

**Статус 200** — Извлечение успешно.

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "Извлечённое описание товара.",
    "category": "Productivity",
    "tags": ["automation", "workflow"]
  }
}
```

**Статус 200** — Функция отключена (Platform API не настроен).

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

:::note
Если `PLATFORM_API_URL` не задан, конечная точка возвращает `200` с `featureDisabled: true`, а не ошибку. Это позволяет фронтенду корректно скрыть функцию извлечения.
:::

**Статус 400** — Некорректный запрос.

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Статус 500** — Ошибка сервера.

```json
{
  "success": false,
  "error": "Internal server error during extraction"
}
```

### Переменные окружения

| Переменная | Обязательная | Описание |
|---------|----------|----------|
| `PLATFORM_API_URL` | Нет | Базовый URL Platform API. Если не задан, функция отключается. |
| `PLATFORM_API_SECRET_TOKEN` | Нет | Необязательный Bearer-токен для аутентификации в Platform API. |

### Имплементационные примечания

- Конечная точка выступает как **защищённый прокси** — URL и токен Platform API никогда не передаются клиенту.
- Вызывается эндпойнт `<PLATFORM_API_URL>/extract-item-details`.
- Поле `existingCategories` передаётся как `existing_data` в теле запроса Platform API.
