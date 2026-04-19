---
id: drizzle-patterns
title: "Modèles ORM de bruine"
sidebar_label: "Modèles de bruine"
sidebar_position: 13
---

# Modèles ORM de bruine

Le modèle utilise Drizzle ORM avec le dialecte PostgreSQL (`drizzle-orm/postgres-js`). Cette page couvre les conventions de définition de schéma, les types de colonnes, les stratégies d'index, les définitions de relations, le flux de travail de migration et les modèles de générateur de requêtes utilisés dans la base de code.

## Définition du schéma (`lib/db/schema.ts`)

### Structure du tableau

Les tables sont définies avec `pgTable` et suivent un modèle cohérent :

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

### Utilisation du type de colonne

|Type de bruine|Type PostgreSQL|Utilisé pour|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|Identifiants, e-mails, noms, slugs, URL|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|Champs de date renvoyés au format JS `Date`|
|`timestamp('col')`|`TIMESTAMP`|Champs de date avec mode par défaut|
|`boolean('col')`|`BOOLEAN`|Indicateurs (isAdmin, isActive, etc.)|
|`integer('col')`|`INTEGER`|Compteurs numériques, OAuth expires_at|
|`serial('col')`|`SERIAL`|ID à incrémentation automatique|
|`varchar('col', { length: N })`|`VARCHAR(N)`|Chaînes à longueur limitée|
|`jsonb('col')`|`JSONB`|Métadonnées structurées|
|`doublePrecision('col')`|`DOUBLE PRECISION`|Coordonnées latitude/longitude|

### Clés primaires UUID

Toutes les tables utilisent des colonnes `text` avec `crypto.randomUUID()` comme fonction par défaut :

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### Colonnes d'énumération

Les énumérations de chaînes sont définies en ligne sur la colonne :

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### Clés primaires composites

Les tables de jointure utilisent `primaryKey` avec plusieurs colonnes :

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

### Clés étrangères

Les clés étrangères utilisent `.references()` en ligne avec suppression en cascade :

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### Définitions d'index

Les index sont définis dans le troisième argument de `pgTable` :

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

Modèles d'index courants :
- `createdAt` index sur la plupart des tables pour un tri temporel
- Index d'état/d'indicateur pour les requêtes de filtre
- Index de courrier électronique pour les requêtes de recherche
- Index des fournisseurs pour les requêtes de compte d'authentification

### Vérifier les contraintes

Utilisé pour la validation de domaine au niveau de la base de données :

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## Inférence de type

Drizzle déduit automatiquement les types TypeScript à partir des définitions de table :

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

Ces types déduits sont exportés directement depuis `lib/db/schema.ts` et utilisés dans toute la couche de requête.

## Relations (`lib/db/migrations/relations.ts`)

Les relations sont définies séparément à l'aide de l'assistant `relations()` pour l'API de requête relationnelle de Drizzle :

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

### Types de relations

|Aide|Cardinalité|Exemple|
|--------|------------|---------|
|`one()`|Plusieurs-à-un|`clientProfile -> user`|
|`many()`|Un à plusieurs|`user -> accounts`|

## Flux de travail de migration

### Configuration du kit de bruine

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

### Commandes de migration

|Commande|Descriptif|
|---------|-------------|
|`pnpm db:generate`|Générer des fichiers de migration SQL à partir des modifications de schéma|
|`pnpm db:migrate`|Appliquer les migrations en attente à la base de données|
|`pnpm db:seed`|Amorcer la base de données avec les données initiales|
|`pnpm db:studio`|Ouvrez Drizzle Studio pour la gestion visuelle de la base de données|

### Coureur de migration

La fonction `runMigrations()` dans `lib/db/migrate.ts` est idempotente et peut être appelée en toute sécurité à chaque démarrage :

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

Drizzle suit les migrations appliquées dans la table `drizzle.__drizzle_migrations` et n'en exécute que de nouvelles.

## Modèles de générateur de requêtes

### Sélectionnez avec Où

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Insérer avec retour

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### Mettre à jour avec le retour

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Supprimer avec retour

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (sur le conflit)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### SQL dynamique

Les expressions SQL brutes sont utilisées pour les conditions et agrégations complexes :

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

### Composition des conditions

Les filtres sont construits dynamiquement et composés avec `and()` :

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### Joindre des modèles

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
