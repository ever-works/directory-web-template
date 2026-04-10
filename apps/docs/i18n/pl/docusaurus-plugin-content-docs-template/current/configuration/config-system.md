---
id: config-system
title: System Konfiguracji
sidebar_label: System Konfiguracji
sidebar_position: 0
---

# System Konfiguracji

Szablon Ever Works używa scentralizowanego, typowanego systemu konfiguracji opartego na schematach walidacji Zod. Wszystkie zmienne środowiskowe są walidowane przy starcie aplikacji, zapewniając natychmiastową informację zwrotną o brakujących lub nieprawidłowych konfiguracjach. System obsługuje zarówno tajemnice wyłącznie serwerowe, jak i bezpieczne publiczne zmienne dla klienta.

## Architektura

```
lib/config/
  config-service.ts        # Scentralizowany singleton ConfigService
  client.ts                # Konfiguracja bezpieczna dla klienta (NEXT_PUBLIC_*)
  env.ts                   # Starszy schemat env (konfiguracja API)
  server-config.ts         # Przestarzałe funkcje pomocnicze serwera (używaj ConfigService)
  feature-flags.ts         # Flagi dostępności funkcji
  index.ts                 # Barrel export
  types.ts                 # Definicje typów TypeScript
  schemas/
    index.ts               # Barrel export schematów
    core.schema.ts         # URL-e, info serwisu, baza danych, treść
    auth.schema.ts         # Tajemnice auth, dostawcy OAuth, JWT, cookies
    email.schema.ts        # SMTP, Resend, konfiguracja Novu
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, ceny
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # Barrel konfiguracji rozliczeń
    stripe.config.ts       # Konfiguracja specyficzna dla Stripe
    lemonsqueezy.config.ts # Konfiguracja LemonSqueezy
    polar.config.ts        # Konfiguracja Polar
    solidgate.config.ts    # Konfiguracja Solidgate
    types.ts               # Typy rozliczeń
  utils/
    env-parser.ts          # Narzędzia do parsowania zmiennych środowiskowych
    validation-logger.ts   # Formatowanie i logowanie wyników walidacji
```

## Singleton ConfigService

Rdzeniem systemu konfiguracji jest klasa `ConfigService` w `lib/config/config-service.ts`. Ona:

1. Zbiera wszystkie zmienne środowiskowe poprzez funkcje kolektora
2. Waliduje je względem połączonego schematu Zod
3. Przechowuje zwalidowaną konfigurację jako singleton
4. Udostępnia typowane gettery dla każdej sekcji konfiguracji

```typescript
import { configService } from '@/lib/config';

// Dostęp do określonych sekcji
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### Eksporty Sekcji

Dla tree-shaking i wygody, poszczególne sekcje są również eksportowane bezpośrednio:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// Bezpośredni dostęp bez przedrostka ConfigService
const dbUrl = coreConfig.DATABASE_URL;
```

### Wymuszanie Tylko-Serwerowe

Moduł `ConfigService` importuje `'server-only'`, co oznacza:

- Może być używany tylko w komponentach serwera, trasach API i kodzie po stronie serwera
- Próba zaimportowania go w komponencie klienta spowoduje błąd kompilacji
- Zapobiega to przypadkowemu ujawnieniu tajemnic, takich jak klucze API

## Konfiguracja Klienta (`lib/config/client.ts`)

Konfiguracja bezpieczna dla klienta znajduje się w oddzielnym module, który odczytuje tylko zmienne `NEXT_PUBLIC_*`:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// Branding serwisu
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // Linki do mediów społecznościowych
siteConfig.attribution // Atrybucja "Built with"

// Ceny
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// Środowisko
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

Ten moduł jest bezpieczny do importowania w dowolnym komponencie, w tym w kodzie po stronie klienta.

## Schematy Walidacji

Każda sekcja konfiguracji ma dedykowany schemat Zod w `lib/config/schemas/`:

### Schemat Core (`core.schema.ts`)

Waliduje: `NODE_ENV`, `APP_URL`, `SITE_URL`, `API_BASE_URL`, `DATABASE_URL`, metadane serwisu (nazwa, tagline, opis, słowa kluczowe, logo), linki społecznościowe, motyw obrazu OG, atrybucję i ustawienia repozytorium treści.

### Schemat Auth (`auth.schema.ts`)

Waliduje: `AUTH_SECRET`, `COOKIE_SECRET`, ustawienia wygasania tokenów JWT, konfigurację cookies, dane uwierzytelniające dostawców OAuth (Google, GitHub, Microsoft, Facebook, X/Twitter, LinkedIn), konfigurację Supabase i dane uwierzytelniające użytkownika seed.

### Schemat Email (`email.schema.ts`)

Waliduje: `EMAIL_PROVIDER` (resend/novu), `EMAIL_FROM`, `EMAIL_SUPPORT`, `COMPANY_NAME`, ustawienia SMTP (host, port, użytkownik, hasło), klucz API Resend i klucz API Novu.

### Schemat Płatności (`payment.schema.ts`)

Waliduje: Stripe (klucz tajny, klucz publikowalny, tajemnica webhook, ID cen, dynamiczne ceny, wiele walut), LemonSqueezy (klucz API, ID sklepu, webhook, ID wariantów), Polar (token dostępu, webhook, organizacja, ID planów), ceny produktów, kwoty próbne.

### Schemat Analityki (`analytics.schema.ts`)

Waliduje: PostHog (klucz, host, debug, nagrywanie sesji, auto-capture, osobisty klucz API, ID projektu), Sentry (DSN, organizacja, projekt, token auth, debug), Vercel Analytics, Recaptcha (klucz serwisu, klucz tajny), dostawca śledzenia wyjątków.

### Schemat Integracji (`integrations.schema.ts`)

Waliduje: Trigger.dev (włączony, klucz API, URL, środowisko), Twenty CRM (bazowy URL, klucz API, włączony, tryb synchronizacji), Cron (tajemnica).

## Zachowanie Walidacji

System walidacji używa `.catch()` Zod dla łagodnej degradacji:

```typescript
// Z integrations.schema.ts
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

- **Pola opcjonalne** z `.catch()` przywracają się z wartościami domyślnymi
- **Pola wymagane** bez `.catch()` powodują błąd startu
- **Kroki transformacji** obliczają wartości pochodne (np. automatyczne wykrywanie stanu włączonego)

Wyniki walidacji są rejestrowane przy starcie przez `validation-logger.ts`, pokazując które integracje są aktywne i ostrzeżenia dotyczące brakującej opcjonalnej konfiguracji.

## Flagi Funkcji (`lib/config/feature-flags.ts`)

Flagi funkcji zapewniają prosty mechanizm włączania/wyłączania funkcji zależnych od bazy danych:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // Renderuj sekcję komentarzy
}
```

Wszystkie flagi funkcji są obecnie powiązane z dostępnością `DATABASE_URL`. Gdy baza danych nie jest skonfigurowana, interaktywne funkcje są wyłączone, podczas gdy katalog nadal serwuje treści statyczne.

## Migracja ze Starszej Konfiguracji

Moduł `server-config.ts` zawiera przestarzałe funkcje pomocnicze. Ścieżki migracji:

| Przestarzałe | Zamiennik |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## Powiązane Pliki

- `lib/config/config-service.ts` -- Singleton ConfigService
- `lib/config/client.ts` -- Konfiguracja bezpieczna dla klienta
- `lib/config/schemas/*.schema.ts` -- Schematy walidacji Zod
- `lib/config/feature-flags.ts` -- Flagi funkcji
- `lib/config/types.ts` -- Definicje typów TypeScript
- `.env.example` -- Pełna dokumentacja zmiennych środowiskowych
