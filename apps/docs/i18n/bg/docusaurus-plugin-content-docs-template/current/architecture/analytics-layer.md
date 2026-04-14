---
id: analytics-layer
title: "Слой за интегриране на анализи"
sidebar_label: "Аналитичен слой"
sidebar_position: 28
---

# Слой за интегриране на анализи

Модулът за анализ (`lib/analytics/index.ts`) предоставя унифициран слой за анализ, който абстрахира проследяването на събития PostHog, наблюдението на грешките на Sentry и оценката на флага на функцията зад един клас `Analytics`. Модулът използва модела singleton, за да осигури един инициализиран екземпляр в приложението.

## Преглед на архитектурата

Аналитичният слой обхваща два доставчика:

- **PostHog** – Проследяване на събития, изгледи на страници, идентификация на потребителя, флагове за функции, запис на сесия и проследяване на изключения
- **Sentry** -- Мониторинг на грешки и проследяване на изключения

И двата доставчика са незадължителни и се контролират чрез константи за конфигуриране на средата. Модулът се деградира грациозно, когато доставчиците са деактивирани.

## Аналитичният клас

### Единичен достъп

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

Експортирането на `analytics` е предварително инициализиран сингълтън. Самият клас също се експортира за използване на типа:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### Инициализация

Методът `init()` трябва да бъде извикан веднъж от страна на клиента преди всякакви проследяващи повиквания:

```ts
analytics.init();
```

#### Какво се случва по време на инициал

1. **SSR guard** -- Пропуска инициализацията, ако `window` е недефиниран
2. **Настройка на PostHog** -- Ако е разрешено, инициализира PostHog с централизирана конфигурация
3. **Запис на сесия** -- Условно разрешава запис на сесия с маскиране на входа
4. **Вземане на проби** -- Прилага честота на вземане на проби от събития (отказващи се потребители на случаен принцип въз основа на `POSTHOG_SAMPLE_RATE`)
5. **Проследяване на изключения** -- Настройва PostHog глобални манипулатори на грешки, ако е конфигуриран
6. **Интегриране на Sentry** -- Свързва PostHog и Sentry, когато и двете са активирани

#### Конфигурация на PostHog

Методът init конструира конфигурацията на PostHog от централизирани константи:

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

Когато записът на сесия е активиран, допълнителната конфигурация се обединява:

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

## Доставчици на проследяване на изключения

Модулът поддържа гъвкаво проследяване на изключения с четири режима на доставчик:

|Доставчик|Поведение|
|----------|----------|
|`'posthog'`|Изключенията се изпращат само до PostHog|
|`'sentry'`|Изключенията се изпращат само на Sentry|
|`'both'`|Изключенията са изпратени както на PostHog, така и на Sentry|
|`'none'`|Проследяването на изключения е деактивирано|

Доставчикът се определя автоматично по време на изграждане въз основа на `EXCEPTION_TRACKING_PROVIDER` конфигурацията и наличността на всеки доставчик:

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

## Справка за API

### Идентификация на потребителя

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

Методът `identify` настройва потребителя едновременно в PostHog и Sentry. Методът `reset` изчиства самоличността и в двата.

### Проследяване на събития

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

### Флагове за функции

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

Методът `isFeatureEnabled` връща `defaultValue`, когато PostHog не е инициализиран или флагът не е намерен.

### Проследяване на изключения

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

Методът `captureException` насочва към конфигурирания доставчик(и):

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

### Потребителски и супер свойства

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

## Настройка за проследяване на изключения на PostHog

Когато проследяването на изключение на PostHog е активирано, модулът инсталира манипулатори на глобални грешки:

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

Това улавя както синхронни грешки (`window.onerror`), така и необработени отхвърляния на обещания.

## Интеграция Sentry-PostHog

Когато и двата доставчика са конфигурирани с режим `'both'`, модулът ги свързва заедно чрез добавяне на процесор за събития Sentry, който препраща грешки към PostHog:

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

Това ви дава Sentry грешки в PostHog за корелация с потребителски сесии.

## Предпазители

Всеки публичен метод включва три проверки за безопасност:

1. **Проверка за инициализация** -- `if (!this.initialized)` предотвратява повиквания преди `init()`
2. **Проверка на доставчика** -- `if (!POSTHOG_ENABLED)` пропуска, когато доставчикът е деактивиран
3. **SSR guard** -- `if (typeof window === 'undefined')` предотвратява повиквания от страна на сървъра

Тези предпазители гарантират, че модулът за анализ никога не се хвърля в никаква среда.

## Константи за конфигурация

Модулът чете от централизирани константи, дефинирани в `lib/constants.ts`:

|Константа|Цел|
|----------|---------|
|`POSTHOG_KEY`|API ключ на проект PostHog|
|`POSTHOG_HOST`|URL адрес на хост на API на PostHog|
|`POSTHOG_ENABLED`|Главен превключвател за PostHog|
|`POSTHOG_DEBUG`|Активиране на регистрирането на грешки|
|`POSTHOG_SESSION_RECORDING_ENABLED`|Активиране на запис на сесия|
|`POSTHOG_AUTO_CAPTURE`|Автоматично заснемане на изгледи на страници|
|`POSTHOG_SAMPLE_RATE`|Честота на семплиране на събития (0-1)|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Честота на семплиране на запис|
|`SENTRY_ENABLED`|Главен превключвател за Sentry|
|`EXCEPTION_TRACKING_PROVIDER`|Кой доставчик обработва изключения|
|`POSTHOG_EXCEPTION_TRACKING`|Активиране на улавянето на изключение на PostHog|
|`SENTRY_EXCEPTION_TRACKING`|Активиране на улавянето на изключения от Sentry|

## Изходни файлове

|Файл|Цел|
|------|---------|
|`lib/analytics/index.ts`|Анализ сингълтън клас и абстракция на доставчик|
|`lib/constants.ts`|Константи за конфигурация за всички доставчици на анализи|
