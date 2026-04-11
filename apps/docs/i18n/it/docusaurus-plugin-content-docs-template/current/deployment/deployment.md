---
id: deployment-introduction
title: Introduzione al Deployment
sidebar_label: Introduzione al Deployment
sidebar_position: 1
---

# Introduzione al Deployment

Questa guida fornisce una panoramica completa del deploy del Template Ever Works negli ambienti di produzione. Il template è costruito su Next.js 16 con una modalità di output standalone, rendendolo compatibile con una vasta gamma di piattaforme di hosting e deployment containerizzato.

## Panoramica dell'Architettura

Il Template Ever Works produce una **build Next.js standalone** che raggruppa tutte le dipendenze in una singola unità deployabile. Questo è configurato in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
};
```

L'impostazione `output: "standalone"` crea un artefatto di deploy autonomo che include solo i file `node_modules` necessari, riducendo significativamente le dimensioni del deploy.

## Piattaforme Supportate

### Consigliata: Vercel

Vercel è la piattaforma di deploy consigliata per il template. Offre:

- Deploy zero-configuration per le applicazioni Next.js
- Provisioning automatico dei certificati SSL
- Pianificazione integrata dei cron job tramite `vercel.json`
- Supporto alle funzioni serverless per le route API
- Deploy di anteprima per le pull request

Il template include una configurazione `vercel.json` con cron schedule predefiniti:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Self-Hosted: Docker

L'output standalone supporta la containerizzazione Docker. Un tipico deploy usa il runtime Node.js per servire l'applicazione compilata. Il requisito principale è assicurarsi che la directory di output `standalone` e le cartelle `public` e `.next/static` vengano copiate nell'immagine del container.

### Altre Piattaforme Cloud

Il template può essere deployato su qualsiasi piattaforma che supporti le applicazioni Node.js:

- **Railway** -- Deploy full-stack semplice con PostgreSQL integrato
- **DigitalOcean App Platform** -- Deploy di container gestiti
- **AWS (EC2, ECS o App Runner)** -- Infrastruttura cloud scalabile
- **Google Cloud Run** -- Piattaforma container serverless
- **Azure App Service** -- Hosting Node.js gestito

## Prerequisiti

### Requisiti di Sistema

- **Node.js**: versione 20.19.0 o superiore (definita nel campo `engines` di `package.json`)
- **Package Manager**: pnpm (il progetto usa `pnpm-lock.yaml`)
- **Database**: PostgreSQL (richiesto per le funzionalità di produzione come auth, abbonamenti, analytics)
- **Memoria**: Almeno 8 GB di RAM consigliati per il processo di build

Lo script di build alloca memoria aggiuntiva esplicitamente:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### Variabili d'Ambiente Richieste

Prima del deploy, assicurati che queste variabili critiche siano configurate. Lo script `scripts/check-env.js` le valida automaticamente:

```bash
# Core (critical -- application will not function without these)
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
AUTH_SECRET=<generated-secret>         # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cookie Configuration
COOKIE_SECRET=<generated-secret>       # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Lo script di controllo dell'ambiente categorizza le variabili per integrazione:

```
Core:            NODE_ENV, PORT, APP_*, BASE_URL
Database:        DATABASE_URL, DB_*, POSTGRES_*
Auth:            AUTH_*, GOOGLE_*, GITHUB_*, FB_*, TWITTER_*
Supabase:        SUPABASE_*, NEXT_PUBLIC_SUPABASE_*
Content:         DATA_REPOSITORY, GH_TOKEN
Email:           RESEND_API_KEY, EMAIL_*
Payment:         STRIPE_*, PAYPAL_*
Analytics:       POSTHOG_*, SENTRY_*
Background Jobs: TRIGGER_DEV_*
```

### Integrazioni Opzionali

Queste variabili d'ambiente abilitano funzionalità opzionali:

```bash
# OAuth Providers (each requires both CLIENT_ID and CLIENT_SECRET)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=...
```

## Guida al Deploy Rapido

### Passo 1: Preparare la Build

Esegui il processo di build completo localmente per verificare che tutto si compili:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

Lo script `build` esegue diversi passaggi in sequenza:

1. **Controllo ambiente** (`scripts/check-env.js`) -- valida le variabili richieste
2. **Generazione OpenAPI** (`scripts/generate-openapi.ts`) -- genera la documentazione API
3. **Migrazioni database** (`scripts/build-migrate.ts`) -- applica le modifiche allo schema in sospeso
4. **Build Next.js** (`next build`) -- compila l'applicazione

### Passo 2: Migrazione del Database in Fase di Build

Lo script `scripts/build-migrate.ts` viene eseguito automaticamente durante la build. Gestisce diversi ambienti:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

Comportamenti principali:

- **Build di produzione**: I fallimenti delle migrazioni causano il fallimento della build (impedisce deploy difettosi)
- **Deploy di anteprima**: Gli errori di connessione sono tollerati (il database potrebbe non essere ancora provisionato)
- **Build CI** (non-Vercel): Le migrazioni vengono completamente saltate

### Passo 3: Inizializzazione Runtime

Quando l'applicazione si avvia, il file `instrumentation.ts` avvia l'inizializzazione del database:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Auto-initialize database (migrate and seed if needed)
  try {
    await initializeDatabase();
  } catch (error) {
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In development/preview, allow app to start for debugging
  }
}
```

La sequenza di inizializzazione:

1. Esegui le migrazioni in sospeso (Drizzle gestisce l'idempotenza)
2. Controlla se il database è stato seedato
3. Se non seedato, acquisisci un advisory lock PostgreSQL ed esegui lo script di seed
4. Rilascia il lock dopo il seeding

### Passo 4: Deploy su Vercel

Per i deploy Vercel, connetti il tuo repository e configura:

1. Imposta il **Framework Preset** su Next.js
2. Imposta il **Build Command** su `pnpm build`
3. Imposta l'**Install Command** su `pnpm install`
4. Aggiungi tutte le variabili d'ambiente richieste nel dashboard Vercel
5. Esegui il deploy

### Passo 5: Verificare il Deploy

Dopo il deploy, verifica:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## Header di Sicurezza

Il template configura automaticamente gli header di sicurezza in `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
        },
      ],
    },
  ];
}
```

## Configurazione del Connection Pool

Il connection pool del database è configurabile tramite la variabile d'ambiente `DB_POOL_SIZE`:

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

- **Default produzione**: 20 connessioni
- **Default sviluppo**: 10 connessioni
- **Range configurabile**: da 1 a 50 connessioni
- **Idle timeout**: 20 secondi
- **Connect timeout**: 30 secondi

## Prossimi Passi

- [SSL e Domini Personalizzati](./ssl-domains.md) -- Configura domini personalizzati e certificati SSL
- [Gestione del Database](./database-management.md) -- Operazioni sul database di produzione
- [Backup e Ripristino](./backup-recovery.md) -- Strategie di backup del database
- [Monitoraggio](./monitoring.md) -- Imposta il tracciamento degli errori e il monitoraggio delle prestazioni
