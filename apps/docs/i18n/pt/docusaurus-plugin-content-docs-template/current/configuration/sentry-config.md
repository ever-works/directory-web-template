---
id: sentry-config
title: Configuração do Sentry
sidebar_label: Conf. do Sentry
sidebar_position: 10
---

# Configuração do Sentry

Esta página documenta a integração do Sentry para rastreamento de erros, monitoramento de desempenho e replay de sessão no template. A configuração está dividida em três arquivos: `sentry.config.ts` (plugin webpack), `instrumentation.ts` (inicialização no servidor) e `instrumentation-client.ts` (inicialização no cliente).

## Visão Geral

O template usa o SDK `@sentry/nextjs` para capturar erros e dados de desempenho tanto no servidor quanto no cliente. O Sentry é totalmente opcional -- se nenhum DSN estiver configurado, toda a inicialização do Sentry é ignorada.

## Configuração do Plugin Webpack

O arquivo `sentry.config.ts` na raiz do projeto configura o plugin webpack do Sentry usado durante a build:

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

### Opções do Plugin

| Opção | Padrão | Descrição |
|-------|---------|-----------|
| `silent` | `true` | Suprime a saída do console do plugin webpack durante as builds |
| `org` | variável de ambiente `SENTRY_ORG` | O slug da sua organização Sentry |
| `project` | variável de ambiente `SENTRY_PROJECT` | O slug do seu projeto Sentry |
| `widenClientFileUpload` | `true` | Faz upload de um conjunto maior de arquivos de origem do lado do cliente para melhores stack traces |
| `transpileClientSDK` | `true` | Transpila o SDK do Sentry para maior compatibilidade com navegadores |
| `tunnelRoute` | `"/monitoring"` | Faz proxy das requisições Sentry pela sua app para evitar bloqueadores de anúncios |
| `hideSourceMaps` | `true` | Impede que os source maps sejam publicamente acessíveis em produção |
| `disableLogger` | `true` | Desativa o logger do Sentry para reduzir o tamanho do bundle |

### Integração com Configuração Next.js

As opções do plugin são consumidas em `next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## Variáveis de Ambiente

O Sentry depende dessas variáveis de ambiente, definidas em `lib/constants.ts`:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| Variável | Obrigatória | Descrição |
|----------|----------|-----------|
| `NEXT_PUBLIC_SENTRY_DSN` | Não | O DSN do Sentry (Data Source Name). Se não definido, o Sentry está desabilitado. |
| `SENTRY_ORG` | Não | Slug da organização Sentry para uploads de source map |
| `SENTRY_PROJECT` | Não | Slug do projeto Sentry para uploads de source map |
| `SENTRY_AUTH_TOKEN` | Não | Token de autenticação para upload de source maps durante as builds |
| `SENTRY_ENABLE_DEV` | Não | Defina como `"true"` para habilitar o Sentry no modo de desenvolvimento |
| `SENTRY_DEBUG` | Não | Defina como `"true"` para habilitar o logging de debug do SDK do Sentry |

## Inicialização no Servidor

O Sentry no servidor é inicializado em `instrumentation.ts`, que é executado uma vez quando o servidor Next.js inicia:

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

### Taxas de Amostragem do Servidor

- **Produção:** amostragem de rastreamento a 10% (`0.1`) para equilibrar custo e visibilidade
- **Desenvolvimento:** amostragem de rastreamento a 100% (`1.0`) para visibilidade total de depuração

### Relatório de Erros

Falhas de inicialização do banco de dados são reportadas ao Sentry com tags contextuais:

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

## Inicialização no Cliente

O Sentry no cliente é inicializado em `instrumentation-client.ts`:

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

### Recursos do Cliente

O **Replay de Sessão** está configurado com padrões focados em privacidade:

- `maskAllText: true` -- Todo o conteúdo de texto é mascarado nos replays
- `blockAllMedia: true` -- Todos os elementos de mídia são bloqueados nos replays
- Replays de erros são capturados a 100% (`replaysOnErrorSampleRate: 1.0`)
- Replays de sessão gerais são capturados a 10% em produção

As **Transições de Rota** são instrumentadas via `onRouterTransitionStart` para rastrear o desempenho de navegação de páginas.

## Rota Túnel

A opção `tunnelRoute: "/monitoring"` faz proxy das transmissões de eventos Sentry pela sua aplicação no endpoint `/monitoring`. Isso ajuda a contornar bloqueadores de anúncios e políticas de segurança de conteúdo que podem bloquear requisições diretas aos servidores do Sentry.

## Resumo das Taxas de Amostragem

| Métrica | Desenvolvimento | Produção |
|---------|----------------|----------|
| Taxa de amostragem de rastreamento (servidor) | 100% | 10% |
| Taxa de amostragem de rastreamento (cliente) | 100% | 10% |
| Taxa de replay de erros | 100% | 100% |
| Taxa de replay de sessão | 100% | 10% |

## Habilitando o Sentry

Para habilitar o Sentry na sua implantação:

1. Crie um projeto Sentry em [sentry.io](https://sentry.io)
2. Defina as variáveis de ambiente necessárias:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. Para desenvolvimento, defina também:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## Recursos Relacionados

- [Guia de Instrumentação](/template/guides/instrumentation) -- Documentação completa do ciclo de vida da instrumentação
- [Padrões de Tratamento de Erros](/template/guides/error-handler-patterns) -- Como os erros são estruturados e registrados
- [Referência de Ambiente](/template/configuration/environment-reference) -- Todas as variáveis de ambiente
