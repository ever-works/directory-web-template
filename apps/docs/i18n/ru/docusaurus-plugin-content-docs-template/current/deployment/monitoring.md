---
id: monitoring
title: Мониторинг и Аналитика
sidebar_label: Мониторинг
sidebar_position: 6
---

# Мониторинг и Аналитика

Шаблон Ever Works использует единую систему аналитики, поддерживающую нескольких провайдеров отслеживания исключений: PostHog, Sentry, оба одновременно или ни одного.

## Отслеживание исключений

### Поддерживаемые режимы

| Режим | Переменная окружения | Когда использовать |
|-------|---------------------|-------------------|
| **PostHog** | `EXCEPTION_PROVIDER=posthog` | Аналитика + отслеживание ошибок в одном месте |
| **Sentry** | `EXCEPTION_PROVIDER=sentry` | Специализированное отслеживание ошибок, отлично для отладки |
| **Оба** | `EXCEPTION_PROVIDER=both` | Максимальная избыточность и покрытие |
| **Ни одного** | `EXCEPTION_PROVIDER=none` | Отключить для локальной разработки |

### Конфигурация

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

### Установка

```bash
pnpm add @sentry/nextjs
```

### Конфигурация

Настроить в `sentry.config.ts`:

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

### Преимущества Sentry

- Детальное отслеживание stack traces
- Воспроизведение сессий (опционально)
- Мониторинг производительности
- Оповещения по email/Slack
- Группировка ошибок по fingerprint
- Интеграция с GitHub для отслеживания задач
- Управление релизами и правила оповещений

## PostHog

### Преимущества PostHog

PostHog объединяет продуктовую аналитику с отслеживанием ошибок:

- Анализ воронок и retention
- Запись сессий
- Feature flags
- A/B тестирование
- Отслеживание исключений с полным контекстом

### Свойства исключений

Система аналитики захватывает исключения со следующими свойствами:

| Свойство | Описание |
|---------|---------|
| `message` | Сообщение об ошибке |
| `stack` | Полный stack trace |
| `context` | Дополнительный объект контекста |
| `userId` | ID затронутого пользователя |
| `url` | URL, где произошла ошибка |
| `environment` | `production`, `development` и т.д. |

### Настройка Dashboard

1. В PostHog создать новый **Dashboard**
2. Добавить виджеты для: **Частота ошибок во времени**, **Топ ошибки**, **Затронутые пользователи**
3. Настроить оповещения в **Alerts** → Создать оповещение при превышении порога частоты ошибок

## Захват исключений

### Использование API

```typescript
import { analytics } from '@/lib/analytics';

// Capture an exception
analytics.captureException(error, {
  userId: user?.id,
  context: { action: 'checkout', productId },
});
```

### Автоматическое отслеживание

Система автоматически отслеживает:

- Ошибки рендеринга React (через error boundaries)
- Необработанные отклонения Promises
- Сбои API-маршрутов
- Ошибки Server Components

## Лучшие практики

### 1. Использовать содержательный контекст

```typescript
analytics.captureException(error, {
  context: {
    action: 'user_checkout',
    cartItems: cart.length,
    paymentMethod: selectedMethod,
  }
});
```

### 2. Категоризировать ошибки

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

### 3. Не захватывать ожидаемые ошибки

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

### 4. Фильтровать чувствительные данные

```typescript
analytics.captureException(error, {
  context: {
    userId: user.id,
    // ❌ Never include: passwords, tokens, credit card numbers
    // ✅ Include: IDs, actions, non-sensitive metadata
  }
});
```

## Устранение неполадок

### Исключения не отображаются

1. Убедиться, что `EXCEPTION_PROVIDER` задан (не `none`)
2. Проверить корректность DSN/API-ключей
3. Убедиться, что `NODE_ENV` соответствует настроенной среде
4. Убедиться, что провайдер инициализирован до первого использования

### Резервный провайдер

Если основной провайдер недоступен, система автоматически переключается на логирование в консоль в режиме разработки.

## Руководство по миграции

### Миграция с Sentry на PostHog

```bash
# 1. Обновить переменную окружения
EXCEPTION_PROVIDER=posthog

# 2. Проверить конфигурацию PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# 3. Повторно задеплоить
```

### Миграция с PostHog на Sentry

```bash
# 1. Обновить переменную окружения
EXCEPTION_PROVIDER=sentry

# 2. Проверить конфигурацию Sentry
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# 3. Повторно задеплоить
```

### Использование обоих провайдеров одновременно

```bash
EXCEPTION_PROVIDER=both
# Configure both providers' env vars
```

## Мониторинг производительности

### Core Web Vitals

```typescript
// instrumentation-client.ts
import { onCLS, onFID, onLCP } from 'web-vitals';

onCLS(metric => analytics.track('web_vitals', { metric: 'CLS', value: metric.value }));
onFID(metric => analytics.track('web_vitals', { metric: 'FID', value: metric.value }));
onLCP(metric => analytics.track('web_vitals', { metric: 'LCP', value: metric.value }));
```

### Пользовательские метрики

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

## Инфраструктура

### Проверка работоспособности

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

Проверить через:

```bash
curl -s https://yourdomain.com/api/health
```

### Сервисы мониторинга доступности

Мониторить эндпоинт работоспособности с помощью любого сервиса uptime:

- **UptimeRobot** (бесплатно, проверки каждые 5 мин.)
- **Better Uptime** (страница статуса в комплекте)
- **Pingdom** (расширенная аналитика)
- **Checkly** (мониторинг на основе кода)
