---
id: troubleshooting
title: Gids voor probleemoplossing
sidebar_label: Problemen oplossen
sidebar_position: 7
---

# Gids voor probleemoplossing

Deze handleiding behandelt veelvoorkomende fouten, foutopsporingstechnieken, loginterpretatie en omgevingsproblemen voor de Ever Works-sjabloon. Problemen zijn geordend per categorie met symptomen, oorzaken en oplossingen.

## Bouwproblemen

### Module niet gevonden tijdens het bouwen

**Symptomen**: Build mislukt met `Module not found: Can't resolve 'postgres'` of vergelijkbare native modulefouten in Node.js.

**Oorzaak**: Webpack probeert alleen server-modules te bundelen voor de clientbundel.

**Oplossing**: Controleer of de module wordt vermeld in `serverExternalPackages` in `next.config.ts` :

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

Als u een nieuwe server-only afhankelijkheid hebt toegevoegd, voegt u deze toe aan deze array.

### Time-out voor het genereren van statische pagina's

**Symptomen**: Build mislukt met `Error: Timeout of 180000ms exceeded` tijdens het genereren van statische elektriciteit.

**Oorzaak**: Pagina's die tijdens het bouwen externe gegevens ophalen, overschrijden de time-out.

**Oplossing**: de sjabloon stelt een time-out van 3 minuten in:

```typescript
staticPageGenerationTimeout: 180,
```

Voor pagina's die meer tijd nodig hebben, verhoogt u deze waarde. U kunt ook langzame pagina's omschakelen naar dynamische weergave:

```typescript
export const dynamic = 'force-dynamic';
```

### Inhoudsmap ontbreekt tijdens het bouwen

**Symptomen**: Build mislukt omdat `.content/data` niet bestaat.

**Oorzaak**: de op Git gebaseerde CMS-inhoud is niet gekloond. Het `scripts/clone.cjs` -script wordt uitgevoerd tijdens `predev` - en `prebuild` -hooks.

**Oplossing**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### Webpack-waarschuwingen van Supabase, bcryptjs, postgres, stripe

**Symptomen**: Build geeft waarschuwingen over deze pakketten, maar wordt succesvol voltooid.

**Oorzaak**: Bekende waarschuwingen van pakketten die verwijzen naar Node.js API's die niet beschikbaar zijn in de browser.

**Oplossing**: Deze zijn al onderdrukt in `next.config.ts` :

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

Geen actie nodig: waarschuwingen hebben geen invloed op de build-uitvoer.

### JavaScript heeft onvoldoende geheugen

**Symptomen**: Crashes veroorzaken met `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` .

**Oplossing**: de build-scripts wijzen al 8 GB toe:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

Als de build nog steeds onvoldoende geheugen heeft, controleer dan op:

- Overmatig genereren van statische pagina's (minder pagina's die tijdens het bouwen worden gemaakt)
- Grote afhankelijkheden zijn niet goed geschud
- Geheugenlekken in buildtime-scripts

## Databaseproblemen

### Verbinding geweigerd voor PostgreSQL

**Symptomen**: Toepassing mislukt met `connection refused` , `ECONNREFUSED` of `connect ETIMEDOUT` .

**Diagnostische stappen**:

1. Controleer `DATABASE_URL` in `.env.local` :
    ``` bash
    node -e "require('dotenv').config({pad:'.env.local'}); console.log(process.env.DATABASE_URL ? 'Set': 'Missing')"
    ```
2. Test de verbinding direct: `psql $DATABASE_URL -c "SELECT 1"` 3. Controleer of PostgreSQL actief is: `pg_isready` **Veelvoorkomende oorzaken en oplossingen**:

| Oorzaak | Repareren |
| ---------------------- | ------------------------------------------ |
| PostgreSQL is niet actief | Start de dienst |
| Verkeerde poort | Controleer de poort in uw verbindingsreeks |
| Ontbrekende database | `createdb your_database_name` |
| Verificatiefout | Controleer gebruikersnaam/wachtwoord in `DATABASE_URL` |
| SSL vereist | Voeg `?sslmode=require` toe aan de verbindingsreeks |

### Migratie mislukt

**Symptomen**: `pnpm db:migrate` mislukt vanwege schema- of SQL-fouten.

**Oplossing**: gebruik de uitgebreide CLI-migratietool voor foutopsporing:

```bash
pnpm db:migrate:cli
```

Dit laat zien:

1. Huidige migratiestatus (lijst met toegepaste migraties)
2. Gedetailleerde uitvoer van de migratie-uitvoering
3. Schemaverificatie na migratie

Als migraties beschadigd zijn, controleer dan de Drizzle-trackingtabel:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### Database-initialisatie is mislukt in instrumentatie

**Symptomen**: Console toont `[Instrumentation] Database initialization failed` bij het opstarten.

**Oorzaak**: de haak `instrumentation.ts` voert migratie en zaaien uit bij het opstarten. Een fout duidt op een databaseconnectiviteits- of schemaprobleem.

**Gedrag per omgeving**:

| Milieu | Bij falen |
| ----------- | ------------------------------------ |
| Productie | Er wordt een fout gegenereerd, de implementatie levert 503 |
| Ontwikkeling | Waarschuwing voor logboeken, app start voor foutopsporing |
| Voorbeeld | Waarschuwing voor logboeken, app start voor foutopsporing |

Vanaf `instrumentation.ts` :

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### Zaad blijft hangen in de status 'zaaien'

**Symptomen**: Applicatie registreert herhaaldelijk `[DB Init] Another instance is seeding` .

**Oorzaak**: een eerdere zaadbewerking is gecrasht zonder dat de status werd bijgewerkt.

**Oplossing**: de initialisatiecode verwerkt automatisch oude zaden na 5 minuten:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

Om dit onmiddellijk op te lossen, werkt u de zaadstatus handmatig bij:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

Start vervolgens de applicatie opnieuw.

## Authenticatieproblemen

### AUTH_SECRET niet ingesteld

**Symptomen**: Applicatie loopt vast met `AUTH_SECRET is not set` of sessiefouten.

**Oplossing**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### OAuth-callback-URL komt niet overeen

**Symptomen**: OAuth-aanmelding wordt omgeleid naar een foutpagina met `redirect_uri_mismatch` .

**Oplossing**: de callback-URL in uw OAuth-providerconsole moet exact overeenkomen:

| Aanbieder | Terugbel-URL |
| -------- | ---------------------------------------------- |
| Googlen | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

Voor lokale ontwikkeling gebruikt u `http://localhost:3000/api/auth/callback/<provider>` .

### OAuth-providers verschijnen niet

**Symptomen**: Er worden alleen aanmeldingsgegevens weergegeven, OAuth-knoppen ontbreken.

**Oorzaak**: OAuth-providers vallen terug naar uitgeschakeld als de configuratie mislukt. Vanaf `auth.config.ts` :

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

**Oplossing**: Controleer of zowel `CLIENT_ID` als `CLIENT_SECRET` zijn ingesteld voor elke provider. Het omgevingscontrolescript valideert OAuth-paren:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### Sessies verlopen onverwacht

**Veelvoorkomende oorzaken**:

| Oorzaak | Oplossing |
| ---------------------- | ----------------------------------------------- |
| `AUTH_SECRET` gewijzigd | Als u het geheim wijzigt, worden alle sessies ongeldig |
| Cookie-domein komt niet overeen | Stel `COOKIE_DOMAIN` in zodat deze overeenkomt met uw implementatiedomein |
| HTTPS komt niet overeen | Stel `COOKIE_SECURE=false` in voor lokale HTTP-ontwikkeling |

## Implementatieproblemen

### Vercel-build mislukt, maar lokale build slaagt

**Checklist**:

1. Alle vereiste omgevingsvariabelen ingesteld in het Vercel-dashboard
2. `DATABASE_URL` toegankelijk via het netwerk van Vercel
3. Compatibel met Node.js-versie (vereist 20.19.0 of hoger)
4. Inhoudsmap bestaat (CI maakt automatisch `.content/data` aan)
5. Geheugentoewijzing voldoende

### Vercel cronjobs worden niet uitgevoerd

**Symptomen**: geplande eindpunten in `vercel.json` worden niet uitgevoerd.

**Diagnostische stappen**:

1. Controleer of `vercel.json` zich in de hoofdmap van het project bevindt, met de juiste paden:
    ```Json
    { "pad": "/api/cron/sync", "schedule": "0 3 * * *" }
    ```
2. Bevestig dat het Vercel-abonnement cron ondersteunt (Pro of Enterprise)
3. Controleer Vercel Dashboard onder het tabblad Cron Jobs voor uitvoeringslogboeken
4. Test het eindpunt handmatig: `curl https://yourdomain.com/api/cron/sync` ### Migratie tijdens de build mislukt op Vercel

**Symptomen**: Buildlog toont `[Build Migration] Migration error` .

**Gedrag**: het `scripts/build-migrate.ts` -script verwerkt verschillende scenario's:

- **Productie**: alle fouten veroorzaken een buildfout
- **Voorbeeld met verbindingsfout**: Build gaat verder met een waarschuwing
- **Voorbeeld met auth-fout**: Build mislukt (verkeerde configuratie)

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

Om migraties tijdens het bouwen volledig over te slaan:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## Internationaliseringsvraagstukken

### Vertaalsleutels weergegeven in plaats van tekst

**Symptomen**: pagina's geven `common.WELCOME` weer in plaats van "Welkom".

**Oplossing**:

1. Controleer of het vertaalbestand bestaat: `messages/<locale>.json` 2. Controleer of het sleutelpad overeenkomt met de naamruimte die in `useTranslations` wordt gebruikt
3. Het fallback-systeem gebruikt `deepmerge` om landinstellingen samen te voegen met Engelse standaardwaarden:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Als er een sleutel ontbreekt in het localebestand, zou de Engelse fallback deze moeten leveren.

### Lokale routering retourneert 404

**Symptomen**: URL's zoals `/fr/discover` retourneren een 404-pagina.

**Oplossing**: controleer of de landinstelling zich in de array `LOCALES` in `lib/constants.ts` bevindt:

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

En controleer de routeringsconfiguratie in `i18n/routing.ts` :

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## Loginterpretatie

### Logvoorvoegsels

| Voorvoegsel | Bron | Locatie |
| ------------------ | ---------------------------------- | ------------------------- |
| `[Instrumentation]` | App opstarten (DB init, Sentry) | `instrumentation.ts` |
| `[Migration]` | Uitvoering van databasemigratie | `lib/db/migrate.ts` |
| `[DB Init]` | Database-initialisatie en zaaien | `lib/db/initialize.ts` |
| `[Build Migration]` | Migratiescript tijdens build | `scripts/build-migrate.ts` |
| `[Layout]` | Fouten bij het ophalen van rootlay-outgegevens | `app/[locale]/layout.tsx` |

### Sentry-fouttags

Sentry-fouten van instrumentatie omvatten deze tags voor filteren:

| Label | Waarden |
| ------------- | -------------------------------------- |
| `component` | `instrumentation` |
| `phase` | `database_init` |
| `environment` | `production` , `preview` of `development` |

## Diagnostische opdrachten

| Taak | Commando |
| ----------------------- | ---------------------------------- |
| Controleer typescriptfouten | `pnpm tsc --noEmit` |
| Linter uitvoeren | `pnpm lint` |
| Omgeving valideren | `node scripts/check-env.js` |
| Snelle omgevingscheck | `node scripts/check-env.js --quick` |
| Databaseverbinding testen | `pnpm db:studio` |
| Migratiestatus bekijken | `pnpm db:migrate:cli` |
| Nieuwe migraties genereren | `pnpm db:generate` |
| In behandeling zijnde migraties toepassen | `pnpm db:migrate` |
| Zadendatabase | `pnpm db:seed` |
| Schone build-cache | `rm -rf .next` |
| Volledige herbouw | `rm -rf .next && pnpm build` |
| Database opnieuw instellen | `node scripts/clean-database.js` |

## Hulp krijgen

1. Zoek naar [GitHub-problemen](https://github.com/ever-works/directory-web-template/issues)
2. Bekijk het `CLAUDE.md` -bestand voor richtlijnen voor AI-ondersteunde ontwikkeling
3. Controleer het Sentry-dashboard op foutdetails (indien geconfigureerd)
4. Stuur voor beveiligingsproblemen een privé e-mail naar security@ever.co
