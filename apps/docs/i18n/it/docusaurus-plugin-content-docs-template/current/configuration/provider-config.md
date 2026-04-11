---
id: provider-config
title: "Configurazione Provider"
sidebar_label: "Configurazione Provider"
sidebar_position: 4
---

# Configurazione Provider

Il template utilizza un singleton `ConfigService` centralizzato per gestire tutti i provider di servizi esterni. Ogni provider è configurato tramite schemi validati con Zod con rilevamento automatico delle funzionalità -- i provider vengono abilitati quando le credenziali richieste sono presenti.

## Architettura ConfigService

Il `ConfigService` in `lib/config/config-service.ts` è un singleton solo lato server che valida tutte le variabili d'ambiente all'avvio:

```ts
import { configService } from '@/lib/config';

// Accesso alle sezioni di configurazione
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

Il servizio è organizzato in sei sezioni, ognuna con il proprio schema Zod:

| Sezione | Accessor | File Schema |
|---------|----------|-------------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### Import Tree-Shakeable

Le singole sezioni possono essere importate direttamente per un migliore tree-shaking:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### Validazione all'Avvio

Tutta la configurazione viene validata con Zod al primo import. I valori non validi attivano i fallback `.catch()` dove possibile, mentre gli errori veramente irrecuperabili vengono lanciati all'avvio:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## Provider di Autenticazione

Definito in `lib/config/schemas/auth.schema.ts`. I provider OAuth rilevano automaticamente l'abilitazione:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### Provider OAuth Supportati

| Provider | Variabile Client ID | Variabile Client Secret |
|----------|---------------------|-------------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### Backend Auth Supabase

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| Variabile | Descrizione |
|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave anonima Supabase |

### Impostazioni Auth Aggiuntive

| Variabile | Predefinito | Descrizione |
|-----------|-------------|-------------|
| `AUTH_SECRET` | -- | Richiesto per la firma della sessione |
| `COOKIE_SECRET` | -- | Segreto di crittografia dei cookie |
| `COOKIE_DOMAIN` | `'localhost'` | Dominio cookie |
| `COOKIE_SECURE` | `false` | Cookie solo HTTPS |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | TTL del token di accesso |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | TTL del token di aggiornamento |

## Provider di Pagamento

Definito in `lib/config/schemas/payment.schema.ts`. Ogni provider viene abilitato automaticamente quando le credenziali richieste sono impostate.

### Stripe

Abilitato automaticamente quando `secretKey` e `publishableKey` sono presenti:

| Variabile | Descrizione |
|-----------|-------------|
| `STRIPE_SECRET_KEY` | Chiave segreta lato server |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chiave pubblicabile lato client |
| `STRIPE_WEBHOOK_SECRET` | Verifica firma webhook |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | ID prezzo per piano gratuito |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | ID prezzo per piano standard |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | ID prezzo per piano premium |

### LemonSqueezy

Abilitato automaticamente quando `apiKey` e `storeId` sono presenti:

| Variabile | Descrizione |
|-----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Chiave API |
| `LEMONSQUEEZY_STORE_ID` | Identificatore store |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Segreto webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | URL endpoint webhook |
| `LEMONSQUEEZY_TEST_MODE` | Abilita modalità test (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | ID variante per piano gratuito |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | ID variante per piano standard |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | ID variante per piano premium |

### Polar

Abilitato automaticamente quando `accessToken` e `organizationId` sono presenti:

| Variabile | Predefinito | Descrizione |
|-----------|-------------|-------------|
| `POLAR_ACCESS_TOKEN` | -- | Token di accesso API |
| `POLAR_ORGANIZATION_ID` | -- | ID organizzazione |
| `POLAR_WEBHOOK_SECRET` | -- | Segreto webhook |
| `POLAR_SANDBOX` | `true` | Modalità sandbox (imposta `'false'` per produzione) |
| `POLAR_API_URL` | -- | URL API personalizzato |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | ID piano per livello gratuito |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | ID piano per livello standard |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | ID piano per livello premium |

### Visualizzazione Prezzi Prodotto

| Variabile | Predefinito | Descrizione |
|-----------|-------------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | Prezzo visualizzato per piano gratuito |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | Prezzo visualizzato per piano standard |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | Prezzo visualizzato per piano premium |

## Provider Email

Definito in `lib/config/schemas/email.schema.ts`.

### SMTP

Abilitato automaticamente quando `host`, `user` e `password` sono tutti presenti:

| Variabile | Predefinito | Descrizione |
|-----------|-------------|-------------|
| `SMTP_HOST` | -- | Hostname del server SMTP |
| `SMTP_PORT` | `587` | Porta del server SMTP |
| `SMTP_USER` | -- | Nome utente per autenticazione SMTP |
| `SMTP_PASSWORD` | -- | Password per autenticazione SMTP |

### Resend

Abilitato automaticamente quando `apiKey` è presente:

| Variabile | Descrizione |
|-----------|-------------|
| `RESEND_API_KEY` | Chiave API Resend |

### Novu

Abilitato automaticamente quando `apiKey` è presente:

| Variabile | Descrizione |
|-----------|-------------|
| `NOVU_API_KEY` | Chiave API Novu |

### Impostazioni Email

| Variabile | Predefinito | Descrizione |
|-----------|-------------|-------------|
| `COMPANY_NAME` | `'Ever Works'` | Nome azienda nei template email |
| `EMAIL_PROVIDER` | `'resend'` | Provider email attivo (`'resend'`, `'novu'`) |
| `EMAIL_FROM` | -- | Indirizzo email mittente |
| `EMAIL_SUPPORT` | -- | Indirizzo email supporto |

## Provider Analytics

Definito in `lib/config/schemas/analytics.schema.ts`.

### PostHog

Abilitato automaticamente quando `key` è presente:

| Variabile | Predefinito | Descrizione |
|-----------|-------------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | Chiave API progetto PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | URL host PostHog |
| `POSTHOG_DEBUG` | `false` | Abilita modalità debug |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | Abilita registrazione sessione |
| `POSTHOG_AUTO_CAPTURE` | `false` | Cattura automatica eventi |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | Traccia eccezioni |
| `POSTHOG_PERSONAL_API_KEY` | -- | Chiave API personale (dashboard admin) |
| `POSTHOG_PROJECT_ID` | -- | ID progetto (dashboard admin) |

### Sentry

Abilitato automaticamente quando `dsn` è presente:

| Variabile | Predefinito | Descrizione |
|-----------|-------------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | DSN Sentry |
| `SENTRY_ORG` | -- | Slug organizzazione Sentry |
| `SENTRY_PROJECT` | -- | Nome progetto Sentry |
| `SENTRY_AUTH_TOKEN` | -- | Token auth per source map |
| `SENTRY_ENABLE_DEV` | `false` | Abilita in sviluppo |
| `SENTRY_DEBUG` | `false` | Modalità debug |

### reCAPTCHA

Abilitato automaticamente quando sono presenti sia `siteKey` che `secretKey`:

| Variabile | Descrizione |
|-----------|-------------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Chiave sito lato client |
| `RECAPTCHA_SECRET_KEY` | Chiave segreta lato server |

### Vercel Analytics

| Variabile | Predefinito | Descrizione |
|-----------|-------------|-------------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | Abilita Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | Frequenza di campionamento (0--1) |

### Provider di Tracciamento Eccezioni

| Variabile | Predefinito | Descrizione |
|-----------|-------------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`, `'sentry'` o `'none'` |

## Verifica Stato Provider

```ts
import { configService } from '@/lib/config';

// Verifica se Stripe è configurato
if (configService.payment.stripe.enabled) {
  // Stripe è pronto per l'uso
}

// Verifica se è disponibile un provider email
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// Elenca i provider OAuth abilitati
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## File Correlati

| Percorso | Descrizione |
|----------|-------------|
| `lib/config/config-service.ts` | Singleton ConfigService |
| `lib/config/schemas/auth.schema.ts` | Schemi provider auth |
| `lib/config/schemas/payment.schema.ts` | Schemi provider pagamento |
| `lib/config/schemas/email.schema.ts` | Schemi provider email |
| `lib/config/schemas/analytics.schema.ts` | Schemi provider analytics |
| `lib/config/schemas/integrations.schema.ts` | Schemi provider integrazioni |
| `lib/config/schemas/core.schema.ts` | Schema configurazione core |
| `lib/config/types.ts` | Definizioni di tipo TypeScript |
| `lib/config/index.ts` | Export barrel |
| `.env.example` | Riferimento completo variabili d'ambiente |
