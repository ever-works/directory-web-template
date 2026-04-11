---
id: migration-guide
title: Guía de migración de versiones
sidebar_label: Guía de migración
sidebar_position: 8
---

# Guía de migración de versiones

Esta guía cubre la actualización de la instalación de su plantilla Ever Works, el manejo de migraciones de bases de datos entre versiones, la gestión de cambios importantes, la escritura y aplicación de scripts de migración y los procedimientos de reversión.

## Descripción general del flujo de trabajo de actualización

La actualización de la plantilla sigue un proceso estructurado para minimizar el riesgo:

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

## Sistema de migración de bases de datos

### Cómo funcionan las migraciones

La plantilla utiliza Drizzle ORM con Drizzle Kit para migraciones de esquemas. El esquema se define en `lib/db/schema.ts` y las migraciones se generan como archivos SQL en `lib/db/migrations/` .

Configuración en `drizzle.config.ts` :

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

### Comandos de migración

| Comando | Propósito | Cuándo utilizar |
|---------|---------|-------------|
| `pnpm db:generate` | Generar SQL a partir de cambios de esquema | Después de modificar `lib/db/schema.ts` |
| `pnpm db:migrate` | Aplicar migraciones pendientes (Drizzle CLI) | Antes de iniciar la aplicación después de los cambios |
| `pnpm db:migrate:cli` | Aplicar con registro detallado | Para depurar problemas de migración |
| `pnpm db:seed` | Completar datos iniciales | Después de nueva migración o cambio de semillas |
| `pnpm db:studio` | Inspección visual de bases de datos | Para depuración o revisión de datos |

### Estructura del archivo de migración

Las migraciones se almacenan como archivos SQL numerados:

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

Llovizna sigue las migraciones aplicadas en `drizzle.__drizzle_migrations` :

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### Generando una Nueva Migración

Después de modificar `lib/db/schema.ts` :

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### Migraciones automáticas

La plantilla ejecuta migraciones automáticamente en dos lugares:

**Tiempo de construcción** (a través de `scripts/build-migrate.ts` ):

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

**Tiempo de ejecución** (a través de `instrumentation.ts` ):

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

### Seguridad migratoria por entorno

| Medio ambiente | Tiempo de construcción | Tiempo de ejecución | Sobre el fracaso |
|-------------|-----------|---------|------------|
| Producción | Requerido | Reserva | La compilación falla/la aplicación se lanza |
| Vista previa | Errores de conexión tolerados | Activo | Advertencia de registros, se inicia la aplicación |
| Desarrollo | No utilizado | Activo | Advertencia de registros, se inicia la aplicación |
| CI (no Vercel) | Saltado | No utilizado | N/A |

## Procedimientos de reversión

### Llovizna no admite la reversión automática

Drizzle Kit genera migraciones solo hacia adelante. Para revertir una migración:

**Opción 1: Migración inversa manual**

1. Identificar la migración problemática en `lib/db/migrations/` 2. Escriba SQL inverso manualmente:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. Aplicar directamente a la base de datos:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. Elimine el archivo de migración hacia adelante de `lib/db/migrations/` 5. Actualice el diario Drizzle si es necesario

**Opción 2: Restaurar desde la copia de seguridad**

El enfoque de reversión más seguro para migraciones complejas:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**Opción 3: revertir el esquema y regenerar**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## Actualizaciones de dependencia

### Actualizando dependencias

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### Dependencias críticas

Estos paquetes requieren pruebas cuidadosas al actualizar:

| Paquete | Riesgo | Notas |
|---------|------|-------|
| `next` | Alto | Las versiones principales cambian API, enrutamiento y configuración |
| `next-auth` | Alto | Cambios en la API de autenticación, estrategia de sesión |
| `drizzle-orm` / `drizzle-kit` | Alto | API de esquema, cambios en el formato de migración |
| `next-intl` | Medio | Cambios de enrutamiento y carga de mensajes |
| `@sentry/nextjs` | Medio | Compatibilidad con ganchos de instrumentación |
| `stripe` | Medio | Versiones de API de pago |
| `@heroui/react` | Medio | Cambios en los accesorios de los componentes de la interfaz de usuario |
| `@trigger.dev/sdk` | Medio | Cambios en la API de programación de trabajos |

### Anulaciones de pnpm

La plantilla utiliza anulaciones de pnpm en `package.json` para forzar versiones consistentes:

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

Al actualizar React o esbuild, actualice estas anulaciones para que coincidan.

## Lista de verificación de cambios importantes

Al actualizar entre versiones de plantilla, revise cada categoría:

### Cambios de esquema

- [] Comparar `lib/db/schema.ts` con upstream para columnas nuevas/modificadas
- [ ] Generar migraciones: `pnpm db:generate` - [] Revisar el SQL generado para operaciones destructivas (caídas de columnas, cambios de tipo)
- [] Aplicar primero a una base de datos de prueba
- [ ] Verificar compatibilidad de semillas: `pnpm db:seed` ### Cambios en la ruta API

- [] Verifique rutas renombradas o eliminadas en `app/api/` - [] Actualizar integraciones externas y URL de webhooks
- [] Verifique que las rutas de los puntos finales de cron aún coincidan `vercel.json` ### Cambios de configuración

- [] Comparar `.env.example` para variables nuevas o renombradas
- [] Revisar `next.config.ts` cambios (encabezados, paquete web, complementos)
- [] Marque `vercel.json` para ver cambios en la programación cron
- [] Revise `drizzle.config.ts` para cambios de ruta

### Cambios de autenticación

- [] Comparar `auth.config.ts` con upstream
- [] Verificar la compatibilidad de la estrategia de sesión
- [] Probar las URL de devolución de llamada de OAuth
- [] Revisar las definiciones de permisos en `lib/permissions/definitions.ts` ### Cambios de estilo y de interfaz de usuario

- [] Comparar `tailwind.config.ts` para cambios de tema
- [] Inspeccionar visualmente las páginas clave
- [] Pruebe diseños responsivos
- [] Verifique que las personalizaciones del tema aún se apliquen

## Proceso de actualización paso a paso

### 1. Prepárate

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. Fusionar aguas arriba

Si realiza un seguimiento de la plantilla como un control remoto ascendente:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

Resolver conflictos, prestando atención a:
- `lib/db/schema.ts` -- cambios de esquema
- `next.config.ts` -- configuración de compilación
- `auth.config.ts` -- proveedores de autenticación
- `package.json` -- versiones de dependencia

### 3. Instalar y migrar

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. Verificar localmente

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. Pruebe las rutas críticas

| Área | Qué probar |
|------|-------------|
| Autenticación | Iniciar sesión, cerrar sesión, OAuth, persistencia de sesión |
| Pagos | Flujos de suscripción, manejo de webhooks |
| Contenido | Representación de páginas, búsqueda, filtrado |
| Administrador | Acceso al panel, aplicación de RBAC |
| i18n | cambio de configuración regional traducción |
| Trabajos en segundo plano | Registros de consola para el registro de trabajos |

### 6. Implementar

1. Empuje la rama de funciones para la verificación de CI
2. Implementar en el entorno de preparación/vista previa
3. Realice pruebas de humo en la puesta en escena.
4. Fusionar con `main` para implementación en producción

## Compatibilidad de versiones

### Nodo.js

La versión mínima está definida en `package.json` :

```json
{ "engines": { "node": ">=20.19.0" } }
```

### Base de datos

| Proveedor | Apoyado | Notas |
|----------|-----------|-------|
| PostgreSQL 14+ | Sí | Producción recomendada |
| Supabase | Sí | Con agrupación de conexiones |
| Neón | Sí | PostgreSQL sin servidor |

### Plataformas

| Plataforma | Estado | Notas |
|----------|--------|-------|
| Vercel | Objetivo principal | Soporte completo para cron, vista previa y borde |
| acoplador | Apoyado | Salida independiente para contenedores |
| Autohospedado | Apoyado | Requiere gestión de procesos |

## Solución de problemas de actualizaciones

| Síntoma | Causa probable | Solución |
|---------|-------------|---------|
| La compilación falla | Departamentos incompatibles | Ejecute `pnpm outdated` , resuelva conflictos entre pares |
| Errores de base de datos al iniciar | Migraciones no aplicadas | `pnpm db:generate && pnpm db:migrate` |
| Autenticación rota | La configuración del proveedor cambió | Comparar `auth.config.ts` con aguas arriba |
| Traducciones faltantes | Nuevas claves agregadas | Marque `messages/` para ver si faltan entradas |
| Estilo roto | La configuración de Tailwind cambió | Comparar `tailwind.config.ts` |
| Los tipos no coinciden | Esquema actualizado | Vuelva a ejecutar `pnpm db:generate` |
