---
id: migration-guide
title: Guida alla migrazione delle versioni
sidebar_label: Guida alla migrazione
sidebar_position: 8
---

# Guida alla migrazione delle versioni

Questa guida tratta l'aggiornamento dell'installazione del modello Ever Works, la gestione delle migrazioni del database tra versioni, la gestione delle modifiche importanti, la scrittura e l'applicazione di script di migrazione e le procedure di rollback.

## Panoramica del flusso di lavoro di aggiornamento

L'aggiornamento del modello segue un processo strutturato per ridurre al minimo i rischi:

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

## Sistema di migrazione del database

### Come funzionano le migrazioni

Il modello utilizza Drizzle ORM con Drizzle Kit per le migrazioni dello schema. Lo schema è definito in `lib/db/schema.ts` e le migrazioni vengono generate come file SQL in `lib/db/migrations/` .

Configurazione in `drizzle.config.ts` :

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

### Comandi di migrazione

| Comando | Scopo | Quando usarlo |
|---------|---------|-----|
| `pnpm db:generate` | Genera SQL dalle modifiche dello schema | Dopo aver modificato `lib/db/schema.ts` |
| `pnpm db:migrate` | Applica migrazioni in sospeso (Drizzle CLI) | Prima di avviare l'app dopo le modifiche |
| `pnpm db:migrate:cli` | Applicare con registrazione dettagliata | Per il debug dei problemi di migrazione |
| `pnpm db:seed` | Compila i dati iniziali | Dopo una nuova migrazione o cambiamenti di semi |
| `pnpm db:studio` | Ispezione visiva del database | Per il debug o la revisione dei dati |

### Struttura dei file di migrazione

Le migrazioni vengono archiviate come file SQL numerati:

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

Drizzle tiene traccia delle migrazioni applicate in `drizzle.__drizzle_migrations` :

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### Generazione di una nuova migrazione

Dopo aver modificato `lib/db/schema.ts` :

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### Migrazioni automatiche

Il modello esegue automaticamente le migrazioni in due posizioni:

**Tempo di costruzione** (tramite `scripts/build-migrate.ts` ):

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

**Runtime** (tramite `instrumentation.ts` ):

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

### Sicurezza della migrazione in base all'ambiente

| Ambiente | Tempo di costruzione | Durata | In caso di fallimento |
|-------------|-----------|---------|------------|
| Produzione | Obbligatorio | Ripiego | La compilazione non riesce/l'app viene lanciata |
| Anteprima | Tollerati errori di connessione | Attivo | Avviso sui registri, l'app si avvia |
| Sviluppo | Non utilizzato | Attivo | Avviso sui registri, l'app si avvia |
| CI (non Vercel) | Saltato | Non utilizzato | N/D |

## Procedure di rollback

### Drizzle non supporta il rollback automatico

Drizzle Kit genera migrazioni forward-only. Per invertire una migrazione:

**Opzione 1: migrazione inversa manuale**

1. Identificare la migrazione problematica nel `lib/db/migrations/` 2. Scrivi manualmente l'SQL inverso:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. Candidati direttamente al database:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. Rimuovere il file di migrazione diretta da `lib/db/migrations/` 5. Aggiorna il diario di Drizzle se necessario

**Opzione 2: ripristino dal backup**

L'approccio di rollback più sicuro per migrazioni complesse:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**Opzione 3: ripristina lo schema e rigenera**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## Aggiornamenti delle dipendenze

### Aggiornamento delle dipendenze

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### Dipendenze critiche

Questi pacchetti richiedono test attenti durante l'aggiornamento:

| Pacchetto | Rischio | Note |
|---------|------|-------|
| `next` | Alto | Le versioni principali modificano API, routing, configurazione |
| `next-auth` | Alto | Modifiche all'API di autenticazione, strategia di sessione |
| `drizzle-orm` / `drizzle-kit` | Alto | API dello schema, modifiche al formato di migrazione |
| `next-intl` | Medio | Modifiche al routing e al caricamento dei messaggi |
| `@sentry/nextjs` | Medio | Compatibilità gancio strumentazione |
| `stripe` | Medio | Versioning dell'API di pagamento |
| `@heroui/react` | Medio | Modifiche alle proprietà del componente dell'interfaccia utente |
| `@trigger.dev/sdk` | Medio | Modifiche all'API di pianificazione dei lavori |

### pnpm Sostituisce

Il modello utilizza le sostituzioni pnpm in `package.json` per forzare versioni coerenti:

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

Quando aggiorni React o esbuild, aggiorna queste sostituzioni in modo che corrispondano.

## Elenco di controllo delle modifiche importanti

Quando esegui l'aggiornamento tra le versioni del modello, esamina ciascuna categoria:

### Modifiche allo schema

- [ ] Confronta `lib/db/schema.ts` con upstream per le colonne nuove/modificate
- [ ] Genera migrazioni: `pnpm db:generate` - [] Esamina l'SQL generato per operazioni distruttive (eliminazioni di colonne, modifiche di tipo)
- [ ] Applicare prima a un database di prova
- [ ] Verifica compatibilità seme: `pnpm db:seed` ### Modifiche al percorso API

- [ ] Controlla i percorsi rinominati o rimossi in `app/api/` - [] Aggiorna le integrazioni esterne e gli URL webhook
- [ ] Verifica che i percorsi dell'endpoint cron corrispondano ancora a `vercel.json` ### Modifiche alla configurazione

- [ ] Confronta `.env.example` per variabili nuove o rinominate
- [ ] Esamina `next.config.ts` modifiche (intestazioni, webpack, plugin)
- [ ] Controlla `vercel.json` per le modifiche alla pianificazione cron
- [ ] Rivedi `drizzle.config.ts` per i cambiamenti di percorso

### Modifiche all'autenticazione

- [ ] Confronta `auth.config.ts` con monte
- [ ] Verificare la compatibilità della strategia di sessione
- [ ] Testare gli URL di callback OAuth
- [ ] Rivedi le definizioni dei permessi in `lib/permissions/definitions.ts` ### Modifiche all'interfaccia utente e allo stile

- [ ] Confronta `tailwind.config.ts` per le modifiche al tema
- [ ] Ispezionare visivamente le pagine principali
- [ ] Prova i layout reattivi
- [ ] Verificare che le personalizzazioni del tema siano ancora applicabili

## Processo di aggiornamento passo dopo passo

### 1. Preparati

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. Unisci a monte

Se monitori il modello come telecomando upstream:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

Risolvere i conflitti, prestando attenzione a:
- `lib/db/schema.ts` -- modifiche allo schema
- `next.config.ts` -- crea configurazione
- `auth.config.ts` -- fornitori di autenticazione
- `package.json` -- versioni delle dipendenze

### 3. Installa e migra

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. Verifica localmente

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. Testare i percorsi critici

| Zona | Cosa testare |
|------|-------------|
| Autenticazione | Accesso, disconnessione, OAuth, persistenza della sessione |
| Pagamenti | Flussi di sottoscrizione, gestione dei webhook |
| Contenuto | Rendering, ricerca, filtraggio della pagina |
| Amministratore | Accesso al dashboard, applicazione RBAC |
| i18n | Cambio di lingua, completezza della traduzione |
| Lavori in background | Registri della console per la registrazione del lavoro |

### 6. Distribuzione

1. Inviare il ramo della funzione per la verifica CI
2. Distribuire nell'ambiente di gestione temporanea/anteprima
3. Eseguire test del fumo sull'allestimento
4. Unisci a `main` per la distribuzione in produzione

## Compatibilità della versione

### Node.js

La versione minima è definita in `package.json` :

```json
{ "engines": { "node": ">=20.19.0" } }
```

### Banca dati

| Fornitore | Supportato | Note |
|----------|-----------|-------|
| PostgreSQL14+ | Sì | Produzione consigliata |
| Supabase | Sì | Con pooling delle connessioni |
| Neon | Sì | PostgreSQL senza server |

### Piattaforme

| Piattaforma | Stato | Note |
|----------|--------|-------|
| Vercella | Obiettivo primario | Supporto completo per cron, anteprima e edge |
| Docker | Supportato | Uscita autonoma per contenitori |
| Ospitato autonomamente | Supportato | Richiede la gestione dei processi |

## Risoluzione dei problemi relativi agli aggiornamenti

| Sintomo | Probabile causa | Soluzione |
|---------|-----|---------|
| La creazione non riesce | Dipendenze incompatibili | Esegui `pnpm outdated` , risolvi i conflitti tra pari |
| Errori DB all'avvio | Migrazioni non applicate | `pnpm db:generate && pnpm db:migrate` |
| Autenticazione interrotta | La configurazione del provider è cambiata | Confrontare `auth.config.ts` con monte |
| Traduzioni mancanti | Aggiunte nuove chiavi | Controllare `messages/` per le voci mancanti |
| Stile rotto | La configurazione di Tailwind è cambiata | Confronta `tailwind.config.ts` |
| Tipi non corrispondenti | Schema aggiornato | Eseguire nuovamente `pnpm db:generate` |
