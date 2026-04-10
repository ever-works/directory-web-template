---
id: provider-config
title: "Конфигурация на Доставчици"
sidebar_label: "Конфигурация на Доставчици"
sidebar_position: 4
---

# Конфигурация на Доставчици

Шаблонът използва централизиран синглтон `ConfigService` за управление на всички външни доставчици на услуги. Всеки доставчик е конфигуриран чрез схеми, валидирани с Zod, с автоматично откриване на функции -- доставчиците се активират когато са налице необходимите идентификационни данни.

## Архитектура на ConfigService

`ConfigService` в `lib/config/config-service.ts` е синглтон само от страна на сървъра, който валидира всички променливи на средата при стартиране:

```ts
import { configService } from '@/lib/config';

// Достъп до секциите за конфигурация
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

Услугата е организирана в шест секции, всяка с отделна схема Zod:

| Секция | Метод за достъп | Файл на схемата |
|--------|----------------|-----------------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### Tree-Shakeable Импорти

Отделните секции могат да бъдат импортирани директно за по-добро tree-shaking:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### Валидиране при Стартиране

Цялата конфигурация се валидира с Zod при първия импорт. Невалидните стойности задействат резервни `.catch()` обработчици там, където е възможно, докато наистина невъзстановимите грешки се хвърлят при стартиране:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## Доставчици на Удостоверяване

Дефинирани в `lib/config/schemas/auth.schema.ts`. OAuth доставчиците автоматично откривате активирането:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### Поддържани OAuth Доставчици

| Доставчик | Променлива Client ID | Променлива Client Secret |
|-----------|---------------------|--------------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### Бекенд за Удостоверяване Supabase

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| Променлива | Описание |
|-----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL на проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Анонимен ключ на Supabase |

### Допълнителни Настройки за Удостоверяване

| Променлива | По подразбиране | Описание |
|-----------|-----------------|----------|
| `AUTH_SECRET` | -- | Необходимо за подписване на сесия |
| `COOKIE_SECRET` | -- | Таен ключ за криптиране на бисквитки |
| `COOKIE_DOMAIN` | `'localhost'` | Домейн на бисквитките |
| `COOKIE_SECURE` | `false` | Само HTTPS бисквитки |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | TTL на токена за достъп |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | TTL на токена за обновяване |

## Доставчици на Плащания

Дефинирани в `lib/config/schemas/payment.schema.ts`. Всеки доставчик се активира автоматично когато са зададени необходимите идентификационни данни.

### Stripe

Автоматично се активира когато са налице `secretKey` и `publishableKey`:

| Променлива | Описание |
|-----------|----------|
| `STRIPE_SECRET_KEY` | Таен ключ от страна на сървъра |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Публичен ключ от страна на клиента |
| `STRIPE_WEBHOOK_SECRET` | Проверка на подписа на уебхука |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | ID на цена за безплатен план |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | ID на цена за стандартен план |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | ID на цена за премиум план |

### LemonSqueezy

Автоматично се активира когато са налице `apiKey` и `storeId`:

| Променлива | Описание |
|-----------|----------|
| `LEMONSQUEEZY_API_KEY` | API ключ |
| `LEMONSQUEEZY_STORE_ID` | Идентификатор на магазина |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Таен ключ на уебхука |
| `LEMONSQUEEZY_WEBHOOK_URL` | URL на крайната точка на уебхука |
| `LEMONSQUEEZY_TEST_MODE` | Активиране на тестов режим (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | ID на вариант за безплатен план |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | ID на вариант за стандартен план |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | ID на вариант за премиум план |

### Polar

Автоматично се активира когато са налице `accessToken` и `organizationId`:

| Променлива | По подразбиране | Описание |
|-----------|-----------------|----------|
| `POLAR_ACCESS_TOKEN` | -- | Токен за достъп до API |
| `POLAR_ORGANIZATION_ID` | -- | ID на организацията |
| `POLAR_WEBHOOK_SECRET` | -- | Таен ключ на уебхука |
| `POLAR_SANDBOX` | `true` | Режим на пясъчника (`'false'` за продукция) |
| `POLAR_API_URL` | -- | Персонализиран URL на API |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | ID на план за безплатно ниво |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | ID на план за стандартно ниво |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | ID на план за премиум ниво |

### Показване на Цените на Продуктите

| Променлива | По подразбиране | Описание |
|-----------|-----------------|----------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | Показвана цена за безплатен план |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | Показвана цена за стандартен план |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | Показвана цена за премиум план |

## Доставчици на Имейл

Дефинирани в `lib/config/schemas/email.schema.ts`.

### SMTP

Автоматично се активира когато са налице `host`, `user` и `password`:

| Променлива | По подразбиране | Описание |
|-----------|-----------------|----------|
| `SMTP_HOST` | -- | Хост на SMTP сървъра |
| `SMTP_PORT` | `587` | Порт на SMTP сървъра |
| `SMTP_USER` | -- | Потребителско ime за удостоверяване по SMTP |
| `SMTP_PASSWORD` | -- | Парола за удостоверяване по SMTP |

### Resend

Автоматично се активира когато е наличен `apiKey`:

| Променлива | Описание |
|-----------|----------|
| `RESEND_API_KEY` | API ключ на Resend |

### Novu

Автоматично се активира когато е наличен `apiKey`:

| Променлива | Описание |
|-----------|----------|
| `NOVU_API_KEY` | API ключ на Novu |

### Настройки на Имейл

| Променлива | По подразбиране | Описание |
|-----------|-----------------|----------|
| `COMPANY_NAME` | `'Ever Works'` | Ime на компанията в шаблоните за имейл |
| `EMAIL_PROVIDER` | `'resend'` | Активен доставчик на имейл (`'resend'`, `'novu'`) |
| `EMAIL_FROM` | -- | Имейл адрес на изпращача |
| `EMAIL_SUPPORT` | -- | Имейл адрес за поддръжка |

## Доставчици на Анализи

Дефинирани в `lib/config/schemas/analytics.schema.ts`.

### PostHog

Автоматично се активира когато е наличен `key`:

| Променлива | По подразбиране | Описание |
|-----------|-----------------|----------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | API ключ на проекта PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | URL на хоста PostHog |
| `POSTHOG_DEBUG` | `false` | Активиране на режим на отстраняване на грешки |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | Активиране на запис на сесии |
| `POSTHOG_AUTO_CAPTURE` | `false` | Автоматично улавяне на събития |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | Проследяване на изключения |
| `POSTHOG_PERSONAL_API_KEY` | -- | Личен API ключ (табло на администратора) |
| `POSTHOG_PROJECT_ID` | -- | ID на проекта (табло на администратора) |

### Sentry

Автоматично се активира когато е наличен `dsn`:

| Променлива | По подразбиране | Описание |
|-----------|-----------------|----------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | DSN на Sentry |
| `SENTRY_ORG` | -- | Slug на организацията в Sentry |
| `SENTRY_PROJECT` | -- | Ime на проекта в Sentry |
| `SENTRY_AUTH_TOKEN` | -- | Токен за auth за source map |
| `SENTRY_ENABLE_DEV` | `false` | Активиране в режим на разработка |
| `SENTRY_DEBUG` | `false` | Режим на отстраняване на грешки |

### reCAPTCHA

Автоматично се активира когато са налице и `siteKey`, и `secretKey`:

| Променлива | Описание |
|-----------|----------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Ключ на сайта от страна на клиента |
| `RECAPTCHA_SECRET_KEY` | Таен ключ от страна на сървъра |

### Vercel Analytics

| Променлива | По подразбиране | Описание |
|-----------|-----------------|----------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | Активиране на Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | Честота на вземане на проби (0--1) |

### Доставчик за Проследяване на Изключения

| Променлива | По подразбиране | Описание |
|-----------|-----------------|----------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`, `'sentry'` или `'none'` |

## Проверка на Статуса на Доставчика

```ts
import { configService } from '@/lib/config';

// Проверете дали Stripe е конфигуриран
if (configService.payment.stripe.enabled) {
  // Stripe е готов за използване
}

// Проверете дали е наличен доставчик на имейл
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// Избройте активираните OAuth доставчици
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## Свързани Файлове

| Път | Описание |
|-----|----------|
| `lib/config/config-service.ts` | Синглтон ConfigService |
| `lib/config/schemas/auth.schema.ts` | Схеми на доставчици за удостоверяване |
| `lib/config/schemas/payment.schema.ts` | Схеми на доставчици за плащане |
| `lib/config/schemas/email.schema.ts` | Схеми на доставчици за имейл |
| `lib/config/schemas/analytics.schema.ts` | Схеми на доставчици за анализи |
| `lib/config/schemas/integrations.schema.ts` | Схеми на доставчици за интеграции |
| `lib/config/schemas/core.schema.ts` | Схема за основна конфигурация |
| `lib/config/types.ts` | Дефиниции на типове TypeScript |
| `lib/config/index.ts` | Barrel-експорт |
| `.env.example` | Пълна справка за променливите на средата |
