---
title: Настройка среды
sidebar_label: Настройка среды
sidebar_position: 3
---

# Настройка среды

## Обязательные переменные

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
COOKIE_SECRET="your-cookie-secret"
DATABASE_URL="postgresql://user:password@localhost:5432/everworks"
GH_TOKEN="github_pat_..."
DATA_REPOSITORY="https://github.com/your-org/your-data"
```

## OAuth (опционально)
GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID, и т.д.

## Платежи (опционально)
STRIPE_SECRET_KEY, LEMON_SQUEEZY_API_KEY, POLAR_ACCESS_TOKEN

## Генерация Auth Secret
```bash
openssl rand -base64 32
```
