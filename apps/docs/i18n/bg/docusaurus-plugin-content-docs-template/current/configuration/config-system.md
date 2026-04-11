---
id: config-system
title: Система за Конфигурация
sidebar_label: Система за Конфигурация
sidebar_position: 0
---

# Система за Конфигурация

Шаблонът Ever Works използва централизирана, типово-безопасна система за конфигурация, изградена върху схеми за валидация Zod. Всички променливи на средата се валидират при стартиране на приложението, осигурявайки незабавна обратна връзка при липсваща или невалидна конфигурация. Системата поддържа както тайни само за сървъра, така и публични променливи, безопасни за клиента.

## Архитектура

```
lib/config/
  config-service.ts        # Централизиран синглтон ConfigService
  client.ts                # Клиентски-безопасна конфигурация (NEXT_PUBLIC_*)
  env.ts                   # Наследена env схема (API конфигурация)
  server-config.ts         # Остарели сървърни помощници (използвайте ConfigService)
  feature-flags.ts         # Флагове за наличност на функции
  index.ts                 # Барелен износ
  types.ts                 # Дефиниции на TypeScript типове
  schemas/
    index.ts               # Барелен износ на схеми
    core.schema.ts         # URL-ове, информация за сайт, база данни, съдържание
    auth.schema.ts         # Секрети за удостоверяване, OAuth доставчици, JWT, бисквитки
    email.schema.ts        # SMTP, Resend, конфигурация на Novu
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, ценообразуване
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # Барелен износ на биллинг
    stripe.config.ts       # Конфигурация на Stripe
    lemonsqueezy.config.ts # Конфигурация на LemonSqueezy
    polar.config.ts        # Конфигурация на Polar
    solidgate.config.ts    # Конфигурация на Solidgate
    types.ts               # Типове за биллинг
  utils/
    env-parser.ts          # Помощни инструменти за парсване на променливи на средата
    validation-logger.ts   # Форматиране и логиране на резултати от валидация
```

## Синглтон ConfigService

Ядрото на системата за конфигурация е класът `ConfigService` в `lib/config/config-service.ts`. Той:

1. Събира всички променливи на средата чрез функции-колектори
2. Валидира ги спрямо комбинирана Zod схема
3. Съхранява валидираната конфигурация като синглтон
4. Предоставя типизирани гетъри за всеки раздел на конфигурацията

```typescript
import { configService } from '@/lib/config';

// Достъп до конкретни раздели
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### Износ на раздели

За tree-shaking и удобство, отделните раздели се изнасят директно:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// Директен достъп без префикс ConfigService
const dbUrl = coreConfig.DATABASE_URL;
```

### Принудително само за сървъра

Модулът `ConfigService` импортира `'server-only'`, което означава:

- Може да се използва само в сървърни компоненти, API маршрути и сървърен код
- Опитът за импортиране в клиентски компонент ще доведе до грешка при изграждане
- Това предотвратява случайно разкриване на тайни като API ключове

## Клиентска конфигурация (`lib/config/client.ts`)

Клиентски-безопасната конфигурация е в отделен модул, който чете само `NEXT_PUBLIC_*` променливи:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// Брандиране на сайта
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // Връзки към социални мрежи
siteConfig.attribution // "Създадено с" атрибуция

// Ценообразуване
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// Среда
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

Този модул е безопасно да се импортира в произволен компонент, включително клиентски код.

## Схеми за валидация

Всеки раздел на конфигурацията има специална Zod схема в `lib/config/schemas/`:

### Основна схема (`core.schema.ts`)

Валидира: `NODE_ENV`, `APP_URL`, `SITE_URL`, `API_BASE_URL`, `DATABASE_URL`, метаданни на сайта (име, слоган, описание, ключови думи, лого), социални връзки, тема на OG изображение, атрибуция и настройки на хранилище за съдържание.

### Схема за удостоверяване (`auth.schema.ts`)

Валидира: `AUTH_SECRET`, `COOKIE_SECRET`, настройки за изтичане на JWT токени, конфигурация на бисквитки, идентификационни данни на OAuth доставчици (Google, GitHub, Microsoft, Facebook, X/Twitter, LinkedIn), конфигурация на Supabase и идентификационни данни за seed потребител.

### Схема за имейл (`email.schema.ts`)

Валидира: `EMAIL_PROVIDER` (resend/novu), `EMAIL_FROM`, `EMAIL_SUPPORT`, `COMPANY_NAME`, настройки на SMTP (хост, порт, потребител, парола), API ключ на Resend и API ключ на Novu.

### Схема за плащания (`payment.schema.ts`)

Валидира: Stripe (таен ключ, публикуван ключ, тайна за webhook, ID-та на цени, динамично ценообразуване, мультивалутност), LemonSqueezy (API ключ, ID на магазин, webhook, ID-та на варианти), Polar (токен за достъп, webhook, организация, ID-та на планове), ценообразуване на продукт, пробни суми.

### Схема за анализ (`analytics.schema.ts`)

Валидира: PostHog (ключ, хост, дебъг, запис на сесии, автоматично записване, личен API ключ, ID на проект), Sentry (DSN, организация, проект, токен за удостоверяване, дебъг), Vercel Analytics, Recaptcha (ключ на сайт, таен ключ), доставчик за проследяване на изключения.

### Схема за интеграции (`integrations.schema.ts`)

Валидира: Trigger.dev (активиран, API ключ, URL, среда), Twenty CRM (базов URL, API ключ, активиран, режим на синхронизация), Cron (тайна).

## Поведение при валидация

Системата за валидация използва `.catch()` на Zod за плавна деградация:

```typescript
// От integrations.schema.ts
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

- **Незадължителните полета** с `.catch()` се възстановяват плавно с默认 стойности
- **Задължителните полета** без `.catch()` причиняват неуспех при стартиране
- **Стъпките за трансформация** изчисляват производни стойности (като автоматично определяне на enabled)

Резултатите от валидацията се записват при стартиране чрез `validation-logger.ts`, показвайки кои интеграции са активни и предупреждения за липсваща незадължителна конфигурация.

## Флагове на функции (`lib/config/feature-flags.ts`)

Флаговете на функции осигуряват прост механизъм за включване/изключване на функции, зависещи от базата данни:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // Рендиране на секцията с коментари
}
```

Всички флагове на функции в момента са обвързани с наличността на `DATABASE_URL`. При липса на конфигурирана база данни, интерактивните функции се деактивират, докато директорията продължава да обслужва статично съдържание.

## Миграция от устарял конфигурационен код

Модулът `server-config.ts` съдържа остарели помощни функции. Пътища за миграция:

| Остаряло | Заместител |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## Свързани файлове

- `lib/config/config-service.ts` — синглтон ConfigService
- `lib/config/client.ts` — клиентски-безопасна конфигурация
- `lib/config/schemas/*.schema.ts` — схеми за валидация Zod
- `lib/config/feature-flags.ts` — флагове на функции
- `lib/config/types.ts` — дефиниции на TypeScript типове
- `.env.example` — пълен справочник за променливи на средата
