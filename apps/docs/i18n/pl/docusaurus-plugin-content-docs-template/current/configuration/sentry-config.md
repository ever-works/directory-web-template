---
id: sentry-config
title: Konfiguracja Sentry
sidebar_label: Konf. Sentry
sidebar_position: 10
---

# Konfiguracja Sentry

Ta strona dokumentuje integrację Sentry do śledzenia błędów, monitorowania wydajności i odtwarzania sesji w szablonie. Konfiguracja jest podzielona na trzy pliki: `sentry.config.ts` (wtyczka webpack), `instrumentation.ts` (inicjalizacja po stronie serwera) i `instrumentation-client.ts` (inicjalizacja po stronie klienta).

## Przegląd

Szablon używa SDK `@sentry/nextjs` do przechwytywania błędów i danych wydajności zarówno na serwerze, jak i na kliencie. Sentry jest w pełni opcjonalny -- jeśli nie skonfigurowano DSN, cała inicjalizacja Sentry jest pomijana.

## Konfiguracja Wtyczki Webpack

Plik `sentry.config.ts` w katalogu głównym projektu konfiguruje wtyczkę webpack Sentry używaną podczas budowania:

```ts
export const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "your-org-name",
  project: process.env.SENTRY_PROJECT || "your-project-name",

  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
};
```

### Opcje Wtyczki

| Opcja | Domyślnie | Opis |
|-------|---------|------|
| `silent` | `true` | Tłumi wyjście konsoli wtyczki webpack podczas budowania |
| `org` | zmienna środowiskowa `SENTRY_ORG` | Slug Twojej organizacji Sentry |
| `project` | zmienna środowiskowa `SENTRY_PROJECT` | Slug Twojego projektu Sentry |
| `widenClientFileUpload` | `true` | Przesyła szerszy zestaw plików źródłowych po stronie klienta dla lepszych stack trace'ów |
| `transpileClientSDK` | `true` | Transpiluje SDK Sentry dla szerszej kompatybilności z przeglądarkami |
| `tunnelRoute` | `"/monitoring"` | Pośredniczy w żądaniach Sentry przez Twoją aplikację, aby unikać blokad reklam |
| `hideSourceMaps` | `true` | Zapobiega publicznemu dostępowi do source map w produkcji |
| `disableLogger` | `true` | Wyłącza logger Sentry w celu zmniejszenia rozmiaru bundle |

### Integracja z Konfiguracją Next.js

Opcje wtyczki są używane w `next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## Zmienne Środowiskowe

Sentry opiera się na następujących zmiennych środowiskowych zdefiniowanych w `lib/constants.ts`:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `NEXT_PUBLIC_SENTRY_DSN` | Nie | DSN Sentry (Data Source Name). Jeśli nie ustawiono, Sentry jest wyłączony. |
| `SENTRY_ORG` | Nie | Slug organizacji Sentry do przesyłania source map |
| `SENTRY_PROJECT` | Nie | Slug projektu Sentry do przesyłania source map |
| `SENTRY_AUTH_TOKEN` | Nie | Token uwierzytelniania do przesyłania source map podczas budowania |
| `SENTRY_ENABLE_DEV` | Nie | Ustaw na `"true"`, aby włączyć Sentry w trybie deweloperskim |
| `SENTRY_DEBUG` | Nie | Ustaw na `"true"`, aby włączyć logowanie debugowania SDK Sentry |

## Inicjalizacja po Stronie Serwera

Sentry po stronie serwera jest inicjalizowany w `instrumentation.ts`, który jest wykonywany raz podczas uruchamiania serwera Next.js:

```ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_DEBUG } from "@/lib/constants";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Only initialize Sentry if DSN is configured
  if (SENTRY_DSN.value) {
    Sentry.init({
      dsn: SENTRY_DSN.value,
      tracesSampleRate:
        process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: SENTRY_DEBUG.value === "true",
    });
  }

  // Database initialization follows...
}

// Capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
```

### Wskaźniki Próbkowania Serwera

- **Produkcja:** próbkowanie śledzenia na poziomie 10% (`0.1`) dla zrównoważenia kosztów i widoczności
- **Rozwój:** próbkowanie śledzenia na poziomie 100% (`1.0`) dla pełnej widoczności debugowania

### Raportowanie Błędów

Błędy inicjalizacji bazy danych są zgłaszane do Sentry z tagami kontekstowymi:

```ts
if (SENTRY_DSN.value) {
  Sentry.captureException(error, {
    tags: {
      component: "instrumentation",
      phase: "database_init",
      environment:
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        "unknown",
    },
  });
}
```

## Inicjalizacja po Stronie Klienta

Sentry po stronie klienta jest inicjalizowany w `instrumentation-client.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
import { Replay } from "@sentry/replay";
import {
  SENTRY_DSN,
  SENTRY_DEBUG,
  SENTRY_ENABLED,
} from "@/lib/constants";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || !SENTRY_ENABLED)
    return;

  Sentry.init({
    dsn: SENTRY_DSN.value,
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: SENTRY_DEBUG.value === "true",

    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      new Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Router transition instrumentation
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
```

### Funkcje po Stronie Klienta

**Odtwarzanie Sesji** jest skonfigurowane z domyślnymi ustawieniami zorientowanymi na prywatność:

- `maskAllText: true` -- Cała zawartość tekstowa jest maskowana w odtworzeniach
- `blockAllMedia: true` -- Wszystkie elementy multimedialne są blokowane w odtworzeniach
- Odtworzenia błędów są przechwytywane w 100% (`replaysOnErrorSampleRate: 1.0`)
- Ogólne odtworzenia sesji są przechwytywane w 10% w produkcji

**Przejścia Routera** są instrumentowane za pośrednictwem `onRouterTransitionStart` do śledzenia wydajności nawigacji stron.

## Trasa Tunelowa

Opcja `tunnelRoute: "/monitoring"` pośredniczy w przesyłaniu zdarzeń Sentry przez Twoją aplikację w punkcie końcowym `/monitoring`. Pomaga to ominąć blokady reklam i zasady bezpieczeństwa treści, które mogłyby blokować bezpośrednie żądania do serwerów Sentry.

## Podsumowanie Wskaźników Próbkowania

| Metryka | Rozwój | Produkcja |
|---------|--------|-----------|
| Wskaźnik próbkowania śledzenia (serwer) | 100% | 10% |
| Wskaźnik próbkowania śledzenia (klient) | 100% | 10% |
| Wskaźnik odtwarzania błędów | 100% | 100% |
| Wskaźnik odtwarzania sesji | 100% | 10% |

## Włączanie Sentry

Aby włączyć Sentry w swojej instalacji:

1. Utwórz projekt Sentry na [sentry.io](https://sentry.io)
2. Ustaw wymagane zmienne środowiskowe:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. W trybie deweloperskim ustaw również:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## Powiązane Zasoby

- [Przewodnik instrumentacji](/template/guides/instrumentation) -- Pełna dokumentacja cyklu życia instrumentacji
- [Wzorce obsługi błędów](/template/guides/error-handler-patterns) -- Jak błędy są strukturyzowane i rejestrowane
- [Odniesienie do środowiska](/template/configuration/environment-reference) -- Wszystkie zmienne środowiskowe
