---
id: drizzle-config
title: Configuração do Drizzle ORM
sidebar_label: Drizzle Config
sidebar_position: 9
---

# Configuração do Drizzle ORM

Esta página documenta a configuração do Drizzle ORM utilizada pelo template para gerenciamento de esquema de banco de dados, migrações e construção de queries com segurança de tipos. A configuração fica em `drizzle.config.ts` na raiz do projeto.

## Visão Geral

O template utiliza [Drizzle ORM](https://orm.drizzle.team/) com PostgreSQL como dialeto de banco de dados. O Drizzle fornece acesso ao banco de dados com segurança de tipos, geração automática de migrações e um estúdio visual para inspecionar seu banco de dados.

## Arquivo de Configuração

A configuração completa é definida em `drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// Use a dummy URL if DATABASE_URL is not set (DB is optional for this project)
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

## Propriedades de Configuração

### `schema`

- **Valor:** `"./lib/db/schema.ts"`
- **Propósito:** Aponta para o arquivo contendo todas as definições de tabelas Drizzle. É aqui que suas declarações `pgTable` ficam.

O arquivo de esquema em `lib/db/schema.ts` define tabelas usando os builders de colunas PostgreSQL do Drizzle:

```ts
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  varchar,
  uniqueIndex,
  index,
  jsonb,
  check,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  image: text("image"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ...colunas adicionais
});
```

### `out`

- **Valor:** `"./lib/db/migrations"`
- **Propósito:** Diretório onde os arquivos de migração SQL gerados são armazenados. Cada vez que você executa `drizzle-kit generate`, novos arquivos de migração aparecem aqui.

### `dialect`

- **Valor:** `"postgresql"`
- **Propósito:** Especifica o mecanismo de banco de dados. O template tem como alvo o PostgreSQL para implantações em produção.

### `dbCredentials`

- **Valor:** `{ url: databaseUrl }`
- **Propósito:** String de conexão para o banco de dados. Lida da variável de ambiente `DATABASE_URL`.

## Carregamento de Variáveis de Ambiente

A configuração carrega variáveis de ambiente de dois arquivos, em ordem:

1. `.env` -- Variáveis de ambiente base
2. `.env.local` -- Substituições locais (têm prioridade)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

Esta abordagem de carregamento duplo permite manter padrões compartilhados em `.env` enquanto substitui URLs de banco de dados e segredos localmente.

## URL de Banco de Dados de Fallback

A configuração inclui uma URL dummy de fallback:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

Este fallback existe porque o banco de dados é opcional para este projeto. Ele permite que comandos Drizzle Kit como `generate` sejam executados mesmo quando nenhum banco de dados real está disponível — útil durante CI/CD ou configuração inicial do projeto.

## Comandos Comuns

O template define vários scripts relacionados ao banco de dados em `package.json`:

| Comando | Descrição |
|---------|-----------|
| `pnpm db:generate` | Gerar arquivos de migração a partir de mudanças no esquema |
| `pnpm db:migrate` | Aplicar migrações pendentes ao banco de dados |
| `pnpm db:seed` | Popular o banco de dados com dados iniciais |
| `pnpm db:studio` | Abrir o Drizzle Studio para gerenciamento visual do banco de dados |

### Gerando Migrações

Após modificar o esquema em `lib/db/schema.ts`, gere uma nova migração:

```bash
pnpm db:generate
```

Isso cria um novo arquivo de migração SQL em `lib/db/migrations/` contendo as instruções DDL necessárias para sincronizar o banco de dados com seu esquema.

### Executando Migrações

Aplicar todas as migrações pendentes:

```bash
pnpm db:migrate
```

### Migração Automática na Inicialização

O template também suporta migração automática durante a inicialização da aplicação via arquivo de instrumentação. Isso serve como fallback para implantações de preview:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // ...
  try {
    console.log("[Instrumentation] Running database initialization...");
    await initializeDatabase();
    console.log("[Instrumentation] Database initialization completed");
  } catch (error) {
    // In production, re-throw to signal critical failure
    // In development, allow app to start for debugging
  }
}
```

Para builds de produção no Vercel, migrações em tempo de build via `scripts/build-migrate.ts` são a abordagem preferida.

## Configurando DATABASE_URL

### Desenvolvimento Local (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / Produção

Defina `DATABASE_URL` nas variáveis de ambiente do seu projeto Vercel, tipicamente apontando para uma instância PostgreSQL gerenciada (Neon, Supabase, Railway, etc.):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## Segurança de Tipos

Como o Drizzle gera tipos TypeScript diretamente do seu esquema, todas as queries são totalmente verificadas por tipo em tempo de compilação. Não há etapa separada de geração de código necessária -- o arquivo de esquema em si é a única fonte de verdade tanto para a estrutura do banco de dados quanto para os tipos TypeScript.

## Recursos Relacionados

- [Referência de Ambiente](/template/configuration/environment-reference) -- Lista completa de variáveis de ambiente incluindo `DATABASE_URL`
- [Verificação de Integridade do Banco de Dados](/template/guides/database-health-check) -- Monitoramento da conectividade do banco de dados
- [Guia de Instrumentação](/template/guides/instrumentation) -- Inicialização automática do banco de dados na inicialização
