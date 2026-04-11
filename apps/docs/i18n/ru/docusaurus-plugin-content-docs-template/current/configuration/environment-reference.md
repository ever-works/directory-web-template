---
id: environment-reference
title: Полный справочник переменных окружения
sidebar_label: Справочник окружения
sidebar_position: 1
---

# Полный справочник переменных окружения

Эта страница содержит полный справочник всех переменных окружения, используемых в шаблоне Ever Works. Переменные организованы по категориям с указанием типов, значений по умолчанию и обязательности.

Скопируйте `.env.example` в `.env.local` и заполните значения для вашего развёртывания.

## Контент и репозиторий данных

| Переменная | Тип | Обязательно | По умолчанию | Описание |
|----------|------|----------|---------|-------------|
| `DATA_REPOSITORY` | string (URL) | **Да** | -- | URL Git-репозитория с данными контента |
| `GH_TOKEN` | string | Нет | -- | Персональный токен GitHub (для приватных репозиториев) |
| `GITHUB_TOKEN` | string | Нет | -- | Альтернативная переменная токена GitHub |
| `GITHUB_BRANCH` | string | Нет | `master` | Ветка Git для клонирования контента |

## База данных

| Переменная | Тип | Обязательно | По умолчанию | Описание |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | string | Рекомендуется | -- | Строка подключения к БД (SQLite или Postgres) |

Если `DATABASE_URL` не задан, функции, зависящие от базы данных (оценки, комментарии, избранное, опросы, рекомендуемые элементы), автоматически отключаются через систему флагов функций.

## Аутентификация

| Переменная | Тип | Обязательно | По умолчанию | Описание |
|----------|------|----------|---------|-------------|
| `AUTH_SECRET` | string | **Да** | -- | Секрет NextAuth (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **Да** | -- | Секрет шифрования куки |
| `COOKIE_DOMAIN` | string | Нет | -- | Домен куки (например, `localhost`) |
| `COOKIE_SECURE` | boolean | Нет | `true` | Флаг безопасности куки |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | Нет | `15m` | Время жизни токена доступа |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | Нет | `7d` | Время жизни токена обновления |

### OAuth-провайдеры

| Переменная | Тип | Обязательно | Описание |
|----------|------|----------|-------------|
| `GOOGLE_CLIENT_ID` | string | Нет | Идентификатор клиента Google OAuth |
| `GOOGLE_CLIENT_SECRET` | string | Нет | Секрет клиента Google OAuth |
| `GITHUB_CLIENT_ID` | string | Нет | Идентификатор клиента GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | string | Нет | Секрет клиента GitHub OAuth |
| `MICROSOFT_CLIENT_ID` | string | Нет | Идентификатор клиента Microsoft OAuth |
| `MICROSOFT_CLIENT_SECRET` | string | Нет | Секрет клиента Microsoft OAuth |
| `FB_CLIENT_ID` | string | Нет | Идентификатор клиента Facebook OAuth |
| `FB_CLIENT_SECRET` | string | Нет | Секрет клиента Facebook OAuth |
| `X_CLIENT_ID` | string | Нет | Идентификатор клиента X (Twitter) OAuth |
| `X_CLIENT_SECRET` | string | Нет | Секрет клиента X (Twitter) OAuth |
| `LINKEDIN_CLIENT_ID` | string | Нет | Идентификатор клиента LinkedIn OAuth |
| `LINKEDIN_CLIENT_SECRET` | string | Нет | Секрет клиента LinkedIn OAuth |

OAuth-провайдеры автоматически включаются, когда заданы как идентификатор клиента, так и секрет.

## Сайт и брендинг (доступно клиенту)

Все переменные `NEXT_PUBLIC_*` доступны в браузере.

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | URL приложения-директории |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | URL публичного сайта компании |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | Базовый URL API |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | Название сайта для метаданных |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | Слоган сайта |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | Название бренда для schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (см. .env.example) | SEO-описание (до 160 символов) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | SEO-ключевые слова через запятую |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Путь к логотипу (относительно /public) |

### Тема изображения OG

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | Начальный цвет градиента OG-изображения |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | Конечный цвет градиента OG-изображения |

### Ссылки на социальные сети

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | Ссылка GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | Ссылка X (Twitter) |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (см. .env.example) | Ссылка LinkedIn |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (см. .env.example) | Ссылка Facebook |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | Ссылка на блог |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | Контактный email |

### Атрибуция

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | URL для ссылки «Создано с помощью» |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | Текст ссылки «Создано с помощью» |

## Платёжные провайдеры

### Stripe

| Переменная | Тип | Обязательно | Описание |
|----------|------|----------|-------------|
| `STRIPE_SECRET_KEY` | string | Нет | Секретный ключ Stripe (только сервер) |
| `STRIPE_PUBLISHABLE_KEY` | string | Нет | Публикуемый ключ Stripe |
| `STRIPE_WEBHOOK_SECRET` | string | Нет | Секрет подписи webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | Нет | Безопасный для клиента публикуемый ключ |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | Нет | Загружать цены из Stripe API |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | Нет | Включить оформление заказа Stripe |

#### Идентификаторы цен Stripe по нескольким валютам

Для тарифов Standard и Premium шаблон поддерживает идентификаторы цен по валютам:

```
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=
...
```

Та же схема применяется для переменных тарифа Premium и идентификаторов платы за настройку.

### LemonSqueezy

| Переменная | Тип | Описание |
|----------|------|-------------|
| `LEMONSQUEEZY_API_KEY` | string | Ключ API |
| `LEMONSQUEEZY_STORE_ID` | string | Идентификатор магазина |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Секрет webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | URL точки webhook |
| `LEMONSQUEEZY_TEST_MODE` | boolean | Включить тестовый режим |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | Вариант бесплатного тарифа |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | Вариант стандартного тарифа |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | Вариант премиального тарифа |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | Включить оформление заказа |

### Polar

| Переменная | Тип | Описание |
|----------|------|-------------|
| `POLAR_ACCESS_TOKEN` | string | Токен доступа |
| `POLAR_WEBHOOK_SECRET` | string | Секрет webhook |
| `POLAR_ORGANIZATION_ID` | string | Идентификатор организации |
| `POLAR_SANDBOX` | boolean | Режим песочницы (по умолчанию: `true`) |
| `POLAR_API_URL` | string (URL) | Пользовательский URL API |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | Идентификатор бесплатного тарифа |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | Идентификатор стандартного тарифа |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | Идентификатор премиального тарифа |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | Включить оформление заказа |

### Solidgate

| Переменная | Тип | Описание |
|----------|------|-------------|
| `SOLIDGATE_API_KEY` | string | Ключ API |
| `SOLIDGATE_SECRET_KEY` | string | Секретный ключ |
| `SOLIDGATE_WEBHOOK_SECRET` | string | Секрет webhook |
| `SOLIDGATE_MERCHANT_ID` | string | Идентификатор продавца |
| `SOLIDGATE_API_BASE_URL` | string (URL) | Базовый URL API |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | Безопасный для клиента ключ |

### Цены на продукты

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | Цена бесплатного тарифа |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | Цена стандартного тарифа |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | Цена премиального тарифа |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | Идентификатор пробной суммы premium |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | Идентификатор пробной суммы standard |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | Включить пробные суммы |

## Аналитика и мониторинг

### PostHog

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | Ключ API проекта PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | Хост PostHog |
| `POSTHOG_DEBUG` | boolean | `false` | Включить ведение журнала отладки |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | Запись сессий |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | Автоматический захват событий |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | Серверный ключ API |
| `POSTHOG_PROJECT_ID` | string | -- | Идентификатор проекта для аналитики |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | Отслеживание исключений |

### Sentry

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | DSN Sentry |
| `SENTRY_ORG` | string | `ever-co` | Организация Sentry |
| `SENTRY_PROJECT` | string | `ever-works` | Название проекта Sentry |
| `SENTRY_AUTH_TOKEN` | string | -- | Токен аутентификации Sentry |
| `SENTRY_ENABLE_DEV` | boolean | `false` | Включить в режиме разработки |
| `SENTRY_DEBUG` | boolean | `false` | Режим отладки |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | Отслеживание исключений |

### Другая аналитика

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | Провайдер исключений (`posthog` или `sentry`) |
| `ANALYZE` | boolean | `true` | Включить анализ бандла |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | Ключ сайта reCAPTCHA |
| `RECAPTCHA_SECRET_KEY` | string | -- | Секретный ключ reCAPTCHA |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | Частота выборки Speed Insights |

## Email

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `EMAIL_PROVIDER` | string | `resend` | Провайдер email (`resend` или `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | Адрес отправителя для уведомлений |
| `EMAIL_SUPPORT` | string | `support@ever.works` | Адрес email поддержки |
| `COMPANY_NAME` | string | `Ever Works` | Название компании для шаблонов email |
| `RESEND_API_KEY` | string | -- | Ключ API Resend |
| `NOVU_API_KEY` | string | -- | Ключ API Novu |
| `SMTP_HOST` | string | -- | Имя хоста SMTP-сервера |
| `SMTP_PORT` | number | `587` | Порт SMTP |
| `SMTP_USER` | string | -- | Имя пользователя SMTP |
| `SMTP_PASSWORD` | string | -- | Пароль SMTP |

## Интеграции

### Twenty CRM

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | URL экземпляра Twenty CRM |
| `TWENTY_CRM_API_KEY` | string | -- | Ключ API для аутентификации |
| `TWENTY_CRM_ENABLED` | boolean | `false` | Явное включение/отключение |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | Режим синхронизации (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (Фоновые задачи)

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | Включить Trigger.dev |
| `TRIGGER_DEV_API_KEY` | string | -- | Ключ API |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | Пользовательский URL API |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | Окружение (`development`, `staging`, `production`) |

### Cron-задачи

| Переменная | Тип | Описание |
|----------|------|-------------|
| `CRON_SECRET` | string | Секрет аутентификации для конечных точек cron |

### Карты и геолокация

| Переменная | Тип | Описание |
|----------|------|-------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | Публичный токен Mapbox (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | Ключ API Google Maps с ограничением по браузеру |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | Идентификатор карты Google Maps |

### API платформы Ever Works

| Переменная | Тип | По умолчанию | Описание |
|----------|------|---------|-------------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | URL API платформы |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | Токен аутентификации API платформы |

## Vercel и развёртывание

| Переменная | Тип | Описание |
|----------|------|-------------|
| `VERCEL_TOKEN` | string | Персональный токен доступа Vercel |
| `VERCEL_PROJECT_ID` | string | Идентификатор проекта Vercel |
