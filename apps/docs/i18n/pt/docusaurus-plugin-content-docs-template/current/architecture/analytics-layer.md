---
id: analytics-layer
title: "Camada de integração analítica"
sidebar_label: "Camada analítica"
sidebar_position: 28
---

# Camada de integração analítica

O módulo analítico (`lib/analytics/index.ts`) fornece uma camada analítica unificada que abstrai o rastreamento de eventos PostHog, o monitoramento de erros do Sentry e a avaliação de sinalizadores de recursos por trás de uma única classe `Analytics`. O módulo usa o padrão singleton para garantir uma única instância inicializada em todo o aplicativo.

## Visão geral da arquitetura

A camada analítica envolve dois provedores:

- **PostHog** – Rastreamento de eventos, visualizações de páginas, identificação de usuários, sinalizadores de recursos, gravação de sessões e rastreamento de exceções
- **Sentry** – Monitoramento de erros e rastreamento de exceções

Ambos os provedores são opcionais e controlados por meio de constantes de configuração de ambiente. O módulo degrada normalmente quando os provedores são desativados.

## A aula de análise

### Acesso único

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

A exportação `analytics` é um singleton pré-inicializado. A própria classe também é exportada para uso de tipo:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### Inicialização

O método `init()` deve ser chamado uma vez no lado do cliente antes de qualquer chamada de rastreamento:

```ts
analytics.init();
```

#### O que acontece durante a inicialização

1. **SSR guard** -- Ignora a inicialização se `window` for indefinido
2. **Configuração do PostHog** -- Se habilitado, inicializa o PostHog com configuração centralizada
3. **Gravação de sessão** – Habilita condicionalmente a gravação de sessão com mascaramento de entrada
4. **Amostragem** – Aplica taxa de amostragem de eventos (excluir usuários aleatoriamente com base em `POSTHOG_SAMPLE_RATE`)
5. **Rastreamento de exceções** – Configura manipuladores de erros globais PostHog, se configurados
6. **Integração do Sentry** – Vincula PostHog e Sentry quando ambos estão habilitados

#### Configuração PostHog

O método init constrói a configuração do PostHog a partir de constantes centralizadas:

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

Quando a gravação da sessão está habilitada, configurações adicionais são mescladas:

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

## Provedores de rastreamento de exceções

O módulo suporta rastreamento flexível de exceções com quatro modos de provedor:

|Provedor|Comportamento|
|----------|----------|
|`'posthog'`|Exceções enviadas apenas para PostHog|
|`'sentry'`|Exceções enviadas apenas ao Sentry|
|`'both'`|Exceções enviadas para PostHog e Sentry|
|`'none'`|Rastreamento de exceções desativado|

O provedor é determinado automaticamente no momento da construção com base na configuração `EXCEPTION_TRACKING_PROVIDER` e na disponibilidade de cada provedor:

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

## Referência de API

### Identificação do usuário

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

O método `identify` define o usuário no PostHog e no Sentry simultaneamente. O método `reset` limpa a identidade em ambos.

### Acompanhamento de eventos

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

### Sinalizadores de recursos

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

O método `isFeatureEnabled` retorna `defaultValue` quando PostHog não é inicializado ou o sinalizador não é encontrado.

### Rastreamento de exceções

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

O método `captureException` roteia para o(s) provedor(es) configurado(s):

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

### Usuário e superpropriedades

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

## Configuração de rastreamento de exceção PostHog

Quando o rastreamento de exceções PostHog está habilitado, o módulo instala manipuladores de erros globais:

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

Isso captura erros síncronos (`window.onerror`) e rejeições de promessas não tratadas.

## Integração Sentry-PostHog

Quando ambos os provedores são configurados com o modo `'both'`, o módulo os conecta adicionando um processador de eventos Sentry que encaminha erros para PostHog:

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

Isso fornece erros do Sentry no PostHog para correlação com as sessões do usuário.

## Guardas de segurança

Cada método público inclui três verificações de segurança:

1. **Verificação de inicialização** -- `if (!this.initialized)` evita chamadas antes de `init()`
2. **Verificação do provedor** -- `if (!POSTHOG_ENABLED)` ignora quando o provedor está desativado
3. **SSR Guard** -- `if (typeof window === 'undefined')` evita chamadas do lado do servidor

Esses protetores garantem que o módulo analítico nunca seja lançado em nenhum ambiente.

## Constantes de configuração

O módulo lê constantes centralizadas definidas em `lib/constants.ts`:

|Constante|Objetivo|
|----------|---------|
|`POSTHOG_KEY`|Chave de API do projeto PostHog|
|`POSTHOG_HOST`|URL do host da API PostHog|
|`POSTHOG_ENABLED`|Alternância mestre para PostHog|
|`POSTHOG_DEBUG`|Habilitar registro de depuração|
|`POSTHOG_SESSION_RECORDING_ENABLED`|Habilitar gravação de sessão|
|`POSTHOG_AUTO_CAPTURE`|Captura automática de visualizações de página|
|`POSTHOG_SAMPLE_RATE`|Taxa de amostragem de eventos (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Taxa de amostragem de gravação|
|`SENTRY_ENABLED`|Alternância mestre para Sentinela|
|`EXCEPTION_TRACKING_PROVIDER`|Qual provedor lida com exceções|
|`POSTHOG_EXCEPTION_TRACKING`|Habilitar captura de exceção PostHog|
|`SENTRY_EXCEPTION_TRACKING`|Habilitar captura de exceção do Sentry|

## Arquivos de origem

|Arquivo|Objetivo|
|------|---------|
|`lib/analytics/index.ts`|Classe singleton de análise e abstração de provedor|
|`lib/constants.ts`|Constantes de configuração para todos os provedores de análise|
