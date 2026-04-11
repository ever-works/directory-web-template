---
id: sentry-config
title: Конфигурация на Sentry
sidebar_label: Конф. на Sentry
sidebar_position: 10
---

# Конфигурация на Sentry

Тази страница документира интеграцията на Sentry за проследяване на грешки, мониторинг на производителността и повторение на сесии в шаблона. Конфигурацията е разделена на три файла: `sentry.config.ts` (webpack плъгин), `instrumentation.ts` (инициализация от страна на сървъра) и `instrumentation-client.ts` (инициализация от страна на клиента).

## Преглед

Шаблонът използва SDK `@sentry/nextjs` за улавяне на грешки и данни за производителността както на сървъра, така и на клиента. Sentry е изцяло незадължителен -- ако не е конфигуриран DSN, цялата инициализация на Sentry се пропуска.

## Конфигурация на Webpack Плъгина

Файлът `sentry.config.ts` в основната директория на проекта конфигурира webpack плъгина на Sentry, използван по време на изграждането:

```ts
export const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "your-org-name",
  project: process.env.SENTRY_PROJECT || "your-project-name",

  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
};
```

### Опции на Плъгина

| Опция | По подразбиране | Описание |
|-------|---------|---------|
| `silent` | `true` | Потиска изхода на конзолата на webpack плъгина по време на изграждане |
| `org` | променлива на средата `SENTRY_ORG` | Вашият slug на организация в Sentry |
| `project` | променлива на средата `SENTRY_PROJECT` | Вашият slug на проект в Sentry |
| `widenClientFileUpload` | `true` | Качва по-широк набор от клиентски файлове с изходен код за по-добри трасировки на стека |
| `transpileClientSDK` | `true` | Транспилира SDK на Sentry за по-широка съвместимост с браузъри |
| `tunnelRoute` | `"/monitoring"` | Проксира заявките на Sentry чрез вашето приложение, за да избегне блокери на реклами |
| `hideSourceMaps` | `true` | Предотвратява публичния достъп до source map-ове в продукция |
| `disableLogger` | `true` | Деактивира логъра на Sentry за намаляване на размера на bundle |

### Интеграция с Конфигурацията на Next.js

Опциите на плъгина се използват в `next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## Променливи на Средата

Sentry разчита на следните променливи на средата, дефинирани в `lib/constants.ts`:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| Променлива | Задължителна | Описание |
|------------|----------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Не | DSN на Sentry (Data Source Name). Ако не е зададен, Sentry е деактивиран. |
| `SENTRY_ORG` | Не | Slug на организацията в Sentry за качване на source map |
| `SENTRY_PROJECT` | Не | Slug на проекта в Sentry за качване на source map |
| `SENTRY_AUTH_TOKEN` | Не | Токен за удостоверяване за качване на source map по време на изграждане |
| `SENTRY_ENABLE_DEV` | Не | Задайте `"true"` за активиране на Sentry в режим на разработка |
| `SENTRY_DEBUG` | Не | Задайте `"true"` за активиране на debug логване на SDK на Sentry |

## Инициализация от Страна на Сървъра

Sentry от страна на сървъра се инициализира в `instrumentation.ts`, което се изпълнява веднъж при стартиране на сървъра Next.js:

```ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_DEBUG } from "@/lib/constants";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Only initialize Sentry if DSN is configured
  if (SENTRY_DSN.value) {
    Sentry.init({
      dsn: SENTRY_DSN.value,
      tracesSampleRate:
        process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: SENTRY_DEBUG.value === "true",
    });
  }

  // Database initialization follows...
}

// Capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
```

### Честоти на Извадка за Сървър

- **Продукция:** 10% честота на извадка на трасировки (`0.1`) за баланс между разходи и видимост
- **Разработка:** 100% честота на извадка на трасировки (`1.0`) за пълна видимост при отстраняване на грешки

### Докладване на Грешки

Грешките при инициализация на базата данни се докладват на Sentry с контекстуални тагове:

```ts
if (SENTRY_DSN.value) {
  Sentry.captureException(error, {
    tags: {
      component: "instrumentation",
      phase: "database_init",
      environment:
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        "unknown",
    },
  });
}
```

## Инициализация от Страна на Клиента

Sentry от страна на клиента се инициализира в `instrumentation-client.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
import { Replay } from "@sentry/replay";
import {
  SENTRY_DSN,
  SENTRY_DEBUG,
  SENTRY_ENABLED,
} from "@/lib/constants";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || !SENTRY_ENABLED)
    return;

  Sentry.init({
    dsn: SENTRY_DSN.value,
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: SENTRY_DEBUG.value === "true",

    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      new Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Router transition instrumentation
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
```

### Функции от Страна на Клиента

**Повторение на Сесии** е конфигурирано с настройки по подразбиране, ориентирани към поверителност:

- `maskAllText: true` -- Цялото текстово съдържание е маскирано в повторенията
- `blockAllMedia: true` -- Всички медийни елементи са блокирани в повторенията
- Повторенията на грешки се улавят на 100% (`replaysOnErrorSampleRate: 1.0`)
- Общите повторения на сесии се улавят на 10% в продукция

**Преходите на Рутера** се инструментират чрез `onRouterTransitionStart` за проследяване на производителността на навигацията между страниците.

## Тунелен Маршрут

Опцията `tunnelRoute: "/monitoring"` проксира изпращанията на събития на Sentry чрез вашето приложение на крайната точка `/monitoring`. Това помага да се заобиколят блокерите на реклами и политиките за сигурност на съдържанието, които биха могли да блокират директните заявки към сървърите на Sentry.

## Обобщение на Честотите на Извадка

| Метрика | Разработка | Продукция |
|---------|-----------|----------|
| Честота на извадка на трасировки (сървър) | 100% | 10% |
| Честота на извадка на трасировки (клиент) | 100% | 10% |
| Честота на повторение на грешки | 100% | 100% |
| Честота на повторение на сесии | 100% | 10% |

## Активиране на Sentry

За активиране на Sentry в разгръщането ви:

1. Създайте проект в Sentry на [sentry.io](https://sentry.io)
2. Задайте необходимите променливи на средата:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. За разработка задайте също:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## Свързани Ресурси

- [Ръководство за инструментиране](/template/guides/instrumentation) -- Пълна документация на жизнения цикъл на инструментирането
- [Модели за обработка на грешки](/template/guides/error-handler-patterns) -- Как грешките се структурират и регистрират
- [Справочник за средата](/template/configuration/environment-reference) -- Всички променливи на средата
