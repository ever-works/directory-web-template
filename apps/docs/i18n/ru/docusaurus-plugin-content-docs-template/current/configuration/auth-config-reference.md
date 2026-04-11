---
id: auth-config-reference
title: Справочник по Конфигурации Auth.js
sidebar_label: Справочник Auth Config
sidebar_position: 11
---

# Справочник по Конфигурации Auth.js

На этой странице описана конфигурация NextAuth (Auth.js), определённая в `auth.config.ts`. Этот файл настраивает провайдеры аутентификации, стратегию сессий и обработку ошибок для шаблона.

## Обзор

Шаблон поддерживает несколько стратегий аутентификации через унифицированную конфигурацию:

- **NextAuth (Auth.js)** — аутентификация через OAuth и учётные данные
- **Supabase Auth** — нативная аутентификация Supabase
- **Оба** — двойной режим провайдера для максимальной гибкости

Файл `auth.config.ts` настраивает сторону NextAuth этой системы.

## Файл конфигурации

Корневой файл `auth.config.ts` экспортирует объект `NextAuthConfig`:

```ts
import { NextAuthConfig } from "next-auth";
import { createNextAuthProviders } from "./lib/auth/providers";
import {
  configureOAuthProviders,
  logError,
} from "./lib/auth/error-handler";
import {
  ErrorType,
  createAppError,
} from "./lib/utils/error-handler";
import { authConfig } from "@/lib/config/config-service";

const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === "google")
        ? {
            enabled: true,
            clientId: authConfig.google.clientId || "",
            clientSecret: authConfig.google.clientSecret || "",
            options: {
              allowDangerousEmailAccountLinking: false,
            },
          }
        : { enabled: false },
      github: oauthProviders.find((p) => p.id === "github")
        ? {
            enabled: true,
            clientId: authConfig.github.clientId || "",
            clientSecret: authConfig.github.clientSecret || "",
          }
        : { enabled: false },
      facebook: oauthProviders.find((p) => p.id === "facebook")
        ? {
            enabled: true,
            clientId: authConfig.facebook.clientId || "",
            clientSecret: authConfig.facebook.clientSecret || "",
          }
        : { enabled: false },
      twitter: oauthProviders.find((p) => p.id === "twitter")
        ? {
            enabled: true,
            clientId: authConfig.twitter.clientId || "",
            clientSecret: authConfig.twitter.clientSecret || "",
          }
        : { enabled: false },
      credentials: {
        enabled: true,
      },
    });
  } catch (error) {
    // Резервный вариант — только учётные данные при сбое OAuth
    const appError = createAppError(
      "Failed to configure OAuth providers. Falling back to credentials only.",
      ErrorType.CONFIG,
      "OAUTH_CONFIG_FAILED",
      error
    );
    logError(appError, "Auth Config");

    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      github: { enabled: false },
      facebook: { enabled: false },
      twitter: { enabled: false },
    });
  }
};

export default {
  trustHost: true,
  providers: configureProviders(),
} satisfies NextAuthConfig;
```

## Ключевые свойства

### `trustHost`

Установите значение `true`, чтобы доверять заголовку хоста при работе за обратным прокси (например, Vercel). Это необходимо для корректной генерации URL перенаправления в производственных средах.

### `providers`

Массив провайдеров строится динамически на основе того, у каких OAuth-провайдеров настроены действительные учётные данные. Функция `configureProviders()`:

1. Вызывает `configureOAuthProviders()` для проверки переменных окружения
2. Сопоставляет каждый включённый провайдер с конфигурацией провайдера NextAuth
3. Всегда добавляет провайдер учётных данных как резервный вариант

## Поддерживаемые провайдеры

| Провайдер | Необходимые переменные окружения | Примечания |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Связывание аккаунтов по email отключено по умолчанию |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Стандартный OAuth поток |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | Стандартный OAuth поток |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | Поток OAuth 2.0 |
| Credentials | Нет (всегда включён) | Аутентификация по email/паролю |

## Архитектура провайдеров

Конвейер создания провайдеров включает несколько файлов, работающих совместно.

### Фабрика провайдеров (`lib/auth/providers.ts`)

Функция `createNextAuthProviders` сопоставляет объекты конфигурации с реальными экземплярами провайдеров NextAuth:

```ts
export function createNextAuthProviders(
  config: OAuthProvidersConfig = defaultOAuthProvidersConfig
) {
  const providers = [];

  if (
    config.google?.enabled &&
    config.google.clientId &&
    config.google.clientSecret
  ) {
    providers.push(
      GoogleProvider({
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        ...config.google.options,
      })
    );
  }

  // Аналогичные блоки для GitHub, Facebook, Twitter...

  if (config.credentials?.enabled) {
    providers.push(credentialsProvider);
  }

  return providers;
}
```

### Обработчик ошибок Auth (`lib/auth/error-handler.ts`)

Обработчик ошибок аутентификации проверяет переменные окружения и предоставляет понятные сообщения об ошибках:

```ts
export function validateAuthConfig() {
  const baseNextAuthVars = ["AUTH_SECRET", "NEXT_PUBLIC_APP_URL"];

  const providerEnvVars = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    facebook: ["FB_CLIENT_ID", "FB_CLIENT_SECRET"],
    microsoft: [
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
    ],
    supabase: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
  };

  // Проверить, у каких провайдеров есть все необходимые переменные
  const enabledProviders: Record<string, boolean> = {};

  Object.entries(providerEnvVars).forEach(([provider, vars]) => {
    const hasAllVars = vars.every(
      (varName) => !!process.env[varName]?.trim()
    );
    enabledProviders[provider] = hasAllVars;
  });

  return enabledProviders;
}
```

## Плавная деградация

Ключевым принципом дизайна является плавная деградация. При сбое конфигурации OAuth при запуске:

1. Ошибка фиксируется как структурированный `AppError` с типом `CONFIG` и кодом `OAUTH_CONFIG_FAILED`
2. Ошибка записывается в журнал с контекстом `"Auth Config"`
3. Система переходит в режим аутентификации только по учётным данным
4. Приложение продолжает запускаться в штатном режиме

Это означает, что неправильно настроенный секрет Google OAuth не помешает запуску всего приложения — пользователи по-прежнему смогут входить через email и пароль.

## Частично настроенные провайдеры

Если у провайдера заданы некоторые, но не все необходимые переменные окружения, записывается предупреждение:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

Это помогает выявлять проблемы с конфигурацией без сбоя приложения.

## Необходимые переменные окружения

Как минимум настройте следующее для работы NextAuth:

```env
# Обязательно для всех конфигураций NextAuth
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Опционально: добавьте учётные данные провайдера для включения OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Генерация `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Связанные ресурсы

- [Конфигурация Провайдеров](/template/configuration/provider-config) — выбор между NextAuth, Supabase или обоими
- [Справочник по Переменным Окружения](/template/configuration/environment-reference) — полный список переменных окружения
- [Паттерны обработки ошибок](/template/guides/error-handler-patterns) — структура ошибок аутентификации
