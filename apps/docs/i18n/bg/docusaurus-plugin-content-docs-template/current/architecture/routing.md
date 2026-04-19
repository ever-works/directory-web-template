---
id: routing
title: Архитектура на маршрутизиране
sidebar_label: Маршрутизиране
sidebar_position: 6
---

# Архитектура на маршрутизиране

Шаблонът Ever Works използва Next.js App Router с интернационализация чрез `next-intl`, предоставяйки маршрути с префикс на локал, групи маршрути за логическа организация и цялостен API слой.

## App Router с локален сегмент

Всички потребителски страници са вложени в `[locale]` динамичен сегмент, което позволява многоезична поддръжка за 6 локализации: `en`, `fr`, `es`, `de`, `ar` и `zh`.

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

URL адресите следват шаблона `/{locale}/path`, например:
- `/en/pricing` -- страница с цени на английски
- `/fr/admin/items` -- Френска страница за администраторски елементи
- `/de/categories` -- Немска страница с категории

## Конфигурация на Next.js

`next.config.ts` конфигурира няколко поведения на маршрутизиране:

### Пренаписва

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

Тези пренаписвания пренасочват основния локален път и `/discover` към първата страница от списъка за откриване (`/discover/1`), предоставяйки чист URL адрес по подразбиране.

### Защитни заглавки

Всички маршрути получават заглавки за сигурност, включително:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` с 2-годишна максимална възраст
- `Content-Security-Policy` с ограничителни настройки по подразбиране
- `Referrer-Policy: strict-origin-when-cross-origin`

### next-intl плъгин

Плъгинът `next-intl` се прилага към конфигурацията на Next.js, сочеща към `./i18n/request.ts` за разрешаване на локала:

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## Групи маршрути

Директорията `[locale]` използва няколко логически групи за организиране на страници:

### (списък) -- Основни страници с обяви

Групата маршрути `(listing)` е група в скоби (без URL сегмент), която обвива страниците със списък на основната директория със споделено оформление.

### admin/ -- Административен панел

Разделът за администриране предоставя пълен бек-офис интерфейс:

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ -- Страници за удостоверяване

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### client/ -- Клиентско табло

Разделът за клиенти предоставя функции за удостоверени потребители за управление на техните собствени подавания и акаунт.

### dashboard/ -- Потребителско табло

Общо потребителско табло с общ преглед на акаунта, активност и настройки.

## API маршрути (29 групи)

Маршрутите на API се намират извън `[locale]` сегмента на `app/api/` и не са с локален префикс. Те служат като бекенд за извличане на данни от страна на клиента.

|Група маршрути|Цел|Ключови крайни точки|
|-------------|---------|---------------|
|`admin/`|Административни операции|Елементи, потребители, категории, настройки|
|`auth/`|Удостоверяване|Сесия, OAuth обратни извиквания|
|`categories/`|Данни за категорията|Списък, търсене|
|`client/`|Клиентски операции|Профил, изявления, табло за управление|
|`collections/`|Данни за събиране|Списък, детайл|
|`config/`|Конфигурация на сайта|Флагове на функции, настройки|
|`cron/`|Планирани задачи|Проверки на абонаменти, почистване|
|`current-user/`|Текуща потребителска информация|Профил, данни за сесията|
|`extract/`|Извличане на URL|Извличане на метаданни от URL адреси|
|`favorites/`|Любими|Добавяне, премахване, списък|
|`featured-items/`|Представени елементи|Избройте активни представени елементи|
|`geocode/`|Геокодиране|Търсене на адрес, обратно геокодиране|
|`health/`|Здравна проверка|Статус на база данни и услуга|
|`internal/`|Вътрешни операции|Крайни точки на системно ниво|
|`items/`|Данни за артикула|Списък, детайл, търсене|
|`lemonsqueezy/`|LemonSqueezy|Манипулатор на уеб кукичка|
|`location/`|Данни за местоположение|Елементи наблизо, търсене на местоположение|
|`payment/`|Разплащателни операции|Плащане, методи на плащане|
|`polar/`|Полярен|Манипулатор на уеб кукичка|
|`reference/`|Справочни данни|Енуми, стойности за търсене|
|`reports/`|Доклади за съдържанието|Изпращане, преглед на отчети|
|`solidgate/`|Solidgate|Манипулатор на уеб кукичка|
|`sponsor-ads/`|Спонсор реклами|CRUD, активиране|
|`stripe/`|Ивица|Манипулатор на уеб кукичка, плащане|
|`surveys/`|Проучвания|Избройте, отговорете, резултати|
|`user/`|Потребителски операции|Профил, настройки|
|`verify-recaptcha/`|reCAPTCHA|Проверка на токена|
|`version/`|Информация за версията|Версия на приложението и информация за компилация|

## Мидълуер

Приложението използва `next-intl` междинен софтуер за локално откриване и маршрутизиране. Мидълуерът обработва:

1. **Откриване на локализация**: Определя локализацията на потребителя от URL пътя, бисквитките или заглавката `Accept-Language`
2. **Locale redirects**: Пренасочва заявки без локален префикс към подходящия локал
3. **Локал по подразбиране**: Връща се към английски (`en`), когато не се открие предпочитание за локал

Мидълуерът е конфигуриран в директорията `i18n/` с правила за локално маршрутизиране, дефинирани в `i18n/routing.ts` и обработка на заявки в `i18n/request.ts`.

## Статично генериране и динамични маршрути

Шаблонът използва няколко стратегии за извличане на данни:

- **Статично генериране**: Страници като политика за поверителност, условия за ползване и информация се генерират статично
- **Динамично изобразяване**: Административните страници, таблата за управление и удостоверените страници се изобразяват динамично
- **ISR (Incremental Static Regeneration)**: Страниците със списъци с категории и тагове използват ISR с повторно валидиране
- **Генериране на карта на сайта**: `app/sitemap.ts` динамично генерира карта на сайта от данни за съдържание

`staticPageGenerationTimeout` е настроен на 180 секунди в `next.config.ts`, за да побере големи хранилища на съдържание по време на компилации.
