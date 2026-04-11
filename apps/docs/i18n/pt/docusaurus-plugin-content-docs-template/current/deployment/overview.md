---
id: overview
title: Visão Geral do Deployment
sidebar_label: Visão Geral
sidebar_position: 1
---

# Visão Geral do Deployment

O Template Ever Works suporta múltiplas plataformas de deployment com suporte de primeira classe para Vercel. Este guia aborda configuração de produção, estratégias de deployment e melhores práticas.

## Plataformas Suportadas

### Recomendadas

| Plataforma | Descrição | Melhor Para |
|-----------|-----------|-------------|
| **Vercel** | Plataforma oficial Next.js | Deployment mais simples, edge functions integradas |
| **Netlify** | Plataforma Jamstack | Bom tooling, fácil CI/CD |
| **Railway** | PaaS simples | Banco de dados + app no mesmo lugar |
| **Render** | PaaS moderno | Bom equilíbrio de recursos e custo |

### Auto-hospedado

| Plataforma | Descrição |
|-----------|-----------|
| **Docker** | Container-based, portável |
| **VPS (Ubuntu/Debian)** | Controle total, mais configuração |
| **AWS EC2 / ECS** | Escalável, ecossistema AWS |
| **Google Cloud Run** | Container serverless |

## Checklist de Pré-deployment

### Código & Build

- [ ] Todos os testes passando: `pnpm lint && pnpm tsc --noEmit`
- [ ] Build bem-sucedida: `pnpm build`
- [ ] Variáveis de ambiente verificadas
- [ ] Schema do banco de dados atualizado

### Banco de Dados

- [ ] `DATABASE_URL` aponta para banco de dados de produção
- [ ] Migrações testadas em ambiente de staging
- [ ] Backup realizado antes do deployment
- [ ] Pool de conexões configurado corretamente

### Segurança

- [ ] `AUTH_SECRET` é string aleatória forte (32+ chars)
- [ ] `COOKIE_SECRET` é string aleatória forte (32+ chars)
- [ ] `COOKIE_SECURE=true` em produção
- [ ] Todas as credenciais OAuth configuradas
- [ ] `CRON_SECRET` definido se usando Vercel Crons

### Monitoramento

- [ ] Sentry DSN configurado (se usando Sentry)
- [ ] PostHog key configurada (se usando PostHog)
- [ ] Health check endpoint testado

## Configuração de Ambiente de Produção

### Variáveis de Ambiente Essenciais

```bash
# ===== REQUIRED =====
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com

# Auth secrets (generate with: openssl rand -base64 32)
AUTH_SECRET=your-auth-secret-here
COOKIE_SECRET=your-cookie-secret-here
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_POOL_SIZE=20

# ===== RECOMMENDED =====

# OAuth (at least one)
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email
EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com

# Exception tracking
EXCEPTION_PROVIDER=posthog  # or sentry, both, none
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Cron jobs (required for Vercel Crons)
CRON_SECRET=your-cron-secret-here

# ===== OPTIONAL =====

# Content repo
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Storage
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

### Segurança de Ambiente

- Nunca commitar `.env` ou `.env.local` para o repositório
- Usar variáveis por ambiente (produção vs. preview vs. desenvolvimento)
- Rotacionar secrets periodicamente
- Usar o cofre de secrets da plataforma (Vercel Encrypted Env, AWS Secrets Manager)
- Revisar quais variáveis começam com `NEXT_PUBLIC_` — são expostas no cliente
- Auditar o acesso às variáveis de ambiente regularmente

## Configuração de Build

### next.config.js

```typescript
// next.config.ts
const nextConfig = {
  output: 'standalone',  // for Docker deployments
  experimental: {
    instrumentationHook: true,  // for auto db initialization
  },
};
```

### Scripts de Build

```json
{
  "scripts": {
    "build": "next build",
    "build:migrate": "tsx scripts/build-migrate.ts && next build",
    "postbuild": "next-sitemap"
  }
}
```

Use `build:migrate` se quiser rodar migrações do banco de dados automaticamente durante o build (útil para plataformas que não suportam comandos de release separados).

## Deployment do Banco de Dados

### Estratégia de Migração

```bash
# Option 1: Run during build (automatic)
pnpm build:migrate

# Option 2: Run as release command
pnpm db:migrate

# Option 3: Run manually before deployment
cd apps/web && pnpm db:migrate
```

### Provedores de Banco de Dados

| Provedor | Melhor Para | Notas |
|---------|-------------|-------|
| **Supabase** | Desenvolvimento rápido | PostgreSQL gerenciado + Auth + Storage |
| **PlanetScale** | Escala global | PostgreSQL serverless, branching |
| **Neon** | Serverless | PostgreSQL serverless, bom para Vercel |
| **Railway** | Simples | Bom para projetos pequenos/médios |
| **AWS RDS** | Empresarial | Controle total, custo mais alto |

### Estratégia de Backup

Configure backups automáticos diários no provedor do banco de dados. Antes de deployments principais:

```bash
# Backup manual via pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Or via provider CLI
supabase db dump -f backup.sql
```

## CDN & Assets Estáticos

### Vercel (Automático)

Vercel serve automaticamente recursos estáticos via sua CDN global — nenhuma configuração necessária.

### Cloudflare

```javascript
// next.config.ts additions for Cloudflare
assetPrefix: process.env.CDN_URL,
```

### Amazon CloudFront

```javascript
// next.config.ts additions for CloudFront
assetPrefix: `https://${process.env.CLOUDFRONT_DISTRIBUTION}.cloudfront.net`,
```

## SSL/TLS

Vercel e Netlify provisionam automaticamente certificados SSL via Let's Encrypt para domínios customizados.

Para auto-hospedagem, usar **Nginx** com certbot:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Monitoramento em Produção

```bash
# Essential monitoring variables
EXCEPTION_PROVIDER=posthog  # or sentry
NEXT_PUBLIC_POSTHOG_KEY=phc_...
SENTRY_DSN=https://...@sentry.io/...

# Log level
LOG_LEVEL=info  # debug | info | warn | error
```

## Estratégias de Deployment

### Blue-Green Deployment

Usado para atualizações sem downtime:

1. Manter instância de produção atual (**blue**) rodando
2. Fazer deploy da nova versão em instância idêntica (**green**)
3. Executar smoke tests no ambiente green
4. Alternar o tráfego de blue para green via load balancer
5. Manter blue ativo por 30 min. como fallback
6. Encerrar instância blue após confirmação

### Rolling Deployment (Vercel Padrão)

O Vercel realiza rolling deployments automaticamente — instâncias antigas servem tráfego até que as novas estejam prontas.

### Canary Deployment

```bash
# Example using Vercel
vercel --prod --target production  # 100% traffic

# Or split traffic (requires Enterprise/Pro)
# Route 10% to new version first
```

## Rollback

### Vercel

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or via dashboard: Deployments → select old deployment → Promote to Production
```

### Git-based Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit (careful with shared repos)
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

## Segurança de Produção

- Usar HTTPS em todas as rotas (Vercel: automático)
- Definir headers de segurança (CSP, HSTS, X-Frame-Options) em `next.config.ts`
- Habilitar rate limiting em endpoints de API
- Sanitizar todas as entradas do usuário antes de persistir
- Usar prepared statements (o Drizzle cuida disso automaticamente)
- Revisar permissões de banco de dados — o usuário da aplicação deve ter acesso mínimo necessário
- Rotacionar secrets após qualquer suspeita de comprometimento
- Monitorar logs de autenticação para acessos suspeitos
