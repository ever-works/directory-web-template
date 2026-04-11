---
id: provider-config
title: "Anbieterkonfiguration"
sidebar_label: "Anbieterkonfiguration"
sidebar_position: 4
---

# Anbieterkonfiguration

Das Template verwendet einen zentralisierten `ConfigService`-Singleton zur Verwaltung aller externen Dienstanbieter. Jeder Anbieter wird durch Zod-validierte Schemata mit automatischer Feature-Erkennung konfiguriert -- Anbieter werden aktiviert, wenn ihre erforderlichen Zugangsdaten vorhanden sind.

## ConfigService-Architektur

Der `ConfigService` in `lib/config/config-service.ts` ist ein nur serverseitiger Singleton, der alle Umgebungsvariablen beim Start validiert:

```ts
import { configService } from '@/lib/config';

// Auf Konfigurationsabschnitte zugreifen
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

Der Dienst ist in sechs Abschnitte gegliedert, jeder mit eigenem Zod-Schema:

| Abschnitt | Zugriffsmethode | Schema-Datei |
|-----------|-----------------|--------------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### Tree-Shakeable Importe

Einzelne Abschnitte können direkt für besseres Tree-Shaking importiert werden:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### Validierung beim Start

Die gesamte Konfiguration wird mit Zod beim ersten Import validiert. Ungültige Werte lösen `.catch()`-Fallbacks aus, wenn möglich, während wirklich nicht behebbare Fehler beim Start geworfen werden:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## Authentifizierungsanbieter

Definiert in `lib/config/schemas/auth.schema.ts`. OAuth-Anbieter erkennen ihre Aktivierung automatisch:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### Unterstützte OAuth-Anbieter

| Anbieter | Client-ID-Variable | Client-Secret-Variable |
|----------|--------------------|------------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### Supabase Auth-Backend

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| Variable | Beschreibung |
|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymer Schlüssel |

### Weitere Auth-Einstellungen

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `AUTH_SECRET` | -- | Erforderlich für Session-Signierung |
| `COOKIE_SECRET` | -- | Cookie-Verschlüsselungsgeheimnis |
| `COOKIE_DOMAIN` | `'localhost'` | Cookie-Domain |
| `COOKIE_SECURE` | `false` | Nur HTTPS-Cookies |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | Access-Token-TTL |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | Refresh-Token-TTL |

## Zahlungsanbieter

Definiert in `lib/config/schemas/payment.schema.ts`. Jeder Anbieter wird automatisch aktiviert, wenn die erforderlichen Zugangsdaten gesetzt sind.

### Stripe

Automatisch aktiviert, wenn `secretKey` und `publishableKey` vorhanden sind:

| Variable | Beschreibung |
|----------|--------------|
| `STRIPE_SECRET_KEY` | Serverseitiger geheimer Schlüssel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clientseitiger öffentlicher Schlüssel |
| `STRIPE_WEBHOOK_SECRET` | Webhook-Signaturprüfung |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | Preis-ID für kostenlosen Plan |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | Preis-ID für Standard-Plan |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | Preis-ID für Premium-Plan |

### LemonSqueezy

Automatisch aktiviert, wenn `apiKey` und `storeId` vorhanden sind:

| Variable | Beschreibung |
|----------|--------------|
| `LEMONSQUEEZY_API_KEY` | API-Schlüssel |
| `LEMONSQUEEZY_STORE_ID` | Store-Kennung |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook-Geheimnis |
| `LEMONSQUEEZY_WEBHOOK_URL` | Webhook-Endpunkt-URL |
| `LEMONSQUEEZY_TEST_MODE` | Testmodus aktivieren (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | Varianten-ID für kostenlosen Plan |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | Varianten-ID für Standard-Plan |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | Varianten-ID für Premium-Plan |

### Polar

Automatisch aktiviert, wenn `accessToken` und `organizationId` vorhanden sind:

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `POLAR_ACCESS_TOKEN` | -- | API-Zugriffstoken |
| `POLAR_ORGANIZATION_ID` | -- | Organisations-ID |
| `POLAR_WEBHOOK_SECRET` | -- | Webhook-Geheimnis |
| `POLAR_SANDBOX` | `true` | Sandbox-Modus (`'false'` für Produktion) |
| `POLAR_API_URL` | -- | Benutzerdefinierte API-URL |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | Plan-ID für kostenlosen Tier |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | Plan-ID für Standard-Tier |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | Plan-ID für Premium-Tier |

### Produktpreise-Anzeige

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | Anzeigepreis für kostenlosen Plan |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | Anzeigepreis für Standard-Plan |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | Anzeigepreis für Premium-Plan |

## E-Mail-Anbieter

Definiert in `lib/config/schemas/email.schema.ts`.

### SMTP

Automatisch aktiviert, wenn `host`, `user` und `password` alle vorhanden sind:

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `SMTP_HOST` | -- | SMTP-Server-Hostname |
| `SMTP_PORT` | `587` | SMTP-Server-Port |
| `SMTP_USER` | -- | SMTP-Authentifizierungs-Benutzername |
| `SMTP_PASSWORD` | -- | SMTP-Authentifizierungs-Passwort |

### Resend

Automatisch aktiviert, wenn `apiKey` vorhanden ist:

| Variable | Beschreibung |
|----------|--------------|
| `RESEND_API_KEY` | Resend-API-Schlüssel |

### Novu

Automatisch aktiviert, wenn `apiKey` vorhanden ist:

| Variable | Beschreibung |
|----------|--------------|
| `NOVU_API_KEY` | Novu-API-Schlüssel |

### E-Mail-Einstellungen

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `COMPANY_NAME` | `'Ever Works'` | Firmenname in E-Mail-Vorlagen |
| `EMAIL_PROVIDER` | `'resend'` | Aktiver E-Mail-Anbieter (`'resend'`, `'novu'`) |
| `EMAIL_FROM` | -- | Absender-E-Mail-Adresse |
| `EMAIL_SUPPORT` | -- | Support-E-Mail-Adresse |

## Analytics-Anbieter

Definiert in `lib/config/schemas/analytics.schema.ts`.

### PostHog

Automatisch aktiviert, wenn `key` vorhanden ist:

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | PostHog-Projekt-API-Schlüssel |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | PostHog-Host-URL |
| `POSTHOG_DEBUG` | `false` | Debug-Modus aktivieren |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | Sitzungsaufzeichnung aktivieren |
| `POSTHOG_AUTO_CAPTURE` | `false` | Ereignisse automatisch erfassen |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | Ausnahmen verfolgen |
| `POSTHOG_PERSONAL_API_KEY` | -- | Persönlicher API-Schlüssel (Admin-Dashboard) |
| `POSTHOG_PROJECT_ID` | -- | Projekt-ID (Admin-Dashboard) |

### Sentry

Automatisch aktiviert, wenn `dsn` vorhanden ist:

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | Sentry-DSN |
| `SENTRY_ORG` | -- | Sentry-Organisations-Slug |
| `SENTRY_PROJECT` | -- | Sentry-Projektname |
| `SENTRY_AUTH_TOKEN` | -- | Auth-Token für Source-Maps |
| `SENTRY_ENABLE_DEV` | `false` | In Entwicklung aktivieren |
| `SENTRY_DEBUG` | `false` | Debug-Modus |

### reCAPTCHA

Automatisch aktiviert, wenn sowohl `siteKey` als auch `secretKey` vorhanden sind:

| Variable | Beschreibung |
|----------|--------------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Clientseitiger Site-Schlüssel |
| `RECAPTCHA_SECRET_KEY` | Serverseitiger geheimer Schlüssel |

### Vercel Analytics

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | Vercel Speed Insights aktivieren |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | Samplingrate (0--1) |

### Ausnahme-Tracking-Anbieter

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`, `'sentry'` oder `'none'` |

## Anbieterstatus prüfen

```ts
import { configService } from '@/lib/config';

// Prüfen, ob Stripe konfiguriert ist
if (configService.payment.stripe.enabled) {
  // Stripe ist einsatzbereit
}

// Prüfen, ob ein E-Mail-Anbieter verfügbar ist
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// Aktivierte OAuth-Anbieter auflisten
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## Verwandte Dateien

| Pfad | Beschreibung |
|------|--------------|
| `lib/config/config-service.ts` | ConfigService-Singleton |
| `lib/config/schemas/auth.schema.ts` | Auth-Anbieter-Schemata |
| `lib/config/schemas/payment.schema.ts` | Zahlungsanbieter-Schemata |
| `lib/config/schemas/email.schema.ts` | E-Mail-Anbieter-Schemata |
| `lib/config/schemas/analytics.schema.ts` | Analytics-Anbieter-Schemata |
| `lib/config/schemas/integrations.schema.ts` | Integrations-Anbieter-Schemata |
| `lib/config/schemas/core.schema.ts` | Kern-Konfigurationsschema |
| `lib/config/types.ts` | TypeScript-Typdefinitionen |
| `lib/config/index.ts` | Barrel-Export |
| `.env.example` | Vollständige Umgebungsvariablen-Referenz |
