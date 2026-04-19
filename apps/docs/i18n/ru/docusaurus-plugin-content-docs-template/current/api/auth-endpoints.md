---
id: auth-endpoints
title: Конечные точки API аутентификации
sidebar_label: Конечные точки аутентификации
sidebar_position: 4
---

# Конечные точки API аутентификации

Конечные точки аутентификации обрабатывают обработку маршрута NextAuth.js, управление паролями и получение текущего сеанса пользователя. Основной универсальный маршрут NextAuth автоматически управляет всеми обратными вызовами OAuth, управлением сеансами и защитой CSRF.

## Следующий обработчик аутентификации (`/api/auth/[...nextauth]`)

Общий маршрут экспортирует обработчики NextAuth из `lib/auth/index.ts`:

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

Этот единственный маршрут обрабатывает все операции NextAuth:

### ПОЛУЧИТЬ конечные точки (через NextAuth)

|Путь|Описание|
|------|-------------|
|`/api/auth/signin`|Отобразить страницу входа или перенаправить к провайдеру|
|`/api/auth/signout`|Обработка выхода из системы|
|`/api/auth/session`|Получить текущий сеанс в формате JSON|
|`/api/auth/csrf`|Получить токен CSRF|
|`/api/auth/providers`|Список доступных поставщиков аутентификации|
|`/api/auth/callback/[provider]`|Обработчик обратного вызова OAuth|

### Конечные точки POST (через NextAuth)

|Путь|Описание|
|------|-------------|
|`/api/auth/signin/[provider]`|Начать вход с помощью провайдера|
|`/api/auth/signout`|Процесс выхода из системы|
|`/api/auth/callback/credentials`|Обработка учетных данных для входа в систему|
|`/api/auth/_log`|Внутреннее ведение журнала Auth.js|

### Обратный вызов OAuth

Когда пользователь проходит аутентификацию с помощью провайдера OAuth:

```
1. User clicks "Sign in with Google"
2. Redirect to Google consent screen
3. Google redirects back to /api/auth/callback/google
4. NextAuth verifies the OAuth code
5. signIn callback runs (lib/auth/index.ts)
   -> Validates user email
   -> Allows account linking for OAuth
6. jwt callback enriches token
   -> Sets userId, provider, isAdmin
   -> Creates client profile for new OAuth users
7. Session created, user redirected to callback URL
```

### Пользовательские страницы

NextAuth настроен на использование пользовательских страниц аутентификации, а не пользовательского интерфейса NextAuth по умолчанию:

|Цель|Пользовательский путь|
|---------|-------------|
|Войти|`/auth/signin`|
|Выйти|`/auth/signout`|
|Ошибка|`/auth/error`|
|Подтвердить запрос|`/auth/verify-request`|
|Регистрация нового пользователя|`/auth/register`|

## Управление паролями (`/api/auth/change-password`)

|Метод|Путь|Описание|
|--------|------|-------------|
|`POST`|`/api/auth/change-password`|Изменить пароль аутентифицированного пользователя|

### Тело запроса

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

### Аутентификация

Требуется действительный сеанс. Конечная точка проверяет текущий пароль перед обновлением.

### Ответ

```json
// Success
{ "success": true, "message": "Password changed successfully" }

// Error
{ "success": false, "error": "Current password is incorrect" }
```

## Текущий пользователь (`/api/current-user`)

|Метод|Путь|Описание|
|--------|------|-------------|
|`GET`|`/api/current-user`|Получить текущие аутентифицированные данные пользователя|

### Ответ

Возвращает объект пользователя сеанса, обогащенный полями, специфичными для приложения:

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "isAdmin": false,
    "clientProfileId": "profile-uuid",
    "provider": "google"
  }
}
```

### Неаутентифицированный ответ

Возвращает статус `null` или `401`, если действительный сеанс не существует.

## Обработка токена сеанса

NextAuth хранит токены сеанса в файлах cookie только для HTTP:

|Имя файла cookie|Окружающая среда|
|------------|-------------|
|`next-auth.session-token`|Разработка (HTTP)|
|`__Secure-next-auth.session-token`|Производство (HTTPS)|

### CSRF-защита

NextAuth включает встроенную защиту CSRF. Файл cookie токена CSRF (`next-auth.csrf-token`) установлен на клиенте и должен быть включен в запросы POST к конечным точкам NextAuth.

## Обработка ошибок

Ошибки аутентификации сопоставляются с удобными для пользователя сообщениями в `lib/auth/error-handler.ts`:

|Шаблон ошибки|Сообщение пользователя|
|--------------|--------------|
|`GOOGLE_CLIENT_ID` связанное|Аутентификация Google настроена неправильно.|
|`GITHUB_CLIENT_ID` связанное|Аутентификация GitHub настроена неправильно.|
|`FB_CLIENT_ID` связанное|Аутентификация Facebook настроена неправильно|
|`MICROSOFT_CLIENT_ID` связанное|Аутентификация Microsoft настроена неправильно.|
|`SUPABASE` связанное|Аутентификация Supabase настроена неправильно.|
|`NEXTAUTH` связанное|NextAuth настроен неправильно.|

Функция `handleAuthError()` улавливает эти ошибки и возвращает структурированный ответ `{ error: string }`.

## События аутентификации

Конфигурация NextAuth в `lib/auth/index.ts` обрабатывает события жизненного цикла:

### Событие выхода из системы

Делает недействительным кэш сеанса для пользователя, чтобы гарантировать, что устаревшие данные сеанса не обслуживаются:

```typescript
events: {
  signOut: async (event) => {
    const token = 'token' in event ? event.token : undefined;
    if (token?.userId) {
      await invalidateSessionCache(undefined, token.userId);
    }
  }
}
```

### Событие обновления пользователя

Делает кэш сеанса недействительным при изменении пользовательских данных (например, обновлении профиля, смене роли):

```typescript
events: {
  updateUser: async ({ user }) => {
    if (user?.id) {
      await invalidateSessionCache(undefined, user.id);
    }
  }
}
```

## Сопутствующая конфигурация

|Файл|Цель|
|------|---------|
|`auth.config.ts`|Конфигурация провайдера верхнего уровня|
|`lib/auth/index.ts`|Экземпляр NextAuth с обратными вызовами и событиями|
|`lib/auth/providers.ts`|Фабрика поставщиков OAuth|
|`lib/auth/credentials.ts`|Поставщик электронной почты/пароля|
|`lib/auth/cached-session.ts`|Уровень кэширования сеанса|
|`lib/auth/admin-guard.ts`|Промежуточное программное обеспечение маршрута администратора|
