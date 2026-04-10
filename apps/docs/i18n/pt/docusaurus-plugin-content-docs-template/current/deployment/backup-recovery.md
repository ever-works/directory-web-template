---
id: backup-recovery
title: Backup & Recuperação
sidebar_label: Backup & Recuperação
sidebar_position: 3
---

# Backup & Recuperação

Este guia aborda estratégias de backup de banco de dados, recuperação point-in-time, automação de backups e procedimentos de recuperação de desastres para o Template Ever Works. O template usa uma arquitetura de armazenamento dupla: PostgreSQL para dados transacionais e um CMS baseado em Git (diretório `.content/`) para conteúdo. Cada um requer sua própria abordagem de backup.

## Arquitetura de Armazenamento

| Tipo de Dados | Armazenamento | Método de Backup |
|-----------|---------|---------------|
| Usuários, funções, permissões | PostgreSQL | Dumps do banco de dados |
| Sessões, contas OAuth | PostgreSQL | Dumps do banco de dados |
| Assinaturas, pagamentos | PostgreSQL | Dumps do banco de dados |
| Comentários, votos, relatórios | PostgreSQL | Dumps do banco de dados |
| Itens, categorias, tags | Repositório Git (`.content/`) | Histórico Git |
| Coleções, páginas | Repositório Git (`.content/`) | Histórico Git |
| Configurações da aplicação | Baseado em arquivo (JSON) | Backup de arquivo |
| Arquivos de backup de categorias | Arquivos YAML | Cópias automáticas com timestamp |

## Conexão com o Banco de Dados

A conexão com o banco de dados é configurada em `lib/db/drizzle.ts` com pool de conexões:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

O tamanho do pool é padrão 20 em produção e 10 em desenvolvimento, configurável via `DB_POOL_SIZE` (limitado entre 1 e 50).

## Métodos de Backup do Banco de Dados

### Backup Completo com pg_dump

Use o nativo `pg_dump` do PostgreSQL para backups confiáveis:

```bash
# Full database backup (custom format -- most flexible for restore)
pg_dump -Fc \
  -h your-db-host \
  -U your-db-user \
  -d your-db-name \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# Plain SQL backup (human-readable)
pg_dump \
  -h your-db-host \
  -U your-db-user \
  -d your-db-name \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema-only backup (for migration debugging)
pg_dump --schema-only \
  -h your-db-host \
  -U your-db-user \
  -d your-db-name \
  > schema_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -h your-db-host -U your-db-user -d your-db-name \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Backups por Tabela Específica

Faça backup de tabelas críticas individualmente para recuperação mais rápida e direcionada:

```bash
# User and authentication data
pg_dump -t users -t accounts -t sessions -t user_roles \
  -h host -U user -d dbname > users_backup.sql

# Payment and subscription data
pg_dump -t subscriptions -t subscription_history \
  -t payment_providers -t payment_accounts \
  -h host -U user -d dbname > payments_backup.sql

# Content interaction data
pg_dump -t comments -t votes -t favorites -t activity_logs \
  -h host -U user -d dbname > interactions_backup.sql
```

### Backups de Banco de Dados Gerenciados

Se estiver usando um provedor PostgreSQL gerenciado, aproveite seus recursos de backup integrados:

- **Supabase**: Backups diários automáticos com recuperação point-in-time nos planos Pro
- **Neon**: Snapshots baseados em branch com restauração instantânea
- **Railway**: Backups automáticos com retenção configurável
- **AWS RDS**: Backups automatizados com janela de retenção de até 35 dias

## Automação de Backups

### Script de Backup Automatizado

```bash
#!/bin/bash
# backup-database.sh
set -euo pipefail

DB_URL="${DATABASE_URL}"
BACKUP_DIR="/backups/everworks"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup..."
pg_dump -Fc "${DB_URL}" -f "${BACKUP_FILE}"

if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date)] Backup successful: ${BACKUP_FILE} (${SIZE})"
else
    echo "[$(date)] ERROR: Backup file missing or empty"
    exit 1
fi

# Clean up old backups
find "${BACKUP_DIR}" -name "backup_*.dump" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned backups older than ${RETENTION_DAYS} days"
```

### Agendamento Cron

Agende backups antes da execução dos cron jobs da aplicação. O `vercel.json` do template agenda um job de sincronização às 3h da manhã:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

Configure os jobs de backup para serem executados antes:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### Backup do Estado de Migração

Antes de implantar novas versões com alterações de esquema, capture o estado de migração:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

O script `cli-migrate.ts` do template exibe esse estado automaticamente:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## Procedimentos de Recuperação

### Restauração Completa do Banco de Dados

```bash
# Restore from custom format (drops and recreates objects)
pg_restore -c -d your-db-name backup_20250101_020000.dump

# Restore to a new database
createdb your-db-name-restored
pg_restore -d your-db-name-restored backup_20250101_020000.dump

# Restore from SQL file
psql -h host -U user -d dbname < backup_20250101_020000.sql

# Restore from compressed file
gunzip -c backup.sql.gz | psql -h host -U user -d dbname
```

### Reset Limpo do Banco de Dados

O script `scripts/clean-database.js` exclui todas as tabelas e o esquema de migração Drizzle:

```javascript
// Drop all tables in the public schema
await client`
  DO $$ DECLARE
    r RECORD;
  BEGIN
    FOR r IN (SELECT tablename FROM pg_tables
              WHERE schemaname = 'public') LOOP
      EXECUTE 'DROP TABLE IF EXISTS '
        || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
  END $$;
`;

// Drop drizzle schema (migration tracking)
await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
```

:::danger
Nunca execute `clean-database.js` em um banco de dados de produção sem um backup verificado. Esta operação é irreversível.
:::

Após um reset limpo:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### Recuperação do Estado de Seed

`lib/db/initialize.ts` lida com falhas de seed automaticamente na inicialização:

```typescript
// Failed seeds are cleaned up for retry
if (status?.status === 'failed') {
  await db.delete(seedStatus).where(eq(seedStatus.id, 'singleton'));
}

// Stale seeding operations (over 5 minutes) are cleaned up
if (status?.status === 'seeding' && status.startedAt) {
  const startedAtMs = new Date(status.startedAt).getTime();
  if (Date.now() - startedAtMs > STALE_SEEDING_THRESHOLD) {
    await db.delete(seedStatus).where(eq(seedStatus.id, 'singleton'));
  }
}
```

O mecanismo de advisory lock previne race conditions durante implantações multi-instância:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## Recuperação de Conteúdo Baseado em Git

### Histórico do Repositório de Conteúdo

O conteúdo em `.content/` é apoiado por um repositório Git configurado via `DATA_REPOSITORY`:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

O script `scripts/clone.cjs` clona este repositório durante `predev` e `prebuild`. Como o conteúdo é gerenciado pelo Git, cada alteração tem histórico completo de versões:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### Revertendo Alterações de Conteúdo

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## Plano de Recuperação de Desastres

### Lista de Verificação de Recuperação

1. **Avaliar o dano** -- determinar o escopo da perda de dados
2. **Parar a aplicação** -- prevenir novas escritas
3. **Identificar o backup limpo mais recente** -- verificar integridade
4. **Restaurar o banco de dados**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **Clonar o repositório de conteúdo**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **Executar migrações pendentes**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **Verificar estado do seed** -- checar a tabela `seed_status` para status `completed`
8. **Configurar o ambiente** -- atualizar `.env.local` com novas strings de conexão
9. **Implantar a aplicação** -- o hook de instrumentation verifica a saúde do banco de dados na inicialização
10. **Verificar funcionalidade** -- testar autenticação, pagamentos, exibição de conteúdo

### Estimativas de Tempo de Recuperação

| Componente | Método | Tempo Estimado |
|-----------|--------|---------------|
| Banco de Dados | pg_restore a partir do backup | 5–30 minutos |
| Conteúdo | Clone Git | 1–5 minutos |
| Aplicação | Deploy a partir do Git | 2–10 minutos |
| Certificados SSL | Provisionamento automático (Vercel) | 1–5 minutos |
| DNS | Já configurado | Imediato |

### Armazenamento de Backup Externo

Armazene backups separadamente do servidor de produção:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## Lista de Verificação de Backup

- [ ] Backups automáticos diários do banco de dados configurados
- [ ] Arquivos de backup armazenados separadamente da produção
- [ ] Repositório Git de conteúdo sincronizado com remoto
- [ ] Restauração de backup testada trimestralmente
- [ ] Monitoramento de health check ativo
- [ ] Variáveis de ambiente documentadas e armazenadas com segurança
- [ ] Configurações dos provedores OAuth documentadas

## Arquivos Relacionados

| Arquivo | Propósito |
|------|---------|
| `lib/db/drizzle.ts` | Conexão com o banco de dados e configuração do pool |
| `lib/db/schema.ts` | Esquema completo do banco de dados |
| `lib/db/initialize.ts` | Auto-migração, seeding, gerenciamento de lock |
| `lib/db/migrate.ts` | Runner de migração idempotente |
| `scripts/clean-database.js` | Utilitário de reset do banco de dados |
| `scripts/cli-migrate.ts` | CLI de migração manual |
| `scripts/cli-seed.ts` | CLI de seed manual |
| `scripts/clone.cjs` | Script de clonagem do repositório de conteúdo |
| `drizzle.config.ts` | Configuração do Drizzle ORM |
