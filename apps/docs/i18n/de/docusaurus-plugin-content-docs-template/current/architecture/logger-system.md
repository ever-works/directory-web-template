---
id: logger-system
title: "Logger-System"
sidebar_label: "Logger-System"
sidebar_position: 44
---

# Logger-System

## Übersicht

Das Logger-System bietet ein leichtes, umgebungsbewusstes Protokollierungsdienstprogramm für eine konsistente Protokollausgabe in der gesamten Anwendung. Es unterstützt vier Protokollebenen (DEBUG, INFO, WARN, ERROR), kontextbezogene Logger-Instanzen und umgebungsspezifische Formatierung – gestaltete Konsolenausgabe im Browser während der Entwicklung und einfache JSON-formatierte Ausgabe in Node.js und Produktionsumgebungen.

## Architektur

Das Modul (`lib/logger.ts`) exportiert zwei Elemente:

- **`logger`** – Eine Standard-Singleton-Instanz ohne Kontextbezeichnung, geeignet für allgemeine Protokollierung.
- **`Logger`** (Klasse) – Die Klasse selbst zum Erstellen kontextbezogener Logger-Instanzen, die auf bestimmte Module oder Funktionen beschränkt sind.

Der Logger folgt einer einfachen Filterstrategie: In der Produktion (`NODE_ENV !== 'development'`) werden nur WARN- und ERROR-Meldungen ausgegeben. In der Entwicklung werden alle Ebenen protokolliert. Dadurch wird sichergestellt, dass ausführliche Debugging-Ausgaben nicht in Produktionsumgebungen gelangen.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## API-Referenz

### Exporte

#### `logger` (Singleton)

Eine vorinstanziierte `Logger` Instanz ohne Kontext. Zur schnellen, uneingeschränkten Protokollierung verwenden.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (Klasse)

##### `static create(context: string): Logger`

Factory-Methode zum Erstellen eines kontextbezogenen Loggers. Die Kontextzeichenfolge erscheint als Präfix in allen Protokollmeldungen.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

Protokolliert eine Meldung auf Debug-Ebene. Wird nur in der Entwicklung emittiert.

##### `info(message: string, data?: any): void`

Protokolliert eine Informationsmeldung. Wird nur in der Entwicklung emittiert.

##### `warn(message: string, data?: any): void`

Protokolliert eine Warnmeldung. Wird in allen Umgebungen emittiert.

##### `error(message: string, error?: any): void`

Protokolliert eine Fehlermeldung. Wenn der Parameter `error` eine `Error`-Instanz ist, extrahiert der Logger automatisch die Eigenschaften `message`, `stack` und `name`. Wird in allen Umgebungen emittiert.

##### `api(method: string, url: string, data?: any): void`

Praktische Methode zum Protokollieren von API-Anfragen. Delegiert an `debug()` mit strukturierten Daten. Nur Entwicklung.

##### `performance(label: string, duration: number): void`

Praktische Methode zum Protokollieren von Leistungsmetriken. Protokolliert die Bezeichnung und Dauer in Millisekunden. Nur Entwicklung.

### Interne Typen

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

## Implementierungsdetails

**Umgebungserkennung**: Der Logger prüft `process.env.NODE_ENV === 'development'` zur Bauzeit und speichert das Ergebnis zwischen. Dadurch werden wiederholte Umgebungssuchen bei jedem Protokollaufruf vermieden.

**Browser-Stil**: Bei der Ausführung im Browser (`typeof window !== 'undefined'`) im Entwicklungsmodus werden Protokollnachrichten mithilfe von `%c` CSS-Anweisungen gestaltet:

|Ebene|Farbe|
|-------|-------|
|DEBUG|`#6366f1` (Indigo)|
|INFO|`#3b82f6` (blau)|
|WARNUNG|`#f59e0b` (bernsteinfarben)|
|FEHLER|`#ef4444` (rot)|

**Node.js-Ausgabe**: In Node.js-Umgebungen oder in der Produktion werden Nachrichten als einfache Zeichenfolgen mit JSON-serialisierten Daten formatiert (schön gedruckt mit 2-Leerzeichen-Einzug).

**Fehlerextraktion**: Die `error()`-Methode erkennt `Error`-Instanzen und extrahiert `errorMessage`, `stack` und `name` in ein strukturiertes Datenobjekt, um das Debuggen zu erleichtern.

## Konfiguration

Der Logger erfordert keine Konfiguration. Sein Verhalten wird vollständig durch `NODE_ENV` bestimmt:

|`NODE_ENV`|DEBUG|INFO|WARNUNG|FEHLER|
|------------|-------|------|------|-------|
|`development`|Ja|Ja|Ja|Ja|
|`production`|Nein|Nein|Ja|Ja|
|`test`|Nein|Nein|Ja|Ja|

## Anwendungsbeispiele

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

## Best Practices

- Erstellen Sie mit `Logger.create('ModuleName')` kontextbezogene Logger für jedes Modul oder jeden Funktionsbereich, um das Filtern von Protokollen zu vereinfachen.
- Verwenden Sie `debug()` für eine detaillierte Ablaufverfolgung, die niemals in der Produktion erscheinen sollte; Verwenden Sie `info()` für bemerkenswerte Ereignisse.
- Übergeben Sie immer `Error`-Objekte (keine Zeichenfolgen) an die `error()`-Methode, damit Stack-Traces automatisch erfasst werden.
- Verwenden Sie die Methode `api()` für die HTTP-Anforderungsprotokollierung, um eine konsistente Protokollstruktur über alle API-Aufrufe hinweg aufrechtzuerhalten.
- Verlassen Sie sich bei der Überwachung in der Produktion nicht auf den Logger; Integration in eine geeignete Observability-Plattform (PostHog, Sentry) zur Produktionsfehlerverfolgung.

## Verwandte Module

- [API-Client-Schicht](/template/architecture/api-client-layer) – Verwendet den Logger für die Anforderungs-/Antwortprotokollierung
- [Config Manager System](./config-manager-system) – ConfigService protokolliert Validierungsergebnisse beim Start
