---
id: environment-variables
title: Переменные Окружения
sidebar_label: Переменные Окружения
sidebar_position: 5
---

# Переменные Окружения

В этом руководстве описаны все переменные окружения, используемые Шаблоном Ever Works, включая значения по умолчанию, примеры значений и инструкции по настройке для каждой платформы.

## Обязательные переменные

### Настройки приложения

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
AUTH_SECRET=your-nextauth-secret-here  # openssl rand -base64 32
```

### Конфигурация базы данных

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional: Connection pool size (default: 20 in production, 10 in development)
DB_POOL_SIZE=20
```

### Аутентификация

```bash
# Auth
COOKIE_SECRET=your-cookie-secret-here  # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# OAuth providers (optional, but at least one recommended)
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Необязательные переменные

### Электронная почта

```bash
# Email (required for notifications and auth emails)
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com

# Or use specific SMTP settings:
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=username
EMAIL_SERVER_PASSWORD=password
```

### Аналитика

```bash
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

### Хранилище

```bash
# S3-compatible storage (for file uploads)
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=https://s3.amazonaws.com  # or custom endpoint for R2, etc.
```

## Настройка по платформам

### Vercel

1. Перейти в **Настройки проекта → Переменные окружения**
2. Добавить каждую переменную с подстановкой по среде (Production, Preview, Development)
3. Переменные с `NEXT_PUBLIC_` автоматически становятся доступны в браузере

**Обязательные переменные для Vercel:**
- `DATABASE_URL` — Строка подключения к базе данных
- `AUTH_SECRET` — Секрет NextAuth (генерируется командой `openssl rand -base64 32`)
- `COOKIE_SECRET` — Секрет cookie
- `NEXTAUTH_URL` — Публичный URL приложения (например `https://yourapp.vercel.app`)

**Переменные, устанавливаемые Vercel автоматически:**
- `VERCEL=1` — Определяет среду Vercel (используется для выбора cron-заданий)
- `VERCEL_URL` — URL текущего деплоя
- `VERCEL_ENV` — `production`, `preview` или `development`

### Netlify

1. Перейти в **Настройки сайта → Переменные окружения**
2. Добавить каждую переменную, опционально указав области видимости по контексту (Production/Deploy/Branch)
3. Выполнить повторный деплой после добавления переменных

### Docker / Самостоятельный хостинг

Создать файл `.env` в корневом каталоге приложения:

```bash
# .env (do not commit to git)
NODE_ENV=production
DATABASE_URL=postgresql://user:password@db:5432/myapp
AUTH_SECRET=your-secret-here
COOKIE_SECRET=another-secret-here
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
```

Для Docker Compose:

```yaml
services:
  web:
    image: your-app-image
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
```

## Лучшие практики безопасности

1. **Никогда не коммитить** `.env` или `.env.local` в систему контроля версий — проверить `.gitignore`
2. **Регулярно ротировать секреты**, особенно `AUTH_SECRET` и учётные данные OAuth
3. **Использовать переменные по средам** — разные значения для production/preview/development
4. **Безопасное хранение** — использовать хранилище секретов платформы (Vercel Encrypted Env, AWS Secrets Manager и т.д.)

## Скрипт валидации

Приложение валидирует обязательные переменные окружения при запуске. Проверить вручную:

```bash
node scripts/check-env.js
```

## Следующие шаги

- [Обзор развертывания](./overview.md)
- [Управление базой данных](./database-management.md)
- [Мониторинг и аналитика](./monitoring.md)
