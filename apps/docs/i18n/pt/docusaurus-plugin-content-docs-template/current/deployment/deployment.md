---
id: deployment-introduction
title: Introdução ao Deployment
sidebar_label: Introdução ao Deployment
sidebar_position: 1
---

# Introdução ao Deployment

Este guia fornece uma visão geral abrangente da implantação do Template Ever Works em ambientes de produção. O template é construído no Next.js 16 com um modo de saída standalone, tornando-o compatível com uma ampla gama de plataformas de hospedagem e implantações em containers.

## Visão Geral da Arquitetura

O Template Ever Works produz uma **build Next.js standalone** que empacota todas as dependências em uma única unidade implantável. Isso está configurado em `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
};
```

A configuração `output: "standalone"` cria um artefato de implantação autocontido que inclui apenas os arquivos `node_modules` necessários, reduzindo significativamente o tamanho da implantação.

## Plataformas Suportadas

### Recomendado: Vercel

O Vercel é a plataforma de implantação recomendada para o template. Ele oferece:

- Implantação zero-configuração para aplicações Next.js
- Provisionamento automático de certificados SSL
- Agendamento integrado de cron jobs via `vercel.json`
- Suporte a funções serverless para rotas de API
- Implantações de prévia para pull requests

O template inclui uma configuração `vercel.json` com agendamentos cron predefinidos:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Auto-Hospedado: Docker

A saída standalone suporta containerização Docker. Uma implantação típica usa o runtime Node.js para servir a aplicação compilada. O requisito principal é garantir que o diretório de saída `standalone` e as pastas `public` e `.next/static` sejam copiados para a imagem do container.

### Outras Plataformas de Nuvem

O template pode ser implantado em qualquer plataforma que suporte aplicações Node.js:

- **Railway** -- Implantação full-stack simples com PostgreSQL integrado
- **DigitalOcean App Platform** -- Implantações de containers gerenciados
- **AWS (EC2, ECS ou App Runner)** -- Infraestrutura de nuvem escalável
- **Google Cloud Run** -- Plataforma de containers serverless
- **Azure App Service** -- Hospedagem Node.js gerenciada

## Pré-requisitos

### Requisitos do Sistema

- **Node.js**: versão 20.19.0 ou superior (definida no campo `engines` do `package.json`)
- **Gerenciador de Pacotes**: pnpm (o projeto usa `pnpm-lock.yaml`)
- **Banco de Dados**: PostgreSQL (necessário para funcionalidades de produção como autenticação, assinaturas, analytics)
- **Memória**: Pelo menos 8 GB de RAM recomendado para o processo de build

O script de build aloca memória adicional explicitamente:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### Variáveis de Ambiente Necessárias

Antes da implantação, certifique-se de que essas variáveis críticas estejam configuradas. O script `scripts/check-env.js` as valida automaticamente:

```bash
# Core (critical -- application will not function without these)
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
AUTH_SECRET=<generated-secret>         # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cookie Configuration
COOKIE_SECRET=<generated-secret>       # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

O script de verificação de ambiente categoriza as variáveis por integração:

```
Core:            NODE_ENV, PORT, APP_*, BASE_URL
Database:        DATABASE_URL, DB_*, POSTGRES_*
Auth:            AUTH_*, GOOGLE_*, GITHUB_*, FB_*, TWITTER_*
Supabase:        SUPABASE_*, NEXT_PUBLIC_SUPABASE_*
Content:         DATA_REPOSITORY, GH_TOKEN
Email:           RESEND_API_KEY, EMAIL_*
Payment:         STRIPE_*, PAYPAL_*
Analytics:       POSTHOG_*, SENTRY_*
Background Jobs: TRIGGER_DEV_*
```

### Integrações Opcionais

Essas variáveis de ambiente habilitam funcionalidades opcionais:

```bash
# OAuth Providers (each requires both CLIENT_ID and CLIENT_SECRET)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=...
```

## Guia de Implantação Rápida

### Passo 1: Preparar a Build

Execute o processo de build completo localmente para verificar que tudo compila:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

O script `build` executa vários passos em sequência:

1. **Verificação do ambiente** (`scripts/check-env.js`) -- valida as variáveis necessárias
2. **Geração OpenAPI** (`scripts/generate-openapi.ts`) -- gera documentação de API
3. **Migrações de banco de dados** (`scripts/build-migrate.ts`) -- aplica alterações de esquema pendentes
4. **Build Next.js** (`next build`) -- compila a aplicação

### Passo 2: Migração do Banco de Dados em Tempo de Build

O script `scripts/build-migrate.ts` é executado automaticamente durante a build. Ele lida com diferentes ambientes:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

Comportamentos principais:

- **Builds de produção**: Falhas de migração causam falha na build (evitando implantações defeituosas)
- **Implantações de prévia**: Erros de conexão são tolerados (o banco de dados pode não estar provisionado)
- **Builds CI** (não-Vercel): Migrações são completamente ignoradas

### Passo 3: Inicialização em Tempo de Execução

Quando a aplicação é iniciada, o arquivo `instrumentation.ts` aciona a inicialização do banco de dados:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Auto-initialize database (migrate and seed if needed)
  try {
    await initializeDatabase();
  } catch (error) {
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In development/preview, allow app to start for debugging
  }
}
```

A sequência de inicialização:

1. Executar quaisquer migrações pendentes (Drizzle gerencia a idempotência)
2. Verificar se o banco de dados foi semeado
3. Se não semeado, adquirir um advisory lock PostgreSQL e executar o script de seed
4. Liberar o lock após o seeding

### Passo 4: Implantar no Vercel

Para implantações Vercel, conecte seu repositório e configure:

1. Defina o **Framework Preset** como Next.js
2. Defina o **Build Command** como `pnpm build`
3. Defina o **Install Command** como `pnpm install`
4. Adicione todas as variáveis de ambiente necessárias no painel do Vercel
5. Implante

### Passo 5: Verificar a Implantação

Após a implantação, verifique:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## Headers de Segurança

O template configura headers de segurança automaticamente em `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
        },
      ],
    },
  ];
}
```

## Configuração do Pool de Conexão

O pool de conexões do banco de dados é configurável via variável de ambiente `DB_POOL_SIZE`:

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

- **Padrão produção**: 20 conexões
- **Padrão desenvolvimento**: 10 conexões
- **Faixa configurável**: 1 a 50 conexões
- **Idle timeout**: 20 segundos
- **Connect timeout**: 30 segundos

## Próximos Passos

- [SSL e Domínios Personalizados](./ssl-domains.md) -- Configurar domínios personalizados e certificados SSL
- [Gerenciamento do Banco de Dados](./database-management.md) -- Operações de banco de dados em produção
- [Backup e Recuperação](./backup-recovery.md) -- Estratégias de backup do banco de dados
- [Monitoramento](./monitoring.md) -- Configurar rastreamento de erros e monitoramento de desempenho
