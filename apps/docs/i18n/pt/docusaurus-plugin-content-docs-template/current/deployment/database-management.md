---
id: database-management
title: Gerenciamento de Banco de Dados
sidebar_label: Gerenciamento de BD
sidebar_position: 4
---

# Gerenciamento de Banco de Dados

O template Ever Works usa PostgreSQL com Drizzle ORM para todas as operações de banco de dados. Este guia aborda o gerenciamento de banco de dados em produção, migrações, pool de conexões, monitoramento e o sistema de seeding.

## Arquitetura

| Camada | Arquivo | Responsabilidade |
|--------|---------|-----------------|
| **Configuração** | `drizzle.config.ts` | Caminho do schema, saída de migrações, dialeto |
| **Conexão** | `lib/db/drizzle.ts` | Pool de conexões, instância singleton, lazy init |
| **Config** | `lib/db/config.ts` | URL de banco de dados segura para scripts e helpers de ambiente |
| **Schema** | `lib/db/schema.ts` | Definições de tabelas, índices, restrições |
| **Migrações** | `lib/db/migrate.ts` | Executor de migrações idempotente |
| **Inicialização** | `lib/db/initialize.ts` | Auto-migrate, seed, advisory locks |
| **Seeding** | `lib/db/seed.ts` | Dados iniciais: papéis, permissões, usuário admin |

## Gerenciamento de Conexões

### Singleton com Lazy Initialization

A conexão com o banco de dados é criada no primeiro uso e armazenada em cache via `globalThis` para sobreviver ao HMR em desenvolvimento. De `lib/db/drizzle.ts`:

```typescript
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle> | undefined;
};

function initializeDatabase(): ReturnType<typeof drizzle> {
  if (!getDatabaseUrl()) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (globalForDb.db) {
    return globalForDb.db;
  }

  const poolSize = getPoolSize();
  const conn = postgres(getDatabaseUrl()!, {
    max: poolSize,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });

  globalForDb.conn = conn;
  globalForDb.db = drizzle(conn, { schema });
  return globalForDb.db;
}
```

O objeto `db` exportado usa um Proxy JavaScript para lazy initialization transparente:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

Isso significa que nenhuma conexão com o banco de dados é estabelecida até a primeira consulta real. Rotas que não usam o banco de dados não têm overhead de conexão.

### Configuração do Pool de Conexões

| Configuração | Padrão Produção | Padrão Desenvolvimento | Descrição |
|-------------|----------------|----------------------|-----------|
| `max` | 20 | 10 | Máximo de conexões no pool |
| `idle_timeout` | 20 s | 20 s | Fechar conexões inativas após este tempo |
| `connect_timeout` | 30 s | 30 s | Timeout para novas tentativas de conexão |
| `prepare` | false | false | Desabilitar prepared statements (compatibilidade Vercel) |

Configurar o tamanho do pool via variável de ambiente:

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

## Visão Geral do Schema

O schema em `lib/db/schema.ts` define estas tabelas principais:

### Usuários e Autenticação

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique(),
  image: text('image'),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  createdAtIndex: index('users_created_at_idx').on(table.createdAt)
}));
```

### Controle de Acesso Baseado em Papéis

```typescript
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: text('status', { enum: ['active', 'inactive'] }).default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
}));
```

### Lista Completa de Tabelas

| Tabela | Propósito |
|--------|-----------|
| `users` | Contas de usuário |
| `accounts` | Links de providers OAuth (adaptador NextAuth) |
| `sessions` | Sessões de usuário ativas |
| `roles` | Definições de papéis com flag admin |
| `permissions` | Definições de permissões (recurso:ação) |
| `userRoles` | Atribuições usuário-papel |
| `rolePermissions` | Atribuições papel-permissão |
| `clientProfiles` | Perfis de usuário estendidos para listagens do diretório |
| `subscriptions` | Registros de assinaturas de pagamento |
| `subscriptionHistory` | Trilha de auditoria de mudanças de assinatura |
| `paymentProviders` | Configuração de pagamento multi-provider |
| `paymentAccounts` | Detalhes de conta específicos do provider |
| `activityLogs` | Trilha de auditoria de ações do usuário |
| `comments` | Comentários do usuário em itens |
| `votes` | Votos/avaliações do usuário |
| `favorites` | Favoritos/marcadores do usuário |
| `notifications` | Notificações in-app |
| `seedStatus` | Rastreamento de seed (registro singleton) |

## Sistema de Migrações

### Comandos de Migração

| Comando | Script | Descrição |
|---------|--------|-----------|
| `pnpm db:generate` | `drizzle-kit generate` | Gera SQL a partir de mudanças no schema |
| `pnpm db:migrate` | `drizzle-kit migrate` | Aplica migrações pendentes (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | Aplica migrações com logging detalhado |
| `pnpm db:studio` | `drizzle-kit studio` | Abre a GUI do Drizzle Studio |

### Executor de Migrações Idempotente

O executor de migrações em `lib/db/migrate.ts` é seguro para chamar a cada inicialização da aplicação:

```typescript
export async function runMigrations(): Promise<boolean> {
  try {
    const { db } = await import('./drizzle');

    // Log current migration state
    const result = await db.execute(sql`
      SELECT hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Run migrations (skips already-applied ones)
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    return true;
  } catch (error) {
    console.error('[Migration] Database migrations failed:', error);
    return false;
  }
}
```

## Inicialização do Banco de Dados

### Inicialização Automática na Inicialização

O arquivo `instrumentation.ts` aciona `initializeDatabase()` a cada inicialização da aplicação:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    await initializeDatabase();
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In dev/preview, allow app to start for debugging
  }
}
```

## Seeding

### Seeding Manual

```bash
# Seed the database with initial data
pnpm db:seed
```

### Credenciais de Admin

Em produção, definir credenciais de admin explícitas:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

## Monitoramento

### Drizzle Studio

Navegue pelo banco de dados com uma interface gráfica:

```bash
pnpm db:studio
```

### Verificação de Saúde do Banco de Dados

O endpoint `/api/health` pode verificar a conectividade com o banco de dados:

```bash
curl -s https://yourdomain.com/api/health
```

## Arquivos Relacionados

| Arquivo | Propósito |
|---------|-----------|
| `drizzle.config.ts` | Configuração Drizzle Kit |
| `lib/db/config.ts` | Helpers de ambiente seguros para scripts |
| `lib/db/drizzle.ts` | Pool de conexões e singleton |
| `lib/db/schema.ts` | Definições completas do schema |
| `lib/db/migrate.ts` | Executor de migrações idempotente |
| `lib/db/initialize.ts` | Auto-migrate, seeding, gerenciamento de lock |
| `lib/db/seed.ts` | Lógica de seeding do banco de dados |
| `scripts/build-migrate.ts` | Executor de migrações no momento do build |
| `scripts/cli-migrate.ts` | CLI de migrações manual |
| `scripts/cli-seed.ts` | CLI de seed manual |
| `scripts/clean-database.js` | Utilitário de reset do banco de dados |
