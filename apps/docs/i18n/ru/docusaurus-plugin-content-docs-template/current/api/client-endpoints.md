---
id: client-endpoints
title: Конечные точки клиентского API (обзор)
sidebar_label: Конечные точки клиента
sidebar_position: 2
---

# Конечные точки клиентского API (обзор)

Клиентские API-маршруты обслуживают аутентифицированных пользователей (не-админов): дашборд, управление заявками, избранное, публичные взаимодействия (\u043aомментарии, голоса, просмотры).

## Дашборд и элементы (`/api/client`)

Все маршруты `/api/client/*` требуют аутентифицированной сессии с `clientProfileId`.

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/client/dashboard/stats` | Статистика дашборда |
| `GET` | `/api/client/items` | Список элементов |
| `POST` | `/api/client/items` | Отправить новый элемент |
| `GET` | `/api/client/items/stats` | Статистика заявок |
| `GET` | `/api/client/items/coordinates` | Координаты элементов |
| `GET` | `/api/client/items/[id]` | Подробности элемента |
| `PUT` | `/api/client/items/[id]` | Обновить свой элемент |
| `DELETE` | `/api/client/items/[id]` | Удалить свой элемент (мягко) |
| `POST` | `/api/client/items/[id]/restore` | Восстановить элемент |
| `GET` | `/api/client/geo-stats` | Географическая статистика |

## Публичные взаимодействия (`/api/items`)

### Комментарии

| Метод | Путь | Описание | Аутентификация |
|--------|------|-------------|-------|
| `GET` | `/api/items/[slug]/comments` | Список комментариев | Нет |
| `POST` | `/api/items/[slug]/comments` | Добавить комментарий | Требуется |
| `GET` | `/api/items/[slug]/comments/[commentId]` | Подробности | Нет |
| `PUT` | `/api/items/[slug]/comments/[commentId]` | Изменить комментарий | Требуется |
| `DELETE` | `/api/items/[slug]/comments/[commentId]` | Удалить | Требуется |

### Оценки

| Метод | Путь | Описание | Аутентификация |
|--------|------|-------------|-------|
| `GET` | `/api/items/[slug]/comments/rating` | Средняя оценка | Нет |
| `POST` | `/api/items/[slug]/comments/rating` | Оценить | Требуется |

### Голосование

| `GET` | `/api/items/[slug]/votes/count` | Количество голосов | Нет |
|--------|------|-------------|-------|
| `POST` | `/api/items/[slug]/votes` | Проголосовать | Требуется |

### Просмотры / Активность

| `POST` | `/api/items/[slug]/views` | Зафиксировать просмотр | Нет |
|--------|------|-------------|-------|
| `GET` | `/api/items/engagement` | Метрики вовлечённости | Нет |

## Избранное (`/api/favorites`)

Все маршруты требуют аутентификации.

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/favorites` | Список избранного |
| `POST` | `/api/favorites/[itemSlug]` | Переключить избранное |
| `DELETE` | `/api/favorites/[itemSlug]` | Удалить из избранного |

## Профиль пользователя (`/api/user`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/user/profile/location` | Гео-локация |
| `GET` | `/api/user/currency` | Валюта |
| `GET` | `/api/user/plan-status` | Статус подписки |
| `GET` | `/api/user/subscription` | Детали подписки |
| `GET` | `/api/user/payments` | История платежей |

## Текущий пользователь (`/api/current-user`)

| `GET` | `/api/current-user` | Данные сессии |

## Рекламные объявления (`/api/sponsor-ads/user`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/sponsor-ads/user` | Список объявлений |
| `GET` | `/api/sponsor-ads/user/stats` | Статистика объявлений |
| `PUT` | `/api/sponsor-ads/user/[id]` | Обновить |
| `POST` | `/api/sponsor-ads/user/[id]/cancel` | Отменить |
| `POST` | `/api/sponsor-ads/user/[id]/renew` | Продлить |

## Опросы (`/api/surveys`)

| Метод | Путь | Описание | Аут. |
|--------|------|-------------|------|
| `GET` | `/api/surveys` | Опубликованные опросы | Нет |
| `GET` | `/api/surveys/[surveyId]` | Подробности | Нет |
| `POST` | `/api/surveys/[surveyId]/responses` | Отправить ответ | Нет |

## Жалобы (`/api/reports`)

| `POST` | `/api/reports` | Отправить жалобу | Требуется |

## Публичные конечные точки

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/categories/exists` | Проверка наличия категорий |
| `GET` | `/api/collections/exists` | Проверка наличия коллекций |
| `GET` | `/api/featured-items` | Избранные элементы |
| `GET` | `/api/sponsor-ads` | Активные рекламные объявления |

## Пагинация

Списковые конечные точки поддерживают стандартные параметры: `page`, `limit`, `sort`, `order`. Ответы содержат метаданные пагинации:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```
