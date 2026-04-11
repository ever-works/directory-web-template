---
title: Configurazione Ambiente
sidebar_label: Configurazione Ambiente
sidebar_position: 3
---

# Configurazione Ambiente

Configurazione completa dell'ambiente per il template Ever Works.

## Variabili Richieste

```bash
# Base
NODE_ENV=development
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Autenticazione
AUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"
COOKIE_SECRET="your-cookie-secret"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/everworks"

# Contenuti
GH_TOKEN="github_pat_..."
DATA_REPOSITORY="https://github.com/your-org/your-data"
```

## Provider OAuth (Opzionale)

```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
FACEBOOK_CLIENT_ID="..."
TWITTER_CLIENT_ID="..."
MICROSOFT_CLIENT_ID="..."
```

## Elaborazione Pagamenti (Opzionale)

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
LEMON_SQUEEZY_API_KEY="..."
POLAR_ACCESS_TOKEN="..."
```

## Servizi Email (Opzionale)

```bash
SENDGRID_API_KEY="..."
RESEND_API_KEY="..."
MAILCHIMP_API_KEY="..."
```

## Analisi (Opzionale)

```bash
NEXT_PUBLIC_POSTHOG_KEY="..."
NEXT_PUBLIC_SENTRY_DSN="..."
```

## Generare il Segreto Auth
```bash
openssl rand -base64 32
```
