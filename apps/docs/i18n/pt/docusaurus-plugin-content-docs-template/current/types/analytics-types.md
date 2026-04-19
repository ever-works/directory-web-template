---
id: analytics-types
title: Definições de tipo de análise
sidebar_label: Tipos de análise
sidebar_position: 16
---

# Definições de tipo de análise

**Fonte:** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

Os tipos de análise configuram provedores de rastreamento e definem as estruturas de dados para métricas de engajamento, visualizações de páginas e estatísticas de painel.

## Tipos de configuração do provedor

### `AnalyticsConfig`

Configuração analítica de nível superior, inferida do esquema Zod.

```typescript
interface AnalyticsConfig {
  exceptionTrackingProvider: 'posthog' | 'sentry' | 'none';
  analyze: boolean;
  posthog: PostHogConfig;
  sentry: SentryConfig;
  recaptcha: RecaptchaConfig;
  vercel: VercelAnalyticsConfig;
}
```

### Configuração PostHog

```typescript
interface PostHogConfig {
  enabled: boolean;                   // Auto-detected from key presence
  key?: string;                        // NEXT_PUBLIC_POSTHOG_KEY
  host: string;                        // Default: 'https://us.i.posthog.com'
  debug: boolean;
  sessionRecordingEnabled: boolean;    // Default: true
  autoCapture: boolean;                // Default: false
  exceptionTracking: boolean;          // Default: true
  personalApiKey?: string;             // Server-side API key for admin
  projectId?: string;                  // PostHog project identifier
}
```

|Campo|Padrão|Descrição|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|Ponto de extremidade de ingestão PostHog|
|`sessionRecordingEnabled`|`true`|Capturar replays de sessão|
|`autoCapture`|`false`|Rastreie automaticamente cliques, visualizações de página, etc.|
|`exceptionTracking`|`true`|Encaminhar exceções JS para PostHog|

### Configuração de Sentinela

```typescript
interface SentryConfig {
  enabled: boolean;           // Auto-detected from DSN presence
  dsn?: string;
  org?: string;
  project?: string;
  authToken?: string;
  enableDev: boolean;         // Default: false
  debug: boolean;             // Default: false
  exceptionTracking: boolean; // Default: true
}
```

### Configuração de recaptcha

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Configuração do Vercel Analytics

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## Constantes de rastreamento do visualizador

Definido em `lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

Essas constantes alimentam o sistema anônimo de contagem de visualizações. Cada visitante recebe um cookie persistente usado para desduplicar as contagens de visualizações diárias sem exigir autenticação.

## Esquema de banco de dados: envolvimento

A tabela `engagement` em `lib/db/schema.ts` rastreia análises em nível de item:

```typescript
// Key columns from the engagement table
{
  id: serial,
  itemId: text,             // Item slug or ID
  viewCount: integer,       // Total page views
  uniqueViewCount: integer, // Unique daily viewers
  clickCount: integer,      // Outbound link clicks
  shareCount: integer,      // Social share actions
  lastViewedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

## Esquema de banco de dados: logs de atividades

A tabela `activityLogs` registra ações de usuários e administradores:

```typescript
{
  id: serial,
  userId: text,        // FK -> users.id (admin actions)
  clientId: text,      // FK -> clientProfiles.id (client actions)
  action: text,        // Action identifier string
  timestamp: timestamp,
  ipAddress: varchar(45),
}
```

## Seleção de provedor de rastreamento de exceções

O campo `exceptionTrackingProvider` determina qual serviço recebe exceções não tratadas:

|Valor|Comportamento|
|-------|-----------|
|`posthog`|Exceções enviadas ao PostHog (padrão)|
|`sentry`|Exceções enviadas ao Sentry|
|`none`|Sem encaminhamento de exceção|

## Exemplo de uso

```typescript
import { analyticsConfig } from '@/lib/config/config-service';

// Check if PostHog is configured
if (analyticsConfig.posthog.enabled) {
  // Initialise PostHog client
}

// Check exception tracking provider
if (analyticsConfig.exceptionTrackingProvider === 'sentry') {
  // Initialise Sentry
}
```

## Tipos Relacionados

- [Tipos de configuração](./config-types.md) -- `AppConfigSchema` contendo `AnalyticsConfig`
- [Configuração/Análise](../configuration/analytics-config.md) – referência de variável de ambiente
