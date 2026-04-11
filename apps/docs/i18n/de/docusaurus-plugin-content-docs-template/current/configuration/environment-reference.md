---
id: environment-reference
title: Vollständige Referenz der Umgebungsvariablen
sidebar_label: Umgebungsreferenz
sidebar_position: 1
---

# Vollständige Referenz der Umgebungsvariablen

Diese Seite bietet eine umfassende Referenz aller Umgebungsvariablen, die vom Ever Works Template verwendet werden. Variablen sind nach Kategorie mit ihren Typen, Standardwerten und ob sie erforderlich sind, organisiert.

Kopieren Sie `.env.example` nach `.env.local` und füllen Sie die Werte für Ihre Deployment-Umgebung aus.

## Inhalts- & Daten-Repository

| Variable | Typ | Erforderlich | Standard | Beschreibung |
|----------|-----|--------------|----------|--------------|
| `DATA_REPOSITORY` | string (URL) | **Ja** | -- | Git-Repository-URL für Inhaltsdaten |
| `GH_TOKEN` | string | Nein | -- | Persönliches GitHub-Zugriffstoken (für private Repos) |
| `GITHUB_TOKEN` | string | Nein | -- | Alternative GitHub-Token-Variable |
| `GITHUB_BRANCH` | string | Nein | `master` | Git-Branch zum Klonen von Inhalten |

## Datenbank

| Variable | Typ | Erforderlich | Standard | Beschreibung |
|----------|-----|--------------|----------|--------------|
| `DATABASE_URL` | string | Empfohlen | -- | Datenbankverbindungsstring (SQLite oder Postgres) |

Wenn `DATABASE_URL` nicht gesetzt ist, werden datenbankabhängige Funktionen (Bewertungen, Kommentare, Favoriten, Umfragen, hervorgehobene Einträge) automatisch über das Feature-Flags-System deaktiviert.

## Authentifizierung

| Variable | Typ | Erforderlich | Standard | Beschreibung |
|----------|-----|--------------|----------|--------------|
| `AUTH_SECRET` | string | **Ja** | -- | NextAuth-Secret (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **Ja** | -- | Cookie-Verschlüsselungs-Secret |
| `COOKIE_DOMAIN` | string | Nein | -- | Cookie-Domain (z.B. `localhost`) |
| `COOKIE_SECURE` | boolean | Nein | `true` | Secure-Cookie-Flag |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | Nein | `15m` | Access-Token-TTL |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | Nein | `7d` | Refresh-Token-TTL |

### OAuth-Anbieter

| Variable | Typ | Erforderlich | Beschreibung |
|----------|-----|--------------|--------------|
| `GOOGLE_CLIENT_ID` | string | Nein | Google OAuth-Client-ID |
| `GOOGLE_CLIENT_SECRET` | string | Nein | Google OAuth-Client-Secret |
| `GITHUB_CLIENT_ID` | string | Nein | GitHub OAuth-Client-ID |
| `GITHUB_CLIENT_SECRET` | string | Nein | GitHub OAuth-Client-Secret |
| `MICROSOFT_CLIENT_ID` | string | Nein | Microsoft OAuth-Client-ID |
| `MICROSOFT_CLIENT_SECRET` | string | Nein | Microsoft OAuth-Client-Secret |
| `FB_CLIENT_ID` | string | Nein | Facebook OAuth-Client-ID |
| `FB_CLIENT_SECRET` | string | Nein | Facebook OAuth-Client-Secret |
| `X_CLIENT_ID` | string | Nein | X (Twitter) OAuth-Client-ID |
| `X_CLIENT_SECRET` | string | Nein | X (Twitter) OAuth-Client-Secret |
| `LINKEDIN_CLIENT_ID` | string | Nein | LinkedIn OAuth-Client-ID |
| `LINKEDIN_CLIENT_SECRET` | string | Nein | LinkedIn OAuth-Client-Secret |

OAuth-Anbieter werden automatisch aktiviert, wenn Client-ID und Secret gesetzt sind.

## Website & Branding (Client-sicher)

Alle `NEXT_PUBLIC_*` Variablen werden dem Browser zugänglich gemacht.

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | Verzeichnis-App-URL |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | Öffentliche Website-URL des Unternehmens |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | API-Basis-URL |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | Site-Name für Metadaten |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | Website-Slogan |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | Markenname für schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (siehe .env.example) | SEO-Beschreibung (unter 160 Zeichen) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | Kommagetrennte SEO-Keywords |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Logo-Pfad (relativ zu /public) |

### OG-Bild-Theming

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | OG-Bild-Verlauf Startfarbe |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | OG-Bild-Verlauf Endfarbe |

### Social-Media-Links

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | GitHub-Link |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | X (Twitter)-Link |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (siehe .env.example) | LinkedIn-Link |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (siehe .env.example) | Facebook-Link |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | Blog-Link |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | Kontakt-E-Mail |

### Attribution

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | "Erstellt mit"-Link-URL |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | "Erstellt mit"-Link-Text |

## Zahlungsanbieter

### Stripe

| Variable | Typ | Erforderlich | Beschreibung |
|----------|-----|--------------|--------------|
| `STRIPE_SECRET_KEY` | string | Nein | Stripe-Secret-Key (nur Server) |
| `STRIPE_PUBLISHABLE_KEY` | string | Nein | Stripe-Publishable-Key |
| `STRIPE_WEBHOOK_SECRET` | string | Nein | Webhook-Signierungsgeheimnis |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | Nein | Client-sicherer Publishable-Key |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | Nein | Preise von Stripe API laden |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | Nein | Stripe-Checkout aktivieren |

#### Stripe Mehrwährungs-Preis-IDs

Für Standard- und Premium-Pläne unterstützt das Template währungsspezifische Preis-IDs:

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

Dasselbe Muster gilt für Premium-Plan-Variablen und Einrichtungsgebühr-IDs.

### LemonSqueezy

| Variable | Typ | Beschreibung |
|----------|-----|--------------|
| `LEMONSQUEEZY_API_KEY` | string | API-Schlüssel |
| `LEMONSQUEEZY_STORE_ID` | string | Store-Kennung |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Webhook-Geheimnis |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | Webhook-Endpunkt-URL |
| `LEMONSQUEEZY_TEST_MODE` | boolean | Testmodus aktivieren |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | Kostenlose Plan-Variante |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | Standard-Plan-Variante |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | Premium-Plan-Variante |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | Checkout aktivieren |

### Polar

| Variable | Typ | Beschreibung |
|----------|-----|--------------|
| `POLAR_ACCESS_TOKEN` | string | Zugriffstoken |
| `POLAR_WEBHOOK_SECRET` | string | Webhook-Geheimnis |
| `POLAR_ORGANIZATION_ID` | string | Organisations-ID |
| `POLAR_SANDBOX` | boolean | Sandbox-Modus (Standard: `true`) |
| `POLAR_API_URL` | string (URL) | Benutzerdefinierte API-URL |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | Kostenloser Plan-ID |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | Standard-Plan-ID |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | Premium-Plan-ID |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | Checkout aktivieren |

### Solidgate

| Variable | Typ | Beschreibung |
|----------|-----|--------------|
| `SOLIDGATE_API_KEY` | string | API-Schlüssel |
| `SOLIDGATE_SECRET_KEY` | string | Geheimer Schlüssel |
| `SOLIDGATE_WEBHOOK_SECRET` | string | Webhook-Geheimnis |
| `SOLIDGATE_MERCHANT_ID` | string | Händler-ID |
| `SOLIDGATE_API_BASE_URL` | string (URL) | API-Basis-URL |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | Client-sicherer Schlüssel |

### Produktpreise

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | Kostenloser Tarif-Preis |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | Standard-Tarif-Preis |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | Premium-Tarif-Preis |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | Premium-Testbetrag-ID |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | Standard-Testbetrag-ID |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | Testbeträge aktivieren |

## Analyse & Überwachung

### PostHog

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | PostHog-Projekt-API-Schlüssel |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | PostHog-Host |
| `POSTHOG_DEBUG` | boolean | `false` | Debug-Protokollierung aktivieren |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | Sitzungsaufzeichnung |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | Ereignisse automatisch erfassen |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | Server-seitiger API-Schlüssel |
| `POSTHOG_PROJECT_ID` | string | -- | Projekt-ID für Analysen |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | Ausnahmeverfolgung |

### Sentry

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | Sentry-DSN |
| `SENTRY_ORG` | string | `ever-co` | Sentry-Organisation |
| `SENTRY_PROJECT` | string | `ever-works` | Sentry-Projektname |
| `SENTRY_AUTH_TOKEN` | string | -- | Sentry-Authentifizierungstoken |
| `SENTRY_ENABLE_DEV` | boolean | `false` | In der Entwicklung aktivieren |
| `SENTRY_DEBUG` | boolean | `false` | Debug-Modus |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | Ausnahmeverfolgung |

### Weitere Analysen

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | Ausnahme-Anbieter (`posthog` oder `sentry`) |
| `ANALYZE` | boolean | `true` | Bundle-Analyse aktivieren |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | reCAPTCHA-Site-Key |
| `RECAPTCHA_SECRET_KEY` | string | -- | reCAPTCHA-Secret-Key |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | Speed-Insights-Stichprobenrate |

## E-Mail

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `EMAIL_PROVIDER` | string | `resend` | E-Mail-Anbieter (`resend` oder `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | Absenderadresse für Benachrichtigungen |
| `EMAIL_SUPPORT` | string | `support@ever.works` | Support-E-Mail-Adresse |
| `COMPANY_NAME` | string | `Ever Works` | Firmenname für E-Mail-Vorlagen |
| `RESEND_API_KEY` | string | -- | Resend-API-Schlüssel |
| `NOVU_API_KEY` | string | -- | Novu-API-Schlüssel |
| `SMTP_HOST` | string | -- | SMTP-Server-Hostname |
| `SMTP_PORT` | number | `587` | SMTP-Port |
| `SMTP_USER` | string | -- | SMTP-Benutzername |
| `SMTP_PASSWORD` | string | -- | SMTP-Passwort |

## Integrationen

### Twenty CRM

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | Twenty-CRM-Instanz-URL |
| `TWENTY_CRM_API_KEY` | string | -- | API-Schlüssel zur Authentifizierung |
| `TWENTY_CRM_ENABLED` | boolean | `false` | Explizites Aktivieren/Deaktivieren |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | Synchronisierungsmodus (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (Hintergrundjobs)

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | Trigger.dev aktivieren |
| `TRIGGER_DEV_API_KEY` | string | -- | API-Schlüssel |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | Benutzerdefinierte API-URL |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | Umgebung (`development`, `staging`, `production`) |

### Cron-Jobs

| Variable | Typ | Beschreibung |
|----------|-----|--------------|
| `CRON_SECRET` | string | Authentifizierungs-Secret für Cron-Endpunkte |

### Karten & Standort

| Variable | Typ | Beschreibung |
|----------|-----|--------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | Öffentliches Mapbox-Token (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | Browser-eingeschränkter Google Maps-Schlüssel |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | Google Maps-Karten-ID |

### Ever Works Plattform-API

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | Plattform-API-URL |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | Plattform-API-Authentifizierungstoken |

## Vercel & Deployment

| Variable | Typ | Beschreibung |
|----------|-----|--------------|
| `VERCEL_TOKEN` | string | Persönliches Vercel-Zugriffstoken |
| `VERCEL_PROJECT_ID` | string | Vercel-Projekt-ID |
| `VERCEL_TEAM_SCOPE` | string | Vercel-Team-ID |
| `VERCEL_PLAN` | string | Plantyp (`pro` für 5-Minuten-Cron) |
| `VERCEL_DEPLOYMENT_ID` | string | Aktuelle Deployment-ID |
| `CRON_FREQUENCY` | string | Cron-Frequenz erzwingen (z.B. `5min`) |

## Demo & Seeding

| Variable | Typ | Standard | Beschreibung |
|----------|-----|----------|--------------|
| `NEXT_PUBLIC_DEMO` | boolean | `true` | Demo-Modus mit Beispieldaten aktivieren |
| `SEED_ADMIN_EMAIL` | string | `admin@changeme.com` | Admin-Benutzer-E-Mail für Seeding |
| `SEED_ADMIN_PASSWORD` | string | `changeme_password` | Admin-Benutzer-Passwort für Seeding |
| `SEED_FAKE_USER_COUNT` | number | `10` | Anzahl der zu generierenden Fake-Benutzer |
| `NODE_ENV` | string | `development` | Node-Umgebung |

## Verwandte Dateien

- `.env.example` -- Vorlagendatei mit allen Variablen und integrierter Dokumentation
- `lib/config/schemas/*.schema.ts` -- Zod-Validierungsschemata für jede Kategorie
- `lib/config/config-service.ts` -- Zentralisierte Validierung und Zugriff
- `lib/config/client.ts` -- Client-sicheres Konfigurationsmodul
