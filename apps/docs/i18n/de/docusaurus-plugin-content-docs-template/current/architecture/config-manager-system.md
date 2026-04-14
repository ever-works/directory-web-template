---
id: config-manager-system
title: "Config Manager-System"
sidebar_label: "Config Manager-System"
sidebar_position: 41
---

# Config Manager-System

## Übersicht

Das Config Manager System bietet zwei komplementäre Konfigurationsebenen: die **ConfigManager**-Klasse (`lib/config-manager.ts`) zum Verwalten der YAML-basierten Inhaltskonfigurationsdatei (`config.yml`) mit Git-gestützter Persistenz und den **ConfigService** (`lib/config/`) zum Validieren und Zugreifen auf umgebungsvariablenbasierte Anwendungskonfigurationen mit Zod-Schemas. Zusammen decken sie sowohl die zur Laufzeit bearbeitbaren Einstellungen als auch die Umgebungskonfiguration zur Bereitstellungszeit ab.

## Architektur

Das System ist in zwei verschiedene Subsysteme unterteilt:

### ConfigManager (YAML-basiert, zur Laufzeit editierbar)

`lib/config-manager.ts` verwaltet die Datei `config.yml` im Verzeichnis `.content/` (aus dem Datenrepository geklont). Es liest und schreibt die YAML-Konfiguration und schreibt Änderungen automatisch mit `isomorphic-git` in das Git-Repository und überträgt diese per Push. Dies wird für Einstellungen verwendet, die Administratoren zur Laufzeit ändern können (Paginierung, Navigation, Kopf-/Fußzeile).

### ConfigService (umgebungsbasiert, vom Start validiert)

`lib/config/` stellt einen Zod-validierten Singleton bereit, der alle Umgebungsvariablen beim Start liest und sie in typisierten Abschnitten organisiert: Kern, Authentifizierung, E-Mail, Zahlung, Analyse und Integrationen. Es umfasst Feature-Flags, Dienstprogramme zur Umgebungserkennung und Baum-Shakeable-Exporte.

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

## API-Referenz

### ConfigManager (`lib/config-manager.ts`)

#### Typen

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

Die standardmäßig exportierte Singleton-Instanz von `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

Gibt das vollständige Konfigurationsobjekt zurück und führt Dateiinhalte mit Standardwerten zusammen.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

Gibt einen Konfigurationswert der obersten Ebene nach Schlüssel zurück.

#### `configManager.getNestedValue(keyPath: string): any`

Gibt einen verschachtelten Konfigurationswert in Punktnotation zurück (z. B. `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

Aktualisiert einen Schlüssel der obersten Ebene und bleibt in Datei + Git bestehen.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

Aktualisiert einen verschachtelten Schlüssel mithilfe der Punktnotation. Beinhaltet Prototypen-Verschmutzungsschutz.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

Praktische Methode zum Aktualisieren der Paginierungseinstellungen.

#### `configManager.getPaginationConfig(): PaginationConfig`

Gibt die aktuelle Paginierungskonfiguration zurück.

### ConfigService (`lib/config/config-service.ts`)

#### `configService` (Singleton)

Nur-Server-Singleton, der alle Umgebungsvariablen beim Start validiert.

|Eigentum|Typ|Beschreibung|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|URLs, Site-Informationen, Datenbank|
|`configService.auth`|`AuthConfig`|Geheimnisse, OAuth-Anbieter|
|`configService.email`|`EmailConfig`|SMTP, erneut senden, Novu|
|`configService.payment`|`PaymentConfig`|Streifen, LemonSqueezy, Polar|
|`configService.analytics`|`AnalyticsConfig`|PostHog, Sentry, Recaptcha|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev, Twenty CRM|

#### Feature-Flags (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

Funktionen (Bewertungen, Kommentare, Favoriten, vorgestellte Artikel, Umfragen) sind aktiviert, wenn `DATABASE_URL` konfiguriert ist.

#### Umweltversorger (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## Implementierungsdetails

**Git-Operationswarteschlange**: `ConfigManager` verwendet eine serielle Warteschlange mit einem Mutex-Muster, um gleichzeitige Git-Operationen zu verhindern. Wenn `writeConfig()` aufgerufen wird, wird die Datei sofort gespeichert und der Git-Commit/Push in die Warteschlange gestellt. Wenn Git-Vorgänge fehlschlagen, ist das Speichern der Datei trotzdem erfolgreich.

**Verzögert geladene Git-Abhängigkeiten**: `isomorphic-git` und sein HTTP-Modul werden verzögert über dynamisches `import()` mit einem Singleton-Muster geladen, um Bündelungsprobleme zu vermeiden und doppelte Importe zu verhindern.

**Prototyp-Verschmutzungsschutz**: Die `updateNestedKey()`-Methode prüft auf jeder Ebene des Pfads, ob `__proto__`-, `constructor`- und `prototype`-Schlüssel vorhanden sind, um Prototyp-Verschmutzungsangriffe zu verhindern.

**Startvalidierung**: `ConfigService` validiert alle Umgebungsvariablen mithilfe von Zod-Schemas während des ersten Imports. Eine ungültige Konfiguration führt zu einem Startfehler mit beschreibenden Fehlermeldungen. Schemata verwenden `.catch()`-Handler für eine sanfte Verschlechterung optionaler Felder.

**Nur serverseitige Durchsetzung**: `config-service.ts` importiert `'server-only'`, um eine versehentliche Aufnahme in Client-Bundles zu verhindern. Die clientsichere Konfiguration wird separat aus `lib/config/client.ts` exportiert.

## Konfiguration

### ConfigManager-Umgebungsvariablen

|Variabel|Erforderlich|Beschreibung|
|----------|----------|-------------|
|`DATA_REPOSITORY`|Ja|Git-Repository-URL für Inhalte|
|`GH_TOKEN`|Für Git-Push|GitHub-Zugriffstoken|
|`GITHUB_BRANCH`|Nein|Filialname (Standard: `main`)|
|`GIT_NAME`|Nein|Name des Committers (Standard: `Website Bot`)|
|`GIT_EMAIL`|Nein|E-Mail des Committers (Standard: `website@ever.works`)|

### ConfigService-Umgebungsvariablen

Die vollständige Liste finden Sie unter `.env.example`. Zu den Schlüsselabschnitten gehören `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*` und andere, die durch Zod-Schemata validiert wurden.

## Anwendungsbeispiele

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

## Best Practices

- Verwenden Sie `configManager` für Einstellungen, die zur Laufzeit von Administratoren ohne erneute Bereitstellung geändert werden müssen.
- Verwenden Sie `configService` für die Konfiguration zur Bereitstellungszeit, die beim Start validiert werden sollte.
- Importieren Sie die clientsichere Konfiguration von `@/lib/config/client` in Client-Komponenten, niemals aus dem Haupt-Barrel-Export.
- Behandeln Sie immer die Rückgabe `Promise<boolean>` von `updateKey` und `updateNestedKey`, um Schreibfehler zu erkennen.
- Verwenden Sie Feature-Flags, um die Funktionalität sanft herabzusetzen, wenn optionale Abhängigkeiten (wie die Datenbank) nicht konfiguriert sind.

## Verwandte Module

- [Cache-System](./cache-system) – Verwendet `CACHE_TAGS.CONFIG` für das Konfigurations-Caching
- [Guards System](./guards-system-deep-dive) – Verbraucht die Plan-/Funktionskonfiguration
- [Inhaltsbibliothek](/template/architecture/content-library) – Von ConfigManager verwendete Inhaltspfadauflösung
