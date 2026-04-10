---
id: environment-variables
title: Zmienne Środowiskowe
sidebar_label: Zmienne Środowiskowe
sidebar_position: 5
---

# Zmienne Środowiskowe

Ten przewodnik opisuje wszystkie zmienne środowiskowe używane przez Szablon Ever Works, włącznie z ich domyślnymi ustawieniami, przykładowymi wartościami i instrukcjami konfiguracji według platformy.

## Zmienne Wymagane

### Ustawienia Aplikacji

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
AUTH_SECRET=your-nextauth-secret-here  # openssl rand -base64 32
```

### Konfiguracja Bazy Danych

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional: Connection pool size (default: 20 in production, 10 in development)
DB_POOL_SIZE=20
```

### Uwierzytelnianie

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

## Zmienne Opcjonalne

### E-mail

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

### Analityka

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

### Przechowywanie

```bash
# S3-compatible storage (for file uploads)
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=https://s3.amazonaws.com  # or custom endpoint for R2, etc.
```

## Konfiguracja według Platformy

### Vercel

1. Przejdź do **Ustawień Projektu → Zmienne Środowiskowe**
2. Dodaj każdą zmienną z podkładaniem wartości według środowiska (Produkcja, Preview, Programowanie)
3. Zmienne z `NEXT_PUBLIC_` są automatycznie ujawniane w przeglądarce

**Zmienne wymagane dla Vercel:**
- `DATABASE_URL` — Ciąg połączenia z bazą danych
- `AUTH_SECRET` — Secret NextAuth (wygenerowany przez `openssl rand -base64 32`)
- `COOKIE_SECRET` — Secret plików cookie
- `NEXTAUTH_URL` — Publiczny URL aplikacji (np. `https://yourapp.vercel.app`)

**Zmienne ustawiane automatycznie przez Vercel:**
- `VERCEL=1` — Wykrywa środowisko Vercel (używane do wyboru zadań cron)
- `VERCEL_URL` — Aktualny URL wdrożenia
- `VERCEL_ENV` — `production`, `preview` lub `development`

### Netlify

1. Przejdź do **Ustawień Strony → Zmienne Środowiskowe**
2. Dodaj każdą zmienną, opcjonalnie z zakresami według kontekstu (Produkcja/Wdrożenie/Gałąź)
3. Ponownie wdróż po dodaniu zmiennych

### Docker / Samodzielny Hosting

Utwórz plik `.env` w głównym katalogu aplikacji:

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

Dla Docker Compose:

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

## Najlepsze Praktyki Bezpieczeństwa

1. **Nigdy nie commituj** `.env` ani `.env.local` do kontroli wersji — sprawdź `.gitignore`
2. **Regularnie rotuj secrets**, szczególnie `AUTH_SECRET` i dane uwierzytelniające OAuth
3. **Używaj zmiennych per środowisko** — różne wartości dla produkcji/preview/deweloperskiego
4. **Bezpieczne przechowywanie** — używaj skarbca secrets platformy (Vercel Encrypted Env, AWS Secrets Manager itp.)

## Skrypt Walidacji

Aplikacja waliduje wymagane zmienne środowiskowe przy starcie. Sprawdź ręcznie:

```bash
node scripts/check-env.js
```

## Następne Kroki

- [Przegląd Wdrożenia](./overview.md)
- [Zarządzanie Bazą Danych](./database-management.md)
- [Monitorowanie & Analityka](./monitoring.md)
