---
id: database-scripts
title: "Scripts de Banco de Dados"
sidebar_label: "Scripts BD"
sidebar_position: 10
---

# Scripts de Banco de Dados

O template fornece um conjunto de scripts de gerenciamento de banco de dados para migrações, seeding e manutenção. Esses scripts usam o Drizzle ORM e são projetados para funcionar em desenvolvimento local, pipelines de CI/CD e implantações no Vercel de produção.

## Inventário de Scripts

| Script | Comando | Propósito |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | Executor de migração em tempo de build |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Migração interativa manual |
| `cli-seed.ts` | `pnpm db:seed` | Ponto de entrada CLI para seeding |
| `seed.ts` | Execução direta | Seeder completo do banco de dados |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Configuração do catálogo de produtos Stripe |
| `clean-database.js` | `node scripts/clean-database.js` | Reset nuclear (apaga tudo) |

## Scripts de Migração

### Migração em Tempo de Build (build-migrate.ts)

Executa automaticamente durante `pnpm build` em implantações no Vercel. Projetado para atualizações de esquema sem tempo de inatividade.

```mermaid
flowchart TD
    A[Build Start] --> B{SKIP_BUILD_MIGRATIONS?}
    B -->|true| C[Skip & Exit 0]
    B -->|false| D{CI Environment?}
    D -->|CI, not Vercel| C
    D -->|Vercel or Local| E{DATABASE_URL set?}
    E -->|No| C
    E -->|Yes| F[Run Drizzle Migrations]
    F --> G{Success?}
    G -->|Yes| H[Verify Schema]
    G -->|No| I{Production?}
    H --> J{Columns exist?}
    J -->|Yes| K[Exit 0 - Success]
    J -->|No| L[Exit 1 - Fail]
    I -->|Yes| L
    I -->|Preview| M{Connection error?}
    M -->|Yes| C
    M -->|Auth error| L
```

**Comportamento por Ambiente:**

| Ambiente | Falha de Migração | Erro de Conexão | Erro de Auth |
|---|---|---|---|
| Produção (`VERCEL_ENV=production`) | Build falha | Build falha | Build falha |
| Preview (`VERCEL_ENV=preview`) | Build falha | Build passa (aviso) | Build falha |
| CI (GitHub Actions) | Ignorado completamente | Ignorado completamente | Ignorado completamente |
| Desenvolvimento local | Build falha | Build falha | Build falha |

**Verificação de Esquema:**

Após migração bem-sucedida, o script verifica se colunas críticas existem:

```typescript
// Verified columns in client_profiles table:
const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
```

### CLI de Migração Manual (cli-migrate.ts)

Ferramenta de migração interativa para execução manual em qualquer banco de dados.

```bash
# Using package.json script
pnpm db:migrate:cli

# Direct execution with custom database
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

**Processo em Três Etapas:**

1. **Verificar Estado Atual** -- Consulta a tabela `drizzle.__drizzle_migrations` para histórico de migrações aplicadas
2. **Executar Migrações** -- Chama `runMigrations()` de `lib/db/migrate.ts`
3. **Verificar Esquema** -- Confirma que colunas obrigatórias existem

## Scripts de Seeding

### Seeder do Banco de Dados (seed.ts)

Popula o banco de dados com dados de teste realistas. Só faz seed se as tabelas estiverem vazias.

```bash
DATABASE_URL=postgres://... pnpm seed
```

**Ordem de Seeding e Dependências:**

```mermaid
graph TD
    A[Roles] --> B[Permissions]
    B --> C[Role-Permission Links]
    C --> D[Users]
    D --> E[Client Profiles]
    D --> F[User Roles]
    E --> G[Newsletter Subscriptions]
    E --> H[Activity Logs]
    E --> I[Comments]
    E --> J[Votes]
```

**Dados Gerados:**

```typescript
// 20 users with sequential emails
{ email: 'user1@example.com', ... }
{ email: 'user2@example.com', ... }

// Client profiles with varied plans
{ plan: i % 5 === 0 ? 'premium' : i % 3 === 0 ? 'standard' : 'free' }

// Role assignment: first user = admin
{ roleId: i === 0 ? 'role-admin' : 'role-user' }

// Newsletter subscriptions: every 3rd user
users.filter((_, i) => i % 3 === 0)
```

**Configuração de Conexão:**

```typescript
const conn = postgres(databaseUrl, {
  max: 1,              // Single connection (safe for scripts)
  idle_timeout: 20,     // Close idle connections after 20s
  connect_timeout: 10,  // Fail fast on connection issues
  prepare: false,       // Disable prepared statements
});
```

### Ponto de Entrada CLI Seed (cli-seed.ts)

Script wrapper que carrega variáveis de ambiente e delega para `lib/db/seed.ts`:

```bash
pnpm db:seed
```

O script procura arquivos de ambiente nesta ordem:
1. `.env.local` (preferencial)
2. `.env` (fallback)
3. Apenas variáveis de ambiente do sistema (se nenhum arquivo existir)

### Seeder de Produtos Stripe (seed-stripe-products.ts)

Cria o catálogo completo de produtos Stripe com planos de assinatura e itens de compra única.

```bash
npx tsx scripts/seed-stripe-products.ts
```

**Obrigatório:** `STRIPE_SECRET_KEY` em `.env.local`

**Produtos e Preços:**

| Produto | Chave do Plano | Tipo de Preço | Metadados |
|---|---|---|---|
| Free | `free` | Assinatura ($0/mês) | `type: subscription` |
| Standard | `standard` | $10/mês, $96/ano | `annualDiscount: 20` |
| Premium | `premium` | $20/mês, $180/ano | `annualDiscount: 25` |
| Anúncio Patrocinado - Semanal | `sponsor_weekly` | $100 único | `type: sponsor_ad` |
| Anúncio Patrocinado - Mensal | `sponsor_monthly` | $300 único | `type: sponsor_ad` |

## Limpeza do Banco de Dados

### clean-database.js

Apaga todas as tabelas e o esquema de rastreamento de migração Drizzle. Fornece um reset completo do banco de dados.

```bash
node scripts/clean-database.js
```

**Operações realizadas:**

1. Apaga todas as tabelas no esquema `public` usando `CASCADE`
2. Apaga o esquema `drizzle` (histórico de migrações)

```sql
-- Step 1: Drop all public tables
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Step 2: Drop migration tracking
DROP SCHEMA IF EXISTS drizzle CASCADE;
```

**Aviso:** Esta operação é irreversível. Sempre crie um backup antes de executar em qualquer ambiente com dados reais.

## Fluxos de Trabalho Comuns

### Configuração de Desenvolvimento Inicial

```bash
# 1. Start local PostgreSQL
docker compose up -d postgres

# 2. Generate migration files from schema
pnpm db:generate

# 3. Apply migrations
pnpm db:migrate:cli

# 4. Seed test data
pnpm db:seed

# 5. Seed Stripe products (if using payments)
npx tsx scripts/seed-stripe-products.ts
```

### Resetar e Re-semear

```bash
# 1. Clean everything
node scripts/clean-database.js

# 2. Re-apply migrations
pnpm db:migrate:cli

# 3. Re-seed
pnpm db:seed
```

### Mudanças de Esquema

```bash
# 1. Modify schema in lib/db/schema.ts
# 2. Generate migration
pnpm db:generate

# 3. Apply locally
pnpm db:migrate:cli

# 4. Verify with Drizzle Studio
pnpm db:studio
```

## Variáveis de Ambiente

| Variável | Requerida Por | Propósito |
|---|---|---|
| `DATABASE_URL` | Todos os scripts | String de conexão PostgreSQL |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | Defina `true` para pular migrações de build |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | Chave API do Stripe para criação de produtos |
| `SEED_ADMIN_EMAIL` | seed.ts (via lib) | Email da conta de administrador |
| `SEED_ADMIN_PASSWORD` | seed.ts (via lib) | Senha da conta de administrador |

## Tratamento de Erros

Todos os scripts de banco de dados seguem estas convenções:

- Código de saída `0` para sucesso ou condições de skip aceitáveis
- Código de saída `1` para falhas que devem interromper o pipeline
- Strings de conexão são mascaradas nos logs (`://***:***@`)
- Mensagens de erro detalhadas são registradas no lado do servidor
- Erros de produção sempre falham o build (sem engolir silencioso)
