---
id: migrations-guide
title: Guida alle migrazioni
sidebar_label: Migrazioni
sidebar_position: 4
---

# Guida alle migrazioni

Il modello Ever Works utilizza **Drizzle Kit** per le migrazioni del database. Le migrazioni sono file SQL che tengono traccia delle modifiche dello schema nel tempo, garantendo la coerenza dello stato del database tra ambienti e membri del team.

## Come funzionano le migrazioni

Drizzle Kit confronta la definizione dello schema corrente (`lib/db/schema.ts`) con le migrazioni generate in precedenza e produce file di migrazione SQL per eventuali differenze.

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

## Struttura della directory di migrazione

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

La directory `meta/` contiene i metadati di tracciamento interni di Drizzle Kit. I file `relations.ts` e `schema.ts` nella directory delle migrazioni sono snapshot di riferimento e non devono essere modificati manualmente.

## Comandi

### Genera una migrazione

Dopo aver modificato `lib/db/schema.ts`, genera una migrazione:

```bash
pnpm db:generate
```

Viene eseguito `drizzle-kit generate` che:
1. Legge lo schema corrente da `lib/db/schema.ts`
2. Lo confronta con l'ultimo snapshot di migrazione
3. Genera un nuovo file SQL in `lib/db/migrations/`
4. Aggiorna i metadati di migrazione in `meta/`

### Esegui migrazioni in sospeso

Applica eventuali migrazioni non applicate al tuo database:

```bash
pnpm db:migrate
```

Questo chiama `lib/db/migrate.ts` che:
1. Si connette al database utilizzando `DATABASE_URL`
2. Controlla la tabella `drizzle.__drizzle_migrations` per le migrazioni applicate
3. Esegue tutte le migrazioni che non sono state applicate
4. Aggiorna la tabella di monitoraggio

### Apri Drizzle Studio

Avvia un editor di database visivo:

```bash
pnpm db:studio
```

## Runner di migrazione (`lib/db/migrate.ts`)

Il corridore della migrazione (`runMigrations()`) è idempotente e sicuro da invocare su ogni startup:

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

Comportamenti chiave:
- **Idempotente**: Drizzle tiene traccia delle migrazioni applicate in `drizzle.__drizzle_migrations`; le migrazioni già applicate vengono saltate
- **Logging**: riporta le migrazioni applicate recenti prima e dopo l'esecuzione
- **Gestione degli errori**: restituisce `false` in caso di errore con messaggi di errore dettagliati
- **Avvio automatico**: richiamato durante l'avvio dell'applicazione tramite `lib/db/initialize.ts`

## Migrazione automatica all'avvio

Il modello esegue automaticamente le migrazioni all'avvio dell'applicazione. Questo viene attivato da `instrumentation.ts` che chiama `initializeDatabase()` da `lib/db/initialize.ts`.

Il flusso di avvio:
1. Controlla se `DATABASE_URL` è configurato (salta in caso contrario)
2. Esegui tutte le migrazioni in sospeso
3. Controlla se il database è stato seminato
4. Se non è stato eseguito il seeding, acquisire un blocco consultivo ed eseguire il seeding

Nella produzione, gli errori di migrazione generano un errore da segnalare ai sistemi di monitoraggio. Negli ambienti di sviluppo e anteprima, l'applicazione continua con un avviso.

## Creazione di nuove migrazioni

### Passaggio 1: modificare lo schema

Modifica `lib/db/schema.ts` per aggiungere, modificare o rimuovere le definizioni di tabella:

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

### Passaggio 2: generare la migrazione

```bash
pnpm db:generate
```

Questo crea un nuovo file SQL come `0029_some_name.sql`.

### Passaggio 3: rivedere l'SQL generato

Esamina sempre la migrazione generata prima di applicarla. Controlla:
- Correggere i nomi di tabelle e colonne
- Tipi di dati e vincoli corretti
- Definizioni dell'indice
- Relazioni di chiave esterna
- Eventuali operazioni distruttive (DROP TABLE, DROP COLUMN)

### Passaggio 4: applicare la migrazione

```bash
pnpm db:migrate
```

### Passaggio 5: impegnarsi

Effettua il commit sia della modifica dello schema che del file di migrazione generato:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (metadati aggiornati)

## Flusso di lavoro del team

### Gestione delle modifiche simultanee dello schema

Quando più membri del team modificano lo schema contemporaneamente:

1. Ogni sviluppatore genera la propria migrazione localmente
2. Durante l'unione, potrebbe essere necessario rinumerare i file di migrazione se i numeri di sequenza sono in conflitto
3. Drizzle Kit tiene traccia delle migrazioni in base all'hash, non al numero, quindi viene gestita l'esecuzione fuori ordine
4. Dopo l'unione, esegui `pnpm db:migrate` per applicare tutte le nuove migrazioni

### Considerazioni sull'ambiente

|Ambiente|Strategia sulla migrazione|
|-------------|-------------------|
|Sviluppo|Esecuzione automatica all'avvio; generare e testare localmente|
|Anteprima/Allestimento|Esecuzione automatica al momento della distribuzione tramite `instrumentation.ts`|
|Produzione|Esecuzione automatica al momento della distribuzione; monitorare i guasti|

### Migliori pratiche

1. **Una preoccupazione per migrazione**: concentra le migrazioni su una singola funzionalità o modifica
2. **Non modificare mai le migrazioni esistenti**: una volta applicata una migrazione ovunque, trattala come immutabile
3. **Esamina l'SQL generato**: controlla sempre cosa genera Drizzle Kit prima di applicarlo
4. **Migrazioni di prova**: esegui le migrazioni su un database di prova prima della distribuzione in produzione
5. **Includi file di migrazione nella revisione del codice**: l'SQL di migrazione deve essere rivisto proprio come il codice dell'applicazione
6. **Esegui il backup prima delle migrazioni distruttive**: esegui sempre il backup prima di eseguire migrazioni che eliminano tabelle o colonne
