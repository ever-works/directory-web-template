---
id: config-manager-system
title: "Configuratiebeheersysteem"
sidebar_label: "Configuratiebeheersysteem"
sidebar_position: 41
---

# Configuratiebeheersysteem

## Overzicht

Het Config Manager-systeem biedt twee complementaire configuratielagen: de klasse **ConfigManager** (`lib/config-manager.ts`) voor het beheren van het op YAML gebaseerde inhoudconfiguratiebestand (`config.yml`) met door Git ondersteunde persistentie, en de **ConfigService** (`lib/config/`) voor het valideren van en toegang krijgen tot de op omgevingsvariabelen gebaseerde applicatieconfiguratie met Zod-schema's. Samen omvatten ze zowel tijdens runtime bewerkbare instellingen als de configuratie van de implementatieomgeving.

## Architectuur

Het systeem is verdeeld in twee afzonderlijke subsystemen:

### ConfigManager (YAML-gebaseerd, runtime-bewerkbaar)

`lib/config-manager.ts` beheert het bestand `config.yml` in de map `.content/` (gekloond uit de gegevensopslag). Het leest en schrijft de YAML-configuratie, en voert automatisch wijzigingen door en pusht deze naar de Git-repository met behulp van `isomorphic-git`. Dit wordt gebruikt voor instellingen die beheerders tijdens runtime kunnen wijzigen (paginering, navigatie, kop-/voettekst).

### ConfigService (omgevingsgebaseerd, bij opstarten gevalideerd)

`lib/config/` biedt een Zod-gevalideerde singleton die alle omgevingsvariabelen leest bij het opstarten en deze in getypte secties organiseert: kern, auth, e-mail, betaling, analyse en integraties. Het bevat functievlaggen, hulpprogramma's voor omgevingsdetectie en boomschudbare exports.

```
config-manager.ts       --> Runtime YAML config (config.yml)
lib/config/
  index.ts              --> Barrel exports
  config-service.ts     --> Singleton ConfigService class
  types.ts              --> Type definitions
  env.ts                --> Zod-validated env variables
  feature-flags.ts      --> Database-dependent feature toggles
  schemas/              --> Zod schemas per section
  client.ts             --> Client-safe config exports
```

## API-referentie

### ConfiguratieManager (`lib/config-manager.ts`)

#### Soorten

```typescript
interface PaginationConfig {
  type: 'standard' | 'infinite';
  itemsPerPage: number;
}

interface AppConfig {
  pagination: PaginationConfig;
  [key: string]: any;
}
```

#### `configManager` (Singleton)

Het standaard geëxporteerde singleton-exemplaar van `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

Retourneert het volledige configuratieobject, waarbij de bestandsinhoud wordt samengevoegd met de standaardwaarden.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

Retourneert een configuratiewaarde op het hoogste niveau per sleutel.

#### `configManager.getNestedValue(keyPath: string): any`

Retourneert een geneste configuratiewaarde met behulp van puntnotatie (bijvoorbeeld `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

Werkt een sleutel op het hoogste niveau bij en blijft aanwezig in bestand + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

Werkt een geneste sleutel bij met behulp van puntnotatie. Inclusief prototype van bescherming tegen vervuiling.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

Gemaksmethode om pagineringsinstellingen bij te werken.

#### `configManager.getPaginationConfig(): PaginationConfig`

Retourneert de huidige pagineringsconfiguratie.

### ConfiguratieService (`lib/config/config-service.ts`)

#### `configService` (Singleton)

Server-only singleton die alle omgevingsvariabelen valideert bij het opstarten.

|Eigendom|Typ|Beschrijving|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|URL's, site-informatie, database|
|`configService.auth`|`AuthConfig`|Geheimen, OAuth-providers|
|`configService.email`|`EmailConfig`|SMTP, Opnieuw verzenden, Novu|
|`configService.payment`|`PaymentConfig`|Gestreept, LemonSqueezy, Polar|
|`configService.analytics`|`AnalyticsConfig`|PostHog, Sentry, Recaptcha|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev, Twenty CRM|

#### Functievlaggen (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

Functies (beoordelingen, opmerkingen, favorieten, aanbevolen items, enquêtes) zijn ingeschakeld wanneer `DATABASE_URL` is geconfigureerd.

#### Milieu Nutsbedrijven (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## Implementatiedetails

**Git-bewerkingswachtrij**: `ConfigManager` gebruikt een seriële wachtrij met een mutex-patroon om gelijktijdige Git-bewerkingen te voorkomen. Wanneer `writeConfig()` wordt aangeroepen, wordt het bestand onmiddellijk opgeslagen en wordt de Git commit/push in de wachtrij geplaatst. Als Git-bewerkingen mislukken, slaagt het opslaan van het bestand nog steeds.

**Lazy-loaded Git-afhankelijkheden**: `isomorphic-git` en zijn HTTP-module worden lui geladen via dynamische `import()` met een singleton-patroon om bundelingsproblemen te voorkomen en dubbele import te voorkomen.

**Prototypebescherming tegen vervuiling**: De `updateNestedKey()`-methode controleert op `__proto__`, `constructor` en `prototype` op elk niveau van het pad om prototype-vervuilingsaanvallen te voorkomen.

**Opstartvalidatie**: `ConfigService` valideert alle omgevingsvariabelen met behulp van Zod-schema's tijdens de eerste import. Ongeldige configuratie veroorzaakt een opstartfout met beschrijvende foutmeldingen. Schema's gebruiken `.catch()` handlers voor een correcte degradatie van optionele velden.

**Afdwinging alleen op de server**: `config-service.ts` importeert `'server-only'` om onbedoelde opname in clientbundels te voorkomen. Clientveilige configuratie wordt afzonderlijk geëxporteerd vanuit `lib/config/client.ts`.

## Configuratie

### ConfigManager-omgevingsvariabelen

|Variabel|Vereist|Beschrijving|
|----------|----------|-------------|
|`DATA_REPOSITORY`|Ja|Git-repository-URL voor inhoud|
|`GH_TOKEN`|Voor Git-push|GitHub-toegangstoken|
|`GITHUB_BRANCH`|Nee|Filiaalnaam (standaard: `main`)|
|`GIT_NAME`|Nee|Committernaam (standaard: `Website Bot`)|
|`GIT_EMAIL`|Nee|E-mailadres van de commititter (standaard: `website@ever.works`)|

### ConfigService-omgevingsvariabelen

Zie `.env.example` voor de volledige lijst. Belangrijke secties zijn onder meer `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*` en andere die zijn gevalideerd door Zod-schema's.

## Gebruiksvoorbeelden

```typescript
// Runtime config (YAML)
import { configManager } from '@/lib/config-manager';

// Read pagination settings
const pagination = configManager.getPaginationConfig();
console.log(pagination.type); // 'standard' | 'infinite'

// Update pagination
await configManager.updatePagination('infinite', 24);

// Update a nested key
await configManager.updateNestedKey('custom_header', [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]);

// Environment config (validated)
import { configService, coreConfig, paymentConfig } from '@/lib/config';

const appUrl = coreConfig.APP_URL;
const stripeEnabled = paymentConfig.stripe.enabled;

// Feature flags
import { isFeatureEnabled } from '@/lib/config';

if (isFeatureEnabled('comments')) {
  // Render comments section
}
```

## Beste praktijken

- Gebruik `configManager` voor instellingen die tijdens runtime door beheerders moeten worden gewijzigd zonder opnieuw te implementeren.
- Gebruik `configService` voor de configuratie tijdens de implementatie die moet worden gevalideerd bij het opstarten.
- Importeer clientveilige configuratie van `@/lib/config/client` in clientcomponenten, nooit vanuit de hoofdcilinderexport.
- Behandel altijd de `Promise<boolean>` return van `updateKey` en `updateNestedKey` om schrijffouten te detecteren.
- Gebruik functievlaggen om de functionaliteit netjes te verminderen wanneer optionele afhankelijkheden (zoals de database) niet zijn geconfigureerd.

## Gerelateerde modules

- [Cachesysteem](./cache-system) -- Gebruikt `CACHE_TAGS.CONFIG` voor configuratiecaching
- [Guards System](./guards-system-deep-dive) - Verbruikt plan-/functieconfiguratie
- [Inhoudsbibliotheek](/template/architecture/content-library) -- Resolutie van inhoudspaden gebruikt door ConfigManager
