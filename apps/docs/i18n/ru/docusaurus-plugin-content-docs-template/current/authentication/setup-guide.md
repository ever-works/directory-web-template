---
id: setup-guide
title: Руководство по Настройке Аутентификации
sidebar_label: Руководство по Настройке
sidebar_position: 2
---

# Руководство по Настройке Аутентификации

Как настроить аутентификацию в вашем приложении Ever Works.

## Необходимые Переменные Окружения

```env
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Генерация Безопасного Секрета:
```bash
openssl rand -base64 32
# или
npx auth secret
```

## Настройка OAuth-провайдера

Добавьте в .env.local:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## Конфигурация NextAuth.js

Конфигурация auth находится в apps/web/auth.config.ts. Включает:
- Стратегию сессии: JWT
- Коллбэки для данных сессии
- Обработчики событий для создания пользователей

## Тестирование Аутентификации

1. Запустите сервер разработки: pnpm run dev
2. Перейдите на http://localhost:3000/sign-in
3. Протестируйте с учётными данными
4. Протестируйте OAuth-потоки
