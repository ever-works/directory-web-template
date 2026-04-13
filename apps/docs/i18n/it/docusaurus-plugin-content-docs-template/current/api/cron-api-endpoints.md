---
id: cron-api-endpoints
title: Endpoint API Cron
sidebar_label: API Cron
sidebar_position: 59
---

# Endpoint API Cron

L'API Cron fornisce endpoint per job pianificati attivati da Vercel Cron, schedulatori esterni o dall'interno del `BackgroundJobManager`. Tutti gli endpoint cron richiedono l'autenticazione tramite la variabile d'ambiente `CRON_SECRET` utilizzando un token `Bearer` nell'intestazione `Authorization`.

**Directory sorgente:** `template/app/api/cron/`

---

## Autenticazione

Gli endpoint cron utilizzano un segreto condiviso per l'autorizzazione:

- **Produzione:** La variabile d'ambiente `CRON_SECRET` deve essere impostata. Le richieste devono includere `Authorization: Bearer <CRON_SECRET>`.
- **Sviluppo:** Se `CRON_SECRET` non è configurato, l'accesso è consentito senza autenticazione per un'esperienza di sviluppo locale senza attrito.
- **Sicurezza:** Tutti gli endpoint cron utilizzano `crypto.timingSafeEqual()` per il confronto a tempo costante per prevenire attacchi di timing.

**Risposta non autorizzata (401):**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## Configurazione Vercel Cron

La pianificazione cron è definita in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

| Job | Pianificazione | Descrizione |
|-----|----------|-------------|
| Sincronizzazione contenuti | Ogni giorno alle 3:00 AM UTC | Sincronizza i contenuti dal CMS basato su Git |
| Promemoria abbonamenti | Ogni giorno alle 9:00 AM UTC | Invia email di promemoria per il rinnovo |
| Scadenza abbonamenti | Ogni giorno a mezzanotte UTC | Elabora gli abbonamenti scaduti |

---

## Sincronizzazione contenuti

Attiva una sincronizzazione dei contenuti dal repository CMS basato su Git.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/cron/sync` |
| **Autenticazione** | `CRON_SECRET` (Bearer token) |
| **Sorgente** | `cron/sync/route.ts` |

### Risposta

**Stato 200** -- Sincronizzazione completata con successo.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Stato 500** -- Sincronizzazione fallita.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `success` | `boolean` | Se la sincronizzazione è riuscita |
| `timestamp` | `string` (ISO 8601) | Quando la sincronizzazione è stata completata |
| `duration` | `number` | Durata in millisecondi |
| `message` | `string` | Messaggio di stato leggibile dall'utente |
| `details` | `string` (opzionale) | Dettagli aggiuntivi in caso di fallimento |

### Intestazioni di risposta

Tutte le risposte includono `Cache-Control: no-cache, no-store, must-revalidate` per prevenire la memorizzazione nella cache dei risultati di sincronizzazione.

### Esempio curl

```bash
curl -s http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Scadenza abbonamenti

Trova ed elabora gli abbonamenti scaduti aggiornando il loro stato da `active` a `expired` e inviando email di notifica.

| Proprietà | Valore |
|----------|-------|
| **Metodi** | `GET`, `POST` |
| **Percorso** | `/api/cron/subscription-expiration` |
| **Autenticazione** | `CRON_SECRET` (Bearer token) |
| **Sorgente** | `cron/subscription-expiration/route.ts` |

### Risposta

**Stato 200** -- Elaborato con successo.

```json
{
  "success": true,
  "message": "Processed 3 expired subscriptions",
  "data": {
    "processed": 3,
    "affectedUsers": [
      {
        "subscriptionId": "sub_abc123",
        "userId": "user_456",
        "planId": "standard"
      }
    ],
    "errors": [],
    "timestamp": "2024-01-20T00:00:05.123Z"
  }
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `data.processed` | `number` | Numero di abbonamenti aggiornati a scaduto |
| `data.affectedUsers` | `array` | Elenco degli abbonamenti interessati (senza PII) |
| `data.errors` | `string[]` | Eventuali errori non fatali (es. errori di consegna email) |
| `data.timestamp` | `string` | Timestamp di elaborazione |

### Passaggi di elaborazione

1. Trova gli abbonamenti attivi passati la loro data di scadenza.
2. Aggiorna lo stato da `active` a `expired`.
3. Invia email di notifica di scadenza tramite il servizio email.
4. Restituisce un riepilogo -- i fallimenti delle email non causano il fallimento dell'intero job.

### Esempio curl

```bash
# Tramite GET
curl -s http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"

# Tramite POST (supportato anche per trigger manuali)
curl -s -X POST http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Promemoria abbonamenti

Invia email di promemoria per il rinnovo agli utenti con abbonamenti in scadenza.

| Proprietà | Valore |
|----------|-------|
| **Metodi** | `GET`, `POST` |
| **Percorso** | `/api/cron/subscription-reminders` |
| **Autenticazione** | `CRON_SECRET` (Bearer token) |
| **Sorgente** | `cron/subscription-reminders/route.ts` |

### Risposta

**Stato 200** -- Job completato con successo.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Stato 207** -- Job completato con errori parziali (Multi-Status).

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

### Esempio curl

```bash
curl -s http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Inizializzazione job in background

Il modulo dei job in background (`cron/jobs/background-jobs-init.ts`) non è un endpoint API ma un modulo di inizializzazione singleton utilizzato per configurare la modalità di pianificazione all'avvio dell'applicazione.

**Sorgente:** `cron/jobs/background-jobs-init.ts`

### Modalità di pianificazione

| Modalità | Descrizione |
|------|-------------|
| `vercel` | Job gestiti da Vercel Cron tramite endpoint `/api/cron/*` |
| `local` | Schedulatore interno (per distribuzioni self-hosted) |
| `trigger-dev` | Integrazione Trigger.dev per job in background gestiti |
| `disabled` | Sincronizzazione in background disabilitata (`DISABLE_AUTO_SYNC=true`) |

### Utilizzo

```typescript
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';

// Chiamato una volta da layout.tsx -- sicuro da chiamare più volte
await ensureBackgroundJobsInitialized();
```

### Caratteristiche principali

- Utilizza `globalThis` per lo stato singleton, garantendo che l'inizializzazione venga eseguita una sola volta per processo.
- Salta l'inizializzazione durante i test (`NODE_ENV=test`) e le build (`NEXT_PHASE=phase-production-build`).
- L'inizializzazione fallita reimposta lo stato per consentire un nuovo tentativo automatico alla chiamata successiva.

---

## Utilizzo TypeScript

```typescript
// Attiva la sincronizzazione dei contenuti in modo programmatico
async function triggerSync(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/sync', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();

  if (data.success) {
    console.log(`Sincronizzazione completata in ${data.duration}ms`);
  } else {
    console.error('Sincronizzazione fallita:', data.message, data.details);
  }
}

// Controlla la scadenza degli abbonamenti
async function processExpirations(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/subscription-expiration', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();
  console.log(`Elaborate ${data.data.processed} scadenze`);

  if (data.data.errors.length > 0) {
    console.warn('Errori non fatali:', data.data.errors);
  }
}
```

## Variabili d'ambiente

| Variabile | Richiesta | Descrizione |
|----------|----------|-------------|
| `CRON_SECRET` | Produzione: Sì, Dev: No | Segreto condiviso per l'autenticazione degli endpoint cron |
| `DISABLE_AUTO_SYNC` | No | Impostare a `true` per disabilitare la sincronizzazione automatica dei contenuti |
