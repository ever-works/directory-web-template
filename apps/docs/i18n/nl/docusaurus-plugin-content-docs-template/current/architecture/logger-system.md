---
id: logger-system
title: "Logger-systeem"
sidebar_label: "Logger-systeem"
sidebar_position: 44
---

# Logger-systeem

## Overzicht

Het Logger-systeem biedt een lichtgewicht, milieubewust loghulpprogramma voor consistente loguitvoer in de hele applicatie. Het ondersteunt vier logniveaus (DEBUG, INFO, WARN, ERROR), contextgerichte logger-instanties en omgevingsspecifieke opmaak - gestileerde console-uitvoer in de browser tijdens ontwikkeling en gewone JSON-geformatteerde uitvoer in Node.js en productieomgevingen.

## Architectuur

De module (`lib/logger.ts`) exporteert twee items:

- **`logger`** -- Een standaard Singleton-instantie zonder contextlabel, geschikt voor logboekregistratie voor algemene doeleinden.
- **`Logger`** (klasse) -- De klasse zelf, voor het maken van contextuele logger-instanties die zich richten op specifieke modules of functies.

De logger volgt een eenvoudige filterstrategie: in productie (`NODE_ENV !== 'development'`) worden alleen WARN- en ERROR-berichten verzonden. Tijdens de ontwikkeling worden alle niveaus geregistreerd. Dit zorgt ervoor dat uitgebreide debugging-uitvoer niet in productieomgevingen terechtkomt.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## API-referentie

### Exporteert

#### `logger` (Singleton)

Een vooraf geïnstantieerde `Logger`-instantie zonder context. Gebruik voor snelle logboekregistratie zonder bereik.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (Klasse)

##### `static create(context: string): Logger`

Fabrieksmethode voor het maken van een contextgerichte logger. De contexttekenreeks verschijnt als voorvoegsel in alle logberichten.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

Registreert een bericht op foutopsporingsniveau. Alleen uitgestoten tijdens de ontwikkeling.

##### `info(message: string, data?: any): void`

Registreert een informatief bericht. Alleen uitgestoten tijdens de ontwikkeling.

##### `warn(message: string, data?: any): void`

Registreert een waarschuwingsbericht. Uitgestoten in alle omgevingen.

##### `error(message: string, error?: any): void`

Registreert een foutmelding. Als de parameter `error` een `Error`-instantie is, extraheert de logger automatisch de eigenschappen `message`, `stack` en `name`. Uitgestoten in alle omgevingen.

##### `api(method: string, url: string, data?: any): void`

Gemaksmethode voor het loggen van API-verzoeken. Delegeert naar `debug()` met gestructureerde gegevens. Alleen ontwikkeling.

##### `performance(label: string, duration: number): void`

Gemaksmethode voor het loggen van prestatiestatistieken. Registreert het label en de duur in milliseconden. Alleen ontwikkeling.

### Interne typen

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;  // ISO 8601
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}
```

## Implementatiedetails

**Omgevingsdetectie**: De logger controleert `process.env.NODE_ENV === 'development'` tijdens de bouwtijd en slaat het resultaat op in de cache. Dit voorkomt herhaalde zoekacties in de omgeving bij elke logoproep.

**Browserstijl**: wanneer de browser (`typeof window !== 'undefined'`) in de ontwikkelingsmodus wordt uitgevoerd, worden logberichten opgemaakt met behulp van `%c` CSS-richtlijnen:

|Niveau|Kleur|
|-------|-------|
|DEBUGGEN|`#6366f1` (indigo)|
|INFO|`#3b82f6` (blauw)|
|WAARSCHUW|`#f59e0b` (oranje)|
|FOUT|`#ef4444` (rood)|

**Node.js-uitvoer**: in Node.js-omgevingen of productie worden berichten opgemaakt als gewone tekenreeksen met JSON-seriële gegevens (mooi afgedrukt met een inspringing van twee spaties).

**Foutextractie**: de `error()`-methode detecteert `Error`-instanties en extraheert `errorMessage`, `stack` en `name` in een gestructureerd gegevensobject voor eenvoudiger debuggen.

## Configuratie

De logger vereist geen configuratie. Het gedrag ervan wordt volledig bepaald door `NODE_ENV`:

|`NODE_ENV`|DEBUGGEN|INFO|WAARSCHUW|FOUT|
|------------|-------|------|------|-------|
|`development`|Ja|Ja|Ja|Ja|
|`production`|Nee|Nee|Ja|Ja|
|`test`|Nee|Nee|Ja|Ja|

## Gebruiksvoorbeelden

```typescript
import { logger, Logger } from '@/lib/logger';

// General logging
logger.info('Server started on port 3000');
logger.warn('Deprecated API endpoint called', { endpoint: '/api/v1/items' });
logger.error('Failed to fetch data', new Error('Network timeout'));

// Context-scoped logging
const dbLogger = Logger.create('Database');
dbLogger.info('Connection established', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection refused'));

// API request logging
const apiLogger = Logger.create('API');
apiLogger.api('GET', '/api/items', { page: 1, limit: 20 });
apiLogger.api('POST', '/api/items', { title: 'New Item' });

// Performance tracking
const perfLogger = Logger.create('Performance');
const start = performance.now();
// ... expensive operation ...
const duration = performance.now() - start;
perfLogger.performance('fetchItems', duration);
// Output: [10:30:45] DEBUG [Performance] Performance: fetchItems { duration: "42ms" }
```

## Beste praktijken

- Maak contextgerichte loggers voor elke module of functiegebied met behulp van `Logger.create('ModuleName')`, zodat logboeken eenvoudig kunnen worden gefilterd.
- Gebruik `debug()` voor gedetailleerde tracering die nooit in productie mag verschijnen; gebruik `info()` voor opmerkelijke evenementen.
- Geef altijd `Error`-objecten (geen tekenreeksen) door aan de `error()`-methode, zodat stacktraces automatisch worden vastgelegd.
- Gebruik de `api()`-methode voor het loggen van HTTP-aanvragen om een consistente logstructuur voor API-aanroepen te behouden.
- Vertrouw niet op de logger voor monitoring tijdens de productie; te integreren met een goed observatieplatform (PostHog, Sentry) voor het opsporen van productiefouten.

## Gerelateerde modules

- [API Client Layer](/template/architecture/api-client-layer) - Gebruikt de logger voor het loggen van verzoeken/antwoorden
- [Config Manager System](./config-manager-system) -- ConfigService registreert validatieresultaten bij het opstarten
