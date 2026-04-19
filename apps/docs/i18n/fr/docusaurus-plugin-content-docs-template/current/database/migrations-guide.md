---
id: migrations-guide
title: Guide des migrations
sidebar_label: Migrations
sidebar_position: 4
---

# Guide des migrations

Le modèle Ever Works utilise **Drizzle Kit** pour les migrations de bases de données. Les migrations sont des fichiers SQL qui suivent les modifications du schéma au fil du temps, garantissant ainsi un état cohérent de la base de données dans tous les environnements et parmi les membres de l'équipe.

## Comment fonctionnent les migrations

Drizzle Kit compare la définition de schéma actuelle (`lib/db/schema.ts`) aux migrations générées précédemment et produit des fichiers de migration SQL pour toutes les différences.

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

## Structure du répertoire de migration

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

Le répertoire `meta/` contient les métadonnées de suivi internes de Drizzle Kit. Les fichiers `relations.ts` et `schema.ts` du répertoire migrations sont des instantanés de référence et ne doivent pas être modifiés manuellement.

## Commandes

### Générer une migration

Après avoir modifié `lib/db/schema.ts`, générez une migration :

```bash
pnpm db:generate
```

Cela exécute `drizzle-kit generate` qui :
1. Lit le schéma actuel à partir de `lib/db/schema.ts`
2. Le compare au dernier instantané de migration
3. Génère un nouveau fichier SQL dans `lib/db/migrations/`
4. Met à jour les métadonnées de migration dans `meta/`

### Exécuter des migrations en attente

Appliquez toutes les migrations non appliquées à votre base de données :

```bash
pnpm db:migrate
```

Cela appelle `lib/db/migrate.ts` qui :
1. Se connecte à la base de données en utilisant `DATABASE_URL`
2. Vérifie la table `drizzle.__drizzle_migrations` pour les migrations appliquées
3. Exécute toutes les migrations qui n'ont pas été appliquées
4. Met à jour le tableau de suivi

### Ouvrir Drizzle Studio

Lancez un éditeur visuel de base de données :

```bash
pnpm db:studio
```

## Exécuteur de migration (`lib/db/migrate.ts`)

Le coureur de migration (`runMigrations()`) est idempotent et peut être utilisé en toute sécurité par chaque startup :

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

Comportements clés :
- **Idempotent** : Drizzle suit les migrations appliquées dans `drizzle.__drizzle_migrations` ; les migrations déjà appliquées sont ignorées
- **Journalisation** : signale les migrations appliquées récentes avant et après l'exécution.
- **Gestion des erreurs** : renvoie `false` en cas d'échec avec des messages d'erreur détaillés
- **Démarrage automatique** : appelé lors du démarrage de l'application via `lib/db/initialize.ts`

## Migration automatique au démarrage

Le modèle exécute automatiquement les migrations au démarrage de l'application. Ceci est déclenché par `instrumentation.ts` qui appelle `initializeDatabase()` depuis `lib/db/initialize.ts`.

Le flux de démarrage :
1. Vérifiez si `DATABASE_URL` est configuré (ignorez-le sinon)
2. Exécuter toutes les migrations en attente
3. Vérifiez si la base de données a été amorcée
4. S'il n'est pas amorcé, obtenez un verrou consultatif et exécutez l'amorçage

En production, les échecs de migration génèrent une erreur à signaler aux systèmes de surveillance. Dans les environnements de développement et de préversion, l'application continue avec un avertissement.

## Créer de nouvelles migrations

### Étape 1 : modifier le schéma

Modifiez `lib/db/schema.ts` pour ajouter, modifier ou supprimer des définitions de table :

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

### Étape 2 : générer la migration

```bash
pnpm db:generate
```

Cela crée un nouveau fichier SQL comme `0029_some_name.sql`.

### Étape 3 : Vérifiez le SQL généré

Examinez toujours la migration générée avant de l’appliquer. Vérifiez :
- Corriger les noms de tables et de colonnes
- Types de données et contraintes appropriés
- Définitions d'index
- Relations de clé étrangère
- Toute opération destructrice (DROP TABLE, DROP COLUMN)

### Étape 4 : appliquer la migration

```bash
pnpm db:migrate
```

### Étape 5 : S'engager

Validez à la fois la modification du schéma et le fichier de migration généré :
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (métadonnées mises à jour)

## Flux de travail d'équipe

### Gestion des modifications de schéma simultanées

Lorsque plusieurs membres de l'équipe modifient le schéma simultanément :

1. Chaque développeur génère sa propre migration localement
2. Lors de la fusion, les fichiers de migration peuvent devoir être renumérotés en cas de conflit de numéros de séquence.
3. Drizzle Kit suit les migrations par hachage et non par numéro, de sorte que l'exécution dans le désordre est gérée
4. Après la fusion, exécutez `pnpm db:migrate` pour appliquer toutes les nouvelles migrations

### Considérations environnementales

|Environnement|Stratégie migratoire|
|-------------|-------------------|
|Développement|Exécution automatique au démarrage ; générer et tester localement|
|Aperçu/Mise en scène|Exécution automatique lors du déploiement via `instrumentation.ts`|
|Fabrication|Exécution automatique lors du déploiement ; surveiller les pannes|

### Meilleures pratiques

1. **Une préoccupation par migration** : gardez les migrations concentrées sur une seule fonctionnalité ou modification
2. **Ne modifiez jamais les migrations existantes** : une fois qu'une migration a été appliquée n'importe où, traitez-la comme immuable
3. **Examinez le SQL généré** : vérifiez toujours ce que Drizzle Kit génère avant de postuler
4. **Test de migration** : exécutez des migrations sur une base de données de test avant de déployer en production
5. **Inclure les fichiers de migration dans la révision du code** : le code SQL de migration doit être révisé tout comme le code de l'application.
6. **Sauvegarder avant les migrations destructives** : sauvegardez toujours avant d'exécuter des migrations qui suppriment des tables ou des colonnes
