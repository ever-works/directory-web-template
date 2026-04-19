---
id: analytics-layer
title: "Couche d'intégration analytique"
sidebar_label: "Couche d'analyse"
sidebar_position: 28
---

# Couche d'intégration analytique

Le module d'analyse (`lib/analytics/index.ts`) fournit une couche d'analyse unifiée qui résume le suivi des événements PostHog, la surveillance des erreurs Sentry et l'évaluation des indicateurs de fonctionnalité derrière une seule classe `Analytics`. Le module utilise le modèle singleton pour garantir une seule instance initialisée dans l'application.

## Présentation de l'architecture

La couche analytique englobe deux fournisseurs :

- **PostHog** – Suivi des événements, pages vues, identification des utilisateurs, indicateurs de fonctionnalités, enregistrement de session et suivi des exceptions.
- **Sentry** – Surveillance des erreurs et suivi des exceptions

Les deux fournisseurs sont facultatifs et contrôlés via des constantes de configuration d'environnement. Le module se dégrade gracieusement lorsque les fournisseurs sont désactivés.

## La classe analytique

### Accès unique

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

L'export `analytics` est un singleton pré-initialisé. La classe elle-même est également exportée pour l'utilisation du type :

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### Initialisation

La méthode `init()` doit être appelée une fois côté client avant tout appel de suivi :

```ts
analytics.init();
```

#### Que se passe-t-il pendant l'initialisation

1. **Garde SSR** -- Ignore l'initialisation si `window` n'est pas défini
2. **Configuration PostHog** -- Si activé, initialise PostHog avec une configuration centralisée
3. **Enregistrement de session** – Active sous condition l'enregistrement de session avec masquage d'entrée.
4. **Échantillonnage** – Applique le taux d'échantillonnage des événements (désinscription des utilisateurs de manière aléatoire en fonction de `POSTHOG_SAMPLE_RATE`)
5. **Suivi des exceptions** -- Configure les gestionnaires d'erreurs globaux PostHog s'ils sont configurés
6. **Intégration Sentry** – Lien PostHog et Sentry lorsque les deux sont activés

#### Configuration PostHog

La méthode init construit la configuration PostHog à partir de constantes centralisées :

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

Lorsque l'enregistrement de session est activé, la configuration supplémentaire est fusionnée :

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

## Fournisseurs de suivi des exceptions

Le module prend en charge un suivi flexible des exceptions avec quatre modes de fournisseur :

|Fournisseur|Comportement|
|----------|----------|
|`'posthog'`|Exceptions envoyées à PostHog uniquement|
|`'sentry'`|Exceptions envoyées à Sentry uniquement|
|`'both'`|Exceptions envoyées à PostHog et Sentry|
|`'none'`|Suivi des exceptions désactivé|

Le fournisseur est déterminé automatiquement au moment de la construction en fonction de la configuration `EXCEPTION_TRACKING_PROVIDER` et de la disponibilité de chaque fournisseur :

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

## Référence API

### Identification de l'utilisateur

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

La méthode `identify` définit simultanément l'utilisateur dans PostHog et Sentry. La méthode `reset` efface l'identité dans les deux cas.

### Suivi des événements

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

### Indicateurs de fonctionnalités

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

La méthode `isFeatureEnabled` renvoie le `defaultValue` lorsque PostHog n'est pas initialisé ou que l'indicateur n'est pas trouvé.

### Suivi des exceptions

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

La méthode `captureException` est acheminée vers le(s) fournisseur(s) configuré(s) :

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

### Utilisateur et super propriétés

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

## Configuration du suivi des exceptions PostHog

Lorsque le suivi des exceptions PostHog est activé, le module installe des gestionnaires d'erreurs globaux :

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

Cela capture à la fois les erreurs synchrones (`window.onerror`) et les rejets de promesses non gérés.

## Intégration Sentry-PostHog

Lorsque les deux fournisseurs sont configurés avec le mode `'both'`, le module les relie en ajoutant un processeur d'événements Sentry qui transmet les erreurs à PostHog :

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

Cela vous donne des erreurs Sentry dans PostHog pour la corrélation avec les sessions utilisateur.

## Gardes de sécurité

Chaque méthode publique comprend trois contrôles de sécurité :

1. **Vérification d'initialisation** -- `if (!this.initialized)` empêche les appels avant `init()`
2. **Vérification du fournisseur** -- `if (!POSTHOG_ENABLED)` ignore lorsque le fournisseur est désactivé
3. **Garde SSR** -- `if (typeof window === 'undefined')` empêche les appels côté serveur

Ces protections garantissent que le module d'analyse ne se lance jamais dans aucun environnement.

## Constantes de configuration

Le module lit à partir des constantes centralisées définies dans `lib/constants.ts` :

|Constante|Objectif|
|----------|---------|
|`POSTHOG_KEY`|Clé API du projet PostHog|
|`POSTHOG_HOST`|URL de l'hôte de l'API PostHog|
|`POSTHOG_ENABLED`|Bascule principale pour PostHog|
|`POSTHOG_DEBUG`|Activer la journalisation du débogage|
|`POSTHOG_SESSION_RECORDING_ENABLED`|Activer l'enregistrement de la session|
|`POSTHOG_AUTO_CAPTURE`|Capture automatique des pages vues|
|`POSTHOG_SAMPLE_RATE`|Taux d'échantillonnage des événements (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Taux d'échantillonnage d'enregistrement|
|`SENTRY_ENABLED`|Bascule principale pour Sentry|
|`EXCEPTION_TRACKING_PROVIDER`|Quel fournisseur gère les exceptions|
|`POSTHOG_EXCEPTION_TRACKING`|Activer la capture des exceptions PostHog|
|`SENTRY_EXCEPTION_TRACKING`|Activer la capture des exceptions Sentry|

## Fichiers sources

|Fichier|Objectif|
|------|---------|
|`lib/analytics/index.ts`|Classe singleton Analytics et abstraction du fournisseur|
|`lib/constants.ts`|Constantes de configuration pour tous les fournisseurs d'analyse|
