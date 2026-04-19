---
id: analytics-layer
title: "Livello di integrazione di analisi"
sidebar_label: "Livello di analisi"
sidebar_position: 28
---

# Livello di integrazione di analisi

Il modulo di analisi (`lib/analytics/index.ts`) fornisce un livello di analisi unificato che astrae il monitoraggio degli eventi PostHog, il monitoraggio degli errori Sentry e la valutazione dei flag di funzionalità dietro una singola classe `Analytics`. Il modulo utilizza il modello singleton per garantire una singola istanza inizializzata nell'applicazione.

## Panoramica dell'architettura

Il livello di analisi racchiude due fornitori:

- **PostHog**: monitoraggio degli eventi, visualizzazioni di pagine, identificazione dell'utente, flag di funzionalità, registrazione delle sessioni e monitoraggio delle eccezioni
- **Sentry** - Monitoraggio degli errori e tracciamento delle eccezioni

Entrambi i provider sono facoltativi e controllati tramite costanti di configurazione dell'ambiente. Il modulo si degrada gradualmente quando i provider sono disabilitati.

## La lezione di analisi

### Accesso singleton

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

L'esportazione `analytics` è un singleton preinizializzato. La classe stessa viene esportata anche per l'utilizzo del tipo:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### Inizializzazione

Il metodo `init()` deve essere chiamato una volta sul lato client prima di qualsiasi chiamata di tracciamento:

```ts
analytics.init();
```

#### Cosa succede durante l'inizializzazione

1. **SSR guard** -- Salta l'inizializzazione se `window` non è definito
2. **Configurazione PostHog** -- Se abilitato, inizializza PostHog con configurazione centralizzata
3. **Registrazione della sessione**: abilita in modo condizionale la registrazione della sessione con mascheramento dell'input
4. **Campionamento**: applica la frequenza di campionamento degli eventi (disattiva gli utenti in modo casuale in base a `POSTHOG_SAMPLE_RATE`)
5. **Tracciamento delle eccezioni**: imposta i gestori degli errori globali di PostHog, se configurati
6. **Integrazione Sentry** -- Collega PostHog e Sentry quando entrambi sono abilitati

#### Configurazione PostHog

Il metodo init costruisce la configurazione PostHog da costanti centralizzate:

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

Quando la registrazione della sessione è abilitata, viene unita una configurazione aggiuntiva:

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

## Provider di monitoraggio delle eccezioni

Il modulo supporta il monitoraggio flessibile delle eccezioni con quattro modalità provider:

|Fornitore|Comportamento|
|----------|----------|
|`'posthog'`|Eccezioni inviate solo a PostHog|
|`'sentry'`|Eccezioni inviate solo a Sentry|
|`'both'`|Eccezioni inviate sia a PostHog che a Sentry|
|`'none'`|Monitoraggio delle eccezioni disabilitato|

Il fornitore viene determinato automaticamente in fase di costruzione in base alla configurazione `EXCEPTION_TRACKING_PROVIDER` e alla disponibilità di ciascun fornitore:

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

## Riferimento API

### Identificazione dell'utente

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

Il metodo `identify` imposta l'utente contemporaneamente sia in PostHog che in Sentry. Il metodo `reset` cancella l'identità in entrambi.

### Monitoraggio degli eventi

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

### Flag di funzionalità

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

Il metodo `isFeatureEnabled` restituisce `defaultValue` quando PostHog non è inizializzato o il flag non viene trovato.

### Monitoraggio delle eccezioni

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

Il metodo `captureException` instrada ai provider configurati:

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

### Utente e Super Proprietà

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

## Impostazione del monitoraggio delle eccezioni PostHog

Quando il tracciamento delle eccezioni PostHog è abilitato, il modulo installa gestori di errori globali:

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

In questo modo vengono acquisiti sia gli errori sincroni (`window.onerror`) sia i rifiuti di promesse non gestiti.

## Integrazione Sentry-PostHog

Quando entrambi i provider sono configurati con la modalità `'both'`, il modulo li collega insieme aggiungendo un processore di eventi Sentry che inoltra gli errori a PostHog:

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

Ciò fornisce errori Sentry in PostHog per la correlazione con le sessioni utente.

## Guardie di sicurezza

Ogni metodo pubblico prevede tre controlli di sicurezza:

1. **Controllo dell'inizializzazione** -- `if (!this.initialized)` impedisce le chiamate prima di `init()`
2. **Controllo del provider** -- `if (!POSTHOG_ENABLED)` salta quando il provider è disabilitato
3. **Protezione SSR** -- `if (typeof window === 'undefined')` impedisce le chiamate lato server

Queste protezioni assicurano che il modulo di analisi non venga mai lanciato in nessun ambiente.

## Costanti di configurazione

Il modulo legge dalle costanti centralizzate definite in `lib/constants.ts`:

|Costante|Scopo|
|----------|---------|
|`POSTHOG_KEY`|Chiave API del progetto PostHog|
|`POSTHOG_HOST`|URL dell'host dell'API PostHog|
|`POSTHOG_ENABLED`|Interruttore principale per PostHog|
|`POSTHOG_DEBUG`|Abilita la registrazione del debug|
|`POSTHOG_SESSION_RECORDING_ENABLED`|Abilita la registrazione della sessione|
|`POSTHOG_AUTO_CAPTURE`|Acquisizione automatica delle visualizzazioni di pagina|
|`POSTHOG_SAMPLE_RATE`|Frequenza di campionamento degli eventi (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Frequenza di campionamento della registrazione|
|`SENTRY_ENABLED`|Interruttore principale per Sentry|
|`EXCEPTION_TRACKING_PROVIDER`|Quale provider gestisce le eccezioni|
|`POSTHOG_EXCEPTION_TRACKING`|Abilita l'acquisizione delle eccezioni PostHog|
|`SENTRY_EXCEPTION_TRACKING`|Abilita l'acquisizione delle eccezioni Sentry|

## File di origine

|Archivio|Scopo|
|------|---------|
|`lib/analytics/index.ts`|Classe singleton di Analytics e astrazione del provider|
|`lib/constants.ts`|Costanti di configurazione per tutti i fornitori di analisi|
