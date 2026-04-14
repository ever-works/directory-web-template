---
id: analytics-layer
title: "Analytics-integratielaag"
sidebar_label: "Analytics-laag"
sidebar_position: 28
---

# Analytics-integratielaag

De analysemodule (`lib/analytics/index.ts`) biedt een uniforme analyselaag die het volgen van PostHog-gebeurtenissen, Sentry-foutmonitoring en functievlagevaluatie achter een enkele `Analytics` klasse abstraheert. De module gebruikt het singleton-patroon om te zorgen voor één geïnitialiseerd exemplaar in de hele toepassing.

## Architectuuroverzicht

De analyselaag omvat twee providers:

- **PostHog** -- Gebeurtenistracking, paginaweergaven, gebruikersidentificatie, functievlaggen, sessieopname en tracking van uitzonderingen
- **Sentry** -- Foutmonitoring en het volgen van uitzonderingen

Beide providers zijn optioneel en worden beheerd via omgevingsconfiguratieconstanten. De module verslechtert netjes wanneer providers worden uitgeschakeld.

## De Analytics-klasse

### Singleton-toegang

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

De `analytics` export is een vooraf geïnitialiseerde singleton. De klasse zelf wordt ook geëxporteerd voor typegebruik:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### Initialisatie

De methode `init()` moet één keer aan de clientzijde worden aangeroepen voordat er trackingaanroepen worden uitgevoerd:

```ts
analytics.init();
```

#### Wat gebeurt er tijdens Init

1. **SSR-bewaking** -- Slaat de initialisatie over als `window` niet gedefinieerd is
2. **PostHog-installatie** -- Indien ingeschakeld, initialiseert PostHog met gecentraliseerde configuratie
3. **Sessieopname** -- Schakelt sessie-opname voorwaardelijk in met invoermaskering
4. **Sampling** -- Past samplingfrequentie van gebeurtenissen toe (meld gebruikers willekeurig af op basis van `POSTHOG_SAMPLE_RATE`)
5. **Bijhouden van uitzonderingen** -- Stelt globale fouthandlers van PostHog in, indien geconfigureerd
6. **Sentry-integratie** - Koppelt PostHog en Sentry wanneer beide zijn ingeschakeld

#### PostHog-configuratie

De init-methode construeert de PostHog-configuratie op basis van gecentraliseerde constanten:

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

Wanneer sessie-opname is ingeschakeld, worden aanvullende configuraties samengevoegd:

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

## Aanbieders voor het volgen van uitzonderingen

De module ondersteunt het flexibel volgen van uitzonderingen met vier providermodi:

|Aanbieder|Gedrag|
|----------|----------|
|`'posthog'`|Uitzonderingen worden alleen naar PostHog verzonden|
|`'sentry'`|Uitzonderingen worden alleen naar Sentry verzonden|
|`'both'`|Uitzonderingen verzonden naar zowel PostHog als Sentry|
|`'none'`|Uitzonderingen bijhouden uitgeschakeld|

De provider wordt tijdens de bouw automatisch bepaald op basis van de `EXCEPTION_TRACKING_PROVIDER`-configuratie en de beschikbaarheid van elke provider:

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

## API-referentie

### Gebruikersidentificatie

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

De `identify` methode stelt de gebruiker tegelijkertijd in zowel PostHog als Sentry in. De `reset` methode wist de identiteit van beide.

### Gebeurtenis volgen

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

### Functievlaggen

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

De `isFeatureEnabled` methode retourneert `defaultValue` wanneer PostHog niet is geïnitialiseerd of de vlag niet is gevonden.

### Uitzonderingen bijhouden

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

De `captureException`-methode routeert naar de geconfigureerde provider(s):

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

### Gebruikers- en supereigenschappen

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

## Instellingen voor het bijhouden van PostHog-uitzonderingen

Wanneer het bijhouden van PostHog-uitzonderingen is ingeschakeld, installeert de module globale fouthandlers:

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

Hiermee worden zowel synchrone fouten (`window.onerror`) als onverwerkte afwijzingen van beloften geregistreerd.

## Sentry-PostHog-integratie

Wanneer beide providers zijn geconfigureerd met de `'both'`-modus, koppelt de module ze aan elkaar door een Sentry-gebeurtenisprocessor toe te voegen die fouten doorstuurt naar PostHog:

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

Dit geeft u Sentry-fouten in PostHog voor correlatie met gebruikerssessies.

## Veiligheidsagenten

Elke openbare methode omvat drie veiligheidscontroles:

1. **Initialisatiecontrole** -- `if (!this.initialized)` voorkomt oproepen vóór `init()`
2. **Providercontrole** -- `if (!POSTHOG_ENABLED)` wordt overgeslagen wanneer de provider is uitgeschakeld
3. **SSR-bewaking** -- `if (typeof window === 'undefined')` voorkomt oproepen aan de serverzijde

Deze bewakers zorgen ervoor dat de analysemodule nooit in welke omgeving dan ook terechtkomt.

## Configuratieconstanten

De module leest van gecentraliseerde constanten gedefinieerd in `lib/constants.ts`:

|Constant|Doel|
|----------|---------|
|`POSTHOG_KEY`|API-sleutel van het PostHog-project|
|`POSTHOG_HOST`|PostHog API-host-URL|
|`POSTHOG_ENABLED`|Hoofdschakelaar voor PostHog|
|`POSTHOG_DEBUG`|Schakel logboekregistratie voor foutopsporing in|
|`POSTHOG_SESSION_RECORDING_ENABLED`|Schakel sessie-opname in|
|`POSTHOG_AUTO_CAPTURE`|Paginaweergaven automatisch vastleggen|
|`POSTHOG_SAMPLE_RATE`|Bemonsteringsfrequentie van gebeurtenissen (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Bemonsteringsfrequentie opnemen|
|`SENTRY_ENABLED`|Hoofdschakelaar voor Sentry|
|`EXCEPTION_TRACKING_PROVIDER`|Welke aanbieder verwerkt uitzonderingen|
|`POSTHOG_EXCEPTION_TRACKING`|Schakel het vastleggen van PostHog-uitzonderingen in|
|`SENTRY_EXCEPTION_TRACKING`|Schakel het vastleggen van Sentry-uitzonderingen in|

## Bronbestanden

|Bestand|Doel|
|------|---------|
|`lib/analytics/index.ts`|Analytics singleton-klasse en providerabstractie|
|`lib/constants.ts`|Configuratieconstanten voor alle analyseproviders|
