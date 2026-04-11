---
id: provider-config
title: "Konfiguracja Dostawców"
sidebar_label: "Konfiguracja Dostawców"
sidebar_position: 4
---

# Konfiguracja Dostawców

Szablon używa scentralizowanego singletonu `ConfigService` do zarządzania wszystkimi zewnętrznymi dostawcami usług. Każdy dostawca jest konfigurowany przez schematy walidowane za pomocą Zod z automatycznym wykrywaniem funkcji -- dostawcy są włączani gdy ich wymagane dane uwierzytelniające są obecne.

## Architektura ConfigService

`ConfigService` w `lib/config/config-service.ts` jest singletonem tylko po stronie serwera, który waliduje wszystkie zmienne środowiskowe przy uruchomieniu:

```ts
import { configService } from '@/lib/config';

// Dostęp do sekcji konfiguracji
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

Usługa jest zorganizowana w sześć sekcji, każda z własnym schematem Zod:

| Sekcja | Akcesor | Plik schematu |
|--------|---------|---------------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### Importy Tree-Shakeable

Poszczególne sekcje mogą być importowane bezpośrednio dla lepszego tree-shakingu:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### Walidacja przy Uruchomieniu

Cała konfiguracja jest walidowana za pomocą Zod przy pierwszym imporcie. Nieprawidłowe wartości wywołują fallbacki `.catch()` tam gdzie to możliwe, podczas gdy błędy, których naprawdę nie można naprawić, są rzucane przy uruchomieniu:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## Dostawcy Uwierzytelniania

Zdefiniowany w `lib/config/schemas/auth.schema.ts`. Dostawcy OAuth automatycznie wykrywają włączenie:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### Obsługiwani Dostawcy OAuth

| Dostawca | Zmienna Client ID | Zmienna Client Secret |
|----------|-------------------|-----------------------|
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

| Zmienna | Opis |
|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projektu Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonimowy klucz Supabase |

### Dodatkowe Ustawienia Auth

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `AUTH_SECRET` | -- | Wymagane do podpisywania sesji |
| `COOKIE_SECRET` | -- | Sekret szyfrowania ciasteczek |
| `COOKIE_DOMAIN` | `'localhost'` | Domena ciasteczek |
| `COOKIE_SECURE` | `false` | Ciasteczka tylko HTTPS |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | TTL tokenu dostępu |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | TTL tokenu odświeżania |

## Dostawcy Płatności

Zdefiniowany w `lib/config/schemas/payment.schema.ts`. Każdy dostawca jest automatycznie włączany gdy wymagane dane uwierzytelniające są ustawione.

### Stripe

Automatycznie włączany gdy `secretKey` i `publishableKey` są obecne:

| Zmienna | Opis |
|---------|------|
| `STRIPE_SECRET_KEY` | Tajny klucz po stronie serwera |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Klucz publiczny po stronie klienta |
| `STRIPE_WEBHOOK_SECRET` | Weryfikacja podpisu webhooka |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | ID ceny dla planu darmowego |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | ID ceny dla planu standardowego |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | ID ceny dla planu premium |

### LemonSqueezy

Automatycznie włączany gdy `apiKey` i `storeId` są obecne:

| Zmienna | Opis |
|---------|------|
| `LEMONSQUEEZY_API_KEY` | Klucz API |
| `LEMONSQUEEZY_STORE_ID` | Identyfikator sklepu |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Sekret webhooka |
| `LEMONSQUEEZY_WEBHOOK_URL` | URL punktu końcowego webhooka |
| `LEMONSQUEEZY_TEST_MODE` | Włącz tryb testowy (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | ID wariantu dla planu darmowego |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | ID wariantu dla planu standardowego |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | ID wariantu dla planu premium |

### Polar

Automatycznie włączany gdy `accessToken` i `organizationId` są obecne:

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `POLAR_ACCESS_TOKEN` | -- | Token dostępu do API |
| `POLAR_ORGANIZATION_ID` | -- | ID organizacji |
| `POLAR_WEBHOOK_SECRET` | -- | Sekret webhooka |
| `POLAR_SANDBOX` | `true` | Tryb piaskownicy (ustaw `'false'` dla produkcji) |
| `POLAR_API_URL` | -- | Niestandardowy URL API |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | ID planu dla poziomu darmowego |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | ID planu dla poziomu standardowego |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | ID planu dla poziomu premium |

### Wyświetlanie Cen Produktów

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | Cena wyświetlana dla planu darmowego |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | Cena wyświetlana dla planu standardowego |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | Cena wyświetlana dla planu premium |

## Dostawcy Email

Zdefiniowany w `lib/config/schemas/email.schema.ts`.

### SMTP

Automatycznie włączany gdy `host`, `user` i `password` są wszystkie obecne:

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `SMTP_HOST` | -- | Nazwa hosta serwera SMTP |
| `SMTP_PORT` | `587` | Port serwera SMTP |
| `SMTP_USER` | -- | Nazwa użytkownika uwierzytelniania SMTP |
| `SMTP_PASSWORD` | -- | Hasło uwierzytelniania SMTP |

### Resend

Automatycznie włączany gdy `apiKey` jest obecny:

| Zmienna | Opis |
|---------|------|
| `RESEND_API_KEY` | Klucz API Resend |

### Novu

Automatycznie włączany gdy `apiKey` jest obecny:

| Zmienna | Opis |
|---------|------|
| `NOVU_API_KEY` | Klucz API Novu |

### Ustawienia Email

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `COMPANY_NAME` | `'Ever Works'` | Nazwa firmy w szablonach email |
| `EMAIL_PROVIDER` | `'resend'` | Aktywny dostawca email (`'resend'`, `'novu'`) |
| `EMAIL_FROM` | -- | Adres email nadawcy |
| `EMAIL_SUPPORT` | -- | Adres email wsparcia |

## Dostawcy Analytics

Zdefiniowany w `lib/config/schemas/analytics.schema.ts`.

### PostHog

Automatycznie włączany gdy `key` jest obecny:

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | Klucz API projektu PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | URL hosta PostHog |
| `POSTHOG_DEBUG` | `false` | Włącz tryb debugowania |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | Włącz nagrywanie sesji |
| `POSTHOG_AUTO_CAPTURE` | `false` | Automatyczne przechwytywanie zdarzeń |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | Śledzenie wyjątków |
| `POSTHOG_PERSONAL_API_KEY` | -- | Osobisty klucz API (panel admina) |
| `POSTHOG_PROJECT_ID` | -- | ID projektu (panel admina) |

### Sentry

Automatycznie włączany gdy `dsn` jest obecny:

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | DSN Sentry |
| `SENTRY_ORG` | -- | Slug organizacji Sentry |
| `SENTRY_PROJECT` | -- | Nazwa projektu Sentry |
| `SENTRY_AUTH_TOKEN` | -- | Token auth dla map źródłowych |
| `SENTRY_ENABLE_DEV` | `false` | Włącz w trybie deweloperskim |
| `SENTRY_DEBUG` | `false` | Tryb debugowania |

### reCAPTCHA

Automatycznie włączany gdy zarówno `siteKey` jak i `secretKey` są obecne:

| Zmienna | Opis |
|---------|------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Klucz strony po stronie klienta |
| `RECAPTCHA_SECRET_KEY` | Tajny klucz po stronie serwera |

### Vercel Analytics

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | Włącz Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | Częstotliwość próbkowania (0--1) |

### Dostawca Śledzenia Wyjątków

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`, `'sentry'` lub `'none'` |

## Sprawdzanie Statusu Dostawców

```ts
import { configService } from '@/lib/config';

// Sprawdź czy Stripe jest skonfigurowany
if (configService.payment.stripe.enabled) {
  // Stripe jest gotowy do użycia
}

// Sprawdź czy jakikolwiek dostawca email jest dostępny
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// Wylistuj włączonych dostawców OAuth
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## Powiązane Pliki

| Ścieżka | Opis |
|---------|------|
| `lib/config/config-service.ts` | Singleton ConfigService |
| `lib/config/schemas/auth.schema.ts` | Schematy dostawców auth |
| `lib/config/schemas/payment.schema.ts` | Schematy dostawców płatności |
| `lib/config/schemas/email.schema.ts` | Schematy dostawców email |
| `lib/config/schemas/analytics.schema.ts` | Schematy dostawców analytics |
| `lib/config/schemas/integrations.schema.ts` | Schematy dostawców integracji |
| `lib/config/schemas/core.schema.ts` | Schemat konfiguracji podstawowej |
| `lib/config/types.ts` | Definicje typów TypeScript |
| `lib/config/index.ts` | Eksport barrel |
| `.env.example` | Pełna dokumentacja zmiennych środowiskowych |
