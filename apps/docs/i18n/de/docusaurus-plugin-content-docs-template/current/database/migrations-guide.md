---
id: migrations-guide
title: Migrationsleitfaden
sidebar_label: Migrationen
sidebar_position: 4
---

# Migrationsleitfaden

Die Ever Works-Vorlage verwendet **Drizzle Kit** für Datenbankmigrationen. Migrationen sind SQL-Dateien, die Schemaänderungen im Laufe der Zeit verfolgen und so einen konsistenten Datenbankstatus über Umgebungen und Teammitglieder hinweg sicherstellen.

## Wie Migrationen funktionieren

Drizzle Kit vergleicht die aktuelle Schemadefinition (`lib/db/schema.ts`) mit zuvor generierten Migrationen und erstellt SQL-Migrationsdateien für etwaige Unterschiede.

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

## Struktur des Migrationsverzeichnisses

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

Das Verzeichnis `meta/` enthält die internen Tracking-Metadaten von Drizzle Kit. Die Dateien `relations.ts` und `schema.ts` im Migrationsverzeichnis sind Referenz-Snapshots und sollten nicht manuell bearbeitet werden.

## Befehle

### Generieren Sie eine Migration

Generieren Sie nach der Änderung von `lib/db/schema.ts` eine Migration:

```bash
pnpm db:generate
```

Dies führt `drizzle-kit generate` aus, was:
1. Liest das aktuelle Schema von `lib/db/schema.ts`
2. Vergleicht es mit dem neuesten Migrations-Snapshot
3. Erzeugt eine neue SQL-Datei in `lib/db/migrations/`
4. Aktualisiert die Migrationsmetadaten in `meta/`

### Führen Sie ausstehende Migrationen aus

Wenden Sie alle nicht angewendeten Migrationen auf Ihre Datenbank an:

```bash
pnpm db:migrate
```

Dies ruft `lib/db/migrate.ts` auf, was:
1. Verbindet sich mit der Datenbank über `DATABASE_URL`
2. Überprüft die Tabelle `drizzle.__drizzle_migrations` auf angewendete Migrationen
3. Führt alle Migrationen aus, die nicht angewendet wurden
4. Aktualisiert die Tracking-Tabelle

### Öffnen Sie Drizzle Studio

Starten Sie einen visuellen Datenbankeditor:

```bash
pnpm db:studio
```

## Migrationsläufer (`lib/db/migrate.ts`)

Der Migration Runner (`runMigrations()`) ist idempotent und kann bei jedem Start sicher aufgerufen werden:

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

Wichtige Verhaltensweisen:
- **Idempotent**: Drizzle verfolgt angewandte Migrationen in `drizzle.__drizzle_migrations`; Bereits angewendete Migrationen werden übersprungen
- **Protokollierung**: Meldet kürzlich durchgeführte Migrationen vor und nach der Ausführung
- **Fehlerbehandlung**: Gibt bei einem Fehler `false` mit detaillierten Fehlermeldungen zurück
- **Autostart**: Wird während des Anwendungsstarts über `lib/db/initialize.ts` aufgerufen.

## Automatische Migration beim Start

Die Vorlage führt Migrationen automatisch aus, wenn die Anwendung gestartet wird. Dies wird durch `instrumentation.ts` ausgelöst, das `initializeDatabase()` von `lib/db/initialize.ts` aufruft.

Der Startablauf:
1. Überprüfen Sie, ob `DATABASE_URL` konfiguriert ist (überspringen Sie es, wenn nicht).
2. Führen Sie alle ausstehenden Migrationen aus
3. Überprüfen Sie, ob die Datenbank geseed wurde
4. Wenn kein Seed vorhanden ist, besorgen Sie sich eine Empfehlungssperre und führen Sie den Seed aus

In der Produktion lösen Migrationsfehler einen Fehler aus, der an Überwachungssysteme gemeldet wird. In Entwicklungs- und Vorschauumgebungen wird die Anwendung mit einer Warnung fortgesetzt.

## Neue Migrationen erstellen

### Schritt 1: Ändern Sie das Schema

Bearbeiten Sie `lib/db/schema.ts`, um Tabellendefinitionen hinzuzufügen, zu ändern oder zu entfernen:

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

### Schritt 2: Generieren Sie die Migration

```bash
pnpm db:generate
```

Dadurch wird eine neue SQL-Datei wie `0029_some_name.sql` erstellt.

### Schritt 3: Überprüfen Sie die generierte SQL

Überprüfen Sie immer die generierte Migration, bevor Sie sie anwenden. Prüfen Sie auf:
- Korrekte Tabellen- und Spaltennamen
- Richtige Datentypen und Einschränkungen
- Indexdefinitionen
- Fremdschlüsselbeziehungen
- Alle destruktiven Operationen (DROP TABLE, DROP COLUMN)

### Schritt 4: Wenden Sie die Migration an

```bash
pnpm db:migrate
```

### Schritt 5: Commit

Übernehmen Sie sowohl die Schemaänderung als auch die generierte Migrationsdatei:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (aktualisierte Metadaten)

## Team-Workflow

### Umgang mit gleichzeitigen Schemaänderungen

Wenn mehrere Teammitglieder das Schema gleichzeitig ändern:

1. Jeder Entwickler generiert lokal seine eigene Migration
2. Beim Zusammenführen müssen Migrationsdateien möglicherweise neu nummeriert werden, wenn Sequenznummernkonflikte auftreten
3. Drizzle Kit verfolgt Migrationen nach Hash und nicht nach Anzahl, sodass Ausführungen außerhalb der Reihenfolge behandelt werden
4. Führen Sie nach dem Zusammenführen `pnpm db:migrate` aus, um alle neuen Migrationen anzuwenden

### Überlegungen zur Umwelt

|Umwelt|Migrationsstrategie|
|-------------|-------------------|
|Entwicklung|Automatische Ausführung beim Start; lokal generieren und testen|
|Vorschau/Inszenierung|Automatische Ausführung bei Bereitstellung über `instrumentation.ts`|
|Produktion|Automatische Ausführung bei Bereitstellung; auf Fehler überwachen|

### Best Practices

1. **Ein Anliegen pro Migration**: Konzentrieren Sie sich bei Migrationen auf eine einzelne Funktion oder Änderung
2. **Bearbeiten Sie niemals vorhandene Migrationen**: Sobald eine Migration irgendwo angewendet wurde, behandeln Sie sie als unveränderlich
3. **Generiertes SQL überprüfen**: Überprüfen Sie immer, was Drizzle Kit generiert, bevor Sie es anwenden
4. **Testmigrationen**: Führen Sie Migrationen anhand einer Testdatenbank durch, bevor Sie sie in der Produktion bereitstellen
5. **Migrationsdateien in die Codeüberprüfung einbeziehen**: Migrations-SQL sollte genau wie Anwendungscode überprüft werden
6. **Sichern Sie vor destruktiven Migrationen**: Führen Sie immer eine Sicherung durch, bevor Sie Migrationen ausführen, bei denen Tabellen oder Spalten gelöscht werden
