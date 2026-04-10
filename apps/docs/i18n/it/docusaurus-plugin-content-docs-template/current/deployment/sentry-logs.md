---
id: sentry-logs
title: Configurazione Sentry Logs
sidebar_label: Sentry Logs
sidebar_position: 7
---

# Configurazione Sentry Logs

Questo documento spiega come configurare e utilizzare Sentry Logs nel repository Template e nel repository Ever Works.

## Panoramica

Sentry Logs fornisce una gestione centralizzata dei log, consentendo di acquisire, inoltrare e analizzare i log applicativi nel Logs Explorer di Sentry. Tutti i log vengono inoltrati automaticamente a Sentry quando abilitato, fornendo una visione unificata del comportamento dell'applicazione nei diversi ambienti.

## Funzionalità

- ✅ Inoltro automatico dei log a Sentry
- ✅ Supporto per tutti i livelli di log (debug, info, warn, error)
- ✅ Logging context-aware con tagging automatico
- ✅ Configurazione specifica per ambiente
- ✅ Logging strutturato con supporto ai metadati
- ✅ Integrazione con il logger esistente

## Configurazione

### Variabili d'Ambiente

Aggiungi queste variabili al file `.env.local` per lo sviluppo locale:

```env
# Configurazione Sentry (obbligatoria per i log)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# Abilitare Sentry in sviluppo (opzionale, predefinito solo in produzione)
SENTRY_ENABLE_DEV=true

# Modalità debug Sentry (opzionale)
SENTRY_DEBUG=false

# Configurazione log Sentry
SENTRY_LOGS_ENABLED=true  # Abilita/disabilita Sentry Logs (predefinito: true)
SENTRY_LOGS_LEVEL=info    # Livello minimo di log da acquisire (predefinito: info)
```

### Configurazione Specifica per Ambiente

#### Sviluppo Locale

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # Acquisisce tutti i log in sviluppo
```

#### Sviluppo/Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info  # Acquisisce log info, warn ed error
```

#### Produzione

```env
SENTRY_ENABLE_DEV=false  # Non necessario in produzione
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # Acquisisce solo avvisi ed errori in produzione
```

## Utilizzo

### Logging di Base

Il logger inoltra automaticamente i log a Sentry quando abilitato:

```typescript
import { logger } from '@/lib/logger';

// Log info
logger.info('User logged in', { userId: '12345' });

// Log di avviso
logger.warn('Rate limit approaching', { current: 90, limit: 100 });

// Log di errore
logger.error('Payment failed', { orderId: '67890', error: errorObject });

// Log di debug (solo in sviluppo)
logger.debug('API request', { method: 'GET', url: '/api/users' });
```

### Logging Contestuale

Crea un logger con un contesto specifico per una migliore organizzazione:

```typescript
import { Logger } from '@/lib/logger';

const paymentLogger = Logger.create('PaymentService');

paymentLogger.info('Processing payment', { amount: 100, currency: 'USD' });
paymentLogger.error('Payment failed', error);
```

### Livelli di Log

Il logger supporta quattro livelli di log, mappati automaticamente ai livelli di gravità Sentry:

| Livello Logger | Livello Sentry | Descrizione |
|-------------|-------------|-------------|
| `DEBUG` | `debug` | Informazioni di debug dettagliate (solo sviluppo) |
| `INFO` | `info` | Messaggi informativi generali |
| `WARN` | `warning` | Messaggi di avviso per problemi potenziali |
| `ERROR` | `error` | Messaggi di errore per i fallimenti |

## Come Funziona

### Inizializzazione

Sentry Logs è abilitato sia nell'instrumentazione client che server:

1. **Lato server** (`instrumentation.ts`): Inizializza Sentry per il runtime Node.js
2. **Lato client** (`instrumentation-client.ts`): Inizializza Sentry per il runtime del browser

Entrambe le configurazioni includono:
```typescript
_experiments: {
  enableLogs: SENTRY_LOGS_ENABLED,
}
```

### Inoltro dei Log

Il logger (`lib/logger.ts`) automaticamente:
1. Verifica se Sentry Logs è abilitato
2. Formatta le voci di log con contesto e metadati
3. Inoltra i log a Sentry usando `Sentry.captureMessage()` con i tag e i livelli appropriati
4. Effettua un fallback corretto se Sentry non è disponibile

### Struttura dei Log

Ogni voce di log inviata a Sentry include:
- **Messaggio**: Il messaggio di log con prefisso di contesto opzionale
- **Livello**: Livello di gravità (debug, info, warning, error)
- **Tag**:
  - `logLevel`: Il livello di log originale
  - `logType`: Sempre `application_log`
  - `context`: Identificatore di contesto opzionale
- **Dati Extra**:
  - `data`: Tutti i dati aggiuntivi forniti
  - `timestamp`: Timestamp ISO

## Visualizzazione dei Log in Sentry

### Logs Explorer

1. Naviga al tuo progetto Sentry
2. Vai su **Logs** → **Logs Explorer**
3. Usa i filtri per trovare log specifici:
   - Filtra per tag `logLevel` (debug, info, warn, error)
   - Filtra per tag `context` per vedere i log di moduli specifici
   - Filtra per `logType:application_log` per vedere solo i log applicativi

### Interrogazione dei Log

Esempi di query nel Sentry Logs Explorer:

```
# Tutti i log di errore
logLevel:error

# Log da un contesto specifico
context:PaymentService

# Tutti i log applicativi
logType:application_log

# Errori da un intervallo di tempo specifico
logLevel:error timestamp:>2024-01-01
```

## Integrazione con il Pacchetto di Monitoraggio

Se stai usando il pacchetto `@ever-works/monitoring`, assicurati che sia configurato per funzionare con Sentry Logs:

1. Il pacchetto di monitoraggio dovrebbe inizializzare Sentry con i log abilitati
2. Il logger in questo template inoltrerà automaticamente i log a Sentry
3. Entrambi i sistemi lavorano insieme per fornire un monitoraggio completo

## Risoluzione dei Problemi

### Log Non Appaiono in Sentry

1. **Verifica la configurazione DSN**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   Assicurati che il DSN sia correttamente impostato e accessibile.

2. **Verifica che i log siano abilitati**
   ```bash
   echo $SENTRY_LOGS_ENABLED
   ```
   Deve essere `true` perché i log vengano inoltrati.

3. **Verifica l'inizializzazione di Sentry**
   - Verifica che `SENTRY_ENABLED` sia true
   - Controlla la console del browser per errori di inizializzazione Sentry
   - Verifica che `_experiments.enableLogs` sia impostato su `true`

4. **Verifica il filtro del livello di log**
   - Assicurati che il tuo livello di log soddisfi la soglia `SENTRY_LOGS_LEVEL`
   - I log di debug vengono acquisiti solo se il livello è impostato su `debug`

### Considerazioni sulle Prestazioni

- I log vengono inviati in modo asincrono e non bloccheranno la tua applicazione
- In produzione, considera di impostare `SENTRY_LOGS_LEVEL=warn` per ridurre il volume dei log
- Sentry gestisce automaticamente il rate limiting e il batching

### Disabilitare i Log

Per disabilitare Sentry Logs senza disabilitare completamente Sentry:

```env
SENTRY_LOGS_ENABLED=false
```

Il logger continuerà a funzionare normalmente, ma i log non verranno inoltrati a Sentry.

## Best Practice

1. **Usare Livelli di Log Appropriati**
   - Usa `debug` per informazioni di debug dettagliate
   - Usa `info` per il flusso generale dell'applicazione
   - Usa `warn` per problemi potenziali che non compromettono la funzionalità
   - Usa `error` per errori reali ed eccezioni

2. **Includere il Contesto**
   - Usa logger contestuali per una migliore organizzazione
   - Includi metadati rilevanti nei dati di log

3. **Evitare Dati Sensibili**
   - Non registrare mai password, token o dati personali
   - Sanifica i dati prima di registrarli

4. **Configurazione di Produzione**
   - Imposta `SENTRY_LOGS_LEVEL=warn` in produzione
   - Monitora l'utilizzo della quota Sentry
   - Rivedi regolarmente i log per individuare pattern

## Checklist di Validazione

- [ ] Il DSN di Sentry è configurato correttamente
- [ ] `SENTRY_LOGS_ENABLED=true` è impostato
- [ ] I log appaiono nel Sentry Logs Explorer
- [ ] I livelli di log sono correttamente mappati (info, warn, error, debug)
- [ ] I tag di contesto sono visibili in Sentry
- [ ] I log funzionano sia in locale che negli ambienti di distribuzione
- [ ] Il QA può vedere e filtrare i log nel Sentry Logs Explorer

## Risorse Aggiuntive

- [Documentazione Sentry Logs](https://docs.sentry.io/product/logs/)
- [Integrazione Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Guida Sentry Logs Explorer](https://docs.sentry.io/product/logs/explorer/)
