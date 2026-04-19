---
id: migrations-guide
title: Guia de Migrações
sidebar_label: Migrações
sidebar_position: 4
---

# Guia de Migrações

O modelo Ever Works usa o **Drizzle Kit** para migrações de banco de dados. As migrações são arquivos SQL que rastreiam alterações de esquema ao longo do tempo, garantindo um estado consistente do banco de dados em ambientes e membros da equipe.

## Como funcionam as migrações

Drizzle Kit compara a definição de esquema atual (`lib/db/schema.ts`) com migrações geradas anteriormente e produz arquivos de migração SQL para quaisquer diferenças.

```
lib/db/schema.ts (source of truth)
        │
        ▼
  drizzle-kit generate
        │
        ▼
lib/db/migrations/
  ├── 0000_burly_darkstar.sql       (initial schema)
  ├── 0001_add_image_to_users.sql
  ├── 0002_silly_victor_mancha.sql
  ├── ...
  └── 0028_tiresome_mauler.sql      (latest)
```

## Estrutura do diretório de migração

```
lib/db/migrations/
├── 0000_burly_darkstar.sql           # Initial schema (16KB - all core tables)
├── 0001_add_image_to_users.sql       # Add image column to users
├── 0002_silly_victor_mancha.sql      # Subscription and payment tables
├── 0003_gigantic_thunderbolts.sql    # Small schema adjustment
├── 0004_big_marrow.sql               # Small schema adjustment
├── 0005_sharp_malcolm_colcord.sql    # Favorites table
├── 0006_giant_the_phantom.sql        # Featured items table
├── 0007_tiresome_true_believers.sql  # Sponsor ads table
├── 0008_add_twenty_crm_singleton_constraint.sql  # CRM singleton
├── 0009_add_integration_mappings.sql # Integration mappings
├── 0010_convert_comments_timestamps_to_timestamptz.sql # Timezone fix
├── 0011_quiet_gravity.sql            # Companies table
├── 0012_purple_vindicator.sql        # Items-companies join
├── 0013_add_surveys_table.sql        # Survey system
├── 0014_fat_madame_masque.sql        # Seed status, item views, audit logs
├── 0015_previous_jack_flag.sql       # Report and moderation tables
├── 0016_solid_stellaris.sql          # Minor adjustment
├── 0017_whole_supreme_intelligence.sql # Minor adjustment
├── 0018_wooden_electro.sql           # Additional indexes
├── 0019_add_subscription_renewal_fields.sql # Auto-renewal support
├── 0020_chunky_naoko.sql             # Minor adjustment
├── 0021_redundant_dragon_lord.sql    # Additional indexes
├── 0022_tidy_dakota_north.sql        # Payment account improvements
├── 0023_boring_silverclaw.sql        # Collection tables
├── 0024_deep_wrecker.sql             # Additional improvements
├── 0025_overconfident_moon_knight.sql # Location features
├── 0026_exotic_clea.sql              # Minor adjustment
├── 0027_minor_mesmero.sql            # Minor adjustment
├── 0028_tiresome_mauler.sql          # Latest migration
├── meta/                             # Drizzle migration metadata
├── relations.ts                      # Drizzle relation definitions
└── schema.ts                         # Snapshot of schema at migration time
```

O diretório `meta/` contém os metadados de rastreamento internos do Drizzle Kit. Os arquivos `relations.ts` e `schema.ts` no diretório de migrações são instantâneos de referência e não devem ser editados manualmente.

## Comandos

### Gerar uma migração

Após modificar `lib/db/schema.ts`, gere uma migração:

```bash
pnpm db:generate
```

Isso executa `drizzle-kit generate` que:
1. Lê o esquema atual de `lib/db/schema.ts`
2. Compara-o com o instantâneo de migração mais recente
3. Gera um novo arquivo SQL em `lib/db/migrations/`
4. Atualiza os metadados de migração em `meta/`

### Execute migrações pendentes

Aplique quaisquer migrações não aplicadas ao seu banco de dados:

```bash
pnpm db:migrate
```

Isso chama `lib/db/migrate.ts` que:
1. Conecta-se ao banco de dados usando `DATABASE_URL`
2. Verifica a tabela `drizzle.__drizzle_migrations` para migrações aplicadas
3. Executa todas as migrações que não foram aplicadas
4. Atualiza a tabela de rastreamento

### Abra o Drizzle Studio

Inicie um editor visual de banco de dados:

```bash
pnpm db:studio
```

## Corredor de migração (`lib/db/migrate.ts`)

O executor de migração (`runMigrations()`) é idempotente e seguro para ser chamado em cada inicialização:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');

  // Log current migration state
  // ...

  // Run migrations (Drizzle automatically skips applied ones)
  await migrate(db, { migrationsFolder: './lib/db/migrations' });

  return true;
}
```

Comportamentos principais:
- **Idempotente**: Drizzle rastreia migrações aplicadas em `drizzle.__drizzle_migrations`; migrações já aplicadas são ignoradas
- **Registro**: relata migrações aplicadas recentes antes e depois da execução
- **Tratamento de erros**: Retorna `false` em caso de falha com mensagens de erro detalhadas
- **Inicialização automática**: chamada durante a inicialização do aplicativo via `lib/db/initialize.ts`

## Migração automática na inicialização

O modelo executa migrações automaticamente quando o aplicativo é iniciado. Isso é acionado por `instrumentation.ts` que chama `initializeDatabase()` de `lib/db/initialize.ts`.

O fluxo de inicialização:
1. Verifique se `DATABASE_URL` está configurado (pule se não estiver)
2. Execute todas as migrações pendentes
3. Verifique se o banco de dados foi propagado
4. Se não for propagado, adquira um bloqueio consultivo e execute o seed

Na produção, as falhas de migração geram um erro para sinalizar aos sistemas de monitoramento. Em ambientes de desenvolvimento e visualização, o aplicativo continua com um aviso.

## Criando novas migrações

### Etapa 1: modificar o esquema

Edite `lib/db/schema.ts` para adicionar, modificar ou remover definições de tabela:

```typescript
// Add a new table
export const newTable = pgTable('new_table', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Add a column to an existing table
// Just add the new column to the existing pgTable definition
```

### Etapa 2: gerar a migração

```bash
pnpm db:generate
```

Isso cria um novo arquivo SQL como `0029_some_name.sql`.

### Etapa 3: revise o SQL gerado

Sempre revise a migração gerada antes de aplicá-la. Verifique:
- Nomes corretos de tabelas e colunas
- Tipos de dados e restrições adequados
- Definições de índice
- Relacionamentos de chave estrangeira
- Quaisquer operações destrutivas (DROP TABLE, DROP COLUMN)

### Etapa 4: aplicar a migração

```bash
pnpm db:migrate
```

### Etapa 5: confirmar

Confirme a alteração do esquema e o arquivo de migração gerado:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (metadados atualizados)

## Fluxo de trabalho da equipe

### Lidando com alterações de esquema simultâneas

Quando vários membros da equipe modificam o esquema simultaneamente:

1. Cada desenvolvedor gera sua própria migração localmente
2. Na mesclagem, os arquivos de migração podem precisar ser renumerados se os números de sequência entrarem em conflito
3. O Drizzle Kit rastreia migrações por hash, não por número, para que a execução fora de ordem seja tratada
4. Após a fusão, execute `pnpm db:migrate` para aplicar todas as novas migrações

### Considerações ambientais

|Meio Ambiente|Estratégia de Migração|
|-------------|-------------------|
|Desenvolvimento|Execução automática na inicialização; gerar e testar localmente|
|Pré-visualização/preparação|Execução automática na implantação via `instrumentation.ts`|
|Produção|Execução automática na implantação; monitorar falhas|

### Melhores práticas

1. **Uma preocupação por migração**: manter as migrações focadas em um único recurso ou alteração
2. **Nunca edite migrações existentes**: depois que uma migração for aplicada em qualquer lugar, trate-a como imutável
3. **Revisar SQL gerado**: Sempre verifique o que o Drizzle Kit gera antes de aplicar
4. **Migrações de teste**: execute migrações em um banco de dados de teste antes de implantar na produção
5. **Incluir arquivos de migração na revisão do código**: o SQL de migração deve ser revisado da mesma forma que o código do aplicativo
6. **Fazer backup antes de migrações destrutivas**: sempre faça backup antes de executar migrações que eliminam tabelas ou colunas
