---
id: database-scripts
title: "Script Database"
sidebar_label: "Script Database"
sidebar_position: 10
---

# Script Database

Il template fornisce una serie di script di gestione del database per migrazioni, seeding e manutenzione. Questi script utilizzano Drizzle ORM e sono progettati per funzionare con lo sviluppo locale, le pipeline CI/CD e le distribuzioni Vercel di produzione.

## Inventario degli script

| Script | Comando | Scopo |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | Esecutore di migrazioni in fase di build |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Migrazione interattiva manuale |
| `cli-seed.ts` | `pnpm db:seed` | Punto di ingresso CLI per il seeding |
| `seed.ts` | Esecuzione diretta | Seeder completo del database |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Configurazione catalogo prodotti Stripe |
| `clean-database.js` | `node scripts/clean-database.js` | Reset completo (elimina tutto) |

## Script di migrazione

### Migrazione in fase di build (build-migrate.ts)

Viene eseguito automaticamente durante `pnpm build` sulle distribuzioni Vercel.

**Comportamento in base all'ambiente:**

| Ambiente | Errore di migrazione | Errore di connessione | Errore di autenticazione |
|---|---|---|---|
| Produzione (`VERCEL_ENV=production`) | Build fallisce | Build fallisce | Build fallisce |
| Preview (`VERCEL_ENV=preview`) | Build fallisce | Build passa (avviso) | Build fallisce |
| CI (GitHub Actions) | Saltato completamente | Saltato completamente | Saltato completamente |
| Sviluppo locale | Build fallisce | Build fallisce | Build fallisce |

### CLI di migrazione manuale (cli-migrate.ts)

```bash
pnpm db:migrate:cli
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

## Script di seeding

### Database Seeder (seed.ts)

Popola il database con dati di test realistici.

```bash
DATABASE_URL=postgres://... pnpm seed
```

### Stripe Product Seeder (seed-stripe-products.ts)

```bash
npx tsx scripts/seed-stripe-products.ts
```

**Richiesto:** `STRIPE_SECRET_KEY` in `.env.local`

**Prodotti e prezzi:**

| Prodotto | Chiave piano | Tipo prezzo | Metadati |
|---|---|---|---|
| Free | `free` | Abbonamento ($0/mese) | `type: subscription` |
| Standard | `standard` | $10/mese, $96/anno | `annualDiscount: 20` |
| Premium | `premium` | $20/mese, $180/anno | `annualDiscount: 25` |
| Sponsored Ad - Weekly | `sponsor_weekly` | $100 una tantum | `type: sponsor_ad` |
| Sponsored Ad - Monthly | `sponsor_monthly` | $300 una tantum | `type: sponsor_ad` |

## Pulizia del database

### clean-database.js

```bash
node scripts/clean-database.js
```

**Avviso:** Questa operazione è irreversibile. Creare sempre un backup prima di eseguirla.

## Flussi di lavoro comuni

### Configurazione iniziale dello sviluppo

```bash
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate:cli
pnpm db:seed
npx tsx scripts/seed-stripe-products.ts
```

### Reset e nuovo seeding

```bash
node scripts/clean-database.js
pnpm db:migrate:cli
pnpm db:seed
```

## Variabili d'ambiente

| Variabile | Usata da | Scopo |
|---|---|---|
| `DATABASE_URL` | Tutti gli script | Stringa di connessione PostgreSQL |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | Impostare `true` per saltare le migrazioni |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | Chiave API Stripe |
