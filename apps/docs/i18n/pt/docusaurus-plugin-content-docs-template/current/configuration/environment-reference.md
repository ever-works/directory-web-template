---
id: environment-reference
title: Referência Completa de Variáveis de Ambiente
sidebar_label: Referência de Ambiente
sidebar_position: 1
---

# Referência Completa de Variáveis de Ambiente

Esta página fornece uma referência abrangente de todas as variáveis de ambiente usadas pelo template Ever Works. As variáveis são organizadas por categoria com seus tipos, valores padrão e se são obrigatórias.

Copie `.env.example` para `.env.local` e preencha os valores para sua implantação.

## Conteúdo & Repositório de Dados

| Variável | Tipo | Obrigatória | Padrão | Descrição |
|----------|------|-------------|--------|-----------|
| `DATA_REPOSITORY` | string (URL) | **Sim** | -- | URL do repositório Git para dados de conteúdo |
| `GH_TOKEN` | string | Não | -- | Token de acesso pessoal do GitHub (para repos privados) |
| `GITHUB_TOKEN` | string | Não | -- | Variável de token GitHub alternativa |
| `GITHUB_BRANCH` | string | Não | `master` | Branch do Git para clonar conteúdo |

## Banco de Dados

| Variável | Tipo | Obrigatória | Padrão | Descrição |
|----------|------|-------------|--------|-----------|
| `DATABASE_URL` | string | Recomendada | -- | String de conexão do banco de dados (SQLite ou Postgres) |

Quando `DATABASE_URL` não está definida, funcionalidades dependentes de banco de dados (avaliações, comentários, favoritos, pesquisas, itens em destaque) são automaticamente desabilitadas pelo sistema de feature flags.

## Autenticação

| Variável | Tipo | Obrigatória | Padrão | Descrição |
|----------|------|-------------|--------|-----------|
| `AUTH_SECRET` | string | **Sim** | -- | Segredo do NextAuth (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **Sim** | -- | Segredo de criptografia de cookie |
| `COOKIE_DOMAIN` | string | Não | -- | Domínio do cookie (ex. `localhost`) |
| `COOKIE_SECURE` | boolean | Não | `true` | Flag de cookie seguro |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | Não | `15m` | TTL do token de acesso |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | Não | `7d` | TTL do token de atualização |

### Provedores OAuth

| Variável | Tipo | Obrigatória | Descrição |
|----------|------|-------------|-----------|
| `GOOGLE_CLIENT_ID` | string | Não | ID de cliente OAuth do Google |
| `GOOGLE_CLIENT_SECRET` | string | Não | Segredo de cliente OAuth do Google |
| `GITHUB_CLIENT_ID` | string | Não | ID de cliente OAuth do GitHub |
| `GITHUB_CLIENT_SECRET` | string | Não | Segredo de cliente OAuth do GitHub |
| `MICROSOFT_CLIENT_ID` | string | Não | ID de cliente OAuth da Microsoft |
| `MICROSOFT_CLIENT_SECRET` | string | Não | Segredo de cliente OAuth da Microsoft |
| `FB_CLIENT_ID` | string | Não | ID de cliente OAuth do Facebook |
| `FB_CLIENT_SECRET` | string | Não | Segredo de cliente OAuth do Facebook |
| `X_CLIENT_ID` | string | Não | ID de cliente OAuth do X (Twitter) |
| `X_CLIENT_SECRET` | string | Não | Segredo de cliente OAuth do X (Twitter) |
| `LINKEDIN_CLIENT_ID` | string | Não | ID de cliente OAuth do LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | string | Não | Segredo de cliente OAuth do LinkedIn |

Provedores OAuth são habilitados automaticamente quando tanto o ID do cliente quanto o segredo estão definidos.

## Site & Branding (Seguro para o Cliente)

Todas as variáveis `NEXT_PUBLIC_*` são expostas ao navegador.

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | URL do aplicativo de diretório |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | URL do site público da empresa |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | URL base da API |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | Nome do site para metadados |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | Slogan do site |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | Nome da marca para schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (veja .env.example) | Descrição SEO (menos de 160 caracteres) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | Palavras-chave SEO separadas por vírgula |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Caminho do logo (relativo a /public) |

### Tema da Imagem OG

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | Cor de início do gradiente da imagem OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | Cor de fim do gradiente da imagem OG |

### Links de Redes Sociais

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | Link do GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | Link do X (Twitter) |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (veja .env.example) | Link do LinkedIn |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (veja .env.example) | Link do Facebook |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | Link do blog |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | Email de contato |

### Atribuição

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | URL do link "Feito com" |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | Texto do link "Feito com" |

## Provedores de Pagamento

### Stripe

| Variável | Tipo | Obrigatória | Descrição |
|----------|------|-------------|-----------|
| `STRIPE_SECRET_KEY` | string | Não | Chave secreta do Stripe (somente servidor) |
| `STRIPE_PUBLISHABLE_KEY` | string | Não | Chave publicável do Stripe |
| `STRIPE_WEBHOOK_SECRET` | string | Não | Segredo de assinatura do webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | Não | Chave publicável segura para o cliente |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | Não | Carregar preços da API do Stripe |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | Não | Habilitar checkout do Stripe |

#### IDs de Preço Multi-Moeda do Stripe

Para planos Standard e Premium, o template suporta IDs de preço específicos por moeda:

```
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=
...
```

O mesmo padrão se aplica às variáveis do plano Premium e IDs de taxa de configuração.

### LemonSqueezy

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `LEMONSQUEEZY_API_KEY` | string | Chave de API |
| `LEMONSQUEEZY_STORE_ID` | string | Identificador da loja |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Segredo do webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | URL do endpoint do webhook |
| `LEMONSQUEEZY_TEST_MODE` | boolean | Habilitar modo de teste |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | Variante do plano gratuito |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | Variante do plano standard |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | Variante do plano premium |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | Habilitar checkout |

### Polar

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `POLAR_ACCESS_TOKEN` | string | Token de acesso |
| `POLAR_WEBHOOK_SECRET` | string | Segredo do webhook |
| `POLAR_ORGANIZATION_ID` | string | ID da organização |
| `POLAR_SANDBOX` | boolean | Modo sandbox (padrão: `true`) |
| `POLAR_API_URL` | string (URL) | URL de API personalizada |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | ID do plano gratuito |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | ID do plano standard |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | ID do plano premium |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | Habilitar checkout |

### Solidgate

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `SOLIDGATE_API_KEY` | string | Chave de API |
| `SOLIDGATE_SECRET_KEY` | string | Chave secreta |
| `SOLIDGATE_WEBHOOK_SECRET` | string | Segredo do webhook |
| `SOLIDGATE_MERCHANT_ID` | string | ID do comerciante |
| `SOLIDGATE_API_BASE_URL` | string (URL) | URL base da API |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | Chave segura para o cliente |

### Preços de Produto

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | Preço do nível gratuito |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | Preço do nível standard |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | Preço do nível premium |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | ID do valor de teste premium |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | ID do valor de teste standard |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | Habilitar valores de teste |

## Análise & Monitoramento

### PostHog

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | Chave de API do projeto PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | Host do PostHog |
| `POSTHOG_DEBUG` | boolean | `false` | Habilitar log de debug |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | Gravação de sessão |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | Captura automática de eventos |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | Chave de API do lado do servidor |
| `POSTHOG_PROJECT_ID` | string | -- | ID do projeto para análises |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | Rastreamento de exceções |

### Sentry

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | DSN do Sentry |
| `SENTRY_ORG` | string | `ever-co` | Organização Sentry |
| `SENTRY_PROJECT` | string | `ever-works` | Nome do projeto Sentry |
| `SENTRY_AUTH_TOKEN` | string | -- | Token de autenticação Sentry |
| `SENTRY_ENABLE_DEV` | boolean | `false` | Habilitar em desenvolvimento |
| `SENTRY_DEBUG` | boolean | `false` | Modo debug |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | Rastreamento de exceções |

### Outras Análises

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | Provedor de exceções (`posthog` ou `sentry`) |
| `ANALYZE` | boolean | `true` | Habilitar análise de bundle |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | Chave de site reCAPTCHA |
| `RECAPTCHA_SECRET_KEY` | string | -- | Chave secreta reCAPTCHA |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | Taxa de amostragem do Speed Insights |

## Email

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `EMAIL_PROVIDER` | string | `resend` | Provedor de email (`resend` ou `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | Endereço de remetente para notificações |
| `EMAIL_SUPPORT` | string | `support@ever.works` | Endereço de email de suporte |
| `COMPANY_NAME` | string | `Ever Works` | Nome da empresa para templates de email |
| `RESEND_API_KEY` | string | -- | Chave de API do Resend |
| `NOVU_API_KEY` | string | -- | Chave de API do Novu |
| `SMTP_HOST` | string | -- | Hostname do servidor SMTP |
| `SMTP_PORT` | number | `587` | Porta SMTP |
| `SMTP_USER` | string | -- | Nome de usuário SMTP |
| `SMTP_PASSWORD` | string | -- | Senha SMTP |

## Integrações

### Twenty CRM

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | URL da instância Twenty CRM |
| `TWENTY_CRM_API_KEY` | string | -- | Chave de API para autenticação |
| `TWENTY_CRM_ENABLED` | boolean | `false` | Habilitar/desabilitar explicitamente |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | Modo de sincronização (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (Jobs em Background)

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | Habilitar Trigger.dev |
| `TRIGGER_DEV_API_KEY` | string | -- | Chave de API |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | URL de API personalizada |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | Ambiente (`development`, `staging`, `production`) |

### Jobs Cron

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `CRON_SECRET` | string | Segredo de autenticação para endpoints cron |

### Mapas & Localização

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | Token público do Mapbox (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | Chave do Google Maps restrita ao navegador |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | ID do mapa do Google Maps |

### API da Plataforma Ever Works

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | URL da API da plataforma |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | Token de autenticação da API da plataforma |

## Vercel & Implantação

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `VERCEL_TOKEN` | string | Token de acesso pessoal do Vercel |
| `VERCEL_PROJECT_ID` | string | ID do projeto Vercel |
| `VERCEL_TEAM_SCOPE` | string | ID da equipe Vercel |
| `VERCEL_PLAN` | string | Tipo de plano (`pro` para cron de 5 minutos) |
| `VERCEL_DEPLOYMENT_ID` | string | ID da implantação atual |
| `CRON_FREQUENCY` | string | Frequência cron forçada (ex. `5min`) |

## Demo & Seeding

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `NEXT_PUBLIC_DEMO` | boolean | `true` | Habilitar modo demo com dados de exemplo |
| `SEED_ADMIN_EMAIL` | string | `admin@changeme.com` | Email do usuário admin para seeding |
| `SEED_ADMIN_PASSWORD` | string | `changeme_password` | Senha do usuário admin para seeding |
| `SEED_FAKE_USER_COUNT` | number | `10` | Número de usuários falsos para gerar |
| `NODE_ENV` | string | `development` | Ambiente do Node |

## Arquivos Relacionados

- `.env.example` -- Arquivo template com todas as variáveis e documentação inline
- `lib/config/schemas/*.schema.ts` -- Esquemas de validação Zod para cada categoria
- `lib/config/config-service.ts` -- Validação centralizada e acesso
- `lib/config/client.ts` -- Módulo de configuração seguro para o cliente
