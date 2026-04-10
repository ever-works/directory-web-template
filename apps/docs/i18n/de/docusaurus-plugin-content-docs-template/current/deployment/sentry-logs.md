---
id: sentry-logs
title: Sentry Protokoll-Konfiguration
sidebar_label: Sentry Protokolle
sidebar_position: 7
---

# Sentry Protokoll-Konfiguration

Dieses Dokument erklärt, wie Sentry-Protokolle im Template-Repository und im Ever Works-Repository konfiguriert und verwendet werden.

## Übersicht

Sentry Logs bietet zentralisiertes Log-Management und ermöglicht es Ihnen, Anwendungsprotokolle im Sentry Logs Explorer zu erfassen, weiterzuleiten und zu analysieren. Alle Protokolle werden bei Aktivierung automatisch an Sentry weitergeleitet und bieten eine einheitliche Übersicht des Anwendungsverhaltens in verschiedenen Umgebungen.

## Funktionen

- ✅ Automatische Protokollweiterleitung an Sentry
- ✅ Unterstützung aller Log-Level (debug, info, warn, error)
- ✅ Kontextbewusstes Logging mit automatischer Kennzeichnung
- ✅ Umgebungsspezifische Konfiguration
- ✅ Strukturiertes Logging mit Metadaten-Unterstützung
- ✅ Integration mit vorhandenem Logger-Dienstprogramm

## Konfiguration

### Umgebungsvariablen

Fügen Sie diese Variablen zu Ihrer `.env.local`-Datei für die lokale Entwicklung hinzu:

```env
# Sentry-Konfiguration (erforderlich für Protokolle)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# Sentry in der Entwicklung aktivieren (optional, standardmäßig nur in Produktion)
SENTRY_ENABLE_DEV=true

# Sentry Debug-Modus (optional)
SENTRY_DEBUG=false

# Sentry-Protokoll-Konfiguration
SENTRY_LOGS_ENABLED=true  # Sentry Logs aktivieren/deaktivieren (Standard: true)
SENTRY_LOGS_LEVEL=info    # Mindest-Log-Level zum Erfassen (Standard: info)
```

### Umgebungsspezifische Einrichtung

#### Lokale Entwicklung

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # Alle Protokolle in der Entwicklung erfassen
```

#### Entwicklung/Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info  # Info-, Warn- und Error-Protokolle erfassen
```

#### Produktion

```env
SENTRY_ENABLE_DEV=false  # In der Produktion nicht benötigt
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # Nur Warnungen und Fehler in der Produktion erfassen
```

## Verwendung

### Grundlegendes Logging

Der Logger leitet Protokolle bei Aktivierung automatisch an Sentry weiter:

```typescript
import { logger } from '@/lib/logger';

// Info-Protokoll
logger.info('User logged in', { userId: '12345' });

// Warn-Protokoll
logger.warn('Rate limit approaching', { current: 90, limit: 100 });

// Error-Protokoll
logger.error('Payment failed', { orderId: '67890', error: errorObject });

// Debug-Protokoll (nur in der Entwicklung)
logger.debug('API request', { method: 'GET', url: '/api/users' });
```

### Kontextuelles Logging

Erstellen Sie einen Logger mit einem bestimmten Kontext für bessere Organisation:

```typescript
import { Logger } from '@/lib/logger';

const paymentLogger = Logger.create('PaymentService');

paymentLogger.info('Processing payment', { amount: 100, currency: 'USD' });
paymentLogger.error('Payment failed', error);
```

### Log-Level

Der Logger unterstützt vier Log-Level, die automatisch auf Sentry-Schweregradebenen abgebildet werden:

| Logger-Level | Sentry-Level | Beschreibung |
|-------------|-------------|-------------|
| `DEBUG` | `debug` | Detaillierte Debug-Informationen (nur Entwicklung) |
| `INFO` | `info` | Allgemeine Informationsmeldungen |
| `WARN` | `warning` | Warnungsmeldungen für potenzielle Probleme |
| `ERROR` | `error` | Fehlermeldungen für Fehler |

## Funktionsweise

### Initialisierung

Sentry Logs ist sowohl in der Client- als auch in der Server-Instrumentierung aktiviert:

1. **Serverseitig** (`instrumentation.ts`): Initialisiert Sentry für Node.js-Runtime
2. **Clientseitig** (`instrumentation-client.ts`): Initialisiert Sentry für Browser-Runtime

Beide Konfigurationen beinhalten:
```typescript
_experiments: {
  enableLogs: SENTRY_LOGS_ENABLED,
}
```

### Protokollweiterleitung

Das Logger-Dienstprogramm (`lib/logger.ts`) führt automatisch folgende Schritte durch:
1. Prüft, ob Sentry Logs aktiviert ist
2. Formatiert Log-Einträge mit Kontext und Metadaten
3. Leitet Protokolle an Sentry weiter mittels `Sentry.captureMessage()` mit entsprechenden Tags und Levels
4. Greift bei Nichtverfügbarkeit von Sentry auf Fallback zurück

### Protokoll-Struktur

Jeder an Sentry gesendete Log-Eintrag enthält:
- **Nachricht**: Die Log-Nachricht mit optionalem Kontext-Präfix
- **Level**: Schweregradebene (debug, info, warning, error)
- **Tags**:
  - `logLevel`: Das ursprüngliche Log-Level
  - `logType`: Immer `application_log`
  - `context`: Optionaler Kontext-Bezeichner
- **Zusätzliche Daten**:
  - `data`: Alle zusätzlich bereitgestellten Daten
  - `timestamp`: ISO-Zeitstempel

## Protokolle in Sentry anzeigen

### Logs Explorer

1. Navigieren Sie zu Ihrem Sentry-Projekt
2. Gehen Sie zu **Logs** → **Logs Explorer**
3. Verwenden Sie Filter, um bestimmte Protokolle zu finden:
   - Nach `logLevel`-Tag filtern (debug, info, warn, error)
   - Nach `context`-Tag filtern, um Protokolle bestimmter Module zu sehen
   - Nach `logType:application_log` filtern, um nur Anwendungsprotokolle zu sehen

### Protokollabfragen

Beispielabfragen im Sentry Logs Explorer:

```
# Alle Fehler-Protokolle
logLevel:error

# Protokolle aus einem bestimmten Kontext
context:PaymentService

# Alle Anwendungsprotokolle
logType:application_log

# Fehler aus einem bestimmten Zeitraum
logLevel:error timestamp:>2024-01-01
```

## Integration mit dem Monitoring-Paket

Falls Sie das `@ever-works/monitoring`-Paket verwenden, stellen Sie sicher, dass es mit Sentry Logs zusammenarbeitet:

1. Das Monitoring-Paket sollte Sentry mit aktivierten Protokollen initialisieren
2. Das Logger-Dienstprogramm in diesem Template leitet Protokolle automatisch an Sentry weiter
3. Beide Systeme arbeiten zusammen, um umfassendes Monitoring bereitzustellen

## Fehlerbehebung

### Protokolle erscheinen nicht in Sentry

1. **DSN-Konfiguration prüfen**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   Stellen Sie sicher, dass die DSN korrekt gesetzt und zugänglich ist.

2. **Protokolle aktiviert prüfen**
   ```bash
   echo $SENTRY_LOGS_ENABLED
   ```
   Sollte `true` sein, damit Protokolle weitergeleitet werden.

3. **Sentry-Initialisierung prüfen**
   - Verifizieren Sie, dass `SENTRY_ENABLED` true ist
   - Prüfen Sie die Browser-Konsole auf Sentry-Initialisierungsfehler
   - Verifizieren Sie, dass `_experiments.enableLogs` auf `true` gesetzt ist

4. **Log-Level-Filterung prüfen**
   - Stellen Sie sicher, dass Ihr Log-Level den `SENTRY_LOGS_LEVEL`-Schwellenwert erfüllt
   - Debug-Protokolle werden nur erfasst, wenn Level auf `debug` gesetzt ist

### Performance-Überlegungen

- Protokolle werden asynchron gesendet und blockieren Ihre Anwendung nicht
- In der Produktion sollten Sie `SENTRY_LOGS_LEVEL=warn` setzen, um das Protokollvolumen zu reduzieren
- Sentry verarbeitet Rate Limiting und Batching automatisch

### Protokolle deaktivieren

So deaktivieren Sie Sentry Logs, ohne Sentry vollständig zu deaktivieren:

```env
SENTRY_LOGS_ENABLED=false
```

Der Logger funktioniert weiterhin normal, aber Protokolle werden nicht an Sentry weitergeleitet.

## Best Practices

1. **Geeignete Log-Level verwenden**
   - `debug` für detaillierte Entwicklungsinformationen verwenden
   - `info` für allgemeinen Anwendungsfluss verwenden
   - `warn` für potenzielle Probleme verwenden, die keine Funktionsbeeinträchtigung verursachen
   - `error` für tatsächliche Fehler und Ausnahmen verwenden

2. **Kontext einschließen**
   - Kontextuelle Logger für bessere Organisation verwenden
   - Relevante Metadaten in Log-Daten einschließen

3. **Sensible Daten vermeiden**
   - Niemals Passwörter, Tokens oder personenbezogene Daten protokollieren
   - Daten vor der Protokollierung bereinigen

4. **Produktionskonfiguration**
   - `SENTRY_LOGS_LEVEL=warn` in der Produktion setzen
   - Sentry-Kontingentnutzung überwachen
   - Protokolle regelmäßig auf Muster überprüfen

## Validierungs-Checkliste

- [ ] Sentry DSN ist korrekt konfiguriert
- [ ] `SENTRY_LOGS_ENABLED=true` ist gesetzt
- [ ] Protokolle erscheinen im Sentry Logs Explorer
- [ ] Log-Level sind korrekt zugeordnet (info, warn, error, debug)
- [ ] Kontext-Tags sind in Sentry sichtbar
- [ ] Protokolle funktionieren sowohl lokal als auch in der Deployment-Umgebung
- [ ] QA kann Protokolle im Sentry Logs Explorer sehen und filtern

## Zusätzliche Ressourcen

- [Sentry Logs Dokumentation](https://docs.sentry.io/product/logs/)
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Logs Explorer Leitfaden](https://docs.sentry.io/product/logs/explorer/)
