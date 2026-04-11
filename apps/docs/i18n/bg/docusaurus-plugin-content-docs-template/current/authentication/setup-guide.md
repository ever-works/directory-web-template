---
id: setup-guide
title: Ръководство за Настройка на Удостоверяването
sidebar_label: Ръководство за Настройка
sidebar_position: 2
---

# Ръководство за Настройка на Удостоверяването

Как да конфигурирате удостоверяването в приложението си Ever Works.

## Необходими Променливи на Средата

```env
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Генериране на Сигурен Секрет:
```bash
openssl rand -base64 32
# или
npx auth secret
```

## Настройка на OAuth Доставчик

Добавете към .env.local:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## Конфигурация на NextAuth.js

Конфигурацията на auth се намира в apps/web/auth.config.ts. Включва:
- Стратегия за сесии: JWT
- Обратни извиквания за данни на сесия
- Обработчици на събития за създаване на потребители

## Тестване на Удостоверяването

1. Стартирайте dev сървъра: pnpm run dev
2. Отидете на http://localhost:3000/sign-in
3. Тествайте с идентификационни данни
4. Тествайте OAuth потоци
