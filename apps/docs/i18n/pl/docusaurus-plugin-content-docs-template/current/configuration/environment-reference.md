---
id: environment-reference
title: Kompletna Dokumentacja Zmiennych Środowiskowych
sidebar_label: Dokumentacja Środowiska
sidebar_position: 1
---

# Kompletna Dokumentacja Zmiennych Środowiskowych

Ta strona zawiera kompleksową dokumentację wszystkich zmiennych środowiskowych używanych przez szablon Ever Works. Zmienne są zorganizowane według kategorii z typami, wartościami domyślnymi i informacją o tym, czy są wymagane.

Skopiuj `.env.example` do `.env.local` i uzupełnij wartości dla swojego wdrożenia.

## Repozytorium zawartości & danych

| Zmienna | Typ | Wymagana | Domyślna | Opis |
|---------|-----|----------|----------|------|
| `DATA_REPOSITORY` | string (URL) | **Tak** | -- | URL repozytorium Git dla danych zawartości |
| `GH_TOKEN` | string | Nie | -- | Osobisty token dostępu GitHub (dla prywatnych repozytoriów) |
| `GITHUB_TOKEN` | string | Nie | -- | Alternatywna zmienna tokenu GitHub |
| `GITHUB_BRANCH` | string | Nie | `master` | Gałąź Git, z której klonować zawartość |

## Baza danych

| Zmienna | Typ | Wymagana | Domyślna | Opis |
|---------|-----|----------|----------|------|
| `DATABASE_URL` | string | Zalecana | -- | Ciąg połączenia z bazą danych (SQLite lub Postgres) |

Gdy `DATABASE_URL` nie jest ustawiona, funkcje zależne od bazy danych (oceny, komentarze, ulubione, ankiety, wyróżnione elementy) są automatycznie wyłączane przez system flag funkcji.

## Uwierzytelnianie

| Zmienna | Typ | Wymagana | Domyślna | Opis |
|---------|-----|----------|----------|------|
| `AUTH_SECRET` | string | **Tak** | -- | Sekret NextAuth (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **Tak** | -- | Sekret szyfrowania ciasteczek |
| `COOKIE_DOMAIN` | string | Nie | -- | Domena ciasteczek (np. `localhost`) |
| `COOKIE_SECURE` | boolean | Nie | `true` | Flaga bezpiecznego ciasteczka |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | Nie | `15m` | TTL tokenu dostępu |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | Nie | `7d` | TTL tokenu odświeżania |

### Dostawcy OAuth

| Zmienna | Typ | Wymagana | Opis |
|---------|-----|----------|------|
| `GOOGLE_CLIENT_ID` | string | Nie | ID klienta OAuth Google |
| `GOOGLE_CLIENT_SECRET` | string | Nie | Sekret klienta OAuth Google |
| `GITHUB_CLIENT_ID` | string | Nie | ID klienta OAuth GitHub |
| `GITHUB_CLIENT_SECRET` | string | Nie | Sekret klienta OAuth GitHub |
| `MICROSOFT_CLIENT_ID` | string | Nie | ID klienta OAuth Microsoft |
| `MICROSOFT_CLIENT_SECRET` | string | Nie | Sekret klienta OAuth Microsoft |
| `FB_CLIENT_ID` | string | Nie | ID klienta OAuth Facebook |
| `FB_CLIENT_SECRET` | string | Nie | Sekret klienta OAuth Facebook |
| `X_CLIENT_ID` | string | Nie | ID klienta OAuth X (Twitter) |
| `X_CLIENT_SECRET` | string | Nie | Sekret klienta OAuth X (Twitter) |
| `LINKEDIN_CLIENT_ID` | string | Nie | ID klienta OAuth LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | string | Nie | Sekret klienta OAuth LinkedIn |

Dostawcy OAuth są automatycznie włączani, gdy ustawione są zarówno ID klienta, jak i sekret.

## Witryna & Branding (Bezpieczne dla klienta)

Wszystkie zmienne `NEXT_PUBLIC_*` są dostępne dla przeglądarki.

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | URL aplikacji katalogu |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | Publiczny URL strony internetowej firmy |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | Bazowy URL API |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | Nazwa witryny dla metadanych |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | Slogan witryny |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | Nazwa marki dla schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (patrz .env.example) | Opis SEO (poniżej 160 znaków) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | Słowa kluczowe SEO oddzielone przecinkami |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Ścieżka logo (względna do /public) |

### Motyw obrazu OG

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | Kolor początkowy gradientu obrazu OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | Kolor końcowy gradientu obrazu OG |

### Linki do mediów społecznościowych

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | Link GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | Link X (Twitter) |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (patrz .env.example) | Link LinkedIn |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (patrz .env.example) | Link Facebook |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | Link do bloga |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | Email kontaktowy |

### Atrybucja

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | URL linku "Zbudowane z" |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | Tekst linku "Zbudowane z" |

## Dostawcy płatności

### Stripe

| Zmienna | Typ | Wymagana | Opis |
|---------|-----|----------|------|
| `STRIPE_SECRET_KEY` | string | Nie | Tajny klucz Stripe (tylko serwer) |
| `STRIPE_PUBLISHABLE_KEY` | string | Nie | Klucz publiczny Stripe |
| `STRIPE_WEBHOOK_SECRET` | string | Nie | Sekret podpisywania webhooka |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | Nie | Bezpieczny klucz publiczny dla klienta |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | Nie | Ładuj ceny z API Stripe |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | Nie | Włącz checkout Stripe |

#### ID cen wielowalutowych Stripe

Dla planów Standard i Premium, szablon obsługuje ID cen specyficzne dla waluty:

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

Ten sam wzorzec obowiązuje dla zmiennych planu Premium i ID opłat instalacyjnych.

### LemonSqueezy

| Zmienna | Typ | Opis |
|---------|-----|------|
| `LEMONSQUEEZY_API_KEY` | string | Klucz API |
| `LEMONSQUEEZY_STORE_ID` | string | Identyfikator sklepu |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Sekret webhooka |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | URL endpointu webhooka |
| `LEMONSQUEEZY_TEST_MODE` | boolean | Włącz tryb testowy |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | Wariant planu darmowego |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | Wariant planu standardowego |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | Wariant planu premium |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | Włącz checkout |

### Polar

| Zmienna | Typ | Opis |
|---------|-----|------|
| `POLAR_ACCESS_TOKEN` | string | Token dostępu |
| `POLAR_WEBHOOK_SECRET` | string | Sekret webhooka |
| `POLAR_ORGANIZATION_ID` | string | ID organizacji |
| `POLAR_SANDBOX` | boolean | Tryb sandbox (domyślnie: `true`) |
| `POLAR_API_URL` | string (URL) | Niestandardowy URL API |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | ID planu darmowego |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | ID planu standardowego |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | ID planu premium |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | Włącz checkout |

### Solidgate

| Zmienna | Typ | Opis |
|---------|-----|------|
| `SOLIDGATE_API_KEY` | string | Klucz API |
| `SOLIDGATE_SECRET_KEY` | string | Tajny klucz |
| `SOLIDGATE_WEBHOOK_SECRET` | string | Sekret webhooka |
| `SOLIDGATE_MERCHANT_ID` | string | ID sprzedawcy |
| `SOLIDGATE_API_BASE_URL` | string (URL) | Bazowy URL API |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | Bezpieczny klucz dla klienta |

### Cennik produktów

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | Cena planu darmowego |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | Cena planu standardowego |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | Cena planu premium |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | ID kwoty próbnej premium |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | ID kwoty próbnej standardowej |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | Włącz kwoty próbne |

## Analiza & Monitorowanie

### PostHog

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | Klucz API projektu PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | Host PostHog |
| `POSTHOG_DEBUG` | boolean | `false` | Włącz logowanie debugowania |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | Nagrywanie sesji |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | Automatyczne przechwytywanie zdarzeń |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | Klucz API po stronie serwera |
| `POSTHOG_PROJECT_ID` | string | -- | ID projektu dla analityki |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | Śledzenie wyjątków |

### Sentry

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | DSN Sentry |
| `SENTRY_ORG` | string | `ever-co` | Organizacja Sentry |
| `SENTRY_PROJECT` | string | `ever-works` | Nazwa projektu Sentry |
| `SENTRY_AUTH_TOKEN` | string | -- | Token uwierzytelniania Sentry |
| `SENTRY_ENABLE_DEV` | boolean | `false` | Włącz w środowisku deweloperskim |
| `SENTRY_DEBUG` | boolean | `false` | Tryb debugowania |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | Śledzenie wyjątków |

### Pozostała analityka

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | Dostawca wyjątków (`posthog` lub `sentry`) |
| `ANALYZE` | boolean | `true` | Włącz analizę bundle |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | Klucz witryny reCAPTCHA |
| `RECAPTCHA_SECRET_KEY` | string | -- | Tajny klucz reCAPTCHA |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | Próbkowanie Speed Insights |

## Email

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `EMAIL_PROVIDER` | string | `resend` | Dostawca email (`resend` lub `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | Adres nadawcy dla powiadomień |
| `EMAIL_SUPPORT` | string | `support@ever.works` | Adres email wsparcia |
| `COMPANY_NAME` | string | `Ever Works` | Nazwa firmy dla szablonów email |
| `RESEND_API_KEY` | string | -- | Klucz API Resend |
| `NOVU_API_KEY` | string | -- | Klucz API Novu |
| `SMTP_HOST` | string | -- | Hostname serwera SMTP |
| `SMTP_PORT` | number | `587` | Port SMTP |
| `SMTP_USER` | string | -- | Nazwa użytkownika SMTP |
| `SMTP_PASSWORD` | string | -- | Hasło SMTP |

## Integracje

### Twenty CRM

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | URL instancji Twenty CRM |
| `TWENTY_CRM_API_KEY` | string | -- | Klucz API do uwierzytelniania |
| `TWENTY_CRM_ENABLED` | boolean | `false` | Jawne włączanie/wyłączanie |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | Tryb synchronizacji (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (Zadania w tle)

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | Włącz Trigger.dev |
| `TRIGGER_DEV_API_KEY` | string | -- | Klucz API |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | Niestandardowy URL API |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | Środowisko (`development`, `staging`, `production`) |

### Zadania Cron

| Zmienna | Typ | Opis |
|---------|-----|------|
| `CRON_SECRET` | string | Sekret uwierzytelniania dla endpointów cron |

### Mapy & Lokalizacja

| Zmienna | Typ | Opis |
|---------|-----|------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | Publiczny token Mapbox (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | Klucz Google Maps z ograniczeniami do przeglądarki |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | ID mapy Google Maps |

### API platformy Ever Works

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | URL API platformy |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | Token uwierzytelniania API platformy |

## Vercel & Wdrożenie

| Zmienna | Typ | Opis |
|---------|-----|------|
| `VERCEL_TOKEN` | string | Osobisty token dostępu Vercel |
| `VERCEL_PROJECT_ID` | string | ID projektu Vercel |
| `VERCEL_TEAM_SCOPE` | string | ID zespołu Vercel |
| `VERCEL_PLAN` | string | Typ planu (`pro` dla 5-minutowego crona) |
| `VERCEL_DEPLOYMENT_ID` | string | ID bieżącego wdrożenia |
| `CRON_FREQUENCY` | string | Wymuś częstotliwość crona (np. `5min`) |

## Demo & Wypełnianie danych

| Zmienna | Typ | Domyślna | Opis |
|---------|-----|----------|------|
| `NEXT_PUBLIC_DEMO` | boolean | `true` | Włącz tryb demo z przykładowymi danymi |
| `SEED_ADMIN_EMAIL` | string | `admin@changeme.com` | Email administratora dla wypełniania danych |
| `SEED_ADMIN_PASSWORD` | string | `changeme_password` | Hasło administratora dla wypełniania danych |
| `SEED_FAKE_USER_COUNT` | number | `10` | Liczba fikcyjnych użytkowników do wygenerowania |
| `NODE_ENV` | string | `development` | Środowisko Node |

## Powiązane pliki

- `.env.example` -- Plik szablonu ze wszystkimi zmiennymi i dokumentacją inline
- `lib/config/schemas/*.schema.ts` -- Schematy walidacji Zod dla każdej kategorii
- `lib/config/config-service.ts` -- Scentralizowana walidacja i dostęp
- `lib/config/client.ts` -- Moduł konfiguracji bezpieczny dla klienta
