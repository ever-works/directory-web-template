---
id: backup-recovery
title: Copia de Seguridad & Recuperación
sidebar_label: Backup & Recovery
sidebar_position: 3
---

# Copia de Seguridad & Recuperación

Esta guía cubre las estrategias de copia de seguridad de base de datos, recuperación a un punto en el tiempo, automatización de copias de seguridad y procedimientos de recuperación ante desastres para la plantilla Ever Works. La plantilla utiliza una arquitectura de almacenamiento dual: PostgreSQL para datos transaccionales y un CMS basado en Git (directorio `.content/`) para el contenido. Cada uno requiere su propio enfoque de copia de seguridad.

## Arquitectura de Almacenamiento

| Tipo de Datos | Almacenamiento | Método de Copia de Seguridad |
|-----------|---------|---------------|
| Usuarios, roles, permisos | PostgreSQL | Volcados de base de datos |
| Sesiones, cuentas OAuth | PostgreSQL | Volcados de base de datos |
| Suscripciones, pagos | PostgreSQL | Volcados de base de datos |
| Comentarios, votos, envíos | PostgreSQL | Volcados de base de datos |
| Elementos, categorías, etiquetas | Repositorio Git (`.content/`) | Historial de Git |
| Colecciones, páginas | Repositorio Git (`.content/`) | Historial de Git |
| Configuración de la aplicación | Basado en archivos (JSON) | Copia de seguridad de archivos |
| Archivos de respaldo de categorías | Archivos YAML | Copias automáticas con marca de tiempo |

## Conexión a la Base de Datos

La conexión a la base de datos está configurada en `lib/db/drizzle.ts` con agrupamiento de conexiones:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

El tamaño de grupo predeterminado es 20 en producción y 10 en desarrollo, configurable mediante `DB_POOL_SIZE` (limitado entre 1 y 50).

## Métodos de Copia de Seguridad de Base de Datos

### Copia de Seguridad Completa con pg_dump

Utilice el `pg_dump` nativo de PostgreSQL para copias de seguridad confiables:

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

### Copias de Seguridad de Tablas Específicas

Realice copias de seguridad de tablas críticas por separado para una recuperación más rápida y enfocada:

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

### Copias de Seguridad de Base de Datos Gestionada

Si usa un proveedor PostgreSQL gestionado, aproveche las capacidades de copia de seguridad integradas:

- **Supabase**: Copias de seguridad diarias automáticas con recuperación a un punto en el tiempo en planes Pro
- **Neon**: Instantáneas basadas en ramas con restauración instantánea
- **Railway**: Copias de seguridad automáticas con retención configurable
- **AWS RDS**: Copias de seguridad automatizadas con ventana de retención de hasta 35 días

## Automatización de Copias de Seguridad

### Script de Copia de Seguridad Automatizado

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

### Programación Cron

Programe las copias de seguridad antes de que se ejecuten los trabajos cron de la aplicación. El `vercel.json` de la plantilla programa el trabajo sync a las 3 AM:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

Configure los trabajos de copia de seguridad antes:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### Copia de Seguridad del Estado de Migración

Antes de implementar nuevas versiones con cambios de esquema, capture el estado de migración:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

El script `cli-migrate.ts` de la plantilla muestra este estado automáticamente:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## Procedimientos de Restauración

### Restauración Completa de Base de Datos

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

### Restablecimiento Limpio de Base de Datos

El script `scripts/clean-database.js` elimina todas las tablas y el esquema de migración de Drizzle:

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
Nunca ejecute `clean-database.js` en una base de datos de producción sin una copia de seguridad verificada. Esta operación es irreversible.
:::

Después de un restablecimiento limpio:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### Recuperación del Estado de Seed

`lib/db/initialize.ts` maneja automáticamente los errores de seeding durante el inicio:

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

El mecanismo de bloqueo advisory evita condiciones de carrera durante despliegues multi-instancia:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## Recuperación de Contenido Basado en Git

### Historial del Repositorio de Contenido

El contenido en `.content/` está respaldado por un repositorio Git configurado mediante `DATA_REPOSITORY`:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

El script `scripts/clone.cjs` clona este repositorio durante `predev` y `prebuild`. Dado que el contenido está gestionado con Git, cada cambio tiene historial de versiones completo:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### Deshacer Cambios de Contenido

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## Plan de Recuperación ante Desastres

### Lista de Verificación de Recuperación

1. **Evaluar el daño** -- determinar el alcance de la pérdida de datos
2. **Detener la aplicación** -- evitar más escrituras
3. **Identificar la última copia de seguridad limpia** -- verificar integridad
4. **Restaurar la base de datos**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **Clonar el repositorio de contenido**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **Ejecutar migraciones pendientes**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **Verificar el estado del seed** -- comprobar la tabla `seed_status` en busca del estado `completed`
8. **Configurar el entorno** -- actualizar `.env.local` con nuevas cadenas de conexión
9. **Desplegar la aplicación** -- el hook de instrumentación verifica el estado de la base de datos en el inicio
10. **Verificar la funcionalidad** -- probar autenticación, pagos, visualización de contenido

### Tiempos Estimados de Recuperación

| Componente | Método | Tiempo Estimado |
|-----------|--------|---------------|
| Base de datos | pg_restore desde copia de seguridad | 5–30 minutos |
| Contenido | Clon Git | 1–5 minutos |
| Aplicación | Despliegue desde Git | 2–10 minutos |
| Certificados SSL | Automático (Vercel) | 1–5 minutos |
| DNS | Ya configurado | Inmediatamente |

### Almacenamiento Externo de Copias de Seguridad

Almacene las copias de seguridad separadas del servidor de producción:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## Lista de Verificación de Copias de Seguridad

- [ ] Copias de seguridad automáticas diarias de base de datos configuradas
- [ ] Archivos de copia de seguridad almacenados separados de producción
- [ ] Repositorio Git de contenido enviado al remoto
- [ ] Restauración de copia de seguridad probada trimestralmente
- [ ] Monitoreo de health check activo
- [ ] Variables de entorno documentadas y almacenadas de forma segura
- [ ] Configuraciones de proveedores OAuth documentadas

## Archivos Relacionados

| Archivo | Propósito |
|------|---------|
| `lib/db/drizzle.ts` | Conexión a base de datos y configuración del pool |
| `lib/db/schema.ts` | Esquema completo de base de datos |
| `lib/db/initialize.ts` | Migración automática, seeding, gestión de bloqueos |
| `lib/db/migrate.ts` | Runner de migración idempotente |
| `scripts/clean-database.js` | Herramienta de restablecimiento de base de datos |
| `scripts/cli-migrate.ts` | CLI de migración manual |
| `scripts/cli-seed.ts` | CLI de seeding manual |
| `scripts/clone.cjs` | Script de clonación del repositorio de contenido |
| `drizzle.config.ts` | Configuración de Drizzle ORM |
