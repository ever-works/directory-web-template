---
id: environment-reference
title: Пълен справочник за променливи на средата
sidebar_label: Справочник за средата
sidebar_position: 1
---

# Пълен справочник за променливи на средата

Тази страница предоставя изчерпателен справочник на всички променливи на средата, използвани от шаблона Ever Works. Променливите са организирани по категории с техните типове, стойности по подразбиране и дали са задължителни.

Копирайте `.env.example` в `.env.local` и попълнете стойностите за вашето разполагане.

## Съдържание и хранилище на данни

| Променлива | Тип | Задължително | По подразбиране | Описание |
|----------|------|----------|---------|-------------|
| `DATA_REPOSITORY` | string (URL) | **Да** | -- | URL на Git хранилище за данни на съдържанието |
| `GH_TOKEN` | string | Не | -- | Личен токен за достъп до GitHub (за частни хранилища) |
| `GITHUB_TOKEN` | string | Не | -- | Алтернативна променлива за токен на GitHub |
| `GITHUB_BRANCH` | string | Не | `master` | Git клон за клониране на съдържание от |

## База данни

| Променлива | Тип | Задължително | По подразбиране | Описание |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | string | Препоръчано | -- | Низ за връзка с база данни (SQLite или Postgres) |

Когато `DATABASE_URL` не е зададена, функции, зависещи от база данни (оценки, коментари, любими, анкети, препоръчани елементи), се деактивират автоматично чрез системата от флагове за функции.

## Удостоверяване

| Променлива | Тип | Задължително | По подразбиране | Описание |
|----------|------|----------|---------|-------------|
| `AUTH_SECRET` | string | **Да** | -- | Тайна на NextAuth (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **Да** | -- | Тайна за криптиране на бисквитки |
| `COOKIE_DOMAIN` | string | Не | -- | Домейн на бисквитката (напр. `localhost`) |
| `COOKIE_SECURE` | boolean | Не | `true` | Флаг за сигурна бисквитка |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | Не | `15m` | TTL на токена за достъп |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | Не | `7d` | TTL на токена за опресняване |

### OAuth доставчици

| Променлива | Тип | Задължително | Описание |
|----------|------|----------|-------------|
| `GOOGLE_CLIENT_ID` | string | Не | Идентификатор на клиент за Google OAuth |
| `GOOGLE_CLIENT_SECRET` | string | Не | Тайна на клиент за Google OAuth |
| `GITHUB_CLIENT_ID` | string | Не | Идентификатор на клиент за GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | string | Не | Тайна на клиент за GitHub OAuth |
| `MICROSOFT_CLIENT_ID` | string | Не | Идентификатор на клиент за Microsoft OAuth |
| `MICROSOFT_CLIENT_SECRET` | string | Не | Тайна на клиент за Microsoft OAuth |
| `FB_CLIENT_ID` | string | Не | Идентификатор на клиент за Facebook OAuth |
| `FB_CLIENT_SECRET` | string | Не | Тайна на клиент за Facebook OAuth |
| `X_CLIENT_ID` | string | Не | Идентификатор на клиент за X (Twitter) OAuth |
| `X_CLIENT_SECRET` | string | Не | Тайна на клиент за X (Twitter) OAuth |
| `LINKEDIN_CLIENT_ID` | string | Не | Идентификатор на клиент за LinkedIn OAuth |
| `LINKEDIN_CLIENT_SECRET` | string | Не | Тайна на клиент за LinkedIn OAuth |

OAuth доставчиците се активират автоматично, когато са зададени и идентификаторът на клиент, и тайната.

## Сайт и брандиране (достъпно за клиент)

Всички променливи `NEXT_PUBLIC_*` са достъпни за браузъра.

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | URL на приложението-директория |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | URL на публичния уебсайт на компанията |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | Базов URL на API |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | Име на сайта за метаданни |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | Слоган на сайта |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | Име на марката за schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (вижте .env.example) | SEO описание (под 160 знака) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | SEO ключови думи, разделени със запетаи |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Път до логото (относително спрямо /public) |

### Тема на OG изображение

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | Начален цвят на градиента на OG изображението |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | Краен цвят на градиента на OG изображението |

### Връзки в социалните мрежи

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | Връзка към GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | Връзка към X (Twitter) |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (вижте .env.example) | Връзка към LinkedIn |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (вижте .env.example) | Връзка към Facebook |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | Връзка към блога |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | Имейл за контакт |

### Атрибуция

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | URL за връзката "Създадено с" |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | Текст за връзката "Създадено с" |

## Доставчици на плащания

### Stripe

| Променлива | Тип | Задължително | Описание |
|----------|------|----------|-------------|
| `STRIPE_SECRET_KEY` | string | Не | Таен ключ на Stripe (само сървър) |
| `STRIPE_PUBLISHABLE_KEY` | string | Не | Публичен ключ на Stripe |
| `STRIPE_WEBHOOK_SECRET` | string | Не | Тайна за подписване на webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | Не | Безопасен за клиент публичен ключ |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | Не | Зареждане на цени от Stripe API |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | Не | Активиране на плащане чрез Stripe |

#### Идентификатори на цени на Stripe за множество валути

За тарифи Standard и Premium шаблонът поддържа идентификатори на цени по валути:

```
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=
...
```

### LemonSqueezy

| Променлива | Тип | Описание |
|----------|------|-------------|
| `LEMONSQUEEZY_API_KEY` | string | API ключ |
| `LEMONSQUEEZY_STORE_ID` | string | Идентификатор на магазина |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Тайна на webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | URL на крайната точка на webhook |
| `LEMONSQUEEZY_TEST_MODE` | boolean | Активиране на тестов режим |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | Вариант на безплатния план |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | Вариант на стандартния план |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | Вариант на премиум плана |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | Активиране на плащане |

### Polar

| Променлива | Тип | Описание |
|----------|------|-------------|
| `POLAR_ACCESS_TOKEN` | string | Токен за достъп |
| `POLAR_WEBHOOK_SECRET` | string | Тайна на webhook |
| `POLAR_ORGANIZATION_ID` | string | Идентификатор на организация |
| `POLAR_SANDBOX` | boolean | Режим на пясъчника (по подразбиране: `true`) |
| `POLAR_API_URL` | string (URL) | Персонализиран URL на API |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | Идентификатор на безплатния план |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | Идентификатор на стандартния план |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | Идентификатор на премиум плана |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | Активиране на плащане |

### Solidgate

| Променлива | Тип | Описание |
|----------|------|-------------|
| `SOLIDGATE_API_KEY` | string | API ключ |
| `SOLIDGATE_SECRET_KEY` | string | Таен ключ |
| `SOLIDGATE_WEBHOOK_SECRET` | string | Тайна на webhook |
| `SOLIDGATE_MERCHANT_ID` | string | Идентификатор на търговец |
| `SOLIDGATE_API_BASE_URL` | string (URL) | Базов URL на API |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | Безопасен за клиент ключ |

### Ценообразуване на продукти

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | Цена на безплатния план |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | Цена на стандартния план |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | Цена на премиум плана |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | Идентификатор на пробна сума за premium |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | Идентификатор на пробна сума за standard |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | Активиране на пробни суми |

## Анализ и наблюдение

### PostHog

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | API ключ на проекта PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | Хост на PostHog |
| `POSTHOG_DEBUG` | boolean | `false` | Активиране на журналиране за отстраняване на грешки |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | Запис на сесии |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | Автоматично засичане на събития |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | API ключ за сървърна страна |
| `POSTHOG_PROJECT_ID` | string | -- | Идентификатор на проект за анализ |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | Проследяване на изключения |

### Sentry

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | DSN на Sentry |
| `SENTRY_ORG` | string | `ever-co` | Организация на Sentry |
| `SENTRY_PROJECT` | string | `ever-works` | Име на проекта в Sentry |
| `SENTRY_AUTH_TOKEN` | string | -- | Токен за удостоверяване на Sentry |
| `SENTRY_ENABLE_DEV` | boolean | `false` | Активиране при разработка |
| `SENTRY_DEBUG` | boolean | `false` | Режим за отстраняване на грешки |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | Проследяване на изключения |

### Друг анализ

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | Доставчик на изключения (`posthog` или `sentry`) |
| `ANALYZE` | boolean | `true` | Активиране на анализ на пакет |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | Ключ на сайт reCAPTCHA |
| `RECAPTCHA_SECRET_KEY` | string | -- | Таен ключ на reCAPTCHA |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | Честота на вземане на извадки за Speed Insights |

## Имейл

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `EMAIL_PROVIDER` | string | `resend` | Доставчик на имейл (`resend` или `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | Адрес на изпращача за известия |
| `EMAIL_SUPPORT` | string | `support@ever.works` | Имейл адрес за поддръжка |
| `COMPANY_NAME` | string | `Ever Works` | Името на компанията за имейл шаблони |
| `RESEND_API_KEY` | string | -- | API ключ на Resend |
| `NOVU_API_KEY` | string | -- | API ключ на Novu |
| `SMTP_HOST` | string | -- | Хост на SMTP сървъра |
| `SMTP_PORT` | number | `587` | SMTP порт |
| `SMTP_USER` | string | -- | Потребителско име за SMTP |
| `SMTP_PASSWORD` | string | -- | Парола за SMTP |

## Интеграции

### Twenty CRM

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | URL на инстанцията Twenty CRM |
| `TWENTY_CRM_API_KEY` | string | -- | API ключ за удостоверяване |
| `TWENTY_CRM_ENABLED` | boolean | `false` | Изрично активиране/деактивиране |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | Режим на синхронизация (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (Фонови задачи)

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | Активиране на Trigger.dev |
| `TRIGGER_DEV_API_KEY` | string | -- | API ключ |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | Персонализиран URL на API |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | Среда (`development`, `staging`, `production`) |

### Cron задачи

| Променлива | Тип | Описание |
|----------|------|-------------|
| `CRON_SECRET` | string | Тайна за удостоверяване за cron крайни точки |

### Карти и местоположение

| Променлива | Тип | Описание |
|----------|------|-------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | Публичен токен на Mapbox (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | Ключ на Google Maps с ограничение за браузър |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | Идентификатор на карта в Google Maps |

### API на платформата Ever Works

| Променлива | Тип | По подразбиране | Описание |
|----------|------|---------|-------------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | URL на API на платформата |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | Токен за удостоверяване на API на платформата |

## Vercel и разполагане

| Променлива | Тип | Описание |
|----------|------|-------------|
| `VERCEL_TOKEN` | string | Личен токен за достъп до Vercel |
| `VERCEL_PROJECT_ID` | string | Идентификатор на проект в Vercel |
