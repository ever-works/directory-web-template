---
id: environment-reference
title: Riferimento Completo Variabili d'Ambiente
sidebar_label: Riferimento Ambiente
sidebar_position: 1
---

# Riferimento Completo Variabili d'Ambiente

Questa pagina fornisce un riferimento completo di tutte le variabili d'ambiente utilizzate dal template Ever Works. Le variabili sono organizzate per categoria con i loro tipi, valori predefiniti e se sono obbligatorie.

Copia `.env.example` in `.env.local` e inserisci i valori per la tua distribuzione.

## Contenuto & Repository dati

| Variabile | Tipo | Obbligatoria | Predefinito | Descrizione |
|-----------|------|--------------|-------------|-------------|
| `DATA_REPOSITORY` | string (URL) | **Sì** | -- | URL del repository Git per i dati del contenuto |
| `GH_TOKEN` | string | No | -- | Token di accesso personale GitHub (per repo privati) |
| `GITHUB_TOKEN` | string | No | -- | Variabile token GitHub alternativa |
| `GITHUB_BRANCH` | string | No | `master` | Branch Git da cui clonare il contenuto |

## Database

| Variabile | Tipo | Obbligatoria | Predefinito | Descrizione |
|-----------|------|--------------|-------------|-------------|
| `DATABASE_URL` | string | Consigliata | -- | Stringa di connessione al database (SQLite o Postgres) |

Quando `DATABASE_URL` non è impostata, le funzionalità dipendenti dal database (valutazioni, commenti, preferiti, sondaggi, elementi in evidenza) vengono automaticamente disabilitate tramite il sistema di flag di funzionalità.

## Autenticazione

| Variabile | Tipo | Obbligatoria | Predefinito | Descrizione |
|-----------|------|--------------|-------------|-------------|
| `AUTH_SECRET` | string | **Sì** | -- | Segreto NextAuth (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **Sì** | -- | Segreto di crittografia cookie |
| `COOKIE_DOMAIN` | string | No | -- | Dominio cookie (es. `localhost`) |
| `COOKIE_SECURE` | boolean | No | `true` | Flag cookie sicuro |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | No | `15m` | TTL token di accesso |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | No | `7d` | TTL token di aggiornamento |

### Provider OAuth

| Variabile | Tipo | Obbligatoria | Descrizione |
|-----------|------|--------------|-------------|
| `GOOGLE_CLIENT_ID` | string | No | ID client OAuth Google |
| `GOOGLE_CLIENT_SECRET` | string | No | Segreto client OAuth Google |
| `GITHUB_CLIENT_ID` | string | No | ID client OAuth GitHub |
| `GITHUB_CLIENT_SECRET` | string | No | Segreto client OAuth GitHub |
| `MICROSOFT_CLIENT_ID` | string | No | ID client OAuth Microsoft |
| `MICROSOFT_CLIENT_SECRET` | string | No | Segreto client OAuth Microsoft |
| `FB_CLIENT_ID` | string | No | ID client OAuth Facebook |
| `FB_CLIENT_SECRET` | string | No | Segreto client OAuth Facebook |
| `X_CLIENT_ID` | string | No | ID client OAuth X (Twitter) |
| `X_CLIENT_SECRET` | string | No | Segreto client OAuth X (Twitter) |
| `LINKEDIN_CLIENT_ID` | string | No | ID client OAuth LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | string | No | Segreto client OAuth LinkedIn |

I provider OAuth si abilitano automaticamente quando sono impostati sia l'ID client che il segreto.

## Sito & Branding (Sicuro per il client)

Tutte le variabili `NEXT_PUBLIC_*` vengono esposte al browser.

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | URL dell'app directory |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | URL del sito web pubblico aziendale |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | URL base API |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | Nome del sito per i metadati |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | Slogan del sito |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | Nome del brand per schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (vedere .env.example) | Descrizione SEO (meno di 160 caratteri) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | Parole chiave SEO separate da virgola |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Percorso logo (relativo a /public) |

### Tema immagine OG

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | Colore di inizio del gradiente immagine OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | Colore di fine del gradiente immagine OG |

### Link social media

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | Link GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | Link X (Twitter) |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (vedere .env.example) | Link LinkedIn |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (vedere .env.example) | Link Facebook |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | Link blog |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | Email di contatto |

### Attribuzione

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | URL del link "Realizzato con" |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | Testo del link "Realizzato con" |

## Provider di pagamento

### Stripe

| Variabile | Tipo | Obbligatoria | Descrizione |
|-----------|------|--------------|-------------|
| `STRIPE_SECRET_KEY` | string | No | Chiave segreta Stripe (solo server) |
| `STRIPE_PUBLISHABLE_KEY` | string | No | Chiave pubblicabile Stripe |
| `STRIPE_WEBHOOK_SECRET` | string | No | Segreto di firma webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | No | Chiave pubblicabile sicura per il client |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | No | Carica prezzi dall'API Stripe |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | No | Abilita checkout Stripe |

#### ID prezzo multi-valuta Stripe

Per i piani Standard e Premium, il template supporta ID prezzo specifici per valuta:

```
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=
...
```

Lo stesso modello si applica alle variabili del piano Premium e agli ID di commissione di installazione.

### LemonSqueezy

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `LEMONSQUEEZY_API_KEY` | string | Chiave API |
| `LEMONSQUEEZY_STORE_ID` | string | Identificatore store |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Segreto webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | URL endpoint webhook |
| `LEMONSQUEEZY_TEST_MODE` | boolean | Abilita modalità test |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | Variante piano gratuito |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | Variante piano standard |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | Variante piano premium |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | Abilita checkout |

### Polar

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `POLAR_ACCESS_TOKEN` | string | Token di accesso |
| `POLAR_WEBHOOK_SECRET` | string | Segreto webhook |
| `POLAR_ORGANIZATION_ID` | string | ID organizzazione |
| `POLAR_SANDBOX` | boolean | Modalità sandbox (predefinito: `true`) |
| `POLAR_API_URL` | string (URL) | URL API personalizzato |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | ID piano gratuito |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | ID piano standard |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | ID piano premium |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | Abilita checkout |

### Solidgate

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `SOLIDGATE_API_KEY` | string | Chiave API |
| `SOLIDGATE_SECRET_KEY` | string | Chiave segreta |
| `SOLIDGATE_WEBHOOK_SECRET` | string | Segreto webhook |
| `SOLIDGATE_MERCHANT_ID` | string | ID commerciante |
| `SOLIDGATE_API_BASE_URL` | string (URL) | URL base API |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | Chiave sicura per il client |

### Prezzi prodotto

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | Prezzo livello gratuito |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | Prezzo livello standard |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | Prezzo livello premium |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | ID importo di prova premium |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | ID importo di prova standard |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | Abilita importi di prova |

## Analisi & Monitoraggio

### PostHog

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | Chiave API del progetto PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | Host PostHog |
| `POSTHOG_DEBUG` | boolean | `false` | Abilita registrazione debug |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | Registrazione sessione |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | Acquisizione automatica eventi |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | Chiave API lato server |
| `POSTHOG_PROJECT_ID` | string | -- | ID progetto per analisi |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | Tracciamento eccezioni |

### Sentry

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | DSN Sentry |
| `SENTRY_ORG` | string | `ever-co` | Organizzazione Sentry |
| `SENTRY_PROJECT` | string | `ever-works` | Nome progetto Sentry |
| `SENTRY_AUTH_TOKEN` | string | -- | Token di autenticazione Sentry |
| `SENTRY_ENABLE_DEV` | boolean | `false` | Abilita in sviluppo |
| `SENTRY_DEBUG` | boolean | `false` | Modalità debug |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | Tracciamento eccezioni |

### Altre analisi

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | Provider eccezioni (`posthog` o `sentry`) |
| `ANALYZE` | boolean | `true` | Abilita analisi bundle |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | Chiave sito reCAPTCHA |
| `RECAPTCHA_SECRET_KEY` | string | -- | Chiave segreta reCAPTCHA |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | Frequenza di campionamento Speed Insights |

## Email

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `EMAIL_PROVIDER` | string | `resend` | Provider email (`resend` o `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | Indirizzo mittente per le notifiche |
| `EMAIL_SUPPORT` | string | `support@ever.works` | Indirizzo email di supporto |
| `COMPANY_NAME` | string | `Ever Works` | Nome azienda per i modelli email |
| `RESEND_API_KEY` | string | -- | Chiave API Resend |
| `NOVU_API_KEY` | string | -- | Chiave API Novu |
| `SMTP_HOST` | string | -- | Hostname del server SMTP |
| `SMTP_PORT` | number | `587` | Porta SMTP |
| `SMTP_USER` | string | -- | Nome utente SMTP |
| `SMTP_PASSWORD` | string | -- | Password SMTP |

## Integrazioni

### Twenty CRM

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | URL istanza Twenty CRM |
| `TWENTY_CRM_API_KEY` | string | -- | Chiave API per autenticazione |
| `TWENTY_CRM_ENABLED` | boolean | `false` | Abilitazione/disabilitazione esplicita |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | Modalità sincronizzazione (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (Job in background)

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | Abilita Trigger.dev |
| `TRIGGER_DEV_API_KEY` | string | -- | Chiave API |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | URL API personalizzato |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | Ambiente (`development`, `staging`, `production`) |

### Job Cron

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `CRON_SECRET` | string | Segreto di autenticazione per gli endpoint cron |

### Mappe & Posizione

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | Token pubblico Mapbox (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | Chiave Google Maps con restrizioni browser |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | ID mappa Google Maps |

### API della piattaforma Ever Works

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | URL API della piattaforma |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | Token di autenticazione API della piattaforma |

## Vercel & Distribuzione

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `VERCEL_TOKEN` | string | Token di accesso personale Vercel |
| `VERCEL_PROJECT_ID` | string | ID progetto Vercel |
| `VERCEL_TEAM_SCOPE` | string | ID team Vercel |
| `VERCEL_PLAN` | string | Tipo di piano (`pro` per cron da 5 minuti) |
| `VERCEL_DEPLOYMENT_ID` | string | ID distribuzione corrente |
| `CRON_FREQUENCY` | string | Frequenza cron forzata (es. `5min`) |

## Demo & Seeding

| Variabile | Tipo | Predefinito | Descrizione |
|-----------|------|-------------|-------------|
| `NEXT_PUBLIC_DEMO` | boolean | `true` | Abilita modalità demo con dati di esempio |
| `SEED_ADMIN_EMAIL` | string | `admin@changeme.com` | Email utente admin per il seeding |
| `SEED_ADMIN_PASSWORD` | string | `changeme_password` | Password utente admin per il seeding |
| `SEED_FAKE_USER_COUNT` | number | `10` | Numero di utenti fittizi da generare |
| `NODE_ENV` | string | `development` | Ambiente Node |

## File correlati

- `.env.example` -- File template con tutte le variabili e documentazione inline
- `lib/config/schemas/*.schema.ts` -- Schemi di validazione Zod per ogni categoria
- `lib/config/config-service.ts` -- Validazione centralizzata e accesso
- `lib/config/client.ts` -- Modulo di configurazione sicuro per il client
