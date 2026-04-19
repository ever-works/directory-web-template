---
id: analytics-layer
title: "Уровень интеграции аналитики"
sidebar_label: "Уровень аналитики"
sidebar_position: 28
---

# Уровень интеграции аналитики

Модуль аналитики (`lib/analytics/index.ts`) предоставляет унифицированный уровень аналитики, который абстрагирует отслеживание событий PostHog, мониторинг ошибок Sentry и оценку флагов функций в рамках одного класса `Analytics`. Модуль использует шаблон Singleton для обеспечения единого инициализированного экземпляра во всем приложении.

## Обзор архитектуры

Уровень аналитики охватывает двух поставщиков:

- **PostHog** — отслеживание событий, просмотров страниц, идентификация пользователей, флаги функций, запись сеансов и отслеживание исключений.
- **Sentry** — мониторинг ошибок и отслеживание исключений.

Оба поставщика являются необязательными и контролируются с помощью констант конфигурации среды. Модуль постепенно ухудшается при отключении провайдеров.

## Класс аналитики

### Синглтон-доступ

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

Экспорт `analytics` представляет собой предварительно инициализированный синглтон. Сам класс также экспортируется для использования типов:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### Инициализация

Метод `init()` должен быть вызван один раз на стороне клиента перед любыми вызовами отслеживания:

```ts
analytics.init();
```

#### Что происходит во время инициализации

1. **SSR Guard** — Пропускает инициализацию, если значение `window` не определено.
2. **Настройка PostHog** – если этот параметр включен, инициализирует PostHog с централизованной конфигурацией.
3. **Запись сеанса** – условно включает запись сеанса с маскированием ввода.
4. **Выборка** – применяется частота выборки событий (пользователи отказываются от участия случайным образом на основе `POSTHOG_SAMPLE_RATE`)
5. **Отслеживание исключений** – настраивает глобальные обработчики ошибок PostHog, если они настроены.
6. **Интеграция Sentry** – связывает PostHog и Sentry, если оба включены.

#### Конфигурация PostHog

Метод init создает конфигурацию PostHog из централизованных констант:

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

При включенной записи сеанса добавляется дополнительный конфиг:

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

## Поставщики отслеживания исключений

Модуль поддерживает гибкое отслеживание исключений с четырьмя режимами провайдера:

|Поставщик|Поведение|
|----------|----------|
|`'posthog'`|Исключения отправляются только в PostHog|
|`'sentry'`|Исключения отправляются только в Sentry|
|`'both'`|Исключения отправляются как в PostHog, так и в Sentry.|
|`'none'`|Отслеживание исключений отключено|

Провайдер определяется автоматически во время сборки на основе конфигурации `EXCEPTION_TRACKING_PROVIDER` и доступности каждого провайдера:

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

## Справочник по API

### Идентификация пользователя

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

Метод `identify` одновременно устанавливает пользователя в PostHog и Sentry. Метод `reset` очищает идентичность в обоих случаях.

### Отслеживание событий

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

### Флаги функций

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

Метод `isFeatureEnabled` возвращает `defaultValue`, когда PostHog не инициализирован или флаг не найден.

### Отслеживание исключений

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

Метод `captureException` направляется к настроенным поставщикам:

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

### Пользовательские и суперсвойства

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

## Настройка отслеживания исключений PostHog

Когда отслеживание исключений PostHog включено, модуль устанавливает глобальные обработчики ошибок:

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

При этом фиксируются как синхронные ошибки (`window.onerror`), так и необработанные отклонения обещаний.

## Интеграция Sentry-PostHog

Когда оба провайдера настроены в режиме `'both'`, модуль связывает их вместе, добавляя обработчик событий Sentry, который пересылает ошибки в PostHog:

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

Это дает вам ошибки Sentry в PostHog для корреляции с пользовательскими сеансами.

## Охранники безопасности

Каждый публичный метод включает три проверки безопасности:

1. **Проверка инициализации** -- `if (!this.initialized)` предотвращает вызовы до `init()`
2. **Проверка поставщика** – `if (!POSTHOG_ENABLED)` пропускается, если поставщик отключен.
3. **Защита SSR** -- `if (typeof window === 'undefined')` предотвращает вызовы на стороне сервера

Эти охранники гарантируют, что аналитический модуль никогда не выкинет какую-либо среду.

## Константы конфигурации

Модуль считывает централизованные константы, определенные в `lib/constants.ts`:

|Константа|Цель|
|----------|---------|
|`POSTHOG_KEY`|Ключ API проекта PostHog|
|`POSTHOG_HOST`|URL-адрес хоста API PostHog|
|`POSTHOG_ENABLED`|Главный переключатель для PostHog|
|`POSTHOG_DEBUG`|Включить ведение журнала отладки|
|`POSTHOG_SESSION_RECORDING_ENABLED`|Включить запись сеанса|
|`POSTHOG_AUTO_CAPTURE`|Автоматический захват просмотров страниц|
|`POSTHOG_SAMPLE_RATE`|Частота выборки событий (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Частота дискретизации записи|
|`SENTRY_ENABLED`|Главный переключатель для Sentry|
|`EXCEPTION_TRACKING_PROVIDER`|Какой провайдер обрабатывает исключения|
|`POSTHOG_EXCEPTION_TRACKING`|Включить захват исключений PostHog|
|`SENTRY_EXCEPTION_TRACKING`|Включить захват исключений Sentry|

## Исходные файлы

|Файл|Цель|
|------|---------|
|`lib/analytics/index.ts`|Одноэлементный класс Analytics и абстракция поставщика|
|`lib/constants.ts`|Константы конфигурации для всех поставщиков аналитики|
