---
id: auth-endpoints
title: Конечные точки API аутентификации
sidebar_label: Конечные точки аутентификации
sidebar_position: 4
---

# Конечные точки API аутентификации

Конечные точки аутентификации обрабатывают маршруты NextAuth.js, управление паролем и получение текущей сессии.

## Обработчик NextAuth (`/api/auth/[...nextauth]`)

```typescript
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

### GET-маршруты (via NextAuth)

| Путь | Описание |
|------|-------------|
| `/api/auth/signin` | Страница входа |
| `/api/auth/signout` | Выход |
| `/api/auth/session` | Текущая сессия как JSON |
| `/api/auth/csrf` | CSRF-токен |
| `/api/auth/providers` | Список поставщиков |
| `/api/auth/callback/[provider]` | Обратный вызов OAuth |

### POST-маршруты (via NextAuth)

| Путь | Описание |
|------|-------------|
| `/api/auth/signin/[provider]` | Инициировать вход |
| `/api/auth/signout` | Обработка выхода |
| `/api/auth/callback/credentials` | Вход по email/паролю |

### Пользовательские страницы

| Назначение | Путь |
|---------|------|
| Вход | `/auth/signin` |
| Выход | `/auth/signout` |
| Ошибка | `/auth/error` |
| Регистрация | `/auth/register` |

## Управление паролем (`/api/auth/change-password`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `POST` | `/api/auth/change-password` | Смена пароля |

**Тело запроса:**

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

**Ответ:**

```json
// Успех
{ "success": true, "message": "Password changed successfully" }
// Ошибка
{ "success": false, "error": "Current password is incorrect" }
```

## Текущий пользователь (`/api/current-user`)

| Метод | Путь | Описание |
|--------|------|-------------|
| `GET` | `/api/current-user` | Получить данные текущего пользователя |

**Ответ:**

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "isAdmin": false,
    "clientProfileId": "profile-uuid",
    "provider": "google"
  }
}
```

## Обработка ошибок аутентификации

Ошибки преобразуются в понятные сообщения через `lib/auth/error-handler.ts`.

## Связанная конфигурация

| Файл | Назначение |
|------|----------|
| `auth.config.ts` | Конфигурация поставщиков |
| `lib/auth/index.ts` | Экземпляр NextAuth |
| `lib/auth/providers.ts` | Фабрика OAuth поставщиков |
| `lib/auth/credentials.ts` | Поставщик email/пароль |
| `lib/auth/cached-session.ts` | Кэширование сессий |
| `lib/auth/admin-guard.ts` | Миддлвер админа |
