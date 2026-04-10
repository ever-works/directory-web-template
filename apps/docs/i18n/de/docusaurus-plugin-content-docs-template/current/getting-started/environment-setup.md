---
title: Umgebungskonfiguration
sidebar_label: Umgebungskonfiguration
sidebar_position: 3
---

# Umgebungskonfiguration

Vollständige Umgebungskonfiguration für das Ever Works Template.

## Erforderliche Variablen

```bash
# Grundlage
NODE_ENV=development
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Authentifizierung
AUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"
COOKIE_SECRET="your-cookie-secret"

# Datenbank
DATABASE_URL="postgresql://user:password@localhost:5432/everworks"

# Inhalt
GH_TOKEN="github_pat_..."
DATA_REPOSITORY="https://github.com/your-org/your-data"
```

## OAuth-Anbieter (Optional)

```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
FACEBOOK_CLIENT_ID="..."
TWITTER_CLIENT_ID="..."
MICROSOFT_CLIENT_ID="..."
```

## Zahlungsverarbeitung (Optional)

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
LEMON_SQUEEZY_API_KEY="..."
POLAR_ACCESS_TOKEN="..."
```

## E-Mail-Dienste (Optional)

```bash
SENDGRID_API_KEY="..."
RESEND_API_KEY="..."
MAILCHIMP_API_KEY="..."
```

## Analysen (Optional)

```bash
NEXT_PUBLIC_POSTHOG_KEY="..."
NEXT_PUBLIC_SENTRY_DSN="..."
```

## Auth-Secret generieren
```bash
openssl rand -base64 32
```
