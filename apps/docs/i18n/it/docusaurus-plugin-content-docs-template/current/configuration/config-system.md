---
id: config-system
title: Sistema di Configurazione
sidebar_label: Sistema di Configurazione
sidebar_position: 0
---

# Sistema di Configurazione

Il template Ever Works utilizza un sistema di configurazione centralizzato e type-safe costruito su schemi di validazione Zod. Tutte le variabili d'ambiente vengono validate all'avvio dell'applicazione, fornendo un feedback immediato su configurazioni mancanti o non valide. Il sistema supporta sia i segreti solo-server che le variabili pubbliche sicure per il client.

## Architettura

```
lib/config/
  config-service.ts        # Singleton ConfigService centralizzato
  client.ts                # Configurazione sicura per client (NEXT_PUBLIC_*)
  env.ts                   # Schema env legacy (configurazione API)
  server-config.ts         # Helper server deprecati (usa ConfigService)
  feature-flags.ts         # Flag di disponibilità delle funzionalità
  index.ts                 # Barrel export
  types.ts                 # Definizioni di tipi TypeScript
  schemas/
    index.ts               # Barrel export schema
    core.schema.ts         # URL, info sito, database, contenuti
    auth.schema.ts         # Segreti auth, provider OAuth, JWT, cookie
    email.schema.ts        # SMTP, Resend, configurazione Novu
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, prezzi
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # Barrel configurazione billing
    stripe.config.ts       # Configurazione specifica Stripe
    lemonsqueezy.config.ts # Configurazione LemonSqueezy
    polar.config.ts        # Configurazione Polar
    solidgate.config.ts    # Configurazione Solidgate
    types.ts               # Tipi di billing
  utils/
    env-parser.ts          # Utility di analisi variabili d'ambiente
    validation-logger.ts   # Formattazione e logging risultati validazione
```

## Singleton ConfigService

Il cuore del sistema di configurazione è la classe `ConfigService` in `lib/config/config-service.ts`. Essa:

1. Raccoglie tutte le variabili d'ambiente tramite funzioni collector
2. Le valida contro uno schema Zod combinato
3. Memorizza la configurazione validata come singleton
4. Fornisce getter tipizzati per ogni sezione di configurazione

```typescript
import { configService } from '@/lib/config';

// Accesso a sezioni specifiche
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### Esportazioni di Sezione

Per il tree-shaking e la comodità, le singole sezioni vengono anche esportate direttamente:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// Accesso diretto senza prefisso ConfigService
const dbUrl = coreConfig.DATABASE_URL;
```

### Applicazione Solo-Server

Il modulo `ConfigService` importa `'server-only'`, il che significa:

- Può essere utilizzato solo in Server Components, route API e codice lato server
- Tentare di importarlo in un Client Component produrrà un errore di build
- Questo previene l'esposizione accidentale di segreti come le chiavi API

## Configurazione Client (`lib/config/client.ts`)

La configurazione sicura per il client si trova in un modulo separato che legge solo le variabili `NEXT_PUBLIC_*`:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// Branding del sito
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // Link social media
siteConfig.attribution // Attribuzione "Built with"

// Prezzi
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// Ambiente
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

Questo modulo è sicuro da importare in qualsiasi componente, incluso il codice lato client.

## Schemi di Validazione

Ogni sezione di configurazione ha uno schema Zod dedicato in `lib/config/schemas/`:

### Schema Core (`core.schema.ts`)

Valida: `NODE_ENV`, `APP_URL`, `SITE_URL`, `API_BASE_URL`, `DATABASE_URL`, metadati del sito (nome, tagline, descrizione, parole chiave, logo), link social, tema immagine OG, attribuzione e impostazioni del repository dei contenuti.

### Schema Auth (`auth.schema.ts`)

Valida: `AUTH_SECRET`, `COOKIE_SECRET`, impostazioni di scadenza token JWT, configurazione cookie, credenziali provider OAuth (Google, GitHub, Microsoft, Facebook, X/Twitter, LinkedIn), configurazione Supabase e credenziali utente seed.

### Schema Email (`email.schema.ts`)

Valida: `EMAIL_PROVIDER` (resend/novu), `EMAIL_FROM`, `EMAIL_SUPPORT`, `COMPANY_NAME`, impostazioni SMTP (host, porta, utente, password), chiave API Resend e chiave API Novu.

### Schema Pagamento (`payment.schema.ts`)

Valida: Stripe (chiave segreta, chiave pubblicabile, segreto webhook, ID prezzo, prezzi dinamici, multi-valuta), LemonSqueezy (chiave API, ID store, webhook, ID variante), Polar (token di accesso, webhook, organizzazione, ID piano), prezzi prodotto, importi di prova.

### Schema Analitica (`analytics.schema.ts`)

Valida: PostHog (chiave, host, debug, registrazione sessione, auto-capture, chiave API personale, ID progetto), Sentry (DSN, organizzazione, progetto, token auth, debug), Vercel Analytics, Recaptcha (chiave sito, chiave segreta), provider di monitoraggio eccezioni.

### Schema Integrazioni (`integrations.schema.ts`)

Valida: Trigger.dev (abilitato, chiave API, URL, ambiente), Twenty CRM (URL base, chiave API, abilitato, modalità sync), Cron (segreto).

## Comportamento di Validazione

Il sistema di validazione utilizza `.catch()` di Zod per una degradazione controllata:

```typescript
// Da integrations.schema.ts
export const twentyCrmConfigSchema = z
  .object({
    baseUrl: z.string().url().optional().catch(undefined),
    apiKey: z.string().optional(),
    enabled: z.boolean().default(false),
    syncMode: twentyCrmSyncModeSchema,
  })
  .transform((data) => ({
    ...data,
    enabled: data.enabled ?? Boolean(data.baseUrl && data.apiKey),
  }));
```

- **Campi opzionali** con `.catch()` si ripristinano con i valori predefiniti
- **Campi obbligatori** senza `.catch()` causano un errore di avvio
- **Passaggi di trasformazione** calcolano valori derivati (come il rilevamento automatico dello stato abilitato)

I risultati della validazione vengono registrati all'avvio tramite `validation-logger.ts`, mostrando quali integrazioni sono attive e gli avvisi sulla configurazione opzionale mancante.

## Flag di Funzionalità (`lib/config/feature-flags.ts`)

I flag di funzionalità forniscono un semplice meccanismo per abilitare/disabilitare le funzionalità dipendenti dal database:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // Renderizzare la sezione commenti
}
```

Tutti i flag di funzionalità sono attualmente legati alla disponibilità di `DATABASE_URL`. Quando nessun database è configurato, le funzionalità interattive sono disabilitate mentre la directory continua a servire contenuti statici.

## Migrazione dalla Configurazione Legacy

Il modulo `server-config.ts` contiene funzioni helper deprecate. Percorsi di migrazione:

| Deprecato | Sostituzione |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## File Correlati

- `lib/config/config-service.ts` -- Singleton ConfigService
- `lib/config/client.ts` -- Configurazione sicura per client
- `lib/config/schemas/*.schema.ts` -- Schemi di validazione Zod
- `lib/config/feature-flags.ts` -- Flag di funzionalità
- `lib/config/types.ts` -- Definizioni di tipi TypeScript
- `.env.example` -- Riferimento completo delle variabili d'ambiente
