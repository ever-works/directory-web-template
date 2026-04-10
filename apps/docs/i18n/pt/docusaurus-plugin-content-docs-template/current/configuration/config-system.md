---
id: config-system
title: Sistema de Configuração
sidebar_label: Sistema de Configuração
sidebar_position: 0
---

# Sistema de Configuração

O template Ever Works utiliza um sistema de configuração centralizado e type-safe construído com esquemas de validação Zod. Todas as variáveis de ambiente são validadas na inicialização da aplicação, fornecendo feedback imediato sobre configurações ausentes ou inválidas. O sistema suporta tanto segredos apenas do servidor quanto variáveis públicas seguras para o cliente.

## Arquitetura

```
lib/config/
  config-service.ts        # Singleton ConfigService centralizado
  client.ts                # Configuração segura para cliente (NEXT_PUBLIC_*)
  env.ts                   # Schema env legado (configuração de API)
  server-config.ts         # Helpers de servidor depreciados (use ConfigService)
  feature-flags.ts         # Flags de disponibilidade de funcionalidades
  index.ts                 # Barrel export
  types.ts                 # Definições de tipos TypeScript
  schemas/
    index.ts               # Barrel export de schemas
    core.schema.ts         # URLs, info do site, banco de dados, conteúdo
    auth.schema.ts         # Segredos auth, provedores OAuth, JWT, cookies
    email.schema.ts        # SMTP, Resend, configuração Novu
    payment.schema.ts      # Stripe, LemonSqueezy, Polar, preços
    analytics.schema.ts    # PostHog, Sentry, Vercel Analytics, Recaptcha
    integrations.schema.ts # Trigger.dev, Twenty CRM, Cron
  billing/
    index.ts               # Barrel de configuração de faturamento
    stripe.config.ts       # Configuração específica do Stripe
    lemonsqueezy.config.ts # Configuração do LemonSqueezy
    polar.config.ts        # Configuração do Polar
    solidgate.config.ts    # Configuração do Solidgate
    types.ts               # Tipos de faturamento
  utils/
    env-parser.ts          # Utilitários de análise de variáveis de ambiente
    validation-logger.ts   # Formatação e logging de resultados de validação
```

## Singleton ConfigService

O núcleo do sistema de configuração é a classe `ConfigService` em `lib/config/config-service.ts`. Ela:

1. Coleta todas as variáveis de ambiente por meio de funções coletoras
2. Valida-as contra um esquema Zod combinado
3. Armazena a configuração validada como um singleton
4. Fornece getters tipados para cada seção de configuração

```typescript
import { configService } from '@/lib/config';

// Acessar seções específicas
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### Exportações de Seção

Para tree-shaking e conveniência, seções individuais também são exportadas diretamente:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// Acesso direto sem prefixo ConfigService
const dbUrl = coreConfig.DATABASE_URL;
```

### Aplicação Apenas do Servidor

O módulo `ConfigService` importa `'server-only'`, o que significa:

- Ele só pode ser usado em Server Components, rotas de API e código server-side
- Tentar importá-lo em um Client Component produzirá um erro de build
- Isso previne a exposição acidental de segredos como chaves de API

## Configuração do Cliente (`lib/config/client.ts`)

A configuração segura para o cliente está em um módulo separado que lê apenas variáveis `NEXT_PUBLIC_*`:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// Branding do site
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // Links de redes sociais
siteConfig.attribution // Atribuição "Built with"

// Preços
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// Ambiente
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

Este módulo é seguro para importar em qualquer componente, incluindo código do lado do cliente.

## Esquemas de Validação

Cada seção de configuração tem um esquema Zod dedicado em `lib/config/schemas/`:

### Esquema Core (`core.schema.ts`)

Valida: `NODE_ENV`, `APP_URL`, `SITE_URL`, `API_BASE_URL`, `DATABASE_URL`, metadados do site (nome, tagline, descrição, palavras-chave, logo), links sociais, tema de imagem OG, atribuição e configurações do repositório de conteúdo.

### Esquema Auth (`auth.schema.ts`)

Valida: `AUTH_SECRET`, `COOKIE_SECRET`, configurações de expiração de token JWT, configuração de cookies, credenciais de provedor OAuth (Google, GitHub, Microsoft, Facebook, X/Twitter, LinkedIn), configuração Supabase e credenciais de usuário seed.

### Esquema de Email (`email.schema.ts`)

Valida: `EMAIL_PROVIDER` (resend/novu), `EMAIL_FROM`, `EMAIL_SUPPORT`, `COMPANY_NAME`, configurações SMTP (host, porta, usuário, senha), chave API Resend e chave API Novu.

### Esquema de Pagamento (`payment.schema.ts`)

Valida: Stripe (chave secreta, chave publicável, segredo webhook, IDs de preço, precificação dinâmica, multi-moeda), LemonSqueezy (chave API, ID da loja, webhook, IDs de variante), Polar (token de acesso, webhook, organização, IDs de plano), preços de produto, valores de teste.

### Esquema de Análise (`analytics.schema.ts`)

Valida: PostHog (chave, host, debug, gravação de sessão, auto-capture, chave API pessoal, ID do projeto), Sentry (DSN, organização, projeto, token auth, debug), Vercel Analytics, Recaptcha (chave do site, chave secreta), provedor de rastreamento de exceções.

### Esquema de Integrações (`integrations.schema.ts`)

Valida: Trigger.dev (habilitado, chave API, URL, ambiente), Twenty CRM (URL base, chave API, habilitado, modo de sincronização), Cron (segredo).

## Comportamento de Validação

O sistema de validação usa `.catch()` do Zod para degradação controlada:

```typescript
// De integrations.schema.ts
export const twentyCrmConfigSchema = z
  .object({
    baseUrl: z.string().url().optional().catch(undefined),
    apiKey: z.string().optional(),
    enabled: z.boolean().default(false),
    syncMode: twentyCrmSyncModeSchema,
  })
  .transform((data) => ({
    ...data,
    enabled: data.enabled ?? Boolean(data.baseUrl && data.apiKey),
  }));
```

- **Campos opcionais** com `.catch()` se recuperam com valores padrão
- **Campos obrigatórios** sem `.catch()` causam falha na inicialização
- **Etapas de transformação** calculam valores derivados (como detecção automática do estado habilitado)

Os resultados da validação são registrados na inicialização via `validation-logger.ts`, mostrando quais integrações estão ativas e avisos sobre configuração opcional ausente.

## Flags de Funcionalidade (`lib/config/feature-flags.ts`)

Os flags de funcionalidade fornecem um mecanismo simples para habilitar/desabilitar funcionalidades dependentes do banco de dados:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // Renderizar seção de comentários
}
```

Todos os flags de funcionalidade estão atualmente vinculados à disponibilidade de `DATABASE_URL`. Quando nenhum banco de dados está configurado, as funcionalidades interativas são desabilitadas enquanto o diretório continua servindo conteúdo estático.

## Migração da Configuração Legada

O módulo `server-config.ts` contém funções helper depreciadas. Caminhos de migração:

| Depreciado | Substituto |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## Arquivos Relacionados

- `lib/config/config-service.ts` -- Singleton ConfigService
- `lib/config/client.ts` -- Configuração segura para cliente
- `lib/config/schemas/*.schema.ts` -- Esquemas de validação Zod
- `lib/config/feature-flags.ts` -- Flags de funcionalidade
- `lib/config/types.ts` -- Definições de tipos TypeScript
- `.env.example` -- Referência completa de variáveis de ambiente
