---
id: config-manager-system
title: "Sistema di gestione della configurazione"
sidebar_label: "Sistema di gestione della configurazione"
sidebar_position: 41
---

# Sistema di gestione della configurazione

## Panoramica

Il sistema Config Manager fornisce due livelli di configurazione complementari: la classe **ConfigManager** (`lib/config-manager.ts`) per la gestione del file di configurazione del contenuto basato su YAML (`config.yml`) con persistenza supportata da Git e **ConfigService** (`lib/config/`) per la convalida e l'accesso alla configurazione dell'applicazione basata su variabili di ambiente con schemi Zod. Insieme coprono sia le impostazioni modificabili in fase di esecuzione che la configurazione dell'ambiente in fase di distribuzione.

## Architettura

Il sistema è suddiviso in due sottosistemi distinti:

### ConfigManager (basato su YAML, modificabile in runtime)

`lib/config-manager.ts` gestisce il file `config.yml` all'interno della directory `.content/` (clonato dal repository dati). Legge e scrive la configurazione YAML, esegue automaticamente il commit e l'invio delle modifiche al repository Git utilizzando `isomorphic-git`. Viene utilizzato per le impostazioni che gli amministratori possono modificare in fase di runtime (impaginazione, navigazione, intestazione/piè di pagina).

### ConfigService (basato sull'ambiente, convalidato all'avvio)

`lib/config/` fornisce un singleton convalidato da Zod che legge tutte le variabili di ambiente all'avvio e le organizza in sezioni tipizzate: core, autenticazione, email, pagamento, analisi e integrazioni. Include flag di funzionalità, utilità di rilevamento dell'ambiente ed esportazioni tremolabili.

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

## Riferimento API

### Gestore configurazione (`lib/config-manager.ts`)

#### Tipi

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

#### `configManager` (Singolo)

L'istanza singleton esportata predefinita di `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

Restituisce l'oggetto di configurazione completo, unendo il contenuto del file con i valori predefiniti.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

Restituisce un valore di configurazione di primo livello per chiave.

#### `configManager.getNestedValue(keyPath: string): any`

Restituisce un valore di configurazione nidificato utilizzando la notazione punto (ad esempio, `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

Aggiorna una chiave di livello superiore e persiste su file + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

Aggiorna una chiave nidificata utilizzando la notazione punto. Include il prototipo di protezione contro l'inquinamento.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

Metodo pratico per aggiornare le impostazioni di impaginazione.

#### `configManager.getPaginationConfig(): PaginationConfig`

Restituisce la configurazione di impaginazione corrente.

### ServizioConfig (`lib/config/config-service.ts`)

#### `configService` (Singolo)

Singleton solo server che convalida tutte le variabili di ambiente all'avvio.

|Proprietà|Digitare|Descrizione|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|URL, informazioni sul sito, database|
|`configService.auth`|`AuthConfig`|Segreti, provider OAuth|
|`configService.email`|`EmailConfig`|SMTP, Rinvia, Nuovo|
|`configService.payment`|`PaymentConfig`|Striscia, LemonSqueezy, Polare|
|`configService.analytics`|`AnalyticsConfig`|PostHog, Sentry, Recaptcha|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev, venti CRM|

#### Flag di funzionalità (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

Le funzionalità (votazioni, commenti, preferiti, elementi in primo piano, sondaggi) sono abilitate quando è configurato `DATABASE_URL`.

#### Utilità ambientali (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## Dettagli di implementazione

**Coda delle operazioni Git**: `ConfigManager` utilizza una coda seriale con un modello mutex per impedire operazioni Git simultanee. Quando viene chiamato `writeConfig()`, il file viene salvato immediatamente e il commit/push Git viene messo in coda. Se le operazioni Git falliscono, il salvataggio del file riesce comunque.

**Dipendenze Git caricate in modo lento**: `isomorphic-git` e il relativo modulo HTTP vengono caricati in modo lento tramite `import()` dinamico con un modello singleton per evitare problemi di raggruppamento e impedire importazioni duplicate.

**Prototipo di protezione dall'inquinamento**: il metodo `updateNestedKey()` controlla le chiavi `__proto__`, `constructor` e `prototype` a ogni livello del percorso per prevenire attacchi di inquinamento del prototipo.

**Convalida di avvio**: `ConfigService` convalida tutte le variabili di ambiente utilizzando gli schemi Zod durante la prima importazione. Una configurazione non valida provoca un errore di avvio con messaggi di errore descrittivi. Gli schemi utilizzano i gestori `.catch()` per una degradazione regolare sui campi facoltativi.

**Applicazione solo server**: `config-service.ts` importa `'server-only'` per impedire l'inclusione accidentale nei bundle client. La configurazione sicura per il client viene esportata separatamente da `lib/config/client.ts`.

## Configurazione

### Variabili d'ambiente di ConfigManager

|Variabile|Obbligatorio|Descrizione|
|----------|----------|-------------|
|`DATA_REPOSITORY`|Sì|URL del repository Git per i contenuti|
|`GH_TOKEN`|Per Git push|Token di accesso GitHub|
|`GITHUB_BRANCH`|No|Nome della filiale (predefinito: `main`)|
|`GIT_NAME`|No|Nome del committente (predefinito: `Website Bot`)|
|`GIT_EMAIL`|No|E-mail del committente (impostazione predefinita: `website@ever.works`)|

### Variabili di ambiente ConfigService

Vedi `.env.example` per l'elenco completo. Le sezioni chiave includono `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*` e altre convalidate dagli schemi Zod.

## Esempi di utilizzo

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

## Migliori pratiche

- Utilizzare `configManager` per le impostazioni che devono essere modificate in fase di esecuzione dagli amministratori senza ridistribuzione.
- Utilizzare `configService` per la configurazione in fase di distribuzione che deve essere convalidata all'avvio.
- Importa la configurazione sicura per il client da `@/lib/config/client` nei componenti client, mai dall'esportazione del barile principale.
- Gestire sempre il ritorno `Promise<boolean>` da `updateKey` e `updateNestedKey` per rilevare errori di scrittura.
- Utilizza i flag di funzionalità per degradare con garbo la funzionalità quando le dipendenze facoltative (come il database) non sono configurate.

## Moduli correlati

- [Cache System](./cache-system) -- Utilizza `CACHE_TAGS.CONFIG` per la memorizzazione nella cache della configurazione
- [Guards System](./guards-system-deep-dive) - Consuma la configurazione del piano/funzionalità
- [Libreria contenuti](/template/architecture/content-library) -- Risoluzione del percorso del contenuto utilizzata da ConfigManager
