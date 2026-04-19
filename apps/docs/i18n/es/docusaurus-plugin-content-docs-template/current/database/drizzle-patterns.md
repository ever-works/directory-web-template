---
id: drizzle-patterns
title: "Patrones ORM de llovizna"
sidebar_label: "Patrones de llovizna"
sidebar_position: 13
---

# Patrones ORM de llovizna

La plantilla utiliza Drizzle ORM con el dialecto PostgreSQL (`drizzle-orm/postgres-js`). Esta página cubre las convenciones de definición de esquemas, tipos de columnas, estrategias de índice, definiciones de relaciones, flujo de trabajo de migración y los patrones del generador de consultas utilizados en todo el código base.

## Definición de esquema (`lib/db/schema.ts`)

### Estructura de la mesa

Las tablas se definen con `pgTable` y siguen un patrón consistente:

```typescript
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text('email').unique(),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at')
  },
  (table) => ({
    createdAtIndex: index('users_created_at_idx').on(table.createdAt)
  })
);
```

### Uso del tipo de columna

|Tipo de llovizna|Tipo PostgreSQL|Utilizado para|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|ID, correos electrónicos, nombres, slugs, URL|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|Los campos de fecha se devuelven como JS `Date`|
|`timestamp('col')`|`TIMESTAMP`|Campos de fecha con modo predeterminado|
|`boolean('col')`|`BOOLEAN`|Banderas (isAdmin, isActive, etc.)|
|`integer('col')`|`INTEGER`|Contadores numéricos, OAuth expires_at|
|`serial('col')`|`SERIAL`|ID de incremento automático|
|`varchar('col', { length: N })`|`VARCHAR(N)`|Cadenas de longitud limitada|
|`jsonb('col')`|`JSONB`|Metadatos estructurados|
|`doublePrecision('col')`|`DOUBLE PRECISION`|Coordenadas de latitud/longitud|

### Claves primarias UUID

Todas las tablas utilizan columnas `text` con `crypto.randomUUID()` como función predeterminada:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### Columnas de enumeración

Las enumeraciones de cadenas se definen en línea en la columna:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### Claves primarias compuestas

Las tablas de unión utilizan `primaryKey` con varias columnas:

```typescript
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => ({
    rolePermissionPk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  })
);
```

### Claves foráneas

Las claves externas utilizan `.references()` en línea con eliminación en cascada:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### Definiciones de índice

Los índices se definen en el tercer argumento de `pgTable`:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

Patrones de índice comunes:
- `createdAt` índices en la mayoría de las tablas para clasificación basada en el tiempo
- Índices de estado/marca para consultas de filtro
- Índices de correo electrónico para consultas de búsqueda
- Índices de proveedores para consultas de cuentas de autenticación

### Verificar restricciones

Utilizado para la validación de dominio a nivel de base de datos:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## Inferencia de tipos

Drizzle infiere automáticamente los tipos de TypeScript a partir de las definiciones de tablas:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

Estos tipos inferidos se exportan directamente desde `lib/db/schema.ts` y se utilizan en toda la capa de consulta.

## Relaciones (`lib/db/migrations/relations.ts`)

Las relaciones se definen por separado utilizando el asistente `relations()` para la API de consulta relacional de Drizzle:

```typescript
import { relations } from "drizzle-orm/relations";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  activityLogs: many(activityLogs),
  clientProfiles: many(clientProfiles),
  favorites: many(favorites),
  notifications: many(notifications),
  paymentAccounts: many(paymentAccounts),
  subscriptions: many(subscriptions),
  userRoles: many(userRoles),
}));

export const clientProfilesRelations = relations(clientProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [clientProfiles.userId],
    references: [users.id]
  }),
  comments: many(comments),
  votes: many(votes),
}));
```

### Tipos de relación

|ayudante|Cardinalidad|Ejemplo|
|--------|------------|---------|
|`one()`|muchos a uno|`clientProfile -> user`|
|`many()`|Uno a muchos|`user -> accounts`|

## Flujo de trabajo de migración

### Configuración del kit de llovizna

```typescript
// drizzle.config.ts
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
```

### Comandos de migración

|Comando|Descripción|
|---------|-------------|
|`pnpm db:generate`|Genere archivos de migración SQL a partir de cambios de esquema|
|`pnpm db:migrate`|Aplicar migraciones pendientes a la base de datos|
|`pnpm db:seed`|Sembrar la base de datos con datos iniciales.|
|`pnpm db:studio`|Abra Drizzle Studio para la gestión visual de bases de datos|

### Corredor de migración

La función `runMigrations()` en `lib/db/migrate.ts` es idempotente y segura de invocar en cada inicio:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

Drizzle rastrea las migraciones aplicadas en la tabla `drizzle.__drizzle_migrations` y solo ejecuta las nuevas.

## Patrones del generador de consultas

### Seleccione con Dónde

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Insertar con retorno

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### Actualizar con regreso

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Eliminar con devolución

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (sobre el conflicto)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### SQL dinámico

Las expresiones SQL sin formato se utilizan para condiciones y agregaciones complejas:

```typescript
import { sql } from 'drizzle-orm';

// Conditional SUM
sql<number>`SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE -1 END)`

// ILIKE search
sql`${clientProfiles.name} ILIKE ${`%${search}%`}`

// COALESCE with subquery
sql<string>`coalesce(
  (SELECT provider FROM ${accounts}
   WHERE ${accounts.userId} = ${clientProfiles.userId}
   LIMIT 1),
  'unknown'
)`

// Date formatting
sql<string>`to_char(${votes.createdAt}, 'IYYY-IW')`
```

### Composición de la condición

Los filtros se construyen dinámicamente y se componen con `and()`:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### Unir patrones

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
