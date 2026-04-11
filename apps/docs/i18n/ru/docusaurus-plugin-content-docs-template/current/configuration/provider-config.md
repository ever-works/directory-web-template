---
id: provider-config
title: "Конфигурация Провайдеров"
sidebar_label: "Конфигурация Провайдеров"
sidebar_position: 4
---

# Конфигурация Провайдеров

Шаблон использует централизованный синглтон `ConfigService` для управления всеми внешними поставщиками услуг. Каждый провайдер настраивается через схемы, валидируемые с помощью Zod, с автоматическим определением функций -- провайдеры включаются при наличии необходимых учётных данных.

## Архитектура ConfigService

`ConfigService` в `lib/config/config-service.ts` — это синглтон только на стороне сервера, который валидирует все переменные среды при запуске:

```ts
import { configService } from '@/lib/config';

// Доступ к разделам конфигурации
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

Сервис организован в шесть разделов, каждый со своей схемой Zod:

| Раздел | Метод доступа | Файл схемы |
|--------|--------------|------------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### Tree-Shakeable Импорты

Отдельные разделы можно импортировать напрямую для лучшего tree-shaking:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### Валидация при Запуске

Вся конфигурация валидируется с помощью Zod при первом импорте. Недопустимые значения активируют обработчики `.catch()` там, где это возможно, тогда как действительно невосстановимые ошибки выбрасываются при запуске:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## Провайдеры Аутентификации

Определены в `lib/config/schemas/auth.schema.ts`. OAuth-провайдеры автоматически определяют включение:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### Поддерживаемые OAuth-Провайдеры

| Провайдер | Переменная Client ID | Переменная Client Secret |
|-----------|---------------------|--------------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### Бэкенд Auth Supabase

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| Переменная | Описание |
|-----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Анонимный ключ Supabase |

### Дополнительные Настройки Auth

| Переменная | По умолчанию | Описание |
|-----------|--------------|----------|
| `AUTH_SECRET` | -- | Требуется для подписи сессии |
| `COOKIE_SECRET` | -- | Секрет шифрования куки |
| `COOKIE_DOMAIN` | `'localhost'` | Домен куки |
| `COOKIE_SECURE` | `false` | Только HTTPS куки |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | Время жизни токена доступа |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | Время жизни токена обновления |

## Платёжные Провайдеры

Определены в `lib/config/schemas/payment.schema.ts`. Каждый провайдер автоматически включается при наличии необходимых учётных данных.

### Stripe

Автоматически включается при наличии `secretKey` и `publishableKey`:

| Переменная | Описание |
|-----------|----------|
| `STRIPE_SECRET_KEY` | Серверный секретный ключ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Клиентский публичный ключ |
| `STRIPE_WEBHOOK_SECRET` | Проверка подписи вебхука |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | ID цены для бесплатного плана |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | ID цены для стандартного плана |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | ID цены для премиум плана |

### LemonSqueezy

Автоматически включается при наличии `apiKey` и `storeId`:

| Переменная | Описание |
|-----------|----------|
| `LEMONSQUEEZY_API_KEY` | Ключ API |
| `LEMONSQUEEZY_STORE_ID` | Идентификатор магазина |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Секрет вебхука |
| `LEMONSQUEEZY_WEBHOOK_URL` | URL конечной точки вебхука |
| `LEMONSQUEEZY_TEST_MODE` | Включить тестовый режим (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | ID варианта для бесплатного плана |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | ID варианта для стандартного плана |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | ID варианта для премиум плана |

### Polar

Автоматически включается при наличии `accessToken` и `organizationId`:

| Переменная | По умолчанию | Описание |
|-----------|--------------|----------|
| `POLAR_ACCESS_TOKEN` | -- | Токен доступа к API |
| `POLAR_ORGANIZATION_ID` | -- | ID организации |
| `POLAR_WEBHOOK_SECRET` | -- | Секрет вебхука |
| `POLAR_SANDBOX` | `true` | Режим песочницы (`'false'` для продакшена) |
| `POLAR_API_URL` | -- | Пользовательский URL API |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | ID плана для бесплатного уровня |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | ID плана для стандартного уровня |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | ID плана для премиум уровня |

### Отображение Цен Продуктов

| Переменная | По умолчанию | Описание |
|-----------|--------------|----------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | Отображаемая цена для бесплатного плана |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | Отображаемая цена для стандартного плана |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | Отображаемая цена для премиум плана |

## Провайдеры Email

Определены в `lib/config/schemas/email.schema.ts`.

### SMTP

Автоматически включается при наличии `host`, `user` и `password`:

| Переменная | По умолчанию | Описание |
|-----------|--------------|----------|
| `SMTP_HOST` | -- | Имя хоста SMTP-сервера |
| `SMTP_PORT` | `587` | Порт SMTP-сервера |
| `SMTP_USER` | -- | Имя пользователя для аутентификации SMTP |
| `SMTP_PASSWORD` | -- | Пароль для аутентификации SMTP |

### Resend

Автоматически включается при наличии `apiKey`:

| Переменная | Описание |
|-----------|----------|
| `RESEND_API_KEY` | Ключ API Resend |

### Novu

Автоматически включается при наличии `apiKey`:

| Переменная | Описание |
|-----------|----------|
| `NOVU_API_KEY` | Ключ API Novu |

### Настройки Email

| Переменная | По умолчанию | Описание |
|-----------|--------------|----------|
| `COMPANY_NAME` | `'Ever Works'` | Название компании в шаблонах email |
| `EMAIL_PROVIDER` | `'resend'` | Активный провайдер email (`'resend'`, `'novu'`) |
| `EMAIL_FROM` | -- | Адрес электронной почты отправителя |
| `EMAIL_SUPPORT` | -- | Адрес электронной почты поддержки |

## Провайдеры Аналитики

Определены в `lib/config/schemas/analytics.schema.ts`.

### PostHog

Автоматически включается при наличии `key`:

| Переменная | По умолчанию | Описание |
|-----------|--------------|----------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | Ключ API проекта PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | URL хоста PostHog |
| `POSTHOG_DEBUG` | `false` | Включить режим отладки |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | Включить запись сессий |
| `POSTHOG_AUTO_CAPTURE` | `false` | Автоматический захват событий |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | Отслеживание исключений |
| `POSTHOG_PERSONAL_API_KEY` | -- | Персональный ключ API (панель администратора) |
| `POSTHOG_PROJECT_ID` | -- | ID проекта (панель администратора) |

### Sentry

Автоматически включается при наличии `dsn`:

| Переменная | По умолчанию | Описание |
|-----------|--------------|----------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | DSN Sentry |
| `SENTRY_ORG` | -- | Slug организации Sentry |
| `SENTRY_PROJECT` | -- | Название проекта Sentry |
| `SENTRY_AUTH_TOKEN` | -- | Токен auth для source map |
| `SENTRY_ENABLE_DEV` | `false` | Включить в режиме разработки |
| `SENTRY_DEBUG` | `false` | Режим отладки |

### reCAPTCHA

Автоматически включается при наличии как `siteKey`, так и `secretKey`:

| Переменная | Описание |
|-----------|----------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Ключ сайта на стороне клиента |
| `RECAPTCHA_SECRET_KEY` | Секретный ключ на стороне сервера |

### Vercel Analytics

| Переменная | По умолчанию | Описание |
|-----------|--------------|----------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | Включить Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | Частота выборки (0--1) |

### Провайдер Отслеживания Исключений

| Переменная | По умолчанию | Описание |
|-----------|--------------|----------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`, `'sentry'` или `'none'` |

## Проверка Статуса Провайдера

```ts
import { configService } from '@/lib/config';

// Проверить, настроен ли Stripe
if (configService.payment.stripe.enabled) {
  // Stripe готов к использованию
}

// Проверить, доступен ли провайдер email
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// Список включённых OAuth-провайдеров
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## Связанные Файлы

| Путь | Описание |
|------|----------|
| `lib/config/config-service.ts` | Синглтон ConfigService |
| `lib/config/schemas/auth.schema.ts` | Схемы провайдеров auth |
| `lib/config/schemas/payment.schema.ts` | Схемы платёжных провайдеров |
| `lib/config/schemas/email.schema.ts` | Схемы провайдеров email |
| `lib/config/schemas/analytics.schema.ts` | Схемы провайдеров аналитики |
| `lib/config/schemas/integrations.schema.ts` | Схемы провайдеров интеграций |
| `lib/config/schemas/core.schema.ts` | Схема основной конфигурации |
| `lib/config/types.ts` | Определения типов TypeScript |
| `lib/config/index.ts` | Barrel-экспорт |
| `.env.example` | Полный справочник переменных среды |
