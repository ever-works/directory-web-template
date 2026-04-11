---
id: migration-guide
title: Handleiding voor versiemigratie
sidebar_label: Migratiegids
sidebar_position: 8
---

# Versiemigratiehandleiding

Deze handleiding behandelt het upgraden van uw Ever Works Template-installatie, het afhandelen van databasemigraties tussen versies, het beheren van belangrijke wijzigingen, het schrijven en toepassen van migratiescripts en rollback-procedures.

## Overzicht upgradeworkflow

Het upgraden van de sjabloon volgt een gestructureerd proces om risico's te minimaliseren:

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

## Databasemigratiesysteem

### Hoe migraties werken

De sjabloon gebruikt Drizzle ORM met Drizzle Kit voor schemamigraties. Het schema is gedefinieerd in `lib/db/schema.ts` en migraties worden gegenereerd als SQL-bestanden naar `lib/db/migrations/` .

Configuratie in `drizzle.config.ts` :

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

### Migratieopdrachten

| Commando | Doel | Wanneer gebruiken |
|---------|---------|------------|
| `pnpm db:generate` | SQL genereren op basis van schemawijzigingen | Na het wijzigen van `lib/db/schema.ts` |
| `pnpm db:migrate` | In behandeling zijnde migraties toepassen (Drizzle CLI) | Voordat u de app start na wijzigingen |
| `pnpm db:migrate:cli` | Toepassen met uitgebreide logboekregistratie | Voor het opsporen van migratieproblemen |
| `pnpm db:seed` | Initiële gegevens invullen | Na nieuwe migratie of zaadwissels |
| `pnpm db:studio` | Visuele database-inspectie | Voor foutopsporing of gegevensbeoordeling |

### Migratiebestandsstructuur

Migraties worden opgeslagen als genummerde SQL-bestanden:

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

Motregen volgt toegepaste migraties in `drizzle.__drizzle_migrations` :

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### Een nieuwe migratie genereren

Na wijziging van `lib/db/schema.ts` :

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### Automatische migraties

De sjabloon voert migraties automatisch uit op twee plaatsen:

**Bouwtijd** (via `scripts/build-migrate.ts` ):

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

**Runtime** (via `instrumentation.ts` ):

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

### Migratieveiligheid per milieu

| Milieu | Bouwtijd | Looptijd | Bij falen |
|------------|-----------|---------|-----------|
| Productie | Vereist | Terugval | Build mislukt / app-worpen |
| Voorbeeld | Verbindingsfouten getolereerd | Actief | Logswaarschuwing, app start |
| Ontwikkeling | Niet gebruikt | Actief | Logswaarschuwing, app start |
| CI (niet-Vercel) | Overgeslagen | Niet gebruikt | N.v.t. |

## Terugdraaiprocedures

### Drizzle ondersteunt geen automatische terugdraaiing

Drizzle Kit genereert alleen voorwaartse migraties. Een migratie ongedaan maken:

**Optie 1: Handmatige omgekeerde migratie**

1. Identificeer de problematische migratie in `lib/db/migrations/` 2. Schrijf reverse SQL handmatig:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. Direct toepassen op de database:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. Verwijder het voorwaartse migratiebestand uit `lib/db/migrations/` 5. Werk indien nodig het Drizzle-logboek bij

**Optie 2: Herstellen vanaf back-up**

De veiligste rollback-aanpak voor complexe migraties:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**Optie 3: Schema terugzetten en opnieuw genereren**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## Afhankelijkheidsupdates

### Afhankelijkheden bijwerken

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### Kritieke afhankelijkheden

Deze pakketten vereisen zorgvuldige tests bij het upgraden:

| Pakket | Risico | Opmerkingen |
|---------|------|-------|
| `next` | Hoog | Belangrijke versies veranderen API's, routing, configuratie |
| `next-auth` | Hoog | Auth API-wijzigingen, sessiestrategie |
| `drizzle-orm` / `drizzle-kit` | Hoog | Schema-API, wijzigingen in migratieformaat |
| `next-intl` | Middel | Wijzigingen in routering en laden van berichten |
| `@sentry/nextjs` | Middel | Compatibiliteit van instrumentatiehaken |
| `stripe` | Middel | Betalings-API-versiebeheer |
| `@heroui/react` | Middel | Wijzigingen in UI-componentprop |
| `@trigger.dev/sdk` | Middel | Wijzigingen in de taakplanning-API |

### pnpm-overschrijvingen

De sjabloon gebruikt pnpm-overschrijvingen in `package.json` om consistente versies te forceren:

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

Wanneer u React of esbuild upgradet, moet u deze overschrijvingen bijwerken zodat ze overeenkomen.

## Controlelijst voor belangrijke wijzigingen

Wanneer u een upgrade uitvoert tussen sjabloonversies, bekijk dan elke categorie:

### Schemawijzigingen

- [ ] Vergelijk `lib/db/schema.ts` met upstream voor nieuwe/gewijzigde kolommen
- [ ] Migraties genereren: `pnpm db:generate` - [ ] Gegenereerde SQL beoordelen op destructieve bewerkingen (kolomdalingen, typewijzigingen)
- [ ] Eerst toepassen op een testdatabase
- [ ] Zaadcompatibiliteit controleren: `pnpm db:seed` ### API-routewijzigingen

- [ ] Controleer op hernoemde of verwijderde routes in `app/api/` - [ ] Update externe integraties en webhook-URL's
- [ ] Controleer of de cron-eindpuntpaden nog steeds overeenkomen met `vercel.json` ### Configuratiewijzigingen

- [ ] Vergelijk `.env.example` voor nieuwe of hernoemde variabelen
- [ ] Bekijk `next.config.ts` wijzigingen (headers, webpack, plug-ins)
- [ ] Controleer `vercel.json` voor wijzigingen in het cron-schema
- [ ] Bekijk `drizzle.config.ts` voor padwijzigingen

### Authenticatiewijzigingen

- [ ] Vergelijk `auth.config.ts` met stroomopwaarts
- [ ] Controleer de compatibiliteit van de sessiestrategie
- [ ] OAuth-callback-URL's testen
- [ ] Bekijk de toestemmingsdefinities in `lib/permissions/definitions.ts` ### UI- en stijlwijzigingen

- [ ] Vergelijk `tailwind.config.ts` voor themawijzigingen
- [ ] Inspecteer de belangrijkste pagina's visueel
- [ ] Test responsieve lay-outs
- [ ] Controleer of thema-aanpassingen nog steeds van toepassing zijn

## Stapsgewijs upgradeproces

### 1. Bereid je voor

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. Stroomopwaarts samenvoegen

Als u de sjabloon bijhoudt als een upstream afstandsbediening:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

Conflicten oplossen, met aandacht voor:
- `lib/db/schema.ts` -- schemawijzigingen
- `next.config.ts` -- bouwconfiguratie
- `auth.config.ts` -- auth-providers
- `package.json` -- afhankelijkheidsversies

### 3. Installeren en migreren

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. Lokaal verifiëren

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. Test kritieke paden

| Gebied | Wat te testen |
|------|-------------|
| Authenticatie | Inloggen, uitloggen, OAuth, sessiepersistentie |
| Betalingen | Abonnementsstromen, afhandeling van webhook |
| Inhoud | Paginaweergave, zoeken, filteren |
| Beheerder | Dashboardtoegang, RBAC-handhaving |
| i18n | Locale-omschakeling, volledigheid van vertalingen |
| Achtergrond banen | Consolelogboeken voor taakregistratie |

### 6. Implementeren

1. Push de functievertakking voor CI-verificatie
2. Implementeren in een staging-/preview-omgeving
3. Voer rooktests uit op de enscenering
4. Samenvoegen naar `main` voor productie-implementatie

## Versiecompatibiliteit

### Knooppunt.js

De minimale versie is gedefinieerd in `package.json` :

```json
{ "engines": { "node": ">=20.19.0" } }
```

### Database

| Aanbieder | Ondersteund | Opmerkingen |
|----------|-----------|------|
| PostgreSQL 14+ | Ja | Productie aanbevolen |
| Supabasis | Ja | Met verbindingspooling |
| Neon | Ja | Serverloze PostgreSQL |

### Platformen

| Platform | Staat | Opmerkingen |
|----------|--------|-------|
| Vercel | Primaire doelgroep | Volledige cron-, preview- en edge-ondersteuning |
| Dokwerker | Ondersteund | Standalone uitvoer voor containers |
| Zelf gehost | Ondersteund | Vereist procesmanagement |

## Problemen met upgrades oplossen

| Symptoom | Waarschijnlijke oorzaak | Oplossing |
|---------|-------------|---------|
| Bouw mislukt | Incompatibele afd. | Voer `pnpm outdated` uit, los peer-conflicten op |
| DB-fouten bij opstarten | Niet-toegepaste migraties | `pnpm db:generate && pnpm db:migrate` |
| Verificatie verbroken | Providerconfiguratie gewijzigd | Vergelijk `auth.config.ts` met stroomopwaarts |
| Ontbrekende vertalingen | Nieuwe sleutels toegevoegd | Controleer `messages/` op ontbrekende vermeldingen |
| Styling kapot | Tailwind-configuratie gewijzigd | Vergelijk `tailwind.config.ts` |
| Typen komen niet overeen | Schema bijgewerkt | Herhaal `pnpm db:generate` |
