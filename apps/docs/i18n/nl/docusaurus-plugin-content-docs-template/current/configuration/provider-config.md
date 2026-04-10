---
id: provider-config
title: "Provider Configuratie"
sidebar_label: "Provider Configuratie"
sidebar_position: 4
---

# Provider Configuratie

Het template gebruikt een gecentraliseerde `ConfigService`-singleton om alle externe serviceproviders te beheren. Elke provider wordt geconfigureerd via Zod-gevalideerde schema's met automatische functiedetectie -- providers worden ingeschakeld wanneer hun vereiste referenties aanwezig zijn.

## ConfigService-architectuur

De `ConfigService` in `lib/config/config-service.ts` is een alleen-server singleton die alle omgevingsvariabelen bij het opstarten valideert:

```ts
import { configService } from '@/lib/config';

// Toegang tot configuratiesecties
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

De service is georganiseerd in zes secties, elk met zijn eigen Zod-schema:

| Sectie | Accessor | Schemabestand |
|--------|----------|---------------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### Tree-Shakeable Imports

Individuele secties kunnen direct worden geïmporteerd voor betere tree-shaking:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### Validatie bij opstarten

Alle configuratie wordt gevalideerd met Zod bij de eerste import. Ongeldige waarden activeren `.catch()`-terugvallen waar mogelijk, terwijl werkelijk onherstelbare fouten bij het opstarten worden gegenereerd:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## Authenticatieproviders

Gedefinieerd in `lib/config/schemas/auth.schema.ts`. OAuth-providers detecteren activering automatisch:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### Ondersteunde OAuth-providers

| Provider | Client-ID-variabele | Client-Secret-variabele |
|----------|---------------------|-------------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### Supabase Auth-backend

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| Variabele | Beschrijving |
|-----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-project-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonieme sleutel |

### Aanvullende Auth-instellingen

| Variabele | Standaard | Beschrijving |
|-----------|-----------|--------------|
| `AUTH_SECRET` | -- | Vereist voor sessie-ondertekening |
| `COOKIE_SECRET` | -- | Cookie-versleutelingsgeheim |
| `COOKIE_DOMAIN` | `'localhost'` | Cookie-domein |
| `COOKIE_SECURE` | `false` | Alleen HTTPS-cookies |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | Toegangstoken-TTL |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | Vernieuwingstoken-TTL |

## Betalingsproviders

Gedefinieerd in `lib/config/schemas/payment.schema.ts`. Elke provider wordt automatisch ingeschakeld wanneer de vereiste referenties zijn ingesteld.

### Stripe

Automatisch ingeschakeld wanneer `secretKey` en `publishableKey` aanwezig zijn:

| Variabele | Beschrijving |
|-----------|--------------|
| `STRIPE_SECRET_KEY` | Serversijdige geheime sleutel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clientsijdige publiceerbare sleutel |
| `STRIPE_WEBHOOK_SECRET` | Webhook-handtekeningverificatie |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | Prijs-ID voor gratis plan |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | Prijs-ID voor standaard plan |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | Prijs-ID voor premium plan |

### LemonSqueezy

Automatisch ingeschakeld wanneer `apiKey` en `storeId` aanwezig zijn:

| Variabele | Beschrijving |
|-----------|--------------|
| `LEMONSQUEEZY_API_KEY` | API-sleutel |
| `LEMONSQUEEZY_STORE_ID` | Winkel-ID |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook-geheim |
| `LEMONSQUEEZY_WEBHOOK_URL` | Webhook-eindpunt-URL |
| `LEMONSQUEEZY_TEST_MODE` | Testmodus inschakelen (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | Variant-ID voor gratis plan |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | Variant-ID voor standaard plan |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | Variant-ID voor premium plan |

### Polar

Automatisch ingeschakeld wanneer `accessToken` en `organizationId` aanwezig zijn:

| Variabele | Standaard | Beschrijving |
|-----------|-----------|--------------|
| `POLAR_ACCESS_TOKEN` | -- | API-toegangstoken |
| `POLAR_ORGANIZATION_ID` | -- | Organisatie-ID |
| `POLAR_WEBHOOK_SECRET` | -- | Webhook-geheim |
| `POLAR_SANDBOX` | `true` | Sandboxmodus (`'false'` voor productie) |
| `POLAR_API_URL` | -- | Aangepaste API-URL |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | Plan-ID voor gratis niveau |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | Plan-ID voor standaard niveau |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | Plan-ID voor premium niveau |

### Weergave van productprijzen

| Variabele | Standaard | Beschrijving |
|-----------|-----------|--------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | Weergaveprijs voor gratis plan |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | Weergaveprijs voor standaard plan |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | Weergaveprijs voor premium plan |

## E-mailproviders

Gedefinieerd in `lib/config/schemas/email.schema.ts`.

### SMTP

Automatisch ingeschakeld wanneer `host`, `user` en `password` allemaal aanwezig zijn:

| Variabele | Standaard | Beschrijving |
|-----------|-----------|--------------|
| `SMTP_HOST` | -- | SMTP-serverhostnaam |
| `SMTP_PORT` | `587` | SMTP-serverpoort |
| `SMTP_USER` | -- | SMTP-authenticatiegebruikersnaam |
| `SMTP_PASSWORD` | -- | SMTP-authenticatiewachtwoord |

### Resend

Automatisch ingeschakeld wanneer `apiKey` aanwezig is:

| Variabele | Beschrijving |
|-----------|--------------|
| `RESEND_API_KEY` | Resend API-sleutel |

### Novu

Automatisch ingeschakeld wanneer `apiKey` aanwezig is:

| Variabele | Beschrijving |
|-----------|--------------|
| `NOVU_API_KEY` | Novu API-sleutel |

### E-mailinstellingen

| Variabele | Standaard | Beschrijving |
|-----------|-----------|--------------|
| `COMPANY_NAME` | `'Ever Works'` | Bedrijfsnaam in e-mailsjablonen |
| `EMAIL_PROVIDER` | `'resend'` | Actieve e-mailprovider (`'resend'`, `'novu'`) |
| `EMAIL_FROM` | -- | Afzender e-mailadres |
| `EMAIL_SUPPORT` | -- | Ondersteunings-e-mailadres |

## Analytics-providers

Gedefinieerd in `lib/config/schemas/analytics.schema.ts`.

### PostHog

Automatisch ingeschakeld wanneer `key` aanwezig is:

| Variabele | Standaard | Beschrijving |
|-----------|-----------|--------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | PostHog-project-API-sleutel |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | PostHog-host-URL |
| `POSTHOG_DEBUG` | `false` | Foutopsporingsmodus inschakelen |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | Sessie-opname inschakelen |
| `POSTHOG_AUTO_CAPTURE` | `false` | Gebeurtenissen automatisch vastleggen |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | Uitzonderingen bijhouden |
| `POSTHOG_PERSONAL_API_KEY` | -- | Persoonlijke API-sleutel (beheerdashboard) |
| `POSTHOG_PROJECT_ID` | -- | Project-ID (beheerdashboard) |

### Sentry

Automatisch ingeschakeld wanneer `dsn` aanwezig is:

| Variabele | Standaard | Beschrijving |
|-----------|-----------|--------------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | Sentry-DSN |
| `SENTRY_ORG` | -- | Sentry-organisatieslug |
| `SENTRY_PROJECT` | -- | Sentry-projectnaam |
| `SENTRY_AUTH_TOKEN` | -- | Auth-token voor bronkaarten |
| `SENTRY_ENABLE_DEV` | `false` | Inschakelen in ontwikkeling |
| `SENTRY_DEBUG` | `false` | Foutopsporingsmodus |

### reCAPTCHA

Automatisch ingeschakeld wanneer zowel `siteKey` als `secretKey` aanwezig zijn:

| Variabele | Beschrijving |
|-----------|--------------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Clientsijdige sitesleutel |
| `RECAPTCHA_SECRET_KEY` | Serversijdige geheime sleutel |

### Vercel Analytics

| Variabele | Standaard | Beschrijving |
|-----------|-----------|--------------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | Vercel Speed Insights inschakelen |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | Bemonsteringsfrequentie (0--1) |

### Uitzonderingstracking-provider

| Variabele | Standaard | Beschrijving |
|-----------|-----------|--------------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`, `'sentry'` of `'none'` |

## Providerstatus controleren

```ts
import { configService } from '@/lib/config';

// Controleer of Stripe geconfigureerd is
if (configService.payment.stripe.enabled) {
  // Stripe is klaar voor gebruik
}

// Controleer of een e-mailprovider beschikbaar is
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// Ingeschakelde OAuth-providers weergeven
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## Gerelateerde bestanden

| Pad | Beschrijving |
|-----|--------------|
| `lib/config/config-service.ts` | ConfigService-singleton |
| `lib/config/schemas/auth.schema.ts` | Auth-providerschema's |
| `lib/config/schemas/payment.schema.ts` | Betalingsprovider-schema's |
| `lib/config/schemas/email.schema.ts` | E-mailprovider-schema's |
| `lib/config/schemas/analytics.schema.ts` | Analytics-provider-schema's |
| `lib/config/schemas/integrations.schema.ts` | Integratieprovider-schema's |
| `lib/config/schemas/core.schema.ts` | Kernconfiguratieschema |
| `lib/config/types.ts` | TypeScript-typedefinities |
| `lib/config/index.ts` | Barrel-export |
| `.env.example` | Volledige omgevingsvariabelen-referentie |
