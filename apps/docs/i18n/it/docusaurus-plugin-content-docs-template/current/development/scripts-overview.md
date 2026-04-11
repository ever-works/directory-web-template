---
id: scripts-overview
title: "Panoramica degli Script"
sidebar_label: "Panoramica degli Script"
sidebar_position: 8
---

# Panoramica degli Script

La directory `scripts/` contiene script di automazione che gestiscono la pipeline di build, il ciclo di vita del database, la sincronizzazione dei contenuti, la qualità del codice e l'infrastruttura di distribuzione.

## Struttura della directory

```
scripts/
├── build-migrate.ts
├── check-env.js
├── check-env-ci.js
├── clean-database.js
├── cli-migrate.ts
├── cli-seed.ts
├── clone.cjs
├── generate-openapi.ts
├── lint.js
├── seed.ts
├── seed-stripe-products.ts
├── sync-translations.js
├── update-cron.ts
└── tsconfig.json
```

## Script di build e distribuzione

### build-migrate.ts

Esegue le migrazioni del database durante il processo di build di Vercel.

```bash
tsx scripts/build-migrate.ts
```

### check-env.js

Valida le variabili d'ambiente prima dell'avvio dell'applicazione.

```bash
node scripts/check-env.js [--silent] [--quick]
```

## Script del database

### seed.ts

Popola il database con dati di test realistici.

| Entità | Quantità | Dettagli |
|---|---|---|
| Ruoli | 2 | `admin` e `user` |
| Utenti | 20 | Con indirizzi email sequenziali |
| Profili client | 20 | Piani misti: free, standard, premium |
| Log attività | 30 | Azioni SIGN_UP, SIGN_IN, COMMENT, VOTE |
| Commenti | 15 | Commenti di esempio con valutazioni |
| Voti | 25 | Mix di upvote e downvote |

## Script di contenuto e i18n

### sync-translations.js

Sincronizza i file di traduzione con il riferimento inglese.

```bash
node scripts/sync-translations.js
```

## Mappature degli script package.json

| Script npm | Comando sottostante | Scopo |
|---|---|---|
| `pnpm dev` | `next dev` | Server di sviluppo |
| `pnpm build` | Pipeline di build con migrazioni | Build di produzione |
| `pnpm lint` | `node scripts/lint.js` | Linting del codice |
| `pnpm db:generate` | `drizzle-kit generate` | Generare file di migrazione |
| `pnpm db:migrate` | `tsx scripts/build-migrate.ts` | Eseguire migrazioni |
| `pnpm db:seed` | `tsx scripts/cli-seed.ts` | Seeding del database |

## Aggiunta di nuovi script

Quando si aggiunge un nuovo script:

1. Posizionarlo nella directory `scripts/`
2. Usare TypeScript (`.ts`) quando possibile
3. Caricare le variabili d'ambiente tramite `dotenv`
4. Aggiungere intestazioni JSDoc con istruzioni d'uso
5. Registrare in `package.json` se orientato all'utente
6. Gestire gli errori con codici di uscita significativi
