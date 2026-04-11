---
id: sentry-config
title: Конфигурация Sentry
sidebar_label: Конф. Sentry
sidebar_position: 10
---

# Конфигурация Sentry

На этой странице описана интеграция Sentry для отслеживания ошибок, мониторинга производительности и повтора сессий в шаблоне. Конфигурация разделена на три файла: `sentry.config.ts` (плагин webpack), `instrumentation.ts` (инициализация на стороне сервера) и `instrumentation-client.ts` (инициализация на стороне клиента).

## Обзор

Шаблон использует SDK `@sentry/nextjs` для захвата ошибок и данных производительности как на сервере, так и на клиенте. Sentry полностью опционален -- если DSN не настроен, вся инициализация Sentry пропускается.

## Конфигурация Плагина Webpack

Файл `sentry.config.ts` в корне проекта настраивает плагин webpack для Sentry, используемый во время сборки:

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

### Параметры Плагина

| Параметр | По умолчанию | Описание |
|----------|---------|----------|
| `silent` | `true` | Подавляет вывод консоли плагина webpack во время сборки |
| `org` | переменная окружения `SENTRY_ORG` | Slug вашей организации Sentry |
| `project` | переменная окружения `SENTRY_PROJECT` | Slug вашего проекта Sentry |
| `widenClientFileUpload` | `true` | Загружает более широкий набор клиентских исходных файлов для лучших трассировок стека |
| `transpileClientSDK` | `true` | Транспилирует SDK Sentry для более широкой совместимости с браузерами |
| `tunnelRoute` | `"/monitoring"` | Проксирует запросы Sentry через ваше приложение для обхода блокировщиков рекламы |
| `hideSourceMaps` | `true` | Предотвращает публичный доступ к source map в продакшене |
| `disableLogger` | `true` | Отключает логгер Sentry для уменьшения размера bundle |

### Интеграция с Конфигурацией Next.js

Параметры плагина используются в `next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## Переменные Окружения

Sentry использует следующие переменные окружения, определённые в `lib/constants.ts`:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| Переменная | Обязательная | Описание |
|------------|----------|----------|
| `NEXT_PUBLIC_SENTRY_DSN` | Нет | DSN Sentry (Data Source Name). Если не задан, Sentry отключён. |
| `SENTRY_ORG` | Нет | Slug организации Sentry для загрузки source map |
| `SENTRY_PROJECT` | Нет | Slug проекта Sentry для загрузки source map |
| `SENTRY_AUTH_TOKEN` | Нет | Токен авторизации для загрузки source map во время сборки |
| `SENTRY_ENABLE_DEV` | Нет | Установите `"true"` для включения Sentry в режиме разработки |
| `SENTRY_DEBUG` | Нет | Установите `"true"` для включения отладочного логирования SDK Sentry |

## Инициализация на Стороне Сервера

Sentry на стороне сервера инициализируется в `instrumentation.ts`, который запускается один раз при старте сервера Next.js:

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

### Частота Дискретизации Сервера

- **Продакшен:** частота дискретизации трассировок 10% (`0.1`) для баланса стоимости и видимости
- **Разработка:** частота дискретизации трассировок 100% (`1.0`) для полной отладочной видимости

### Отчёты об Ошибках

Сбои инициализации базы данных передаются в Sentry с контекстными тегами:

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

## Инициализация на Стороне Клиента

Sentry на стороне клиента инициализируется в `instrumentation-client.ts`:

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

### Функции на Стороне Клиента

**Повтор Сессии** настроен с ориентированными на конфиденциальность значениями по умолчанию:

- `maskAllText: true` -- Всё текстовое содержимое маскируется в повторах
- `blockAllMedia: true` -- Все медиаэлементы блокируются в повторах
- Повторы ошибок захватываются на 100% (`replaysOnErrorSampleRate: 1.0`)
- Общие повторы сессий захватываются на 10% в продакшене

**Переходы Маршрутизатора** инструментируются через `onRouterTransitionStart` для отслеживания производительности навигации по страницам.

## Маршрут Туннеля

Опция `tunnelRoute: "/monitoring"` проксирует передачи событий Sentry через ваше приложение на эндпоинте `/monitoring`. Это помогает обойти блокировщики рекламы и политики безопасности контента, которые могут блокировать прямые запросы к серверам Sentry.

## Сводная Таблица Частоты Дискретизации

| Метрика | Разработка | Продакшен |
|---------|------------|-----------|
| Частота дискретизации трассировок (сервер) | 100% | 10% |
| Частота дискретизации трассировок (клиент) | 100% | 10% |
| Частота повтора ошибок | 100% | 100% |
| Частота повтора сессий | 100% | 10% |

## Включение Sentry

Для включения Sentry в вашем развёртывании:

1. Создайте проект Sentry на [sentry.io](https://sentry.io)
2. Установите необходимые переменные окружения:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. Для разработки также установите:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## Связанные Ресурсы

- [Руководство по Инструментированию](/template/guides/instrumentation) -- Полная документация жизненного цикла инструментирования
- [Паттерны Обработки Ошибок](/template/guides/error-handler-patterns) -- Как ошибки структурируются и логируются
- [Справочник по Окружению](/template/configuration/environment-reference) -- Все переменные окружения
