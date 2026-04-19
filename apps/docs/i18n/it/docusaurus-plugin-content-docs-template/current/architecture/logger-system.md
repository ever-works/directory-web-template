---
id: logger-system
title: "Sistema di registrazione"
sidebar_label: "Sistema di registrazione"
sidebar_position: 44
---

# Sistema di registrazione

## Panoramica

Il sistema Logger fornisce un'utilità di registrazione leggera e compatibile con l'ambiente per un output di registro coerente in tutta l'applicazione. Supporta quattro livelli di log (DEBUG, INFO, WARN, ERROR), istanze di logger con ambito contestuale e formattazione specifica dell'ambiente: output della console in stile nel browser durante lo sviluppo e output in formato JSON semplice in Node.js e ambienti di produzione.

## Architettura

Il modulo (`lib/logger.ts`) esporta due elementi:

- **`logger`** -- Un'istanza singleton predefinita senza un'etichetta di contesto, adatta per la registrazione per scopi generici.
- **`Logger`** (classe) -- La classe stessa, per creare istanze di logger contestuali con ambito a moduli o funzionalità specifici.

Il logger segue una semplice strategia di filtraggio: in produzione (`NODE_ENV !== 'development'`), vengono emessi solo i messaggi WARN ed ERROR. Durante lo sviluppo, tutti i livelli vengono registrati. Ciò garantisce che l'output dettagliato del debug non si diffonda negli ambienti di produzione.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## Riferimento API

### Esportazioni

#### `logger` (Singolo)

Un'istanza `Logger` preistanziata senza contesto. Utilizzare per la registrazione rapida e senza ambito.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (Classe)

##### `static create(context: string): Logger`

Metodo di fabbrica per creare un logger con ambito contestuale. La stringa di contesto appare come prefisso in tutti i messaggi di registro.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

Registra un messaggio a livello di debug. Emesso solo in fase di sviluppo.

##### `info(message: string, data?: any): void`

Registra un messaggio informativo. Emesso solo in fase di sviluppo.

##### `warn(message: string, data?: any): void`

Registra un messaggio di avviso. Emesso in tutti gli ambienti.

##### `error(message: string, error?: any): void`

Registra un messaggio di errore. Se il parametro `error` è un'istanza `Error`, il logger estrae automaticamente le proprietà `message`, `stack` e `name`. Emesso in tutti gli ambienti.

##### `api(method: string, url: string, data?: any): void`

Metodo pratico per la registrazione delle richieste API. Delegati a `debug()` con dati strutturati. Solo sviluppo.

##### `performance(label: string, duration: number): void`

Metodo pratico per la registrazione delle metriche delle prestazioni. Registra l'etichetta e la durata in millisecondi. Solo sviluppo.

### Tipi interni

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

## Dettagli di implementazione

**Rilevamento dell'ambiente**: il logger controlla `process.env.NODE_ENV === 'development'` in fase di costruzione e memorizza nella cache il risultato. Ciò evita ricerche ripetute dell'ambiente su ogni chiamata di registro.

**Stile del browser**: durante l'esecuzione nel browser (`typeof window !== 'undefined'`) in modalità sviluppo, ai messaggi di registro viene applicato uno stile utilizzando le direttive CSS `%c`:

|Livello|Colore|
|-------|-------|
|DEBUG|`#6366f1` (indaco)|
|INFORMAZIONI|`#3b82f6` (blu)|
|AVVISO|`#f59e0b` (ambra)|
|ERRORE|`#ef4444` (rosso)|

**Output Node.js**: negli ambienti o nella produzione Node.js, i messaggi vengono formattati come stringhe semplici con dati serializzati JSON (prestampati con rientro di 2 spazi).

**Estrazione degli errori**: il metodo `error()` rileva le istanze `Error` ed estrae `errorMessage`, `stack` e `name` in un oggetto dati strutturati per un debug più semplice.

## Configurazione

Il logger non richiede configurazione. Il suo comportamento è determinato interamente da `NODE_ENV`:

|`NODE_ENV`|DEBUG|INFORMAZIONI|AVVISO|ERRORE|
|------------|-------|------|------|-------|
|`development`|Sì|Sì|Sì|Sì|
|`production`|No|No|Sì|Sì|
|`test`|No|No|Sì|Sì|

## Esempi di utilizzo

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

## Migliori pratiche

- Crea logger con ambito contestuale per ogni modulo o area di funzionalità utilizzando `Logger.create('ModuleName')` per semplificare il filtraggio dei log.
- Utilizzare `debug()` per una traccia dettagliata che non dovrebbe mai apparire nella produzione; utilizzare `info()` per eventi importanti.
- Passa sempre gli oggetti `Error` (non le stringhe) al metodo `error()` in modo che le analisi dello stack vengano acquisite automaticamente.
- Utilizza il metodo `api()` per la registrazione delle richieste HTTP per mantenere una struttura di registro coerente tra le chiamate API.
- Non fare affidamento sul logger per il monitoraggio in produzione; integrarsi con un'apposita piattaforma di osservabilità (PostHog, Sentry) per il tracciamento degli errori di produzione.

## Moduli correlati

- [API Client Layer](/template/architecture/api-client-layer): utilizza il logger per la registrazione di richieste/risposte
- [Config Manager System](./config-manager-system): ConfigService registra i risultati della convalida all'avvio
