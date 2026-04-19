---
id: architecture
title: Преглед на архитектурата
sidebar_label: Преглед
sidebar_position: 0
---

# Преглед на архитектурата

Тази страница предоставя карта на високо ниво на архитектурата на шаблона Ever Works. Използвайте го като отправна точка, преди да се потопите в подробните страници, които следват.

## Технологична фондация

Шаблонът е приложение **Next.js 16**, използващо **App Router** с **React 19**. Той произвежда `standalone` изход за контейнеризирани внедрявания и прилага няколко оптимизации на ниво рамка в `next.config.ts`:

|Слой|технология|Цел|
|---|---|---|
|**Рамка**|Next.js 16 (Рутер за приложения)|Рендиране на сървър и клиент, маршрутизиране, API маршрути|
|**UI**|React 19, HeroUI, Radix UI, Tailwind CSS 4|Библиотека с компоненти, примитиви, стил|
|**База данни**|Намажете ORM + PostgreSQL (или SQLite локално)|Управление на схеми, миграции, заявки|
|**Удостоверяване**|NextAuth.js v5 (бета)|Удостоверяване на множество доставчици с кеширане на сесии|
|**Интернационализация**|следващ-межд|Маршрутизиране, съобразено с локала, и пакети съобщения|
|**Плащания**|Stripe, Polar, LemonSqueezy, Solidgate|Потоци за абонамент и еднократно плащане|
|**Съдържание**|Базирана на Git CMS (директория `.content/`)|Markdown/YAML съдържание, клонирано от хранилище на данни|
|**Мониторинг**|Sentry, PostHog, Vercel Analytics|Проследяване на грешки, продуктови анализи, производителност|
|**Имейл**|Повторно изпращане|Транзакционна доставка по имейл|
|**Обогатен текст**|Типтап|WYSIWYG редактор за административно съдържание|

## Структура на проекта

Шаблонът следва многослойна организация, базирана на функции. Ето директориите от най-високо ниво и техните отговорности:

```text
template/
  app/              # Next.js App Router -- routes and layouts
    [locale]/       # Locale-prefixed pages (i18n)
      admin/        # Admin dashboard pages
      auth/         # Authentication flows
      dashboard/    # Client dashboard
      items/        # Item detail pages
      categories/   # Category browsing
      ...
    api/            # API route handlers
  components/       # Shared React components (UI, layout, features)
  lib/              # Core logic -- the heart of the application
    auth/           # Authentication providers, guards, session caching
    db/             # Drizzle schema, migrations, seed, queries
    middleware/     # Permission checks and middleware utilities
    repositories/  # Data-access layer (database queries)
    services/      # Business logic services
    payment/       # Payment provider integrations
    mail/           # Email templates and sending
    analytics/     # Analytics tracking layer
    config/        # Centralized configuration service
    validations/   # Zod schemas for input validation
    utils/         # General utility functions
    ...
  hooks/            # Custom React hooks (React Query wrappers, UI logic)
  constants/        # Application-wide constants
  types/            # Shared TypeScript type definitions
  i18n/             # Internationalization setup and locale request config
  messages/         # Translation message files (JSON per locale)
  e2e/              # Playwright end-to-end tests
  scripts/          # Build, seed, migration, and utility scripts
  public/           # Static assets
```

За пълно описание на директорията вижте страницата [Структура на проекта](/architecture/project-structure).

## Слоеста архитектура

Кодовата база налага ясно разделяне на проблемите на три слоя:

### Презентационен слой

Компонентите на React в `components/` и файловете на страницата в `app/[locale]/` обработват изобразяването и взаимодействието с потребителя. Сървърните компоненти извличат данни директно; Клиентските компоненти използват кукички за React Query от `hooks/` за състояние от страна на клиента.

### Слой бизнес логика

Услугите в `lib/services/` съдържат основните бизнес правила. Шаблонът се доставя с над 30 сервизни файла, обхващащи анализи, абонаменти, модериране, CRM синхронизиране, геокодиране, известия и др. Услугите се извикват от манипулатори на API маршрути и сървърни компоненти, но никога директно от UI код в браузъра.

### Слой за достъп до данни

Хранилищата в `lib/repositories/` капсулират всички заявки към базата данни с помощта на Drizzle ORM. Всеки обект на домейн (артикули, категории, колекции, потребители, роли, тагове, реклами на спонсори) има свой собствен файл на хранилище. Това предпазва детайлите на ниво SQL извън слоя на услугата.

За по-задълбочен поглед върху потока от данни между тези слоеве вижте [Поток от данни](/architecture/data-flow).

## Маршрутизатор на приложението Next.js и маршрутизиране

Всички маршрути, насочени към потребителя, живеят под `app/[locale]/`, което позволява URL адреси с префикс за локализация извън кутията чрез `next-intl`. Приложението използва няколко функции на App Router:

- **Оформления** -- вложени `layout.tsx` файлове за администратор, клиентско табло и публични зони.
- **Групи маршрути** -- групата `(listing)` управлява списъка с основната директория и преглеждането на етикети, без да засяга URL структурата.
- **Динамични маршрути** -- `[page]`, `[...tag]` и именувани сегменти за елементи, категории и колекции.
- **Пренаписва** -- дефинирано в `next.config.ts` за пренасочване на пътищата на голи категории към техния изглед за откриване с страници.

Вижте [Routing](/architecture/routing) за пълната карта на маршрута.

## Система за удостоверяване

Удостоверяването е изградено на **NextAuth.js v5** със система за конфигуриране на доставчик в `lib/auth/`. Файлът `auth.config.ts` в корена на проекта организира:

- **OAuth доставчици** -- Google и GitHub, конфигурирани чрез променливи на средата и активирани/деактивирани динамично.
- **Доставчик на идентификационни данни** -- удостоверяване на имейл/парола с bcrypt хеширане.
- **Адаптер Supabase** -- опционално хранилище за сесии, поддържано от Supabase.
- **Кеширане на сесии** -- `lib/auth/cached-session.ts` намалява излишните търсения на сесии.
- **Система за охрана** -- `lib/auth/guards.ts` и `lib/guards/` налагат базиран на роли достъп на ниво маршрут.

За подробности относно защитната система и базираните на роли разрешения вижте [Guards System](/architecture/guards-system) и [Permissions System](/architecture/permissions-system).

## Drizzle ORM и база данни

Слоят на базата данни използва **Drizzle ORM** със схемата, дефинирана в `lib/db/schema.ts`. Ключови аспекти:

- **Миграциите** се генерират с `drizzle-kit generate` и се прилагат с `drizzle-kit migrate`.
- Скриптовете **Seeding** в `lib/db/seed.ts` и `scripts/cli-seed.ts` попълват първоначални данни, включително роли.
- **Конфигурацията** се намира в `drizzle.config.ts` в основата на проекта.
- PostgreSQL е необходим за производство; SQLite се поддържа за локално развитие.

Вижте [Образци на хранилище](/architecture/repository-patterns) за това как е структуриран слоят за достъп до данни.

## Мидълуер верига

Шаблонът използва междинен софтуер Next.js (чрез плъгина `next-intl`, приложен в `next.config.ts`), комбиниран с персонализирани проверки на разрешения в `lib/middleware/permission-check.ts`. Конвейерът на междинния софтуер обработва:

- Откриване на локал и маршрутизиране
- Проверка на състоянието на удостоверяване
- Ролева защита на маршрута
- Заглавки за сигурност (HSTS, CSP, X-Frame-Options и други -- конфигурирани в `next.config.ts`)

За подробна разбивка вижте [Middleware](/architecture/middleware) и [Middleware Deep Dive](/architecture/middleware-deep-dive).

## Конфигурация и сигурност

Файлът `next.config.ts` задава няколко настройки по подразбиране за сигурност и производителност:

- **Самостоятелен изход** за подходящи за Docker внедрявания.
- **Заглавки за сигурност**, включително Content-Security-Policy, HSTS, X-Content-Type-Options и X-Frame-Options.
- **Оптимизация на изображението** с отдалечена поддръжка на шаблони и правила за безопасност на SVG.
- **Интеграция на Sentry**, приложена като най-външната обвивка на конфигурацията за проследяване на грешки.
- **Оптимизация на пакета** за HeroUI и Lucide React за намаляване на размера на пакета.

## Страници с подробна архитектура

Разгледайте тези страници за по-задълбочено покритие на отделните системи:

|Страница|Какво покрива|
|---|---|
|[Tech Stack](/architecture/tech-stack)|Пълен опис на зависимостите и подробности за версията|
|[Структура на проекта](/architecture/project-structure)|Указание по директория|
|[Поток на данни](/architecture/data-flow)|Жизнен цикъл на заявка от браузър към база данни|
|[Маршрутизиране](/архитектура/маршрутизиране)|Структура на App Router и URL модели|
|[Образци на компоненти](/architecture/component-patterns)|Сървър срещу клиентски компоненти, модели на съставяне|
|[Управление на състоянието](/architecture/state-management)|React Query, Zustand и състояние на сървъра|
|[API слой](/архитектура/api-слой)|Дизайн на REST API и шаблони за обработка на маршрути|
|[Middleware](/architecture/middleware)|Мидълуер конвейер и обработка на заявки|
|[Система за охрана](/architecture/guards-system)|Ролеви контрол на достъпа на ниво маршрут|
|[Система за разрешения](/architecture/permissions-system)|Дефинирани дефиниции на разрешения|
|[Модели на хранилище](/архитектура/модели-хранилище)|Конвенции на слоя за достъп до данни|
|[Модели за валидиране](/architecture/validation-patterns)|Zod схеми и проверка на входа|
|[Система за теми](/архитектура/система за теми)|Тематична архитектура и управление на цветовете|
|[Цветова система](/architecture/color-system)|Конвейер за динамично генериране на цветове|
|[SEO система](/architecture/seo-система)|Метаданни, карти на сайтове и структурирани данни|
|[Библиотека за плащане](/architecture/payment-library)|Интегриране на плащания с множество доставчици|
|[Библиотека със съдържание](/architecture/content-library)|CMS канал за съдържание, базиран на Git|
|[Редакторска система](/architecture/editor-system)|Tiptap интегриране на редактор с богат текст|
|[Mapper Patterns](/architecture/mapper-patterns)|Трансформация на данни между слоевете|
|[Граници на грешка](/архитектура/граници-на-грешка)|Обработка на грешки и възстановяване|
|[Аналитичен слой](/architecture/analytics-layer)|Проследяване на събития и канал за анализ|
|[Swagger System](/architecture/swagger-system)|Генериране на OpenAPI документация|

## Къде да отида след това

- **Нов сте в проекта?** Започнете с [Getting Started](/getting-started), за да инсталирате и стартирате шаблона.
- **Готови ли сте за персонализиране?** Преминете към раздела [Ръководства](/guides) за уроци стъпка по стъпка.
- **Искате пълния технически инвентар?** Вижте [Tech Stack](/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
