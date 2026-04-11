---
id: migration-guide
title: Guia de migração de versão
sidebar_label: Guia de migração
sidebar_position: 8
---

# Guia de migração de versão

Este guia cobre a atualização da instalação do modelo Ever Works, manipulação de migrações de banco de dados entre versões, gerenciamento de alterações significativas, gravação e aplicação de scripts de migração e procedimentos de reversão.

## Visão geral do fluxo de trabalho de atualização

A atualização do modelo segue um processo estruturado para minimizar o risco:

```
1. Review changelog for breaking changes
2. Back up your database (pg_dump)
3. Create a feature branch for the upgrade
4. Update dependencies (pnpm install)
5. Generate and apply database migrations
6. Run lint, type check, and build locally
7. Test critical paths (auth, payments, content)
8. Deploy to staging / preview
9. Verify staging
10. Deploy to production
```

## Sistema de migração de banco de dados

### Como funcionam as migrações

O modelo usa Drizzle ORM com Drizzle Kit para migrações de esquema. O esquema é definido em `lib/db/schema.ts` e as migrações são geradas como arquivos SQL em `lib/db/migrations/` .

Configuração em `drizzle.config.ts` :

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

### Comandos de migração

| Comando | Finalidade | Quando usar |
|---------|---------|------------|
| `pnpm db:generate` | Gerar SQL a partir de alterações de esquema | Depois de modificar `lib/db/schema.ts` |
| `pnpm db:migrate` | Aplicar migrações pendentes (Drizzle CLI) | Antes de iniciar o aplicativo após alterações |
| `pnpm db:migrate:cli` | Aplicar com registro detalhado | Para depurar problemas de migração |
| `pnpm db:seed` | Preencher dados iniciais | Após nova migração ou mudança de sementes |
| `pnpm db:studio` | Inspeção visual de banco de dados | Para depuração ou revisão de dados |

### Estrutura do arquivo de migração

As migrações são armazenadas como arquivos SQL numerados:

```
lib/db/migrations/
  0000_burly_darkstar.sql          # Initial schema
  0001_add_image_to_users.sql      # Add image column
  ...
  0019_add_subscription_renewal_fields.sql
  ...
  0028_tiresome_mauler.sql         # Latest migration
  meta/
    _journal.json                  # Migration journal
```

Drizzle rastreia migrações aplicadas em `drizzle.__drizzle_migrations` :

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### Gerando uma nova migração

Depois de modificar `lib/db/schema.ts` :

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### Migrações Automáticas

O modelo executa migrações automaticamente em dois locais:

**Tempo de construção** (via `scripts/build-migrate.ts` ):

```typescript
// Production builds: failure causes build to fail
if (isProduction) {
  process.exit(1);
}

// Preview deployments: connection errors are tolerated
if (isConnectionError && !isAuthError) {
  process.exit(0); // Allow preview to deploy
}
```

**Tempo de execução** (via `instrumentation.ts` ):

```typescript
export async function register() {
  try {
    await initializeDatabase(); // Runs migrate then seed
  } catch (error) {
    if (isProduction) throw error; // Fail fast
    // Dev/preview: log and continue
  }
}
```

### Segurança Migratória por Meio Ambiente

| Meio Ambiente | Tempo de construção | Tempo de execução | Em caso de falha |
|------------|-----------|---------|------------|
| Produção | Obrigatório | Reserva | A compilação falha / o aplicativo é lançado |
| Visualização | Erros de conexão tolerados | Ativo | Aviso de registros, aplicativo é iniciado |
| Desenvolvimento | Não utilizado | Ativo | Aviso de registros, aplicativo é iniciado |
| CI (não Vercel) | Ignorado | Não utilizado | N/A |

## Procedimentos de reversão

### Drizzle não suporta reversão automática

Drizzle Kit gera migrações somente para frente. Para reverter uma migração:

**Opção 1: migração reversa manual**

1. Identifique a migração problemática em `lib/db/migrations/` 2. Escreva o SQL reverso manualmente:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. Aplique diretamente no banco de dados:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. Remova o arquivo de migração direta de `lib/db/migrations/` 5. Atualize o diário Drizzle, se necessário

**Opção 2: Restaurar do backup**

A abordagem de reversão mais segura para migrações complexas:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**Opção 3: reverter esquema e regenerar**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## Atualizações de dependências

### Atualizando Dependências

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### Dependências Críticas

Esses pacotes exigem testes cuidadosos durante a atualização:

| Pacote | Risco | Notas |
|--------|------|-------|
| `next` | Alto | Versões principais alteram APIs, roteamento, configuração |
| `next-auth` | Alto | Mudanças na API de autenticação, estratégia de sessão |
| `drizzle-orm` / `drizzle-kit` | Alto | API de esquema, alterações no formato de migração |
| `next-intl` | Médio | Mudanças de roteamento e carregamento de mensagens |
| `@sentry/nextjs` | Médio | Compatibilidade com gancho de instrumentação |
| `stripe` | Médio | Versionamento da API de pagamento |
| `@heroui/react` | Médio | Mudanças nas props do componente UI |
| `@trigger.dev/sdk` | Médio | Mudanças na API de agendamento de tarefas |

### Substituições de pnpm

O modelo usa substituições pnpm em `package.json` para forçar versões consistentes:

```json
{
  "pnpm": {
    "overrides": {
      "@types/react": "19.2.7",
      "@types/react-dom": "19.2.3",
      "esbuild": "0.27.0",
      "@opentelemetry/api": "1.9.0"
    }
  }
}
```

Ao atualizar o React ou o esbuild, atualize essas substituições para corresponder.

## Lista de verificação de alterações importantes

Ao atualizar entre versões de modelo, revise cada categoria:

### Mudanças de esquema

- [] Compare `lib/db/schema.ts` com upstream para colunas novas/modificadas
- [ ] Gerar migrações: `pnpm db:generate` - [] Revise o SQL gerado para operações destrutivas (quedas de coluna, alterações de tipo)
- [] Aplicar primeiro a um banco de dados de teste
- [ ] Verifique a compatibilidade das sementes: `pnpm db:seed` ### Mudanças na rota da API

- [ ] Verifique rotas renomeadas ou removidas em `app/api/` - [] Atualizar integrações externas e URLs de webhook
- [] Verifique se os caminhos do endpoint cron ainda correspondem a `vercel.json` ### Mudanças de configuração

- [ ] Compare `.env.example` para variáveis novas ou renomeadas
- [ ] Revise as alterações `next.config.ts` (cabeçalhos, webpack, plugins)
- [ ] Verifique `vercel.json` para alterações na programação do cron
- [ ] Revise `drizzle.config.ts` para mudanças de caminho

### Alterações de autenticação

- [ ] Comparar `auth.config.ts` com upstream
- [] Verifique a compatibilidade da estratégia de sessão
- [] Testar URLs de retorno de chamada OAuth
- [ ] Revise as definições de permissão em `lib/permissions/definitions.ts` ### UI e mudanças de estilo

- [ ] Compare `tailwind.config.ts` para mudanças de tema
- [] Inspecione visualmente as páginas principais
- [] Testar layouts responsivos
- [] Verifique se as personalizações do tema ainda se aplicam

## Processo de atualização passo a passo

### 1. Prepare-se

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. Mesclar Upstream

Se você rastrear o modelo como um controle remoto upstream:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

Resolver conflitos, prestando atenção a:
- `lib/db/schema.ts` -- alterações de esquema
- `next.config.ts` -- configuração de compilação
- `auth.config.ts` -- provedores de autenticação
- `package.json` -- versões de dependência

### 3. Instalar e migrar

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. Verifique localmente

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. Teste caminhos críticos

| Área | O que testar |
|------|-------------|
| Autenticação | Login, logout, OAuth, persistência de sessão |
| Pagamentos | Fluxos de assinatura, manipulação de webhook |
| Conteúdo | Renderização de páginas, pesquisa, filtragem |
| Administrador | Acesso ao painel, aplicação de RBAC |
| i18n | Mudança de local, integridade da tradução |
| Trabalhos em segundo plano | Logs do console para registro de trabalho |

### 6. Implantar

1. Envie o branch de recurso para verificação de CI
2. Implante no ambiente de teste/visualização
3. Execute testes de fumaça na preparação
4. Mesclar para `main` para implantação em produção

## Compatibilidade de versão

### Node.js

A versão mínima é definida em `package.json` :

```json
{ "engines": { "node": ">=20.19.0" } }
```

### Banco de dados

| Provedor | Suportado | Notas |
|----------|-----------|-------|
| PostgreSQL 14+ | Sim | Produção recomendada |
| Supabase | Sim | Com pool de conexões |
| Néon | Sim | PostgreSQL sem servidor |

### Plataformas

| Plataforma | Estado | Notas |
|----------|--------|-------|
| Vercell | Alvo primário | Suporte completo para cron, visualização e borda |
| Docker | Suportado | Saída autônoma para contêineres |
| Auto-hospedado | Suportado | Requer gerenciamento de processos |

## Solução de problemas de atualizações

| Sintoma | Causa provável | Solução |
|---------|-------------|---------|
| A compilação falha | Deps incompatíveis | Execute `pnpm outdated` , resolva conflitos entre pares |
| Erros de banco de dados na inicialização | Migrações não aplicadas | `pnpm db:generate && pnpm db:migrate` |
| Autenticação quebrada | Configuração do provedor alterada | Compare `auth.config.ts` com upstream |
| Traduções ausentes | Novas chaves adicionadas | Verifique `messages/` para entradas faltantes |
| Estilo quebrado | Configuração do Tailwind alterada | Comparar `tailwind.config.ts` |
| Incompatibilidade de tipos | Esquema atualizado | Execute novamente `pnpm db:generate` |
