---
id: environment-variables
title: Променливи на Средата
sidebar_label: Променливи на Средата
sidebar_position: 5
---

# Променливи на Средата

Това ръководство описва всички променливи на средата, използвани от Шаблона Ever Works, включително техните стойности по подразбиране, примерни стойности и инструкции за конфигурация по платформи.

## Задължителни променливи

### Настройки на приложението

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
AUTH_SECRET=your-nextauth-secret-here  # openssl rand -base64 32
```

### Конфигурация на базата данни

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional: Connection pool size (default: 20 in production, 10 in development)
DB_POOL_SIZE=20
```

### Удостоверяване

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

## Незадължителни променливи

### Имейл

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

### Анализ

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

## Конфигурация по платформа

### Vercel

1. Отидете в **Настройки на проекта → Променливи на средата**
2. Добавете всяка променлива с подмяна по среда (Production, Preview, Development)
3. Променливите с `NEXT_PUBLIC_` се излагат автоматично на браузъра

**Задължителни променливи за Vercel:**
- `DATABASE_URL` — Низ за свързване с базата данни
- `AUTH_SECRET` — NextAuth тайна (генерирана с `openssl rand -base64 32`)
- `COOKIE_SECRET` — Тайна за бисквитките
- `NEXTAUTH_URL` — Публичният URL на приложението (напр. `https://yourapp.vercel.app`)

**Променливи, задавани автоматично от Vercel:**
- `VERCEL=1` — Открива среда Vercel (използвана за избор на cron задачи)
- `VERCEL_URL` — URL на текущото разпределение
- `VERCEL_ENV` — `production`, `preview` или `development`

### Netlify

1. Отидете в **Настройки на сайта → Променливи на средата**
2. Добавете всяка променлива, по избор с обхвати по контекст (Production/Deploy/Branch)
3. Преразпределете след добавяне на променливите

### Docker / Самостоятелен хостинг

Създайте `.env` файл в главната директория на приложението:

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

За Docker Compose:

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

## Добри практики за сигурност

1. **Никога не включвайте** `.env` или `.env.local` в контрола на версиите — проверете `.gitignore`
2. **Редовно ротирайте тайните**, особено `AUTH_SECRET` и OAuth идентификационни данни
3. **Използвайте променливи по среда** — различни стойности за production/preview/development
4. **Сигурно съхранение** — използвайте хранилището за тайни на платформата (Vercel Encrypted Env, AWS Secrets Manager и др.)

## Скрипт за валидация

Приложението валидира задължителните променливи на средата при стартиране. Проверете ръчно:

```bash
node scripts/check-env.js
```

## Следващи стъпки

- [Преглед на внедряването](./overview.md)
- [Управление на базата данни](./database-management.md)
- [Мониторинг и анализ](./monitoring.md)
