---
id: environment-variables
title: Variáveis de Ambiente
sidebar_label: Variáveis de Ambiente
sidebar_position: 5
---

# Variáveis de Ambiente

Este guia descreve todas as variáveis de ambiente usadas pelo Template Ever Works, incluindo suas configurações padrão, valores de exemplo e instruções de configuração por plataforma.

## Variáveis Obrigatórias

### Configurações da Aplicação

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
AUTH_SECRET=your-nextauth-secret-here  # openssl rand -base64 32
```

### Configuração do Banco de Dados

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional: Connection pool size (default: 20 in production, 10 in development)
DB_POOL_SIZE=20
```

### Autenticação

```bash
# Auth
COOKIE_SECRET=your-cookie-secret-here  # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# OAuth providers (optional, but at least one recommended)
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Variáveis Opcionais

### Email

```bash
# Email (required for notifications and auth emails)
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com

# Or use specific SMTP settings:
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=username
EMAIL_SERVER_PASSWORD=password
```

### Analytics

```bash
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

### Armazenamento

```bash
# S3-compatible storage (for file uploads)
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=https://s3.amazonaws.com  # or custom endpoint for R2, etc.
```

## Configuração por Plataforma

### Vercel

1. Acesse **Configurações do Projeto → Variáveis de Ambiente**
2. Adicione cada variável com substituição por ambiente (Produção, Preview, Desenvolvimento)
3. Variáveis com `NEXT_PUBLIC_` são expostas automaticamente no navegador

**Variáveis necessárias para o Vercel:**
- `DATABASE_URL` — String de conexão com o banco de dados
- `AUTH_SECRET` — Secret do NextAuth (gerado com `openssl rand -base64 32`)
- `COOKIE_SECRET` — Secret dos cookies
- `NEXTAUTH_URL` — URL pública do app (por exemplo `https://yourapp.vercel.app`)

**Variáveis definidas automaticamente pelo Vercel:**
- `VERCEL=1` — Detecta ambiente Vercel (usado para seleção de cron job)
- `VERCEL_URL` — URL de deployment atual
- `VERCEL_ENV` — `production`, `preview` ou `development`

### Netlify

1. Acesse **Configurações do Site → Variáveis de Ambiente**
2. Adicione cada variável, opcionalmente com escopos por contexto (Produção/Deploy/Filial)
3. Redeploy após adicionar variáveis

### Docker / Auto-hospedado

Criar um arquivo `.env` no diretório raiz do app:

```bash
# .env (do not commit to git)
NODE_ENV=production
DATABASE_URL=postgresql://user:password@db:5432/myapp
AUTH_SECRET=your-secret-here
COOKIE_SECRET=another-secret-here
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
```

Para Docker Compose:

```yaml
services:
  web:
    image: your-app-image
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
```

## Melhores Práticas de Segurança

1. **Nunca commitar** `.env` ou `.env.local` no controle de versão — verificar `.gitignore`
2. **Rotacionar secrets** regularmente, especialmente `AUTH_SECRET` e credenciais OAuth
3. **Usar variáveis por ambiente** — diferentes valores para produção/preview/desenvolvimento
4. **Armazenamento seguro** — usar o cofre de secrets da plataforma (Vercel Encrypted Env, AWS Secrets Manager, etc.)

## Script de Validação

O app valida variáveis de ambiente obrigatórias ao iniciar. Verificar manualmente:

```bash
node scripts/check-env.js
```

## Próximos Passos

- [Visão Geral do Deployment](./overview.md)
- [Gerenciamento de Banco de Dados](./database-management.md)
- [Monitoramento & Analytics](./monitoring.md)
