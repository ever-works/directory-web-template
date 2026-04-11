---
id: monitoring
title: Мониторинг и Анализ
sidebar_label: Мониторинг
sidebar_position: 6
---

# Мониторинг и Анализ

Шаблонът Ever Works използва унифицирана аналитична система, която поддържа множество доставчици за проследяване на изключения: PostHog, Sentry, и двата едновременно или нито един.

## Проследяване на изключения

### Поддържани режими

| Режим | Променлива на средата | Кога да се използва |
|-------|---------------------|---------------------|
| **PostHog** | `EXCEPTION_PROVIDER=posthog` | Анализ + проследяване на грешки на едно място |
| **Sentry** | `EXCEPTION_PROVIDER=sentry` | Специализирано проследяване на грешки, отлично за отстраняване |
| **И двата** | `EXCEPTION_PROVIDER=both` | Максимална излишност и покритие |
| **Нито един** | `EXCEPTION_PROVIDER=none` | Деактивиране за локална разработка |

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

### Инсталация

```bash
pnpm add @sentry/nextjs
```

### Конфигурация

Конфигурирайте в `sentry.config.ts`:

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

### Предимства на Sentry

- Подробно проследяване на stack traces
- Възпроизвеждане на сесии (по избор)
- Мониторинг на производителността
- Известия чрез имейл/Slack
- Групиране на грешки по fingerprint
- Интеграция с GitHub за проследяване на проблеми
- Управление на издания и правила за известяване

## PostHog

### Предимства на PostHog

PostHog комбинира продуктов анализ с проследяване на грешки:

- Анализ на фунии и задържане
- Записване на сесии
- Feature flags
- A/B тестване
- Проследяване на изключения с пълен контекст

### Свойства на изключенията

Аналитичната система улавя изключения с тези свойства:

| Свойство | Описание |
|---------|---------|
| `message` | Съобщение за грешка |
| `stack` | Пълен stack trace |
| `context` | Допълнителен обект с контекст |
| `userId` | ID на засегнатия потребител |
| `url` | URL, където е настъпила грешката |
| `environment` | `production`, `development` и др. |

## Улавяне на изключения

### Използване на API

```typescript
import { analytics } from '@/lib/analytics';

// Capture an exception
analytics.captureException(error, {
  userId: user?.id,
  context: { action: 'checkout', productId },
});
```

### Автоматично проследяване

Системата автоматично проследява:

- Грешки при рендериране в React (чрез error boundaries)
- Необработени отхвърляния на Promises
- Неуспехи на API маршрути
- Грешки на Server Components

## Добри практики

### 1. Използвайте смислен контекст

```typescript
analytics.captureException(error, {
  context: {
    action: 'user_checkout',
    cartItems: cart.length,
    paymentMethod: selectedMethod,
  }
});
```

### 2. Категоризирайте грешките

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

### 3. Не улавяйте очакваните грешки

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

### 4. Филтрирайте чувствителни данни

```typescript
analytics.captureException(error, {
  context: {
    userId: user.id,
    // ❌ Never include: passwords, tokens, credit card numbers
    // ✅ Include: IDs, actions, non-sensitive metadata
  }
});
```

## Отстраняване на проблеми

### Изключенията не се показват

1. Проверете, че `EXCEPTION_PROVIDER` е зададен (не `none`)
2. Проверете дали DSN-ите/API ключовете са правилни
3. Проверете дали `NODE_ENV` отговаря на конфигурираната среда
4. Уверете се, че доставчикът е инициализиран преди първата употреба

## Ръководство за миграция

### Миграция от Sentry към PostHog

```bash
# 1. Актуализирайте променливата на средата
EXCEPTION_PROVIDER=posthog

# 2. Проверете конфигурацията на PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# 3. Преразпределете
```

### Миграция от PostHog към Sentry

```bash
# 1. Актуализирайте променливата на средата
EXCEPTION_PROVIDER=sentry

# 2. Проверете конфигурацията на Sentry
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# 3. Преразпределете
```

## Мониторинг на производителността

### Core Web Vitals

```typescript
// instrumentation-client.ts
import { onCLS, onFID, onLCP } from 'web-vitals';

onCLS(metric => analytics.track('web_vitals', { metric: 'CLS', value: metric.value }));
onFID(metric => analytics.track('web_vitals', { metric: 'FID', value: metric.value }));
onLCP(metric => analytics.track('web_vitals', { metric: 'LCP', value: metric.value }));
```

## Инфраструктура

### Проверка на здравето

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

Проверете чрез:

```bash
curl -s https://yourdomain.com/api/health
```

### Услуги за мониторинг на достъпността

Наблюдавайте endpoint-а за здраве с всяка uptime услуга:

- **UptimeRobot** (безплатно, проверки на всеки 5 мин.)
- **Better Uptime** (страница за статус включена)
- **Pingdom** (разширен анализ)
- **Checkly** (мониторинг, базиран на код)
