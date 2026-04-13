---
id: admin-endpoints
title: Конечные точки API администратора
sidebar_label: Конечные точки администратора
sidebar_position: 1
---

# Конечные точки API администратора

API администратора содержит около 60 обработчиков маршрутов в 19 группах ресурсов. Все конечные точки защищены миддлвером `withAdminAuth`.

## Аутентификация

Каждая конечная точка требует:

1. Действительную JWT-сессию (via `auth()`)
2. Роль администратора в таблице `user_roles` (via `isAdmin()` из `lib/db/roles.ts`)

Неаутентифицированные запросы получают `401`. Аутентифицированные, но неадминистративные — `403`.

## Группы ресурсов

### Категории (`/api/admin/categories`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/categories` | Список категорий |
| `POST` | `/api/admin/categories` | Создать категорию |
| `GET` | `/api/admin/categories/all` | Все категории |
| `POST` | `/api/admin/categories/git` | Синхронизация с Git |
| `POST` | `/api/admin/categories/reorder` | Изменить порядок |
| `GET` | `/api/admin/categories/[id]` | Получить по ID |
| `PUT` | `/api/admin/categories/[id]` | Обновить |
| `DELETE` | `/api/admin/categories/[id]` | Удалить |

### Клиенты (`/api/admin/clients`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/clients` | Список клиентов |
| `POST` | `/api/admin/clients/advanced-search` | Расширенный поиск |
| `POST` | `/api/admin/clients/bulk` | Групповые операции |
| `GET` | `/api/admin/clients/dashboard` | Панель управления |
| `GET` | `/api/admin/clients/stats` | Статистика |
| `GET` | `/api/admin/clients/[clientId]` | Получить по ID |
| `PUT` | `/api/admin/clients/[clientId]` | Обновить |
| `DELETE` | `/api/admin/clients/[clientId]` | Удалить |

### Коллекции (`/api/admin/collections`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/collections` | Список коллекций |
| `POST` | `/api/admin/collections` | Создать |
| `GET` | `/api/admin/collections/[id]` | Получить |
| `PUT` | `/api/admin/collections/[id]` | Обновить |
| `DELETE` | `/api/admin/collections/[id]` | Удалить |

### Комментарии (`/api/admin/comments`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/comments` | Список комментариев |
| `GET` | `/api/admin/comments/[id]` | Получить |
| `PUT` | `/api/admin/comments/[id]` | Обновить |
| `DELETE` | `/api/admin/comments/[id]` | Удалить |

### Компании (`/api/admin/companies`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/companies` | Список |
| `POST` | `/api/admin/companies` | Создать |
| `GET` | `/api/admin/companies/[id]` | Получить |
| `PUT` | `/api/admin/companies/[id]` | Обновить |
| `DELETE` | `/api/admin/companies/[id]` | Удалить |

### Элементы (`/api/admin/items`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/items` | Список элементов |
| `POST` | `/api/admin/items` | Создать |
| `POST` | `/api/admin/items/bulk` | Групповые операции |
| `GET` | `/api/admin/items/stats` | Статистика |
| `GET` | `/api/admin/items/[id]` | Получить |
| `PUT` | `/api/admin/items/[id]` | Обновить |
| `DELETE` | `/api/admin/items/[id]` | Удалить |
| `GET` | `/api/admin/items/[id]/history` | История изменений |
| `POST` | `/api/admin/items/[id]/review` | Проверка (одобрение/отклонение) |

### Уведомления (`/api/admin/notifications`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/notifications` | Список уведомлений |
| `POST` | `/api/admin/notifications/mark-all-read` | Отметить все прочитанными |
| `POST` | `/api/admin/notifications/[id]/read` | Отметить одно прочитанным |

### Роли (`/api/admin/roles`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/roles` | Список ролей |
| `POST` | `/api/admin/roles` | Создать роль |
| `GET` | `/api/admin/roles/active` | Активные роли |
| `GET` | `/api/admin/roles/stats` | Статистика |
| `GET` | `/api/admin/roles/[id]` | Получить |
| `PUT` | `/api/admin/roles/[id]` | Обновить |
| `DELETE` | `/api/admin/roles/[id]` | Удалить |
| `GET` | `/api/admin/roles/[id]/permissions` | Получить права |
| `PUT` | `/api/admin/roles/[id]/permissions` | Обновить права |

### Настройки (`/api/admin/settings`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/settings` | Получить настройки |
| `PUT` | `/api/admin/settings` | Обновить |
| `GET` | `/api/admin/settings/map-status` | Статус карты |

### Теги (`/api/admin/tags`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/tags` | Список |
| `POST` | `/api/admin/tags` | Создать |
| `GET` | `/api/admin/tags/all` | Все теги |
| `GET` | `/api/admin/tags/[id]` | Получить |
| `PUT` | `/api/admin/tags/[id]` | Обновить |
| `DELETE` | `/api/admin/tags/[id]` | Удалить |

### Пользователи (`/api/admin/users`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/admin/users` | Список |
| `POST` | `/api/admin/users` | Создать |
| `GET` | `/api/admin/users/stats` | Статистика |
| `GET` | `/api/admin/users/check-email` | Проверить наличие email |
| `GET` | `/api/admin/users/check-username` | Проверить наличие имени пользователя |
| `GET` | `/api/admin/users/[id]` | Получить |
| `PUT` | `/api/admin/users/[id]` | Обновить |
| `DELETE` | `/api/admin/users/[id]` | Удалить |

## Общие шаблоны

### Групповые операции

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### Конечные точки статистики

Большинство групп ресурсов имеют конечную точку `/stats`, возвращающую агрегированные счётчики.

### История аудита

Элементы поддерживают отслеживание изменений через `/[id]/history` — записы о том, кто и когда вносил изменения.
