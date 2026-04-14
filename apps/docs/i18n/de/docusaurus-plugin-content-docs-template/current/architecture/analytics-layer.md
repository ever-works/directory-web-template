---
id: analytics-layer
title: "Analytics-Integrationsschicht"
sidebar_label: "Analytics-Ebene"
sidebar_position: 28
---

# Analytics-Integrationsschicht

Das Analysemodul (`lib/analytics/index.ts`) bietet eine einheitliche Analyseebene, die die PostHog-Ereignisverfolgung, die Sentry-Fehlerüberwachung und die Feature-Flag-Auswertung hinter einer einzigen `Analytics`-Klasse abstrahiert. Das Modul verwendet das Singleton-Muster, um eine einzelne initialisierte Instanz in der gesamten Anwendung sicherzustellen.

## Architekturübersicht

Die Analyseschicht umfasst zwei Anbieter:

- **PostHog** – Ereignisverfolgung, Seitenaufrufe, Benutzeridentifikation, Funktionsflags, Sitzungsaufzeichnung und Ausnahmeverfolgung
- **Sentry** – Fehlerüberwachung und Ausnahmeverfolgung

Beide Anbieter sind optional und werden über Umgebungskonfigurationskonstanten gesteuert. Das Modul wird ordnungsgemäß beeinträchtigt, wenn Anbieter deaktiviert werden.

## Die Analytics-Klasse

### Singleton-Zugriff

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

Der `analytics`-Export ist ein vorinitialisierter Singleton. Die Klasse selbst wird auch zur Typverwendung exportiert:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### Initialisierung

Die `init()`-Methode muss vor allen Tracking-Aufrufen einmal auf der Clientseite aufgerufen werden:

```ts
analytics.init();
```

#### Was passiert während der Init

1. **SSR-Schutz** – Überspringt die Initialisierung, wenn `window` nicht definiert ist
2. **PostHog-Setup** – Wenn aktiviert, wird PostHog mit zentraler Konfiguration initialisiert
3. **Sitzungsaufzeichnung** – Aktiviert bedingt die Sitzungsaufzeichnung mit Eingabemaskierung
4. **Sampling** – Wendet die Ereignis-Sampling-Rate an (Opt-out-Benutzer nach dem Zufallsprinzip basierend auf `POSTHOG_SAMPLE_RATE`)
5. **Ausnahmeverfolgung** – Richtet globale PostHog-Fehlerhandler ein, sofern konfiguriert
6. **Sentry-Integration** – Verknüpft PostHog und Sentry, wenn beide aktiviert sind

#### PostHog-Konfiguration

Die Init-Methode erstellt die PostHog-Konfiguration aus zentralisierten Konstanten:

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

Wenn die Sitzungsaufzeichnung aktiviert ist, werden zusätzliche Konfigurationen zusammengeführt:

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

## Ausnahmeverfolgungsanbieter

Das Modul unterstützt eine flexible Ausnahmeverfolgung mit vier Anbietermodi:

|Anbieter|Verhalten|
|----------|----------|
|`'posthog'`|Ausnahmen werden nur an PostHog gesendet|
|`'sentry'`|Ausnahmen werden nur an Sentry gesendet|
|`'both'`|Ausnahmen werden sowohl an PostHog als auch an Sentry gesendet|
|`'none'`|Ausnahmeverfolgung deaktiviert|

Der Anbieter wird automatisch zur Erstellungszeit basierend auf der `EXCEPTION_TRACKING_PROVIDER`-Konfiguration und der Verfügbarkeit jedes Anbieters ermittelt:

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

## API-Referenz

### Benutzeridentifikation

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

Die Methode `identify` stellt den Benutzer gleichzeitig in PostHog und Sentry ein. Die Methode `reset` löscht die Identität in beiden.

### Ereignisverfolgung

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

### Feature-Flags

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

Die Methode `isFeatureEnabled` gibt `defaultValue` zurück, wenn PostHog nicht initialisiert ist oder das Flag nicht gefunden wird.

### Ausnahmeverfolgung

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

Die Methode `captureException` leitet an den/die konfigurierten Anbieter weiter:

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

### Benutzer- und Supereigenschaften

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

## PostHog-Ausnahmeverfolgungs-Setup

Wenn die PostHog-Ausnahmeverfolgung aktiviert ist, installiert das Modul globale Fehlerhandler:

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

Dadurch werden sowohl synchrone Fehler (`window.onerror`) als auch nicht behandelte Versprechenablehnungen erfasst.

## Sentry-PostHog-Integration

Wenn beide Anbieter mit dem `'both'`-Modus konfiguriert sind, verknüpft das Modul sie miteinander, indem es einen Sentry-Ereignisprozessor hinzufügt, der Fehler an PostHog weiterleitet:

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

Dadurch erhalten Sie Sentry-Fehler in PostHog für die Korrelation mit Benutzersitzungen.

## Sicherheitspersonal

Jede öffentliche Methode umfasst drei Sicherheitsüberprüfungen:

1. **Initialisierungsprüfung** – `if (!this.initialized)` verhindert Anrufe vor `init()`
2. **Anbieterprüfung** – `if (!POSTHOG_ENABLED)` wird übersprungen, wenn der Anbieter deaktiviert ist
3. **SSR-Schutz** – `if (typeof window === 'undefined')` verhindert serverseitige Aufrufe

Diese Wächter stellen sicher, dass das Analysemodul niemals in irgendeiner Umgebung abstürzt.

## Konfigurationskonstanten

Das Modul liest aus zentralisierten Konstanten, die in `lib/constants.ts` definiert sind:

|Konstant|Zweck|
|----------|---------|
|`POSTHOG_KEY`|API-Schlüssel des PostHog-Projekts|
|`POSTHOG_HOST`|PostHog-API-Host-URL|
|`POSTHOG_ENABLED`|Master-Schalter für PostHog|
|`POSTHOG_DEBUG`|Aktivieren Sie die Debug-Protokollierung|
|`POSTHOG_SESSION_RECORDING_ENABLED`|Aktivieren Sie die Sitzungsaufzeichnung|
|`POSTHOG_AUTO_CAPTURE`|Seitenaufrufe automatisch erfassen|
|`POSTHOG_SAMPLE_RATE`|Ereignisabtastrate (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Aufnahme-Abtastrate|
|`SENTRY_ENABLED`|Master-Schalter für Sentry|
|`EXCEPTION_TRACKING_PROVIDER`|Welcher Anbieter behandelt Ausnahmen?|
|`POSTHOG_EXCEPTION_TRACKING`|Aktivieren Sie die PostHog-Ausnahmeerfassung|
|`SENTRY_EXCEPTION_TRACKING`|Aktivieren Sie die Sentry-Ausnahmeerfassung|

## Quelldateien

|Datei|Zweck|
|------|---------|
|`lib/analytics/index.ts`|Analytics-Singleton-Klasse und Provider-Abstraktion|
|`lib/constants.ts`|Konfigurationskonstanten für alle Analyseanbieter|
