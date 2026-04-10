---
id: config-system
title: Configuratiesysteem
sidebar_label: Configuratiesysteem
sidebar_position: 0
---

# Configuratiesysteem

Het Ever Works template gebruikt een gecentraliseerd, type-veilig configuratiesysteem gebouwd op Zod-validatieschema's. Alle omgevingsvariabelen worden gevalideerd bij het opstarten van de applicatie, wat directe feedback geeft over ontbrekende of ongeldige configuratie. Het systeem ondersteunt zowel server-only geheimen als client-veilige publieke variabelen.

## Architectuur

```
lib/config/
  config-service.ts        # Gecentraliseerde ConfigService-singleton
  client.ts                # Client-veilige configuratie (NEXT_PUBLIC_*)
  env.ts                   # Verouderd env-schema (API-configuratie)
  server-config.ts         # Verouderde server-hulpfuncties (gebruik ConfigService)
  feature-flags.ts         # Functiebeschikbaarheidsmarkeringen
  index.ts                 # Barrel-export
  types.ts                 # TypeScript-typedefinities
  schemas/
    index.ts               # Schema-barrel-export
    core.schema.ts         # URL's, site-info, database, inhoud
    auth.schema.ts         # Auth-geheimen, OAuth-providers, JWT, cookies
    email.schema.ts        # SMTP, Resend, Novu-configuratie
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, prijzen
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # Billing-configuratie-barrel
    stripe.config.ts       # Stripe-specifieke configuratie
    lemonsqueezy.config.ts # LemonSqueezy-configuratie
    polar.config.ts        # Polar-configuratie
    solidgate.config.ts    # Solidgate-configuratie
    types.ts               # Billing-typen
  utils/
    env-parser.ts          # Hulpfuncties voor het verwerken van omgevingsvariabelen
    validation-logger.ts   # Validatieresultaat opmaak en logging
```

## ConfigService-Singleton

De kern van het configuratiesysteem is de `ConfigService`-klasse in `lib/config/config-service.ts`. Deze:

1. Verzamelt alle omgevingsvariabelen via collector-functies
2. Valideert deze tegen een gecombineerd Zod-schema
3. Slaat de gevalideerde configuratie op als singleton
4. Biedt getypeerde getters voor elke configuratiesectie

```typescript
import { configService } from '@/lib/config';

// Toegang tot specifieke secties
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### Sectie-exports

Voor tree-shaking en gemak worden individuele secties ook direct geëxporteerd:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// Directe toegang zonder ConfigService-prefix
const dbUrl = coreConfig.DATABASE_URL;
```

### Server-Only Afdwinging

Het `ConfigService`-module importeert `'server-only'`, wat betekent:

- Het kan alleen worden gebruikt in Server Components, API-routes en server-side code
- Proberen het in een Client Component te importeren geeft een build-fout
- Dit voorkomt het per ongeluk blootstellen van geheimen zoals API-sleutels

## Client-Configuratie (`lib/config/client.ts`)

Client-veilige configuratie bevindt zich in een apart module dat alleen `NEXT_PUBLIC_*`-variabelen leest:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// Site-branding
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // Social media-links
siteConfig.attribution // "Built with"-attributie

// Prijzen
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// Omgeving
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

Dit module kan veilig worden geïmporteerd in elk component, inclusief client-side code.

## Validatieschema's

Elke configuratiesectie heeft een eigen Zod-schema in `lib/config/schemas/`:

### Core-schema (`core.schema.ts`)

Valideert: `NODE_ENV`, `APP_URL`, `SITE_URL`, `API_BASE_URL`, `DATABASE_URL`, site-metadata (naam, tagline, beschrijving, sleutelwoorden, logo), sociale links, OG-afbeeldingsthema, attributie en inhoudsrepository-instellingen.

### Auth-schema (`auth.schema.ts`)

Valideert: `AUTH_SECRET`, `COOKIE_SECRET`, JWT-tokenvervalinstelling, cookie-configuratie, OAuth-provider-credentials (Google, GitHub, Microsoft, Facebook, X/Twitter, LinkedIn), Supabase-configuratie en seed-gebruikerscredentials.

### E-mail-schema (`email.schema.ts`)

Valideert: `EMAIL_PROVIDER` (resend/novu), `EMAIL_FROM`, `EMAIL_SUPPORT`, `COMPANY_NAME`, SMTP-instellingen (host, poort, gebruiker, wachtwoord), Resend API-sleutel en Novu API-sleutel.

### Betalings-schema (`payment.schema.ts`)

Valideert: Stripe (geheime sleutel, publiceerbare sleutel, webhook-geheim, prijs-ID's, dynamische prijzen, multi-valuta), LemonSqueezy (API-sleutel, store-ID, webhook, variant-ID's), Polar (toegangstoken, webhook, organisatie, plan-ID's), productprijzen, proefbedragen.

### Analytiek-schema (`analytics.schema.ts`)

Valideert: PostHog (sleutel, host, debug, sessie-opname, auto-capture, persoonlijke API-sleutel, project-ID), Sentry (DSN, organisatie, project, auth-token, debug), Vercel Analytics, Recaptcha (sitekey, geheime sleutel), uitzondering-trackingprovider.

### Integraties-schema (`integrations.schema.ts`)

Valideert: Trigger.dev (ingeschakeld, API-sleutel, URL, omgeving), Twenty CRM (basis-URL, API-sleutel, ingeschakeld, synchronisatiemodus), Cron (geheim).

## Validatiegedrag

Het validatiesysteem gebruikt Zod's `.catch()` voor een soepele degradatie:

```typescript
// Uit integrations.schema.ts
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

- **Optionele velden** met `.catch()` herstellen met standaardwaarden
- **Verplichte velden** zonder `.catch()` veroorzaken een opstartfout
- **Transform-stappen** berekenen afgeleide waarden (zoals automatische detectie van ingeschakelde status)

Validatieresultaten worden bij het opstarten gelogd via `validation-logger.ts`, met informatie over actieve integraties en waarschuwingen over ontbrekende optionele configuratie.

## Functiemarkeringen (`lib/config/feature-flags.ts`)

Functiemarkeringen bieden een eenvoudig mechanisme om database-afhankelijke functies in of uit te schakelen:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // Commentaarsectie renderen
}
```

Alle functiemarkeringen zijn momenteel gekoppeld aan de beschikbaarheid van `DATABASE_URL`. Als er geen database is geconfigureerd, zijn interactieve functies uitgeschakeld terwijl de directory statische inhoud blijft serveren.

## Migratie van Verouderde Configuratie

Het `server-config.ts`-module bevat verouderde hulpfuncties. Migratiepaden:

| Verouderd | Vervanging |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## Gerelateerde Bestanden

- `lib/config/config-service.ts` -- ConfigService-singleton
- `lib/config/client.ts` -- Client-veilige configuratie
- `lib/config/schemas/*.schema.ts` -- Zod-validatieschema's
- `lib/config/feature-flags.ts` -- Functiemarkeringen
- `lib/config/types.ts` -- TypeScript-typedefinities
- `.env.example` -- Volledige omgevingsvariabelen-referentie
