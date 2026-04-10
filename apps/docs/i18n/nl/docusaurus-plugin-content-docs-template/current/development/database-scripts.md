---
id: database-scripts
title: "Database Scripts"
sidebar_label: "Database Scripts"
sidebar_position: 10
---

# Database Scripts

Het sjabloon biedt een reeks databasebeheersscripts voor migraties, seeding en onderhoud. Deze scripts gebruiken Drizzle ORM en zijn ontworpen voor lokale ontwikkeling, CI/CD-pipelines en Vercel-productie-implementaties.

## Scriptinventaris

| Script | Opdracht | Doel |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | Build-time migratieuitvoerder |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Handmatige interactieve migratie |
| `cli-seed.ts` | `pnpm db:seed` | CLI-ingangspunt voor seeding |
| `seed.ts` | Directe uitvoering | Volledige database seeder |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Stripe-productcatalogus instelling |
| `clean-database.js` | `node scripts/clean-database.js` | Volledige reset (verwijdert alles) |

## Migratiescripts

### Build-time migratie (build-migrate.ts)

Wordt automatisch uitgevoerd tijdens `pnpm build` bij Vercel-implementaties. Ontworpen voor schema-updates zonder uitvaltijd.

**Omgevingsbewust gedrag:**

| Omgeving | Migratiefout | Verbindingsfout | Authenticatiefout |
|---|---|---|---|
| Productie (`VERCEL_ENV=production`) | Build mislukt | Build mislukt | Build mislukt |
| Preview (`VERCEL_ENV=preview`) | Build mislukt | Build slaagt (waarschuwing) | Build mislukt |
| CI (GitHub Actions) | Volledig overgeslagen | Volledig overgeslagen | Volledig overgeslagen |
| Lokale ontwikkeling | Build mislukt | Build mislukt | Build mislukt |

### Handmatige migratie CLI (cli-migrate.ts)

Interactief migratiehulpmiddel voor handmatige uitvoering tegen elke database.

```bash
pnpm db:migrate:cli

DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

## Seedingscripts

### Database Seeder (seed.ts)

Vult de database met realistische testgegevens.

```bash
DATABASE_URL=postgres://... pnpm seed
```

### Stripe Product Seeder (seed-stripe-products.ts)

Maakt de volledige Stripe-productcatalogus aan met abonnementsplannen en eenmalige aankopen.

```bash
npx tsx scripts/seed-stripe-products.ts
```

**Vereist:** `STRIPE_SECRET_KEY` in `.env.local`

**Producten en prijzen:**

| Product | Plansleutel | Prijstype | Metadata |
|---|---|---|---|
| Free | `free` | Abonnement ($0/mo) | `type: subscription` |
| Standard | `standard` | $10/mo, $96/jr | `annualDiscount: 20` |
| Premium | `premium` | $20/mo, $180/jr | `annualDiscount: 25` |
| Sponsored Ad - Weekly | `sponsor_weekly` | $100 eenmalig | `type: sponsor_ad` |
| Sponsored Ad - Monthly | `sponsor_monthly` | $300 eenmalig | `type: sponsor_ad` |

## Databaseopruiming

### clean-database.js

Verwijdert alle tabellen in het `public`-schema en het `drizzle`-migratiebeheersingschema.

```bash
node scripts/clean-database.js
```

**Waarschuwing:** Dit is onomkeerbaar. Maak altijd een backup voordat u dit uitvoert in een omgeving met echte gegevens.

## Veelgebruikte workflows

### Nieuwe ontwikkelopzet

```bash
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate:cli
pnpm db:seed
npx tsx scripts/seed-stripe-products.ts
```

### Resetten en opnieuw seeden

```bash
node scripts/clean-database.js
pnpm db:migrate:cli
pnpm db:seed
```

## Omgevingsvariabelen

| Variabele | Gebruikt door | Doel |
|---|---|---|
| `DATABASE_URL` | Alle scripts | PostgreSQL-verbindingsreeks |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | Instellen op `true` om build-migraties over te slaan |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | Stripe API-sleutel voor productcreatie |
