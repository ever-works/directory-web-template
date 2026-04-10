---
id: scripts-overview
title: "Scripts Overzicht"
sidebar_label: "Scripts Overzicht"
sidebar_position: 8
---

# Scripts Overzicht

De `scripts/`-map bevat automatiseringsscripts die de build-pipeline, de databaselevenscyclus, inhoudssynchronisatie, codekwaliteit en implementatie-infrastructuur beheren.

## Mapstructuur

```
scripts/
├── build-migrate.ts
├── check-env.js
├── check-env-ci.js
├── clean-database.js
├── cli-migrate.ts
├── cli-seed.ts
├── clone.cjs
├── codeql-setup.js
├── clean-codeql.js
├── generate-openapi.ts
├── lint.js
├── seed.ts
├── seed-stripe-products.ts
├── sync-translations.js
├── update-cron.ts
└── tsconfig.json
```

## Build- en implementatiescripts

### build-migrate.ts

Voert databasemigraties uit tijdens het Vercel-buildproces.

```bash
tsx scripts/build-migrate.ts
```

### check-env.js

Valideert omgevingsvariabelen vóór het starten van de applicatie.

```bash
node scripts/check-env.js [--silent] [--quick]
```

### update-cron.ts

Beheert Vercel cron job-schema's via de Vercel API.

```bash
tsx scripts/update-cron.ts
```

## Databasescripts

### seed.ts

Vult de database met realistische testgegevens.

| Entiteit | Aantal | Details |
|---|---|---|
| Rollen | 2 | `admin` en `user` |
| Gebruikers | 20 | Met opeenvolgende e-mailadressen |
| Clientprofielen | 20 | Gemengde plannen: free, standard, premium |
| Activiteitslogboeken | 30 | SIGN_UP, SIGN_IN, COMMENT, VOTE acties |

### clean-database.js

Verwijdert alle tabellen. Gebruik met voorzichtigheid.

```bash
node scripts/clean-database.js
```

## Inhoud- en i18n-scripts

### sync-translations.js

Synchroniseert vertaalbestanden met de Engelse referentie.

```bash
node scripts/sync-translations.js
```

## Package.json-scripttoewijzingen

| npm Script | Onderliggende opdracht | Doel |
|---|---|---|
| `pnpm dev` | `next dev` | Ontwikkelingsserver |
| `pnpm build` | Build-pipeline met migraties | Productiebuild |
| `pnpm lint` | `node scripts/lint.js` | Code linting |
| `pnpm db:generate` | `drizzle-kit generate` | Migratiebestanden genereren |
| `pnpm db:migrate` | `tsx scripts/build-migrate.ts` | Migraties uitvoeren |
| `pnpm db:seed` | `tsx scripts/cli-seed.ts` | Database seeding |

## Nieuwe scripts toevoegen

Bij het toevoegen van een nieuw script:

1. Plaats het in de `scripts/`-map
2. Gebruik TypeScript (`.ts`) voor nieuwe scripts indien mogelijk
3. Laad omgevingsvariabelen via `dotenv`
4. Voeg JSDoc-headers toe met gebruiksaanwijzingen
5. Registreer in `package.json`-scripts indien gebruikersgericht
6. Behandel fouten graceful met betekenisvolle exitcodes
