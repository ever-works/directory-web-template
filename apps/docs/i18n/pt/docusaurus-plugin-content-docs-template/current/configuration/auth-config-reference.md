---
id: auth-config-reference
title: Referência de Configuração Auth.js
sidebar_label: Referência de Configuração Auth
sidebar_position: 11
---

# Referência de Configuração Auth.js

Esta página documenta a configuração NextAuth (Auth.js) definida em `auth.config.ts`. Este arquivo configura provedores de autenticação, estratégia de sessão e tratamento de erros para o template.

## Visão Geral

O template suporta múltiplas estratégias de autenticação por meio de uma configuração unificada:

- **NextAuth (Auth.js)** -- Autenticação baseada em OAuth e credenciais
- **Supabase Auth** -- Autenticação nativa do Supabase
- **Ambos** -- Modo dual-provedor para máxima flexibilidade

O arquivo `auth.config.ts` configura especificamente o lado NextAuth deste sistema.

## Arquivo de Configuração

O arquivo root `auth.config.ts` exporta um objeto `NextAuthConfig`:

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

## Propriedades Principais

### `trustHost`

Definido como `true` para confiar no cabeçalho do host ao executar atrás de um proxy reverso (como o Vercel). Isso é necessário para a geração correta de URLs de redirecionamento em ambientes de produção.

### `providers`

O array de provedores é construído dinamicamente com base em quais provedores OAuth têm credenciais configuradas válidas. A função `configureProviders()`:

1. Chama `configureOAuthProviders()` para validar variáveis de ambiente
2. Mapeia cada provedor habilitado para sua configuração de provedor NextAuth
3. Sempre inclui o provedor de credenciais como fallback

## Provedores Suportados

| Provedor | Variáveis de Ambiente Necessárias | Notas |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Vinculação de conta por e-mail desabilitada por padrão |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Fluxo OAuth padrão |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | Fluxo OAuth padrão |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | Fluxo OAuth 2.0 |
| Credentials | Nenhuma (sempre habilitado) | Autenticação por e-mail/senha |

## Arquitetura do Provedor

O pipeline de criação de provedores envolve vários arquivos trabalhando juntos.

### Factory do Provedor (`lib/auth/providers.ts`)

A função `createNextAuthProviders` mapeia objetos de configuração para instâncias reais de provedores NextAuth:

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
```

### Manipulador de Erros Auth (`lib/auth/error-handler.ts`)

O manipulador de erros auth valida variáveis de ambiente e fornece mensagens de erro legíveis:

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

## Degradação Controlada

Um princípio de design fundamental é a degradação controlada. Se a configuração OAuth falhar na inicialização:

1. O erro é capturado como um `AppError` estruturado com tipo `CONFIG` e código `OAUTH_CONFIG_FAILED`
2. O erro é registrado com o contexto `"Auth Config"`
3. O sistema recorre à autenticação somente por credenciais
4. A aplicação continua iniciando normalmente

Isso significa que um segredo OAuth do Google mal configurado não impedirá que toda a aplicação seja executada -- os usuários ainda podem fazer login com e-mail e senha.

## Provedores Parcialmente Configurados

Quando um provedor tem algumas, mas não todas as variáveis de ambiente necessárias, um aviso é registrado:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

Isso ajuda a identificar problemas de configuração sem travar a aplicação.

## Variáveis de Ambiente Necessárias

Configure no mínimo estas variáveis para o NextAuth funcionar:

```env
# Necessário para todas as configurações NextAuth
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Opcional: adicionar credenciais do provedor para habilitar OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Gere `AUTH_SECRET` usando:

```bash
openssl rand -base64 32
```

## Recursos Relacionados

- [Configuração do Provedor](/template/configuration/provider-config) -- Escolhendo entre NextAuth, Supabase ou ambos
- [Referência de Ambiente](/template/configuration/environment-reference) -- Listagem completa de variáveis de ambiente
- [Padrões de Tratamento de Erros](/template/guides/error-handler-patterns) -- Como os erros auth são estruturados
