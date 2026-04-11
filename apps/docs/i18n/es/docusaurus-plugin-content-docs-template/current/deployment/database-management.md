---
id: database-management
title: Gestión de Base de Datos
sidebar_label: Gestión de BD
sidebar_position: 4
---

# Gestión de Base de Datos

El Template Ever Works usa PostgreSQL con Drizzle ORM para todas las operaciones de base de datos. Esta guía cubre la gestión de base de datos en producción, migraciones, pooling de conexiones, monitoreo y el sistema de seeding.

## Arquitectura

| Capa | Archivo | Responsabilidad |
|------|---------|----------------|
| **Configuración** | `drizzle.config.ts` | Ruta del schema, salida de migraciones, dialecto |
| **Conexión** | `lib/db/drizzle.ts` | Pool de conexiones, instancia singleton, lazy init |
| **Config** | `lib/db/config.ts` | URL de base de datos segura para scripts y helpers de entorno |
| **Schema** | `lib/db/schema.ts` | Definiciones de tablas, índices, restricciones |
| **Migraciones** | `lib/db/migrate.ts` | Ejecutor de migraciones idempotente |
| **Inicialización** | `lib/db/initialize.ts` | Auto-migrate, seed, advisory locks |
| **Seeding** | `lib/db/seed.ts` | Datos iniciales: roles, permisos, usuario admin |

## Gestión de Conexiones

### Singleton con Lazy Initialization

La conexión a la base de datos se crea en el primer uso y se almacena en caché via `globalThis` para sobrevivir al HMR en desarrollo. De `lib/db/drizzle.ts`:

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

El objeto `db` exportado usa un Proxy de JavaScript para lazy initialization transparente:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

Esto significa que no se establece ninguna conexión a la base de datos hasta la primera consulta real. Las rutas que no usan la base de datos no tienen overhead de conexión.

### Configuración del Pool de Conexiones

| Configuración | Valor por Defecto Producción | Valor por Defecto Desarrollo | Descripción |
|--------------|------------------------------|------------------------------|-------------|
| `max` | 20 | 10 | Máximo de conexiones en el pool |
| `idle_timeout` | 20 s | 20 s | Cerrar conexiones inactivas después de este tiempo |
| `connect_timeout` | 30 s | 30 s | Timeout para nuevos intentos de conexión |
| `prepare` | false | false | Deshabilitar prepared statements (compatibilidad con Vercel) |

Configurar el tamaño del pool mediante variable de entorno:

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

## Visión General del Schema

El schema en `lib/db/schema.ts` define estas tablas principales:

### Usuarios y Autenticación

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

### Control de Acceso Basado en Roles

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

### Lista Completa de Tablas

| Tabla | Propósito |
|-------|-----------|
| `users` | Cuentas de usuario |
| `accounts` | Vínculos de proveedores OAuth (adaptador NextAuth) |
| `sessions` | Sesiones de usuario activas |
| `roles` | Definiciones de roles con flag admin |
| `permissions` | Definiciones de permisos (recurso:acción) |
| `userRoles` | Asignaciones usuario-rol |
| `rolePermissions` | Asignaciones rol-permiso |
| `clientProfiles` | Perfiles de usuario extendidos para listados del directorio |
| `subscriptions` | Registros de suscripciones de pago |
| `subscriptionHistory` | Historial de cambios de suscripción |
| `paymentProviders` | Configuración de pago multi-proveedor |
| `paymentAccounts` | Detalles de cuenta específicos del proveedor |
| `activityLogs` | Registro de auditoría de acciones del usuario |
| `comments` | Comentarios de usuarios en elementos |
| `votes` | Votos/valoraciones de usuarios |
| `favorites` | Favoritos/marcadores del usuario |
| `notifications` | Notificaciones in-app |
| `seedStatus` | Seguimiento del seed (registro singleton) |

## Sistema de Migraciones

### Comandos de Migración

| Comando | Script | Descripción |
|---------|--------|-------------|
| `pnpm db:generate` | `drizzle-kit generate` | Genera SQL a partir de cambios en el schema |
| `pnpm db:migrate` | `drizzle-kit migrate` | Aplica migraciones pendientes (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | Aplica migraciones con registro detallado |
| `pnpm db:studio` | `drizzle-kit studio` | Abre la GUI de Drizzle Studio |

### Ejecutor de Migraciones Idempotente

El ejecutor de migraciones en `lib/db/migrate.ts` es seguro de llamar en cada inicio de la aplicación:

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

## Inicialización de la Base de Datos

### Inicialización Automática al Arranque

El archivo `instrumentation.ts` activa `initializeDatabase()` en cada inicio de la aplicación:

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

### Credenciales de Admin

En producción, definir credenciales de admin explícitas:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

## Monitoreo

### Drizzle Studio

Navega la base de datos con una interfaz gráfica:

```bash
pnpm db:studio
```

### Verificación del Estado de la Base de Datos

El endpoint `/api/health` puede verificar la conectividad con la base de datos:

```bash
curl -s https://yourdomain.com/api/health
```

## Archivos Relacionados

| Archivo | Propósito |
|---------|-----------|
| `drizzle.config.ts` | Configuración de Drizzle Kit |
| `lib/db/config.ts` | Helpers de entorno seguros para scripts |
| `lib/db/drizzle.ts` | Pool de conexiones y singleton |
| `lib/db/schema.ts` | Definiciones completas del schema |
| `lib/db/migrate.ts` | Ejecutor de migraciones idempotente |
| `lib/db/initialize.ts` | Auto-migrate, seeding, gestión de locks |
| `lib/db/seed.ts` | Lógica de seeding de la base de datos |
| `scripts/build-migrate.ts` | Ejecutor de migraciones en tiempo de build |
| `scripts/cli-migrate.ts` | CLI de migraciones manual |
| `scripts/cli-seed.ts` | CLI de seed manual |
| `scripts/clean-database.js` | Utilidad de reset de la base de datos |
