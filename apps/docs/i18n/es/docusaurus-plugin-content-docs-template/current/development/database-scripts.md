---
id: database-scripts
title: "Scripts de Base de Datos"
sidebar_label: "Scripts BD"
sidebar_position: 10
---

# Scripts de Base de Datos

La plantilla proporciona un conjunto de scripts de gestión de base de datos para migraciones, seeding y mantenimiento. Estos scripts usan Drizzle ORM y están diseñados para funcionar en desarrollo local, pipelines de CI/CD y despliegues de producción en Vercel.

## Inventario de Scripts

| Script | Comando | Propósito |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | Ejecutor de migración en tiempo de construcción |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Migración interactiva manual |
| `cli-seed.ts` | `pnpm db:seed` | Punto de entrada CLI para seeding |
| `seed.ts` | Ejecución directa | Seeder completo de base de datos |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Configuración del catálogo de productos Stripe |
| `clean-database.js` | `node scripts/clean-database.js` | Reinicio nuclear (elimina todo) |

## Scripts de Migración

### Migración en Tiempo de Construcción (build-migrate.ts)

Se ejecuta automáticamente durante `pnpm build` en despliegues de Vercel. Diseñado para actualizaciones de esquema sin tiempo de inactividad.

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

**Comportamiento por Entorno:**

| Entorno | Fallo de migración | Error de conexión | Error de autenticación |
|---|---|---|---|
| Producción (`VERCEL_ENV=production`) | Build falla | Build falla | Build falla |
| Preview (`VERCEL_ENV=preview`) | Build falla | Build pasa (advertencia) | Build falla |
| CI (GitHub Actions) | Omitido completamente | Omitido completamente | Omitido completamente |
| Desarrollo local | Build falla | Build falla | Build falla |

**Verificación de Esquema:**

Después de una migración exitosa, el script verifica que existan columnas críticas:

```typescript
// Verified columns in client_profiles table:
const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
```

### CLI de Migración Manual (cli-migrate.ts)

Herramienta de migración interactiva para ejecución manual contra cualquier base de datos.

```bash
# Using package.json script
pnpm db:migrate:cli

# Direct execution with custom database
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

**Proceso de Tres Pasos:**

1. **Verificar Estado Actual** -- Consulta la tabla `drizzle.__drizzle_migrations` para el historial de migraciones aplicadas
2. **Ejecutar Migraciones** -- Llama a `runMigrations()` desde `lib/db/migrate.ts`
3. **Verificar Esquema** -- Confirma que existen las columnas requeridas

## Scripts de Seeding

### Seeder de Base de Datos (seed.ts)

Puebla la base de datos con datos de prueba realistas. Solo hace seed si las tablas están vacías.

```bash
DATABASE_URL=postgres://... pnpm seed
```

**Orden de Seeding y Dependencias:**

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

**Datos Generados:**

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

### Punto de Entrada CLI Seed (cli-seed.ts)

Script envolvente que carga variables de entorno y delega a `lib/db/seed.ts`.

El script busca archivos de entorno en este orden:
1. `.env.local` (preferido)
2. `.env` (alternativo)
3. Solo variables de entorno del sistema (si ningún archivo existe)

### Seeder de Productos Stripe (seed-stripe-products.ts)

Crea el catálogo completo de productos Stripe con planes de suscripción y elementos de compra única.

```bash
npx tsx scripts/seed-stripe-products.ts
```

**Requerido:** `STRIPE_SECRET_KEY` en `.env.local`

**Productos y Precios:**

| Producto | Clave del Plan | Tipo de Precio | Metadatos |
|---|---|---|---|
| Free | `free` | Suscripción ($0/mes) | `type: subscription` |
| Standard | `standard` | $10/mes, $96/año | `annualDiscount: 20` |
| Premium | `premium` | $20/mes, $180/año | `annualDiscount: 25` |
| Anuncio Patrocinado - Semanal | `sponsor_weekly` | $100 único | `type: sponsor_ad` |
| Anuncio Patrocinado - Mensual | `sponsor_monthly` | $300 único | `type: sponsor_ad` |

## Limpieza de Base de Datos

### clean-database.js

Elimina todas las tablas y el esquema de seguimiento de migraciones Drizzle. Proporciona un reinicio completo de la base de datos.

```bash
node scripts/clean-database.js
```

**Operaciones realizadas:**

1. Elimina todas las tablas en el esquema `public` usando `CASCADE`
2. Elimina el esquema `drizzle` (historial de migraciones)

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

**Advertencia:** Esta operación es irreversible. Siempre crea una copia de seguridad antes de ejecutar en cualquier entorno con datos reales.

## Flujos de Trabajo Comunes

### Configuración de Desarrollo Fresco

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

### Reiniciar y Re-sembrar

```bash
# 1. Clean everything
node scripts/clean-database.js

# 2. Re-apply migrations
pnpm db:migrate:cli

# 3. Re-seed
pnpm db:seed
```

## Variables de Entorno

| Variable | Requerida por | Propósito |
|---|---|---|
| `DATABASE_URL` | Todos los scripts | Cadena de conexión PostgreSQL |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | Establece `true` para omitir migraciones de build |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | Clave API de Stripe para creación de productos |
| `SEED_ADMIN_EMAIL` | seed.ts (via lib) | Email de la cuenta de administrador |
| `SEED_ADMIN_PASSWORD` | seed.ts (via lib) | Contraseña de la cuenta de administrador |

## Manejo de Errores

Todos los scripts de base de datos siguen estas convenciones:

- Código de salida `0` para éxito o condiciones de omisión aceptables
- Código de salida `1` para fallos que deben detener el pipeline
- Las cadenas de conexión están enmascaradas en los logs (`://***:***@`)
- Los mensajes de error detallados se registran en el lado del servidor
- Los errores de producción siempre fallan el build (sin silenciamiento)
