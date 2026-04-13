---
id: auth-endpoints
title: Крайни точки на API за удостоверяване
sidebar_label: Крайни точки за удостоверяване
sidebar_position: 4
---

# Крайни точки на API за удостоверяване

Крайните точки за удостоверяване обработват обработката на маршрута на NextAuth.js, управлението на паролите и извличането на текущата потребителска сесия. Основният маршрут за улавяне на NextAuth автоматично управлява всички обратни извиквания на OAuth, управление на сесии и CSRF защита.

## Манипулатор на NextAuth (`/api/auth/[...nextauth]`)

Обхватният маршрут експортира манипулаторите на NextAuth от `lib/auth/index.ts`:

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

Този единствен маршрут обработва всички операции на NextAuth:

### ВЗЕМЕТЕ крайни точки (чрез NextAuth)

|Пътека|Описание|
|------|-------------|
|`/api/auth/signin`|Изобразяване на страница за вход или пренасочване към доставчик|
|`/api/auth/signout`|Справяне с излизането|
|`/api/auth/session`|Вземете текущата сесия като JSON|
|`/api/auth/csrf`|Вземете CSRF токен|
|`/api/auth/providers`|Избройте наличните доставчици на удостоверяване|
|`/api/auth/callback/[provider]`|Манипулатор за обратно извикване на OAuth|

### Крайни точки на POST (чрез NextAuth)

|Пътека|Описание|
|------|-------------|
|`/api/auth/signin/[provider]`|Инициирайте влизане с доставчика|
|`/api/auth/signout`|Обработете излизане|
|`/api/auth/callback/credentials`|Обработете влизане с идентификационни данни|
|`/api/auth/_log`|Auth.js вътрешно регистриране|

### Поток на обратно извикване на OAuth

Когато потребител се удостоверява с доставчик на OAuth:

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

### Персонализирани страници

NextAuth е конфигуриран да използва потребителски страници за удостоверяване, а не потребителския интерфейс на NextAuth по подразбиране:

|Цел|Персонализиран път|
|---------|-------------|
|Вход|`/auth/signin`|
|Излезте|`/auth/signout`|
|Грешка|`/auth/error`|
|Потвърдете заявката|`/auth/verify-request`|
|Регистрация на нов потребител|`/auth/register`|

## Управление на пароли (`/api/auth/change-password`)

|Метод|Пътека|Описание|
|--------|------|-------------|
|`POST`|`/api/auth/change-password`|Променете паролата на удостоверения потребител|

### Тяло на заявката

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

### Удостоверяване

Изисква валидна сесия. Крайната точка проверява текущата парола преди актуализиране.

### Отговор

```json
// Success
{ "success": true, "message": "Password changed successfully" }

// Error
{ "success": false, "error": "Current password is incorrect" }
```

## Текущ потребител (`/api/current-user`)

|Метод|Пътека|Описание|
|--------|------|-------------|
|`GET`|`/api/current-user`|Вземете текущи удостоверени потребителски данни|

### Отговор

Връща потребителския обект на сесията, обогатен със специфични за приложението полета:

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

### Неудостоверен отговор

Връща `null` или `401` състояние, когато не съществува валидна сесия.

## Обработка на токени за сесии

NextAuth съхранява сесийни токени в бисквитки само за HTTP:

|Име на бисквитката|Околна среда|
|------------|-------------|
|`next-auth.session-token`|Разработка (HTTP)|
|`__Secure-next-auth.session-token`|Продукция (HTTPS)|

### CSRF защита

NextAuth включва вградена CSRF защита. CSRF токен бисквитка (`next-auth.csrf-token`) е зададена на клиента и трябва да бъде включена с POST заявки към крайни точки на NextAuth.

## Обработка на грешки

Грешките при удостоверяване се нанасят в удобни за потребителя съобщения в `lib/auth/error-handler.ts`:

|Модел на грешка|Потребителско съобщение|
|--------------|--------------|
|`GOOGLE_CLIENT_ID` свързани|Удостоверяването на Google не е правилно конфигурирано|
|`GITHUB_CLIENT_ID` свързани|GitHub удостоверяването не е правилно конфигурирано|
|`FB_CLIENT_ID` свързани|Facebook удостоверяването не е правилно конфигурирано|
|`MICROSOFT_CLIENT_ID` свързани|Удостоверяването на Microsoft не е правилно конфигурирано|
|`SUPABASE` свързани|Supabase удостоверяването не е правилно конфигурирано|
|`NEXTAUTH` свързани|NextAuth не е правилно конфигуриран|

Функцията `handleAuthError()` улавя тези грешки и връща структуриран отговор `{ error: string }`.

## Събития за удостоверяване

Конфигурацията NextAuth в `lib/auth/index.ts` обработва събития от жизнения цикъл:

### Събитие за излизане

Анулира кеша на сесията за потребителя, за да гарантира, че не се обслужват остарели данни от сесията:

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

### Събитие за актуализация на потребителя

Анулира кеша на сесията при промяна на потребителските данни (напр. актуализация на профил, промяна на роля):

```typescript
events: {
  updateUser: async ({ user }) => {
    if (user?.id) {
      await invalidateSessionCache(undefined, user.id);
    }
  }
}
```

## Свързана конфигурация

|Файл|Цел|
|------|---------|
|`auth.config.ts`|Конфигурация на доставчик от най-високо ниво|
|`lib/auth/index.ts`|Екземпляр на NextAuth с обратни извиквания и събития|
|`lib/auth/providers.ts`|Фабрика на доставчик на OAuth|
|`lib/auth/credentials.ts`|Доставчик на имейл/парола|
|`lib/auth/cached-session.ts`|Слой за кеширане на сесии|
|`lib/auth/admin-guard.ts`|Администраторски маршрут междинен софтуер|
