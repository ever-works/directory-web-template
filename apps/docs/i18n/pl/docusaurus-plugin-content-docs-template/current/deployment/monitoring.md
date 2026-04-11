---
id: monitoring
title: Monitorowanie & Analityka
sidebar_label: Monitorowanie
sidebar_position: 6
---

# Monitorowanie & Analityka

Szablon Ever Works używa ujednoliconego systemu analityki, który obsługuje wielu dostawców śledzenia wyjątków: PostHog, Sentry, oba jednocześnie lub żaden.

## Śledzenie Wyjątków

### Obsługiwane Tryby

| Tryb | Zmienna Środowiskowa | Kiedy Używać |
|------|---------------------|-------------|
| **PostHog** | `EXCEPTION_PROVIDER=posthog` | Analityka + śledzenie błędów w jednym miejscu |
| **Sentry** | `EXCEPTION_PROVIDER=sentry` | Dedykowane śledzenie błędów, świetne do debugowania |
| **Oba** | `EXCEPTION_PROVIDER=both` | Maksymalna redundancja i pokrycie |
| **Żaden** | `EXCEPTION_PROVIDER=none` | Wyłącz dla lokalnego środowiska deweloperskiego |

### Konfiguracja

```bash
# Exception tracking mode
EXCEPTION_PROVIDER=posthog  # posthog | sentry | both | none

# PostHog analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry error tracking
SENTRY_DSN=https://key@sentry.io/project
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project
SENTRY_AUTH_TOKEN=your_token  # for source maps
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

## Sentry

### Instalacja

```bash
pnpm add @sentry/nextjs
```

### Konfiguracja

Skonfiguruj w `sentry.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';
import { sentryConfig } from '@/lib/analytics/sentry';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  ...sentryConfig,
});
```

### Zalety Sentry

- Szczegółowe śledzenie stack trace
- Odtwarzanie sesji (opcjonalne)
- Monitorowanie wydajności
- Alerty email/Slack
- Grupowanie błędów według fingerprinta
- Integracja z GitHub do śledzenia problemów
- Zarządzanie wydaniami i reguły alertów

## PostHog

### Zalety PostHog

PostHog łączy analitykę produktu ze śledzeniem błędów:

- Analiza lejków i retencji
- Nagrywanie sesji
- Feature flagi
- Testy A/B
- Śledzenie wyjątków z pełnym kontekstem

### Właściwości Wyjątków

System analityki przechwytuje wyjątki z tymi właściwościami:

| Właściwość | Opis |
|-----------|------|
| `message` | Komunikat błędu |
| `stack` | Pełny stack trace |
| `context` | Dodatkowy obiekt kontekstu |
| `userId` | ID dotkniętego użytkownika |
| `url` | URL, gdzie wystąpił błąd |
| `environment` | `production`, `development` itp. |

### Konfiguracja Dashboardu

1. W PostHog utwórz nowy **Dashboard**
2. Dodaj widżety dla: **Wskaźnik Błędów w Czasie**, **Top Błędy**, **Użytkownicy Dotknięci Błędami**
3. Skonfiguruj alerty w **Alerts** → Utwórz alert dla wskaźnika błędów powyżej progu

## Przechwytywanie Wyjątków

### Użycie API

```typescript
import { analytics } from '@/lib/analytics';

// Capture an exception
analytics.captureException(error, {
  userId: user?.id,
  context: { action: 'checkout', productId },
});
```

### Automatyczne Śledzenie

System automatycznie śledzi:

- Błędy renderowania React (przez error boundaries)
- Nieobsłużone odrzucenia Promises
- Awarie tras API
- Błędy Server Components

## Najlepsze Praktyki

### 1. Użyj Znaczącego Kontekstu

```typescript
analytics.captureException(error, {
  context: {
    action: 'user_checkout',
    cartItems: cart.length,
    paymentMethod: selectedMethod,
  }
});
```

### 2. Kategoryzuj Błędy

```typescript
// Business logic errors
analytics.captureException(new BusinessError('Payment failed'), {
  context: { type: 'payment', provider: 'stripe' }
});

// Integration errors
analytics.captureException(new IntegrationError('API timeout'), {
  context: { type: 'external_api', service: 'sendgrid' }
});
```

### 3. Nie Przechwytuj Oczekiwanych Błędów

```typescript
// ❌ Don't log expected validation errors
try {
  validateForm(data);
} catch (e) {
  if (e instanceof ValidationError) {
    showFormError(e.message); // just show to user
    return;
  }
  analytics.captureException(e); // only unexpected errors
}
```

### 4. Filtruj Wrażliwe Dane

```typescript
analytics.captureException(error, {
  context: {
    userId: user.id,
    // ❌ Never include: passwords, tokens, credit card numbers
    // ✅ Include: IDs, actions, non-sensitive metadata
  }
});
```

## Rozwiązywanie Problemów

### Wyjątki Nie Pojawiają Się

1. Sprawdź, czy `EXCEPTION_PROVIDER` jest ustawione (nie `none`)
2. Zweryfikuj, czy DSN-y/klucze API są poprawne
3. Sprawdź, czy `NODE_ENV` odpowiada skonfigurowanemu środowisku
4. Upewnij się, że dostawca jest zainicjowany przed pierwszym użyciem

### Fallback Dostawcy

Jeśli główny dostawca zawiedzie, system automatycznie wraca do logowania w konsoli w trybie deweloperskim.

## Przewodnik Migracji

### Migracja z Sentry do PostHog

```bash
# 1. Zaktualizuj zmienną środowiskową
EXCEPTION_PROVIDER=posthog

# 2. Zweryfikuj konfigurację PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# 3. Ponownie wdróż
```

### Migracja z PostHog do Sentry

```bash
# 1. Zaktualizuj zmienną środowiskową
EXCEPTION_PROVIDER=sentry

# 2. Zweryfikuj konfigurację Sentry
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# 3. Ponownie wdróż
```

### Używanie Obu Jednocześnie

```bash
EXCEPTION_PROVIDER=both
# Configure both providers' env vars
```

## Monitorowanie Wydajności

### Core Web Vitals

```typescript
// instrumentation-client.ts
import { onCLS, onFID, onLCP } from 'web-vitals';

onCLS(metric => analytics.track('web_vitals', { metric: 'CLS', value: metric.value }));
onFID(metric => analytics.track('web_vitals', { metric: 'FID', value: metric.value }));
onLCP(metric => analytics.track('web_vitals', { metric: 'LCP', value: metric.value }));
```

### Niestandardowe Metryki

```typescript
// Track custom performance metrics
const start = performance.now();
await heavyOperation();
const duration = performance.now() - start;

analytics.track('performance', {
  operation: 'heavy_operation',
  duration,
  context: operationContext,
});
```

## Infrastruktura

### Sprawdzanie Stanu

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await runHealthChecks();
  return Response.json({
    status: checks.allPassed ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}
```

Sprawdź przez:

```bash
curl -s https://yourdomain.com/api/health
```

### Usługi Uptime

Monitoruj endpoint sprawdzania stanu z dowolną usługą uptime:

- **UptimeRobot** (darmowy, sprawdzenia co 5 min.)
- **Better Uptime** (strona statusu w zestawie)
- **Pingdom** (zaawansowane analizy)
- **Checkly** (monitorowanie oparte na kodzie)
