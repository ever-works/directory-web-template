---
id: provider-config
title: "Configuração de Provedores"
sidebar_label: "Configuração de Provedores"
sidebar_position: 4
---

# Configuração de Provedores

O template usa um singleton `ConfigService` centralizado para gerenciar todos os provedores de serviços externos. Cada provedor é configurado através de esquemas validados com Zod com detecção automática de funcionalidades -- os provedores são habilitados quando suas credenciais necessárias estão presentes.

## Arquitetura do ConfigService

O `ConfigService` em `lib/config/config-service.ts` é um singleton somente no servidor que valida todas as variáveis de ambiente na inicialização:

```ts
import { configService } from '@/lib/config';

// Acessar seções de configuração
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

O serviço é organizado em seis seções, cada uma com seu próprio esquema Zod:

| Seção | Accessor | Arquivo de Esquema |
|-------|----------|--------------------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### Imports Tree-Shakeable

Seções individuais podem ser importadas diretamente para melhor tree-shaking:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### Validação na Inicialização

Toda configuração é validada com Zod na primeira importação. Valores inválidos acionam fallbacks `.catch()` onde possível, enquanto erros verdadeiramente irrecuperáveis são lançados na inicialização:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## Provedores de Autenticação

Definido em `lib/config/schemas/auth.schema.ts`. Provedores OAuth detectam a habilitação automaticamente:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### Provedores OAuth Suportados

| Provedor | Variável Client ID | Variável Client Secret |
|----------|--------------------|------------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### Backend de Auth Supabase

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase |

### Configurações de Auth Adicionais

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `AUTH_SECRET` | -- | Necessário para assinatura de sessão |
| `COOKIE_SECRET` | -- | Segredo de criptografia de cookie |
| `COOKIE_DOMAIN` | `'localhost'` | Domínio do cookie |
| `COOKIE_SECURE` | `false` | Cookies somente HTTPS |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | TTL do token de acesso |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | TTL do token de atualização |

## Provedores de Pagamento

Definido em `lib/config/schemas/payment.schema.ts`. Cada provedor é habilitado automaticamente quando suas credenciais necessárias são definidas.

### Stripe

Habilitado automaticamente quando `secretKey` e `publishableKey` estão presentes:

| Variável | Descrição |
|----------|-----------|
| `STRIPE_SECRET_KEY` | Chave secreta do lado do servidor |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave publicável do lado do cliente |
| `STRIPE_WEBHOOK_SECRET` | Verificação de assinatura de webhook |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | ID de preço para plano gratuito |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | ID de preço para plano padrão |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | ID de preço para plano premium |

### LemonSqueezy

Habilitado automaticamente quando `apiKey` e `storeId` estão presentes:

| Variável | Descrição |
|----------|-----------|
| `LEMONSQUEEZY_API_KEY` | Chave de API |
| `LEMONSQUEEZY_STORE_ID` | Identificador de loja |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Segredo de webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | URL do endpoint de webhook |
| `LEMONSQUEEZY_TEST_MODE` | Habilitar modo de teste (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | ID de variante para plano gratuito |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | ID de variante para plano padrão |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | ID de variante para plano premium |

### Polar

Habilitado automaticamente quando `accessToken` e `organizationId` estão presentes:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `POLAR_ACCESS_TOKEN` | -- | Token de acesso à API |
| `POLAR_ORGANIZATION_ID` | -- | ID da organização |
| `POLAR_WEBHOOK_SECRET` | -- | Segredo de webhook |
| `POLAR_SANDBOX` | `true` | Modo sandbox (defina `'false'` para produção) |
| `POLAR_API_URL` | -- | URL de API personalizada |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | ID do plano para nível gratuito |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | ID do plano para nível padrão |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | ID do plano para nível premium |

### Exibição de Preços do Produto

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | Preço de exibição para plano gratuito |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | Preço de exibição para plano padrão |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | Preço de exibição para plano premium |

## Provedores de Email

Definido em `lib/config/schemas/email.schema.ts`.

### SMTP

Habilitado automaticamente quando `host`, `user` e `password` estão todos presentes:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `SMTP_HOST` | -- | Hostname do servidor SMTP |
| `SMTP_PORT` | `587` | Porta do servidor SMTP |
| `SMTP_USER` | -- | Nome de usuário de autenticação SMTP |
| `SMTP_PASSWORD` | -- | Senha de autenticação SMTP |

### Resend

Habilitado automaticamente quando `apiKey` está presente:

| Variável | Descrição |
|----------|-----------|
| `RESEND_API_KEY` | Chave de API do Resend |

### Novu

Habilitado automaticamente quando `apiKey` está presente:

| Variável | Descrição |
|----------|-----------|
| `NOVU_API_KEY` | Chave de API do Novu |

### Configurações de Email

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `COMPANY_NAME` | `'Ever Works'` | Nome da empresa nos templates de email |
| `EMAIL_PROVIDER` | `'resend'` | Provedor de email ativo (`'resend'`, `'novu'`) |
| `EMAIL_FROM` | -- | Endereço de email remetente |
| `EMAIL_SUPPORT` | -- | Endereço de email de suporte |

## Provedores de Analytics

Definido em `lib/config/schemas/analytics.schema.ts`.

### PostHog

Habilitado automaticamente quando `key` está presente:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | Chave de API do projeto PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | URL do host PostHog |
| `POSTHOG_DEBUG` | `false` | Habilitar modo debug |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | Habilitar gravação de sessão |
| `POSTHOG_AUTO_CAPTURE` | `false` | Captura automática de eventos |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | Rastrear exceções |
| `POSTHOG_PERSONAL_API_KEY` | -- | Chave de API pessoal (painel admin) |
| `POSTHOG_PROJECT_ID` | -- | ID do projeto (painel admin) |

### Sentry

Habilitado automaticamente quando `dsn` está presente:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | DSN do Sentry |
| `SENTRY_ORG` | -- | Slug da organização Sentry |
| `SENTRY_PROJECT` | -- | Nome do projeto Sentry |
| `SENTRY_AUTH_TOKEN` | -- | Token de auth para source maps |
| `SENTRY_ENABLE_DEV` | `false` | Habilitar em desenvolvimento |
| `SENTRY_DEBUG` | `false` | Modo debug |

### reCAPTCHA

Habilitado automaticamente quando tanto `siteKey` quanto `secretKey` estão presentes:

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Chave de site do lado do cliente |
| `RECAPTCHA_SECRET_KEY` | Chave secreta do lado do servidor |

### Vercel Analytics

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | Habilitar Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | Taxa de amostragem (0--1) |

### Provedor de Rastreamento de Exceções

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`, `'sentry'` ou `'none'` |

## Verificar Status do Provedor

```ts
import { configService } from '@/lib/config';

// Verificar se o Stripe está configurado
if (configService.payment.stripe.enabled) {
  // Stripe está pronto para uso
}

// Verificar se algum provedor de email está disponível
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// Listar provedores OAuth habilitados
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## Arquivos Relacionados

| Caminho | Descrição |
|---------|-----------|
| `lib/config/config-service.ts` | Singleton ConfigService |
| `lib/config/schemas/auth.schema.ts` | Esquemas de provedor auth |
| `lib/config/schemas/payment.schema.ts` | Esquemas de provedor de pagamento |
| `lib/config/schemas/email.schema.ts` | Esquemas de provedor de email |
| `lib/config/schemas/analytics.schema.ts` | Esquemas de provedor analytics |
| `lib/config/schemas/integrations.schema.ts` | Esquemas de provedor de integração |
| `lib/config/schemas/core.schema.ts` | Esquema de configuração core |
| `lib/config/types.ts` | Definições de tipo TypeScript |
| `lib/config/index.ts` | Export barrel |
| `.env.example` | Referência completa de variáveis de ambiente |
