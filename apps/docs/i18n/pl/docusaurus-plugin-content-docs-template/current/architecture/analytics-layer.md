---
id: analytics-layer
title: "Warstwa integracji analityki"
sidebar_label: "Warstwa analityczna"
sidebar_position: 28
---

# Warstwa integracji analityki

Moduł analityczny (`lib/analytics/index.ts`) zapewnia ujednoliconą warstwę analityczną, która wyodrębnia śledzenie zdarzeń PostHog, monitorowanie błędów Sentry i ocenę flag funkcji za pojedynczą klasą `Analytics`. Moduł wykorzystuje wzorzec singletonu, aby zapewnić pojedynczą inicjowaną instancję w całej aplikacji.

## Przegląd architektury

Warstwa analityczna obejmuje dwóch dostawców:

- **PostHog** — śledzenie zdarzeń, odsłony stron, identyfikacja użytkownika, flagi funkcji, nagrywanie sesji i śledzenie wyjątków
- **Sentry** — Monitorowanie błędów i śledzenie wyjątków

Obaj dostawcy są opcjonalni i kontrolowani za pomocą stałych konfiguracyjnych środowiska. Moduł łagodnie ulega degradacji, gdy dostawcy są wyłączeni.

## Klasa Analityka

### Dostęp do Singletona

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

Eksport `analytics` jest wstępnie zainicjowanym singletonem. Sama klasa jest również eksportowana do użycia typu:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### Inicjalizacja

Metodę `init()` należy wywołać raz po stronie klienta przed wywołaniem śledzącym:

```ts
analytics.init();
```

#### Co się dzieje podczas init

1. **Ochrona SSR** -- Pomija inicjalizację, jeśli `window` jest niezdefiniowane
2. **Konfiguracja PostHog** — Jeśli jest włączona, inicjuje PostHog ze scentralizowaną konfiguracją
3. **Nagrywanie sesji** — Warunkowo umożliwia nagrywanie sesji z maskowaniem wejścia
4. **Próbkowanie** — stosuje częstotliwość próbkowania zdarzeń (użytkownicy rezygnują losowo na podstawie `POSTHOG_SAMPLE_RATE`)
5. **Śledzenie wyjątków** – Konfiguruje globalne procedury obsługi błędów PostHog, jeśli są skonfigurowane
6. **Integracja Sentry** — łączy PostHog i Sentry, gdy oba są włączone

#### Konfiguracja PostHoga

Metoda init konstruuje konfigurację PostHog na podstawie scentralizowanych stałych:

```ts
const baseConfig: Partial<PostHogConfig> = {
  api_host: posthogHost,
  debug: POSTHOG_DEBUG.value === 'true',
  persistence: 'localStorage',
  capture_pageview: POSTHOG_AUTO_CAPTURE.value === 'true',
  capture_pageleave: true,
  enable_recording_console_log: POSTHOG_DEBUG.value === 'true',
  mask_all_element_attributes: false,
  mask_all_text: false,
  loaded: (posthog) => {
    if (POSTHOG_SAMPLE_RATE < 1) {
      if (Math.random() > POSTHOG_SAMPLE_RATE) {
        posthog.opt_out_capturing();
      }
    }
  },
};
```

Gdy włączone jest nagrywanie sesji, dodatkowa konfiguracja jest scalana:

```ts
const config = POSTHOG_SESSION_RECORDING_ENABLED.value === 'true'
  ? {
      ...baseConfig,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-mask]',
        sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
      },
    }
  : baseConfig;
```

## Dostawcy śledzenia wyjątków

Moduł obsługuje elastyczne śledzenie wyjątków w czterech trybach dostawcy:

|Dostawca|Zachowanie|
|----------|----------|
|`'posthog'`|Wyjątki wysyłane tylko do PostHog|
|`'sentry'`|Wyjątki wysyłane tylko do Sentry|
|`'both'`|Wyjątki wysyłane zarówno do PostHog, jak i Sentry|
|`'none'`|Śledzenie wyjątków wyłączone|

Dostawca jest określany automatycznie w czasie tworzenia na podstawie konfiguracji `EXCEPTION_TRACKING_PROVIDER` i dostępności każdego dostawcy:

```ts
private determineExceptionTrackingProvider(): ExceptionTrackingProvider {
  const provider = EXCEPTION_TRACKING_PROVIDER.value;

  // Validate availability and fall back gracefully
  if (provider === 'sentry' && !SENTRY_ENABLED) {
    return POSTHOG_ENABLED ? 'posthog' : 'none';
  }

  if (provider === 'posthog' && !POSTHOG_ENABLED) {
    return SENTRY_ENABLED ? 'sentry' : 'none';
  }

  // For 'both', check what's actually available
  if (provider === 'both') {
    const sentryAvailable = SENTRY_ENABLED;
    const posthogAvailable = POSTHOG_ENABLED;
    if (!sentryAvailable && !posthogAvailable) return 'none';
    if (!sentryAvailable) return 'posthog';
    if (!posthogAvailable) return 'sentry';
  }

  return provider;
}
```

## Dokumentacja API

### Identyfikacja użytkownika

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

Metoda `identify` ustawia użytkownika jednocześnie w PostHog i Sentry. Metoda `reset` czyści tożsamość w obu przypadkach.

### Śledzenie zdarzeń

```ts
// Track a custom event
analytics.track('checkout_started', {
  plan: 'pro',
  source: 'pricing_page',
});

// Track a page view
analytics.trackPageView('/pricing', {
  referrer: document.referrer,
});
```

### Flagi funkcyjne

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

Metoda `isFeatureEnabled` zwraca `defaultValue`, gdy PostHog nie został zainicjowany lub flaga nie została znaleziona.

### Śledzenie wyjątków

```ts
// Capture an exception
analytics.captureException(new Error('Something went wrong'), {
  component: 'PaymentForm',
  action: 'submit',
});

// Capture from a string
analytics.captureException('Unexpected response format', {
  endpoint: '/api/data',
});
```

Metoda `captureException` kieruje do skonfigurowanych dostawców:

```ts
captureException(error: Error | string, context?: Record<string, any>) {
  const errorObject =
    typeof error === 'string' ? new Error(error) : error;

  // Send to PostHog
  if (POSTHOG_ENABLED && (provider === 'posthog' || provider === 'both')) {
    this.track('$exception', {
      $exception_message: errorObject.message,
      $exception_type: errorObject.name,
      $exception_stack_trace_raw: errorObject.stack,
      $exception_handled: true,
      ...context,
    });
  }

  // Send to Sentry
  if (SENTRY_ENABLED && (provider === 'sentry' || provider === 'both')) {
    Sentry.captureException(errorObject, {
      extra: context,
    });
  }
}
```

### Użytkownik i superwłaściwości

```ts
// Set persistent user properties
analytics.setUserProperties({
  plan: 'pro',
  company: 'Acme Inc',
});

// Set super properties (sent with every event)
analytics.setSuperProperties({
  app_version: '1.0.0',
  environment: 'production',
});
```

## Konfiguracja śledzenia wyjątków PostHog

Gdy włączone jest śledzenie wyjątków PostHog, moduł instaluje globalne procedury obsługi błędów:

```ts
private setupPostHogExceptionTracking() {
  // Override window.onerror
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    this.captureException(error || new Error(String(message)), {
      source,
      lineno,
      colno,
      type: 'window.onerror',
    });
    // Chain to original handler
    if (typeof originalOnError === 'function') {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    this.captureException(
      new Error(event.reason?.message || String(event.reason)),
      { type: 'unhandledrejection' }
    );
  });
}
```

Wychwytuje to zarówno błędy synchroniczne (`window.onerror`), jak i odrzucenia nieobsłużonych obietnic.

## Integracja Sentry-PostHog

Gdy obaj dostawcy są skonfigurowani w trybie `'both'`, moduł łączy ich ze sobą poprzez dodanie procesora zdarzeń Sentry, który przekazuje błędy do PostHog:

```ts
Sentry.addIntegration({
  name: 'PostHog',
  setupOnce() {
    Sentry.addEventProcessor((event) => {
      if (event.user) {
        posthog.capture('sentry_error', {
          error: event.message,
          error_id: event.event_id,
          error_type: event.type,
          error_context: event.contexts,
          error_tags: event.tags,
        });
      }
      return event;
    });
  },
});
```

Daje to błędy Sentry w PostHog w celu korelacji z sesjami użytkowników.

## Strażnicy Bezpieczeństwa

Każda metoda publiczna obejmuje trzy kontrole bezpieczeństwa:

1. **Sprawdzanie inicjalizacji** -- `if (!this.initialized)` zapobiega wywołaniom przed `init()`
2. **Sprawdzanie dostawcy** -- `if (!POSTHOG_ENABLED)` pomija, gdy dostawca jest wyłączony
3. **Ochrona SSR** -- `if (typeof window === 'undefined')` zapobiega wywołaniom po stronie serwera

Dzięki tym strażnikom moduł analityczny nigdy nie zostanie uruchomiony w żadnym środowisku.

## Stałe konfiguracyjne

Moduł odczytuje ze scentralizowanych stałych zdefiniowanych w `lib/constants.ts`:

|Stała|Cel|
|----------|---------|
|`POSTHOG_KEY`|Klucz API projektu PostHog|
|`POSTHOG_HOST`|Adres URL hosta API PostHog|
|`POSTHOG_ENABLED`|Główny przełącznik dla PostHog|
|`POSTHOG_DEBUG`|Włącz rejestrowanie debugowania|
|`POSTHOG_SESSION_RECORDING_ENABLED`|Włącz nagrywanie sesji|
|`POSTHOG_AUTO_CAPTURE`|Automatyczne przechwytywanie wyświetleń strony|
|`POSTHOG_SAMPLE_RATE`|Częstotliwość próbkowania zdarzeń (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Częstotliwość próbkowania nagrywania|
|`SENTRY_ENABLED`|Główny przełącznik dla Sentry|
|`EXCEPTION_TRACKING_PROVIDER`|Który dostawca obsługuje wyjątki|
|`POSTHOG_EXCEPTION_TRACKING`|Włącz przechwytywanie wyjątków PostHog|
|`SENTRY_EXCEPTION_TRACKING`|Włącz przechwytywanie wyjątków Sentry|

## Pliki źródłowe

|Plik|Cel|
|------|---------|
|`lib/analytics/index.ts`|Abstrakcja klasy singletonu i dostawcy analizy|
|`lib/constants.ts`|Stałe konfiguracyjne dla wszystkich dostawców usług analitycznych|
