---
id: migrations-guide
title: Gids voor migraties
sidebar_label: Migraties
sidebar_position: 4
---

# Gids voor migraties

De Ever Works-sjabloon gebruikt **Drizzle Kit** voor databasemigraties. Migraties zijn SQL-bestanden die schemawijzigingen in de loop van de tijd bijhouden, waardoor een consistente databasestatus in alle omgevingen en teamleden wordt gegarandeerd.

## Hoe migraties werken

Drizzle Kit vergelijkt de huidige schemadefinitie (`lib/db/schema.ts`) met eerder gegenereerde migraties en produceert SQL-migratiebestanden voor eventuele verschillen.

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

## Migratiedirectorystructuur

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

De map `meta/` bevat de interne tracking-metagegevens van Drizzle Kit. De bestanden `relations.ts` en `schema.ts` in de migratiedirectory zijn referentiemomentopnamen en mogen niet handmatig worden bewerkt.

## Commando's

### Genereer een migratie

Genereer een migratie na het wijzigen van `lib/db/schema.ts`:

```bash
pnpm db:generate
```

Deze voert `drizzle-kit generate` uit, wat:
1. Leest het huidige schema van `lib/db/schema.ts`
2. Vergelijkt het met de nieuwste migratiemomentopname
3. Genereert een nieuw SQL-bestand in `lib/db/migrations/`
4. Werkt de migratiemetagegevens bij in `meta/`

### Voer lopende migraties uit

Pas eventuele niet-toegepaste migraties toe op uw database:

```bash
pnpm db:migrate
```

Dit roept `lib/db/migrate.ts` aan, wat:
1. Maakt verbinding met de database via `DATABASE_URL`
2. Controleert de `drizzle.__drizzle_migrations` tabel op toegepaste migraties
3. Voert alle migraties uit die nog niet zijn toegepast
4. Werkt de trackingtabel bij

### Open Drizzle Studio

Start een visuele database-editor:

```bash
pnpm db:studio
```

## Migratie Runner (`lib/db/migrate.ts`)

De migratierunner (`runMigrations()`) is idempotent en veilig te gebruiken bij elke startup:

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

Belangrijkste gedragingen:
- **Idempotent**: Drizzle volgt toegepaste migraties in `drizzle.__drizzle_migrations`; reeds toegepaste migraties worden overgeslagen
- **Logboekregistratie**: rapporteert recent toegepaste migraties voor en na de uitvoering
- **Foutafhandeling**: Retourneert `false` bij een fout met gedetailleerde foutmeldingen
- **Automatisch opstarten**: gebeld tijdens het opstarten van de applicatie via `lib/db/initialize.ts`

## Automatische migratie bij opstarten

De sjabloon voert automatisch migraties uit wanneer de applicatie start. Dit wordt geactiveerd door `instrumentation.ts`, die `initializeDatabase()` aanroept vanuit `lib/db/initialize.ts`.

De opstartstroom:
1. Controleer of `DATABASE_URL` is geconfigureerd (overslaan indien niet)
2. Voer alle lopende migraties uit
3. Controleer of de database is geplaatst
4. Indien niet gezaaid, zorg dan voor een adviesslot en voer zaad uit

In de productie zorgen migratiefouten voor een signaal naar de bewakingssystemen. In ontwikkel- en preview-omgevingen gaat de applicatie verder met een waarschuwing.

## Nieuwe migraties creëren

### Stap 1: Wijzig het schema

Bewerk `lib/db/schema.ts` om tabeldefinities toe te voegen, te wijzigen of te verwijderen:

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

### Stap 2: Genereer de migratie

```bash
pnpm db:generate
```

Hierdoor wordt een nieuw SQL-bestand gemaakt, zoals `0029_some_name.sql`.

### Stap 3: Bekijk de gegenereerde SQL

Controleer altijd de gegenereerde migratie voordat u deze toepast. Controleer op:
- Correcte tabel- en kolomnamen
- Juiste gegevenstypen en beperkingen
- Indexdefinities
- Buitenlandse sleutelrelaties
- Eventuele destructieve bewerkingen (DROP TABLE, DROP COLUMN)

### Stap 4: Pas de migratie toe

```bash
pnpm db:migrate
```

### Stap 5: Toewijden

Voer zowel de schemawijziging als het gegenereerde migratiebestand door:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (bijgewerkte metagegevens)

## Teamwerkstroom

### Gelijktijdige schemawijzigingen verwerken

Wanneer meerdere teamleden het schema tegelijkertijd wijzigen:

1. Elke ontwikkelaar genereert lokaal zijn eigen migratie
2. Bij het samenvoegen moeten migratiebestanden mogelijk opnieuw worden genummerd als de volgnummers conflicteren
3. Drizzle Kit houdt migraties bij op basis van hash, niet op nummer, zodat uitvoering buiten de juiste volgorde wordt afgehandeld
4. Voer na het samenvoegen `pnpm db:migrate` uit om alle nieuwe migraties toe te passen

### Milieuoverwegingen

|Milieu|Migratiestrategie|
|-------------|-------------------|
|Ontwikkeling|Automatisch uitvoeren bij opstarten; lokaal genereren en testen|
|Preview/Staging|Automatisch uitvoeren bij implementatie via `instrumentation.ts`|
|Productie|Automatisch uitvoeren bij implementatie; monitoren op fouten|

### Beste praktijken

1. **Eén zorg per migratie**: Houd migraties gericht op één functie of wijziging
2. **Bewerk nooit bestaande migraties**: zodra een migratie ergens is toegepast, moet u deze als onveranderlijk behandelen
3. **Review gegenereerde SQL**: Controleer altijd wat Drizzle Kit genereert voordat u zich aanmeldt
4. **Testmigraties**: voer migraties uit op een testdatabase voordat u deze naar productie implementeert
5. **Migratiebestanden opnemen in codebeoordeling**: Migratie-SQL moet net als applicatiecode worden beoordeeld
6. **Back-up maken vóór destructieve migraties**: maak altijd een back-up voordat u migraties uitvoert waarbij tabellen of kolommen worden verwijderd
