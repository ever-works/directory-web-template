---
id: config-system
title: Konfigurationssystem
sidebar_label: Konfigurationssystem
sidebar_position: 0
---

# Konfigurationssystem

Das Ever Works Template verwendet ein zentralisiertes, typsicheres Konfigurationssystem, das auf Zod-Validierungsschemata basiert. Alle Umgebungsvariablen werden beim Anwendungsstart validiert, was sofortiges Feedback bei fehlenden oder ungültigen Konfigurationen liefert. Das System unterstützt sowohl rein serverseitige Secrets als auch client-sichere öffentliche Variablen.

## Architektur

```
lib/config/
  config-service.ts        # Zentralisiertes ConfigService-Singleton
  client.ts                # Client-sichere Konfiguration (NEXT_PUBLIC_*)
  env.ts                   # Legacy-Env-Schema (API-Konfiguration)
  server-config.ts         # Veraltete Server-Hilfsfunktionen (ConfigService verwenden)
  feature-flags.ts         # Feature-Verfügbarkeits-Flags
  index.ts                 # Barrel-Export
  types.ts                 # TypeScript-Typdefinitionen
  schemas/
    index.ts               # Schema-Barrel-Export
    core.schema.ts         # URLs, Website-Info, Datenbank, Inhalte
    auth.schema.ts         # Auth-Secrets, OAuth-Anbieter, JWT, Cookies
    email.schema.ts        # SMTP, Resend, Novu-Konfiguration
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, Preise
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # Billing-Konfiguration-Barrel
    stripe.config.ts       # Stripe-spezifische Konfiguration
    lemonsqueezy.config.ts # LemonSqueezy-Konfiguration
    polar.config.ts        # Polar-Konfiguration
    solidgate.config.ts    # Solidgate-Konfiguration
    types.ts               # Billing-Typen
  utils/
    env-parser.ts          # Hilfsfunktionen zum Parsen von Umgebungsvariablen
    validation-logger.ts   # Formatierung und Protokollierung von Validierungsergebnissen
```

## ConfigService-Singleton

Der Kern des Konfigurationssystems ist die `ConfigService`-Klasse in `lib/config/config-service.ts`. Sie:

1. Sammelt alle Umgebungsvariablen über Collector-Funktionen
2. Validiert diese gegen ein kombiniertes Zod-Schema
3. Speichert die validierte Konfiguration als Singleton
4. Stellt typisierte Getter für jeden Konfigurationsabschnitt bereit

```typescript
import { configService } from '@/lib/config';

// Zugriff auf bestimmte Abschnitte
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### Abschnittsexporte

Für Tree-Shaking und Bequemlichkeit werden einzelne Abschnitte auch direkt exportiert:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// Direkter Zugriff ohne ConfigService-Präfix
const dbUrl = coreConfig.DATABASE_URL;
```

### Nur-Server-Erzwingung

Das `ConfigService`-Modul importiert `'server-only'`, was bedeutet:

- Es kann nur in Server-Komponenten, API-Routen und server-seitigem Code verwendet werden
- Der Versuch, es in einer Client-Komponente zu importieren, erzeugt einen Build-Fehler
- Dies verhindert versehentliche Offenlegung von Secrets wie API-Schlüsseln

## Client-Konfiguration (`lib/config/client.ts`)

Client-sichere Konfiguration befindet sich in einem separaten Modul, das nur `NEXT_PUBLIC_*`-Variablen liest:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// Website-Branding
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // Social-Media-Links
siteConfig.attribution // "Built with"-Attribution

// Preisgestaltung
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// Umgebung
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

Dieses Modul kann sicher in jeder Komponente importiert werden, einschließlich client-seitigem Code.

## Validierungsschemata

Jeder Konfigurationsabschnitt hat ein dediziertes Zod-Schema in `lib/config/schemas/`:

### Core-Schema (`core.schema.ts`)

Validiert: `NODE_ENV`, `APP_URL`, `SITE_URL`, `API_BASE_URL`, `DATABASE_URL`, Website-Metadaten (Name, Tagline, Beschreibung, Schlüsselwörter, Logo), Social-Links, OG-Bildthema, Attribution und Inhalts-Repository-Einstellungen.

### Auth-Schema (`auth.schema.ts`)

Validiert: `AUTH_SECRET`, `COOKIE_SECRET`, JWT-Token-Ablaufeinstellungen, Cookie-Konfiguration, OAuth-Anbieter-Zugangsdaten (Google, GitHub, Microsoft, Facebook, X/Twitter, LinkedIn), Supabase-Konfiguration und Seed-Benutzer-Zugangsdaten.

### E-Mail-Schema (`email.schema.ts`)

Validiert: `EMAIL_PROVIDER` (resend/novu), `EMAIL_FROM`, `EMAIL_SUPPORT`, `COMPANY_NAME`, SMTP-Einstellungen (Host, Port, Benutzer, Passwort), Resend-API-Schlüssel und Novu-API-Schlüssel.

### Zahlungs-Schema (`payment.schema.ts`)

Validiert: Stripe (Secret-Schlüssel, veröffentlichbarer Schlüssel, Webhook-Secret, Preis-IDs, dynamische Preisgestaltung, Mehrwährung), LemonSqueezy (API-Schlüssel, Store-ID, Webhook, Variant-IDs), Polar (Zugriffstoken, Webhook, Organisation, Plan-IDs), Produktpreise, Testbeträge.

### Analytik-Schema (`analytics.schema.ts`)

Validiert: PostHog (Schlüssel, Host, Debug, Sitzungsaufzeichnung, Auto-Capture, persönlicher API-Schlüssel, Projekt-ID), Sentry (DSN, Organisation, Projekt, Auth-Token, Debug), Vercel Analytics, Recaptcha (Website-Schlüssel, Secret-Schlüssel), Ausnahmetracking-Anbieter.

### Integrations-Schema (`integrations.schema.ts`)

Validiert: Trigger.dev (aktiviert, API-Schlüssel, URL, Umgebung), Twenty CRM (Basis-URL, API-Schlüssel, aktiviert, Synchronisierungsmodus), Cron (Secret).

## Validierungsverhalten

Das Validierungssystem verwendet Zods `.catch()` für eine sanfte Degradierung:

```typescript
// Aus integrations.schema.ts
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

- **Optionale Felder** mit `.catch()` stellen sich mit Standardwerten wieder her
- **Pflichtfelder** ohne `.catch()` verursachen einen Startfehler
- **Transform-Schritte** berechnen abgeleitete Werte (wie das automatische Erkennen des aktivierten Zustands)

Validierungsergebnisse werden beim Start über `validation-logger.ts` protokolliert und zeigen, welche Integrationen aktiv sind und Warnungen zu fehlenden optionalen Konfigurationen.

## Feature-Flags (`lib/config/feature-flags.ts`)

Feature-Flags bieten einen einfachen Mechanismus zum Aktivieren/Deaktivieren datenbankabhängiger Funktionen:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // Kommentarbereich rendern
}
```

Alle Feature-Flags sind derzeit an die Verfügbarkeit von `DATABASE_URL` gebunden. Wenn keine Datenbank konfiguriert ist, sind interaktive Funktionen deaktiviert, während das Verzeichnis weiterhin statische Inhalte bereitstellt.

## Migration von der Legacy-Konfiguration

Das `server-config.ts`-Modul enthält veraltete Hilfsfunktionen. Migrationspfade:

| Veraltet | Ersatz |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## Verwandte Dateien

- `lib/config/config-service.ts` -- ConfigService-Singleton
- `lib/config/client.ts` -- Client-sichere Konfiguration
- `lib/config/schemas/*.schema.ts` -- Zod-Validierungsschemata
- `lib/config/feature-flags.ts` -- Feature-Flags
- `lib/config/types.ts` -- TypeScript-Typdefinitionen
- `.env.example` -- Vollständige Umgebungsvariablen-Referenz
