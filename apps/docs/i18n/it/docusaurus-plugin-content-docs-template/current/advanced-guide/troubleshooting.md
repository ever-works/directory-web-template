---
id: troubleshooting
title: Guida alla risoluzione dei problemi
sidebar_label: Risoluzione dei problemi
sidebar_position: 7
---

# Guida alla risoluzione dei problemi

Questa guida tratta gli errori comuni, le tecniche di debug, l'interpretazione dei log e i problemi ambientali per il modello Ever Works. I problemi sono organizzati per categoria con sintomi, cause e soluzioni.

## Problemi di creazione

### Modulo non trovato durante la compilazione

**Sintomi**: la compilazione fallisce con errori `Module not found: Can't resolve 'postgres'` o simili del modulo nativo Node.js.

**Causa**: Webpack tenta di raggruppare moduli solo server per il bundle client.

**Soluzione**: verificare che il modulo sia elencato in `serverExternalPackages` in `next.config.ts` :

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

Se hai aggiunto una nuova dipendenza solo server, aggiungila a questo array.

### Timeout nella generazione della pagina statica

**Sintomi**: la compilazione fallisce con `Error: Timeout of 180000ms exceeded` durante la generazione statica.

**Causa**: le pagine che recuperano dati esterni durante la fase di creazione superano il timeout.

**Soluzione**: il modello imposta un timeout di 3 minuti:

```typescript
staticPageGenerationTimeout: 180,
```

Per le pagine che richiedono più tempo, aumenta questo valore. In alternativa, passa alle pagine lente al rendering dinamico:

```typescript
export const dynamic = 'force-dynamic';
```

### Directory dei contenuti mancante durante la compilazione

**Sintomi**: la compilazione fallisce perché `.content/data` non esiste.

**Causa**: il contenuto CMS basato su Git non è stato clonato. Lo script `scripts/clone.cjs` viene eseguito durante gli hook `predev` e `prebuild` .

**Soluzione**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### Avvisi sui pacchetti web da Supabase, bcryptjs, postgres, stripe

**Sintomi**: la compilazione produce avvisi su questi pacchetti ma viene completata correttamente.

**Causa**: avvisi noti provenienti da pacchetti che fanno riferimento alle API Node.js non disponibili nel browser.

**Soluzione**: Questi sono già soppressi in `next.config.ts` :

```typescript
config.ignoreWarnings = [
	{ module: /@supabase\/realtime-js/ },
	{ module: /@supabase\/supabase-js/ },
	{ module: /bcryptjs/ },
	{ message: /bcryptjs/ },
	{ module: /postgres/ },
	{ module: /stripe/ }
];
```

Nessuna azione necessaria: gli avvisi non influiscono sull'output della compilazione.

### Memoria insufficiente per l'heap JavaScript

**Sintomi**: la build si blocca con `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` .

**Soluzione**: gli script di build allocano già 8 GB:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

Se la build continua a esaurire la memoria, controlla:

- Generazione eccessiva di pagine statiche (ridurre le pagine create in fase di creazione)
- Dipendenze di grandi dimensioni non strutturate correttamente
- Perdite di memoria negli script in fase di compilazione

## Problemi con il database

### Connessione rifiutata a PostgreSQL

**Sintomi**: L'applicazione fallisce con `connection refused` , `ECONNREFUSED` o `connect ETIMEDOUT` .

**Passaggi diagnostici**:

1. Verifica `DATABASE_URL` in `.env.local` :
    "bash."
    node -e "require('dotenv').config({percorso:'.env.local'}); console.log(process.env.DATABASE_URL ? 'Set': 'Mancante')"
    ```
2. Testare direttamente la connessione: `psql $DATABASE_URL -c "SELECT 1"` 3. Verificare che PostgreSQL sia in esecuzione: `pg_isready` **Cause comuni e soluzioni**:

| Causa | Correzione |
| ---------------------- | ------------------------------------------------------ |
| PostgreSQL non in esecuzione | Avvia il servizio |
| Porta sbagliata | Verifica la porta nella stringa di connessione |
| Banca dati mancante | `createdb your_database_name` |
| Errore di autenticazione | Controllare nome utente/password in `DATABASE_URL` |
| SSL richiesto | Aggiungere `?sslmode=require` alla stringa di connessione |

### Migrazione non riuscita

**Sintomi**: `pnpm db:migrate` fallisce con errori di schema o SQL.

**Soluzione**: utilizzare lo strumento di migrazione CLI dettagliato per il debug:

```bash
pnpm db:migrate:cli
```

Questo mostra:

1. Stato di migrazione attuale (elenco delle migrazioni applicate)
2. Output dettagliato dell'esecuzione della migrazione
3. Verifica dello schema dopo la migrazione

Se le migrazioni sono danneggiate, controlla la tabella di monitoraggio di Drizzle:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### Inizializzazione del database non riuscita nella strumentazione

**Sintomi**: la console mostra `[Instrumentation] Database initialization failed` all'avvio.

**Causa**: L'hook `instrumentation.ts` esegue la migrazione e il seeding all'avvio. L'errore indica un problema di connettività del database o di schema.

**Comportamento per ambiente**:

| Ambiente | In caso di fallimento |
| ----------- | -------------------------------------- |
| Produzione | Genera un errore, la distribuzione serve 503 |
| Sviluppo | Avviso sui registri, l'app viene avviata per il debug |
| Anteprima | Avviso sui registri, l'app viene avviata per il debug |

Da `instrumentation.ts` :

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### Seme bloccato nello stato di "semina".

**Sintomi**: l'applicazione registra `[DB Init] Another instance is seeding` ripetutamente.

**Causa**: un'operazione di seed precedente si è arrestata in modo anomalo senza aggiornare lo stato.

**Soluzione**: il codice di inizializzazione gestisce automaticamente i semi raffermo dopo 5 minuti:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

Per risolvere immediatamente, aggiorna manualmente lo stato del seed:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

Quindi riavviare l'applicazione.

## Problemi di autenticazione

### AUTH_SECRET non impostato

**Sintomi**: l'applicazione si arresta in modo anomalo con `AUTH_SECRET is not set` o errori di sessione.

**Soluzione**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### Mancata corrispondenza dell'URL di richiamata OAuth

**Sintomi**: l'accesso OAuth reindirizza a una pagina di errore con `redirect_uri_mismatch` .

**Soluzione**: l'URL di richiamata nella console del provider OAuth deve corrispondere esattamente:

| Fornitore | URL di richiamata |
| -------- | --------------------------------------------------- |
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

Per lo sviluppo locale, utilizzare `http://localhost:3000/api/auth/callback/<provider>` .

### I provider OAuth non vengono visualizzati

**Sintomi**: viene visualizzato solo l'accesso con le credenziali, mancano i pulsanti OAuth.

**Causa**: i provider OAuth tornano disabilitati se la configurazione non riesce. Da `auth.config.ts` :

```typescript
} catch (error) {
  // Fallback to credentials only
  return createNextAuthProviders({
    credentials: { enabled: true },
    google: { enabled: false },
    github: { enabled: false },
    facebook: { enabled: false },
    twitter: { enabled: false },
  });
}
```

**Soluzione**: verifica che per ciascun fornitore siano impostati sia `CLIENT_ID` che `CLIENT_SECRET` . Lo script di controllo dell'ambiente convalida le coppie OAuth:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### Sessioni che scadono inaspettatamente

**Cause comuni**:

| Causa | Soluzione |
| ---------------------- | ---------------------------------------------------- |
| `AUTH_SECRET` cambiato | La modifica del segreto invalida tutte le sessioni |
| Mancata corrispondenza del dominio dei cookie | Imposta `COOKIE_DOMAIN` in modo che corrisponda al tuo dominio di distribuzione |
| Mancata corrispondenza HTTPS | Impostare `COOKIE_SECURE=false` per lo sviluppo HTTP locale |

## Problemi di distribuzione

### La build di Vercel fallisce ma la build locale riesce

**Lista di controllo**:

1. Tutte le variabili di ambiente richieste impostate nella dashboard Vercel
2. `DATABASE_URL` accessibile dalla rete Vercel
3. Compatibile con la versione Node.js (richiede 20.19.0 o successiva)
4. La directory dei contenuti esiste (CI crea `.content/data` automaticamente)
5. Allocazione di memoria sufficiente

### I lavori cron di Vercel non vengono eseguiti

**Sintomi**: gli endpoint pianificati in `vercel.json` non vengono eseguiti.

**Passaggi diagnostici**:

1. Verificare che `vercel.json` sia nella radice del progetto con i percorsi corretti:
    ```json
    { "percorso": "/api/cron/sync", "schedule": "0 3 * * *" }
    ```
2. Conferma che il piano Vercel supporta cron (Pro o Enterprise)
3. Controlla Vercel Dashboard nella scheda Cron Jobs per i registri di esecuzione
4. Testare manualmente l'endpoint: `curl https://yourdomain.com/api/cron/sync` ### La migrazione in fase di compilazione non riesce su Vercel

**Sintomi**: il registro di creazione mostra `[Build Migration] Migration error` .

**Comportamento**: lo script `scripts/build-migrate.ts` gestisce diversi scenari:

- **Produzione**: tutti gli errori causano un errore di compilazione
- **Anteprima con errore di connessione**: la compilazione continua con un avviso
- **Anteprima con errore di autenticazione**: compilazione non riuscita (configurazione errata)

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

Per ignorare completamente le migrazioni in fase di compilazione:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## Problemi di internazionalizzazione

### Chiavi di traduzione mostrate al posto del testo

**Sintomi**: sulle pagine viene visualizzato `common.WELCOME` invece di "Benvenuto".

**Soluzione**:

1. Verificare che il file di traduzione esista: `messages/<locale>.json` 2. Verificare che il percorso della chiave corrisponda allo spazio dei nomi utilizzato in `useTranslations` 3. Il sistema di fallback utilizza `deepmerge` per unire i messaggi locali con le impostazioni predefinite in inglese:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Se manca una chiave dal file locale, il fallback inglese dovrebbe fornirla.

### Il routing locale restituisce 404

**Sintomi**: URL come `/fr/discover` restituiscono una pagina 404.

**Soluzione**: verificare che la lingua sia nell'array `LOCALES` in `lib/constants.ts` :

```typescript
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
```

E verifica la configurazione del routing in `i18n/routing.ts` :

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## Interpretazione del registro

### Prefissi di registro

| Prefisso | Fonte | Posizione |
| ------------------- | ----------------------------------- | -------------------------- |
| `[Instrumentation]` | Avvio dell'app (DB init, Sentry) | `instrumentation.ts` |
| `[Migration]` | Esecuzione della migrazione del database | `lib/db/migrate.ts` |
| `[DB Init]` | Inizializzazione e seeding del database | `lib/db/initialize.ts` |
| `[Build Migration]` | Script di migrazione in fase di compilazione | `scripts/build-migrate.ts` |
| `[Layout]` | Errori di recupero dei dati del layout root | `app/[locale]/layout.tsx` |

### Tag di errore della sentinella

Gli errori sentinella dalla strumentazione includono questi tag per il filtraggio:

| Etichetta | Valori |
| ------------- | ----------------------------------------- |
| `component` | `instrumentation` |
| `phase` | `database_init` |
| `environment` | `production` , `preview` o `development` |

## Comandi diagnostici

| Compito | Comando |
| ------------------------ | ----------------------------------- |
| Controlla gli errori TypeScript | `pnpm tsc --noEmit` |
| Esegui linter | `pnpm lint` |
| Convalida ambiente | `node scripts/check-env.js` |
| Controllo rapido dell'ambiente | `node scripts/check-env.js --quick` |
| Testare la connessione al database | `pnpm db:studio` |
| Visualizza lo stato della migrazione | `pnpm db:migrate:cli` |
| Genera nuove migrazioni | `pnpm db:generate` |
| Applica migrazioni in sospeso | `pnpm db:migrate` |
| Banca dati dei semi | `pnpm db:seed` |
| Pulisci la cache della build | `rm -rf .next` |
| Ricostruzione completa | `rm -rf .next && pnpm build` |
| Reimposta database | `node scripts/clean-database.js` |

## Ottenere aiuto

1. Cerca [Problemi di GitHub](https://github.com/ever-works/directory-web-template/issues)
2. Esamina il file `CLAUDE.md` per le linee guida sullo sviluppo assistito dall'intelligenza artificiale
3. Controlla la dashboard di Sentry per i dettagli dell'errore (se configurato)
4. Per problemi di sicurezza, inviare un'e-mail a security@ever.co in privato
