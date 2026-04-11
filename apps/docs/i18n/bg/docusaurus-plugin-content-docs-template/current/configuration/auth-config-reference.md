---
id: auth-config-reference
title: Справочник за Конфигурация на Auth.js
sidebar_label: Справочник Auth Config
sidebar_position: 11
---

# Справочник за Конфигурация на Auth.js

Тази страница документира конфигурацията на NextAuth (Auth.js), дефинирана в `auth.config.ts`. Този файл настройва доставчиците на удостоверяване, стратегията за сесии и обработката на грешки за шаблона.

## Обзор

Шаблонът поддържа множество стратегии за удостоверяване чрез унифицирана конфигурация:

- **NextAuth (Auth.js)** — удостоверяване чрез OAuth и идентификационни данни
- **Supabase Auth** — нативно удостоверяване на Supabase
- **И двете** — режим с двоен доставчик за максимална гъвкавост

Файлът `auth.config.ts` конфигурира страната на NextAuth от тази система.

## Конфигурационен файл

Коренният `auth.config.ts` експортира обект `NextAuthConfig`:

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
    // Резервен вариант — само идентификационни данни при неуспех на OAuth
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

## Ключови свойства

### `trustHost`

Задайте стойност `true`, за да доверявате на хедъра на хоста при работа зад обратен прокси (като Vercel). Това е необходимо за правилно генериране на URL за пренасочване в производствени среди.

### `providers`

Масивът с доставчици се изгражда динамично въз основа на това кои OAuth доставчици имат конфигурирани валидни идентификационни данни. Функцията `configureProviders()`:

1. Извиква `configureOAuthProviders()` за валидиране на променливите на средата
2. Съпоставя всеки активиран доставчик с конфигурацията му за NextAuth
3. Винаги включва доставчика на идентификационни данни като резервен вариант

## Поддържани доставчици

| Доставчик | Необходими променливи на средата | Бележки |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Свързването на акаунти по имейл е деактивирано по подразбиране |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Стандартен OAuth поток |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | Стандартен OAuth поток |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | OAuth 2.0 поток |
| Credentials | Няма (винаги активирана) | Удостоверяване с имейл/парола |

## Архитектура на доставчиците

Конвейерът за създаване на доставчици включва няколко файла, работещи заедно.

### Фабрика за доставчици (`lib/auth/providers.ts`)

Функцията `createNextAuthProviders` съпоставя конфигурационни обекти с реални инстанции на доставчиците на NextAuth:

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

  // Подобни блокове за GitHub, Facebook, Twitter...

  if (config.credentials?.enabled) {
    providers.push(credentialsProvider);
  }

  return providers;
}
```

### Обработчик на грешки при удостоверяване (`lib/auth/error-handler.ts`)

Обработчикът на грешки при удостоверяване валидира променливите на средата и предоставя разбираеми съобщения за грешки:

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

## Плавна деградация

Ключов принцип на проектирането е плавната деградация. При сбой на конфигурацията на OAuth при стартиране:

1. Грешката се улавя като структуриран `AppError` с тип `CONFIG` и код `OAUTH_CONFIG_FAILED`
2. Грешката се записва в журнал с контекст `"Auth Config"`
3. Системата преминава към удостоверяване само с идентификационни данни
4. Приложението продължава да стартира нормално

Това означава, че неправилно конфигуриран секрет на Google OAuth няма да попречи на стартирането на цялото приложение — потребителите пак могат да влязат с имейл и парола.

## Частично конфигурирани доставчици

Когато даден доставчик има зададени само някои от необходимите променливи на средата, се записва предупреждение:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

Това помага за идентифициране на проблеми с конфигурацията, без да срива приложението.

## Необходими променливи на средата

Минималната конфигурация за работа на NextAuth:

```env
# Задължително за всички конфигурации на NextAuth
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# По избор: добавете идентификационни данни на доставчика за активиране на OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Генериране на `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Свързани ресурси

- [Конфигурация на Доставчика](/template/configuration/provider-config) — избор между NextAuth, Supabase или и двете
- [Справочник за Средата](/template/configuration/environment-reference) — пълен списък с променливи на средата
- [Модели на обработка на грешки](/template/guides/error-handler-patterns) — структура на грешките при удостоверяване
