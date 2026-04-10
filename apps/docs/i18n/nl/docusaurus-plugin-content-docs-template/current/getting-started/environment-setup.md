---
title: Omgevingsconfiguratie
sidebar_label: Omgevingsconfiguratie
sidebar_position: 3
---

# Omgevingsconfiguratie

Volledige omgevingsconfiguratie voor het Ever Works Template.

## Vereiste variabelen

```bash
# Basis
NODE_ENV=development
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Authenticatie
AUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"
COOKIE_SECRET="your-cookie-secret"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/everworks"

# Inhoud
GH_TOKEN="github_pat_..."
DATA_REPOSITORY="https://github.com/your-org/your-data"
```

## OAuth-providers (Optioneel)

```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
FACEBOOK_CLIENT_ID="..."
TWITTER_CLIENT_ID="..."
MICROSOFT_CLIENT_ID="..."
```

## Betalingsverwerking (Optioneel)

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
LEMON_SQUEEZY_API_KEY="..."
POLAR_ACCESS_TOKEN="..."
```

## E-maildiensten (Optioneel)

```bash
SENDGRID_API_KEY="..."
RESEND_API_KEY="..."
MAILCHIMP_API_KEY="..."
```

## Analyse (Optioneel)

```bash
NEXT_PUBLIC_POSTHOG_KEY="..."
NEXT_PUBLIC_SENTRY_DSN="..."
```

## Auth-geheim genereren
```bash
openssl rand -base64 32
```
