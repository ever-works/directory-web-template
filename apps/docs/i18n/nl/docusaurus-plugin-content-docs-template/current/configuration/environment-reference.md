---
id: environment-reference
title: Volledige Referentie Omgevingsvariabelen
sidebar_label: Omgevingsreferentie
sidebar_position: 1
---

# Volledige Referentie Omgevingsvariabelen

Deze pagina biedt een uitgebreide referentie van alle omgevingsvariabelen die door het Ever Works template worden gebruikt. Variabelen zijn georganiseerd per categorie met hun typen, standaardwaarden en of ze verplicht zijn.

Kopieer `.env.example` naar `.env.local` en vul de waarden in voor uw implementatie.

## Inhoud & Gegevensrepository

| Variabele | Type | Verplicht | Standaard | Beschrijving |
|-----------|------|-----------|-----------|--------------|
| `DATA_REPOSITORY` | string (URL) | **Ja** | -- | Git-repository-URL voor inhoudsgegevens |
| `GH_TOKEN` | string | Nee | -- | Persoonlijk GitHub-toegangstoken (voor privé-repos) |
| `GITHUB_TOKEN` | string | Nee | -- | Alternatieve GitHub-tokenvariabele |
| `GITHUB_BRANCH` | string | Nee | `master` | Git-branch om inhoud van te klonen |

## Database

| Variabele | Type | Verplicht | Standaard | Beschrijving |
|-----------|------|-----------|-----------|--------------|
| `DATABASE_URL` | string | Aanbevolen | -- | Databaseverbindingsstring (SQLite of Postgres) |

Wanneer `DATABASE_URL` niet is ingesteld, worden database-afhankelijke functies (beoordelingen, opmerkingen, favorieten, enquêtes, uitgelichte items) automatisch uitgeschakeld via het functievlaggen-systeem.

## Authenticatie

| Variabele | Type | Verplicht | Standaard | Beschrijving |
|-----------|------|-----------|-----------|--------------|
| `AUTH_SECRET` | string | **Ja** | -- | NextAuth-geheim (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **Ja** | -- | Cookie-versleuteling-geheim |
| `COOKIE_DOMAIN` | string | Nee | -- | Cookie-domein (bijv. `localhost`) |
| `COOKIE_SECURE` | boolean | Nee | `true` | Beveiligde-cookie-vlag |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | Nee | `15m` | Access-token TTL |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | Nee | `7d` | Refresh-token TTL |

### OAuth-providers

| Variabele | Type | Verplicht | Beschrijving |
|-----------|------|-----------|--------------|
| `GOOGLE_CLIENT_ID` | string | Nee | Google OAuth-client-ID |
| `GOOGLE_CLIENT_SECRET` | string | Nee | Google OAuth-clientgeheim |
| `GITHUB_CLIENT_ID` | string | Nee | GitHub OAuth-client-ID |
| `GITHUB_CLIENT_SECRET` | string | Nee | GitHub OAuth-clientgeheim |
| `MICROSOFT_CLIENT_ID` | string | Nee | Microsoft OAuth-client-ID |
| `MICROSOFT_CLIENT_SECRET` | string | Nee | Microsoft OAuth-clientgeheim |
| `FB_CLIENT_ID` | string | Nee | Facebook OAuth-client-ID |
| `FB_CLIENT_SECRET` | string | Nee | Facebook OAuth-clientgeheim |
| `X_CLIENT_ID` | string | Nee | X (Twitter) OAuth-client-ID |
| `X_CLIENT_SECRET` | string | Nee | X (Twitter) OAuth-clientgeheim |
| `LINKEDIN_CLIENT_ID` | string | Nee | LinkedIn OAuth-client-ID |
| `LINKEDIN_CLIENT_SECRET` | string | Nee | LinkedIn OAuth-clientgeheim |

OAuth-providers worden automatisch ingeschakeld wanneer zowel client-ID als clientgeheim zijn ingesteld.

## Site & Branding (Clientveilig)

Alle `NEXT_PUBLIC_*` variabelen worden blootgesteld aan de browser.

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | Directory-app-URL |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | Openbare website-URL van het bedrijf |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | API-basis-URL |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | Sitenaam voor metadata |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | Sitetagline |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | Merknaam voor schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (zie .env.example) | SEO-beschrijving (onder 160 tekens) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | Kommagescheiden SEO-trefwoorden |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Logo-pad (relatief aan /public) |

### OG-afbeelding theming

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | OG-afbeelding verloop startkleur |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | OG-afbeelding verloop eindkleur |

### Sociale media-links

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | GitHub-link |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | X (Twitter)-link |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (zie .env.example) | LinkedIn-link |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (zie .env.example) | Facebook-link |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | Blog-link |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | Contact-e-mail |

### Toeschrijving

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | "Gebouwd met"-link-URL |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | "Gebouwd met"-linktekst |

## Betalingsproviders

### Stripe

| Variabele | Type | Verplicht | Beschrijving |
|-----------|------|-----------|--------------|
| `STRIPE_SECRET_KEY` | string | Nee | Stripe-geheime sleutel (alleen server) |
| `STRIPE_PUBLISHABLE_KEY` | string | Nee | Stripe-publiceerbare sleutel |
| `STRIPE_WEBHOOK_SECRET` | string | Nee | Webhook-ondertekeningsgeheim |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | Nee | Clientveilige publiceerbare sleutel |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | Nee | Prijzen laden van Stripe API |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | Nee | Stripe-checkout activeren |

#### Stripe meervaluta prijs-ID's

Voor Standaard- en Premium-plannen ondersteunt het template valuta-specifieke prijs-ID's:

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

Hetzelfde patroon geldt voor Premium-planvariabelen en instellingskosten-ID's.

### LemonSqueezy

| Variabele | Type | Beschrijving |
|-----------|------|--------------|
| `LEMONSQUEEZY_API_KEY` | string | API-sleutel |
| `LEMONSQUEEZY_STORE_ID` | string | Store-identificator |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Webhook-geheim |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | Webhook-eindpunt-URL |
| `LEMONSQUEEZY_TEST_MODE` | boolean | Testmodus activeren |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | Gratis planvariant |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | Standaard planvariant |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | Premium planvariant |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | Checkout activeren |

### Polar

| Variabele | Type | Beschrijving |
|-----------|------|--------------|
| `POLAR_ACCESS_TOKEN` | string | Toegangstoken |
| `POLAR_WEBHOOK_SECRET` | string | Webhook-geheim |
| `POLAR_ORGANIZATION_ID` | string | Organisatie-ID |
| `POLAR_SANDBOX` | boolean | Sandbox-modus (standaard: `true`) |
| `POLAR_API_URL` | string (URL) | Aangepaste API-URL |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | Gratis plan-ID |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | Standaard plan-ID |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | Premium plan-ID |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | Checkout activeren |

### Solidgate

| Variabele | Type | Beschrijving |
|-----------|------|--------------|
| `SOLIDGATE_API_KEY` | string | API-sleutel |
| `SOLIDGATE_SECRET_KEY` | string | Geheime sleutel |
| `SOLIDGATE_WEBHOOK_SECRET` | string | Webhook-geheim |
| `SOLIDGATE_MERCHANT_ID` | string | Handelaar-ID |
| `SOLIDGATE_API_BASE_URL` | string (URL) | API-basis-URL |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | Clientveilige sleutel |

### Productprijzen

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | Gratis tariefprijs |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | Standaard tariefprijs |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | Premium tariefprijs |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | Premium proefbedrag-ID |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | Standaard proefbedrag-ID |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | Proefbedragen activeren |

## Analyse & Bewaking

### PostHog

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | PostHog-project-API-sleutel |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | PostHog-host |
| `POSTHOG_DEBUG` | boolean | `false` | Debug-logboekregistratie activeren |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | Sessie-opname |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | Gebeurtenissen automatisch vastleggen |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | Server-side API-sleutel |
| `POSTHOG_PROJECT_ID` | string | -- | Project-ID voor analyse |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | Uitzonderingsbeheer |

### Sentry

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | Sentry-DSN |
| `SENTRY_ORG` | string | `ever-co` | Sentry-organisatie |
| `SENTRY_PROJECT` | string | `ever-works` | Sentry-projectnaam |
| `SENTRY_AUTH_TOKEN` | string | -- | Sentry-authenticatietoken |
| `SENTRY_ENABLE_DEV` | boolean | `false` | In ontwikkeling activeren |
| `SENTRY_DEBUG` | boolean | `false` | Foutopsporingsmodus |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | Uitzonderingsbeheer |

### Overige analyse

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | Uitzonderingsprovider (`posthog` of `sentry`) |
| `ANALYZE` | boolean | `true` | Bundle-analyse activeren |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | reCAPTCHA-sitesleutel |
| `RECAPTCHA_SECRET_KEY` | string | -- | reCAPTCHA-geheime sleutel |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | Speed Insights steekproefpercentage |

## E-mail

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `EMAIL_PROVIDER` | string | `resend` | E-mailprovider (`resend` of `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | Afzenderadres voor meldingen |
| `EMAIL_SUPPORT` | string | `support@ever.works` | Ondersteunings-e-mailadres |
| `COMPANY_NAME` | string | `Ever Works` | Bedrijfsnaam voor e-mailsjablonen |
| `RESEND_API_KEY` | string | -- | Resend-API-sleutel |
| `NOVU_API_KEY` | string | -- | Novu-API-sleutel |
| `SMTP_HOST` | string | -- | SMTP-serverhostnaam |
| `SMTP_PORT` | number | `587` | SMTP-poort |
| `SMTP_USER` | string | -- | SMTP-gebruikersnaam |
| `SMTP_PASSWORD` | string | -- | SMTP-wachtwoord |

## Integraties

### Twenty CRM

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | Twenty CRM-instantie-URL |
| `TWENTY_CRM_API_KEY` | string | -- | API-sleutel voor authenticatie |
| `TWENTY_CRM_ENABLED` | boolean | `false` | Expliciet in-/uitschakelen |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | Synchronisatiemodus (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (Achtergrondtaken)

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | Trigger.dev activeren |
| `TRIGGER_DEV_API_KEY` | string | -- | API-sleutel |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | Aangepaste API-URL |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | Omgeving (`development`, `staging`, `production`) |

### Cron-taken

| Variabele | Type | Beschrijving |
|-----------|------|--------------|
| `CRON_SECRET` | string | Authenticatiegeheim voor cron-eindpunten |

### Kaarten & Locatie

| Variabele | Type | Beschrijving |
|-----------|------|--------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | Mapbox openbaar token (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | Browser-beperkte Google Maps-sleutel |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | Google Maps-kaart-ID |

### Ever Works Platform-API

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | Platform-API-URL |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | Platform-API-authenticatietoken |

## Vercel & Implementatie

| Variabele | Type | Beschrijving |
|-----------|------|--------------|
| `VERCEL_TOKEN` | string | Persoonlijk Vercel-toegangstoken |
| `VERCEL_PROJECT_ID` | string | Vercel-project-ID |
| `VERCEL_TEAM_SCOPE` | string | Vercel-team-ID |
| `VERCEL_PLAN` | string | Plantype (`pro` voor 5-minuten cron) |
| `VERCEL_DEPLOYMENT_ID` | string | Huidige implementatie-ID |
| `CRON_FREQUENCY` | string | Cron-frequentie forceren (bijv. `5min`) |

## Demo & Seeding

| Variabele | Type | Standaard | Beschrijving |
|-----------|------|-----------|--------------|
| `NEXT_PUBLIC_DEMO` | boolean | `true` | Demomodus met voorbeeldgegevens activeren |
| `SEED_ADMIN_EMAIL` | string | `admin@changeme.com` | Beheerders-e-mail voor seeding |
| `SEED_ADMIN_PASSWORD` | string | `changeme_password` | Beheerderwachtwoord voor seeding |
| `SEED_FAKE_USER_COUNT` | number | `10` | Aantal te genereren nep-gebruikers |
| `NODE_ENV` | string | `development` | Node-omgeving |

## Verwante bestanden

- `.env.example` -- Sjabloonbestand met alle variabelen en inline documentatie
- `lib/config/schemas/*.schema.ts` -- Zod-validatieschema's voor elke categorie
- `lib/config/config-service.ts` -- Gecentraliseerde validatie en toegang
- `lib/config/client.ts` -- Clientveilig configuratiemodule
