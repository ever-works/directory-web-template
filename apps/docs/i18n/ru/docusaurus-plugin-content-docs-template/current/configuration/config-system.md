---
id: config-system
title: Система Конфигурации
sidebar_label: Система Конфигурации
sidebar_position: 0
---

# Система Конфигурации

Шаблон Ever Works использует централизованную, типобезопасную систему конфигурации, основанную на схемах валидации Zod. Все переменные окружения проверяются при запуске приложения, обеспечивая немедленную обратную связь при отсутствии или неверной конфигурации. Система поддерживает как секреты, доступные только на сервере, так и публичные переменные, безопасные для клиентской части.

## Архитектура

```
lib/config/
  config-service.ts        # Централизованный синглтон ConfigService
  client.ts                # Безопасная для клиента конфигурация (NEXT_PUBLIC_*)
  env.ts                   # Устаревшая схема env (конфигурация API)
  server-config.ts         # Устаревшие серверные помощники (используйте ConfigService)
  feature-flags.ts         # Флаги доступности функций
  index.ts                 # Барельный экспорт
  types.ts                 # Определения типов TypeScript
  schemas/
    index.ts               # Барельный экспорт схем
    core.schema.ts         # URL, информация о сайте, база данных, контент
    auth.schema.ts         # Секреты Auth, OAuth провайдеры, JWT, куки
    email.schema.ts        # SMTP, Resend, конфигурация Novu
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, ценообразование
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # Барельный экспорт биллинга
    stripe.config.ts       # Конфигурация Stripe
    lemonsqueezy.config.ts # Конфигурация LemonSqueezy
    polar.config.ts        # Конфигурация Polar
    solidgate.config.ts    # Конфигурация Solidgate
    types.ts               # Типы биллинга
  utils/
    env-parser.ts          # Утилиты парсинга переменных окружения
    validation-logger.ts   # Форматирование и логирование результатов валидации
```

## Синглтон ConfigService

Ядром системы конфигурации является класс `ConfigService` в `lib/config/config-service.ts`. Он:

1. Собирает все переменные окружения через функции-сборщики
2. Проверяет их по объединённой схеме Zod
3. Хранит проверенную конфигурацию как синглтон
4. Предоставляет типизированные геттеры для каждого раздела конфигурации

```typescript
import { configService } from '@/lib/config';

// Доступ к конкретным разделам
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### Экспорт разделов

Для tree-shaking и удобства отдельные разделы также экспортируются:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// Прямой доступ без префикса ConfigService
const dbUrl = coreConfig.DATABASE_URL;
```

### Ограничение только серверной частью

Модуль `ConfigService` импортирует `'server-only'`, что означает:

- Его можно использовать только в серверных компонентах, маршрутах API и серверном коде
- Попытка импортировать его в клиентском компоненте вызовет ошибку сборки
- Это предотвращает случайное раскрытие секретов, таких как API-ключи

## Клиентская конфигурация (`lib/config/client.ts`)

Безопасная для клиента конфигурация находится в отдельном модуле, который читает только переменные `NEXT_PUBLIC_*`:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// Брендинг сайта
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // Ссылки на социальные сети
siteConfig.attribution // "Создано с помощью" атрибуция

// Ценообразование
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// Окружение
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

Этот модуль безопасно импортировать в любом компоненте, включая клиентский код.

## Схемы валидации

Каждый раздел конфигурации имеет выделенную схему Zod в `lib/config/schemas/`:

### Основная схема (`core.schema.ts`)

Проверяет: `NODE_ENV`, `APP_URL`, `SITE_URL`, `API_BASE_URL`, `DATABASE_URL`, метаданные сайта (название, слоган, описание, ключевые слова, логотип), ссылки на социальные сети, тему OG-изображения, атрибуцию и настройки контентного репозитория.

### Схема аутентификации (`auth.schema.ts`)

Проверяет: `AUTH_SECRET`, `COOKIE_SECRET`, настройки истечения JWT-токенов, конфигурацию куки, учётные данные OAuth-провайдеров (Google, GitHub, Microsoft, Facebook, X/Twitter, LinkedIn), конфигурацию Supabase и учётные данные seed-пользователя.

### Схема электронной почты (`email.schema.ts`)

Проверяет: `EMAIL_PROVIDER` (resend/novu), `EMAIL_FROM`, `EMAIL_SUPPORT`, `COMPANY_NAME`, настройки SMTP (хост, порт, пользователь, пароль), API-ключ Resend и API-ключ Novu.

### Схема платежей (`payment.schema.ts`)

Проверяет: Stripe (секретный ключ, публичный ключ, секрет webhook, ID цен, динамическое ценообразование, мультивалютность), LemonSqueezy (API-ключ, ID магазина, webhook, ID вариантов), Polar (токен доступа, webhook, организация, ID планов), ценообразование продукта, пробные суммы.

### Схема аналитики (`analytics.schema.ts`)

Проверяет: PostHog (ключ, хост, отладка, запись сессий, автозахват, персональный API-ключ, ID проекта), Sentry (DSN, организация, проект, токен аутентификации, отладка), Vercel Analytics, Recaptcha (ключ сайта, секретный ключ), провайдер отслеживания исключений.

### Схема интеграций (`integrations.schema.ts`)

Проверяет: Trigger.dev (включён, API-ключ, URL, окружение), Twenty CRM (базовый URL, API-ключ, включён, режим синхронизации), Cron (секрет).

## Поведение валидации

Система валидации использует `.catch()` от Zod для плавной деградации:

```typescript
// Из integrations.schema.ts
export const twentyCrmConfigSchema = z
  .object({
    baseUrl: z.string().url().optional().catch(undefined),
    apiKey: z.string().optional(),
    enabled: z.boolean().default(false),
    syncMode: twentyCrmSyncModeSchema,
  })
  .transform((data) => ({
    ...data,
    enabled: data.enabled ?? Boolean(data.baseUrl && data.apiKey),
  }));
```

- **Опциональные поля** с `.catch()` плавно восстанавливаются со значениями по умолчанию
- **Обязательные поля** без `.catch()` вызывают сбой при запуске
- **Шаги преобразования** вычисляют производные значения (например, автоопределение состояния enabled)

Результаты валидации записываются при запуске через `validation-logger.ts`, показывая, какие интеграции активны и предупреждения об отсутствующей опциональной конфигурации.

## Флаги функций (`lib/config/feature-flags.ts`)

Флаги функций предоставляют простой механизм для включения/отключения функций, зависящих от базы данных:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // Отображение секции комментариев
}
```

Все флаги функций в настоящее время привязаны к доступности `DATABASE_URL`. При отсутствии настроенной базы данных интерактивные функции отключаются, пока каталог продолжает обслуживать статический контент.

## Миграция с устаревшей конфигурации

Модуль `server-config.ts` содержит устаревшие вспомогательные функции. Пути миграции:

| Устаревшее | Замена |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## Связанные файлы

- `lib/config/config-service.ts` — синглтон ConfigService
- `lib/config/client.ts` — безопасная для клиента конфигурация
- `lib/config/schemas/*.schema.ts` — схемы валидации Zod
- `lib/config/feature-flags.ts` — флаги функций
- `lib/config/types.ts` — определения типов TypeScript
- `.env.example` — полный справочник переменных окружения
