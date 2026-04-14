---
id: cron-endpoints
title: Endpoint API Job Cron
sidebar_label: Endpoint Cron
sidebar_position: 6
---

# Endpoint API Job Cron

Il template include tre endpoint per job cron che vengono eseguiti a intervalli pianificati tramite Vercel Cron. Questi endpoint gestiscono la sincronizzazione dei contenuti, i promemoria degli abbonamenti e l'elaborazione della scadenza degli abbonamenti.

## Configurazione Cron

Le pianificazioni cron sono definite in `vercel.json`:

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

## Sincronizzazione contenuti (`/api/cron/sync`)

| Metodo | Percorso | Pianificazione | Descrizione |
|--------|------|----------|-------------|
| `GET` | `/api/cron/sync` | Ogni giorno alle 3:00 AM UTC | Sincronizza il repository di contenuti basato su Git |

### Cosa fa

Il job cron di sincronizzazione estrae i contenuti più recenti dal repository Git dei dati configurato (`DATA_REPOSITORY`) e aggiorna la cache dei contenuti locali. Questo assicura che l'applicazione rifletta eventuali modifiche apportate direttamente al repository dei contenuti (es. tramite merge di PR su GitHub).

### Processo di sincronizzazione

```
1. Verifica l'autorizzazione CRON_SECRET
2. Controlla se la sincronizzazione è già in corso (mutex lock)
3. Estrae le ultime modifiche dal repository Git remoto
4. Analizza e valida i file YAML dei contenuti aggiornati
5. Aggiorna la cache dei contenuti locali
6. Restituisce il risultato della sincronizzazione con la durata
```

### Comportamenti chiave

- **Mutex lock**: Solo una sincronizzazione può essere eseguita alla volta. Le richieste concorrenti vengono rifiutate con un messaggio di stato
- **Timeout**: Le operazioni di sincronizzazione hanno un timeout di 5 minuti per prevenire processi fuori controllo
- **Logica di retry**: Le sincronizzazioni fallite riprovano fino a 3 volte
- **Modalità sviluppo**: La sincronizzazione automatica può essere disabilitata tramite la variabile d'ambiente `DISABLE_AUTO_SYNC=true`

### Risposta

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## Promemoria abbonamenti (`/api/cron/subscription-reminders`)

| Metodo | Percorso | Pianificazione | Descrizione |
|--------|------|----------|-------------|
| `GET` | `/api/cron/subscription-reminders` | Ogni giorno alle 9:00 AM UTC | Invia promemoria per il rinnovo degli abbonamenti |

### Cosa fa

Interroga gli abbonamenti in avvicinamento alla data di rinnovo e invia email di promemoria agli abbonati. Questo aiuta a ridurre il churn involontario avvisando gli utenti prima che il pagamento venga elaborato.

### Logica dei promemoria

```
1. Verifica l'autorizzazione CRON_SECRET
2. Interroga gli abbonamenti in rinnovo entro la finestra di promemoria
3. Filtra gli abbonamenti già notificati
4. Invia email di promemoria tramite il servizio di notifica email
5. Contrassegna gli abbonamenti come notificati
6. Restituisce il conteggio dei promemoria inviati
```

### Finestre di promemoria

Finestre di promemoria tipiche:
- **7 giorni prima del rinnovo**: Primo promemoria
- **1 giorno prima del rinnovo**: Promemoria finale

### Risposta

```json
{
  "success": true,
  "message": "Subscription reminders sent",
  "data": {
    "reminders_sent": 15,
    "errors": 0
  }
}
```

## Scadenza abbonamenti (`/api/cron/subscription-expiration`)

| Metodo | Percorso | Pianificazione | Descrizione |
|--------|------|----------|-------------|
| `GET` | `/api/cron/subscription-expiration` | Ogni giorno a mezzanotte UTC | Elabora gli abbonamenti scaduti |

### Cosa fa

Identifica gli abbonamenti passati la loro data di scadenza e aggiorna il loro stato. Questo gestisce gli abbonamenti che sono stati annullati ma avevano del tempo rimanente, nonché gli abbonamenti che non hanno potuto essere rinnovati.

### Processo di scadenza

```
1. Verifica l'autorizzazione CRON_SECRET
2. Interroga gli abbonamenti con data di scadenza nel passato
3. Aggiorna lo stato dell'abbonamento a 'expired'
4. Revoca accessi/permessi associati
5. Invia email di notifica di scadenza
6. Registra gli eventi di scadenza per audit trail
7. Restituisce il conteggio delle scadenze elaborate
```

### Risposta

```json
{
  "success": true,
  "message": "Subscription expirations processed",
  "data": {
    "expired": 3,
    "errors": 0
  }
}
```

## Job in background (`/api/cron/jobs`)

Il file `background-jobs-init.ts` nella directory dei job cron inizializza l'elaborazione dei job in background. Questo configura qualsiasi attività ricorrente che deve essere eseguita all'interno del runtime dell'applicazione.

## Sicurezza

### Verifica CRON_SECRET

Tutti gli endpoint cron verificano un'intestazione o un parametro di query `CRON_SECRET` per prevenire esecuzioni non autorizzate:

```typescript
// Tipico controllo di autorizzazione cron
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Autorizzazione Vercel Cron

Quando distribuito su Vercel, i job cron vengono automaticamente chiamati dallo schedulatore cron di Vercel con l'intestazione `CRON_SECRET` appropriata. Il segreto è configurato nella dashboard di Vercel nelle impostazioni del progetto.

| Variabile d'ambiente | Descrizione |
|---------------------|-------------|
| `CRON_SECRET` | Segreto condiviso per l'autorizzazione dei job cron |

### Esecuzione manuale

Gli endpoint cron possono essere attivati manualmente per il debug includendo il `CRON_SECRET` nell'intestazione Authorization:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/sync
```

## Monitoraggio

### Stato della sincronizzazione

Lo stato del job cron di sincronizzazione può essere monitorato tramite:
- `/api/version/sync` - Restituisce l'ultimo tempo di sincronizzazione e il risultato
- Log del server - Le operazioni di sincronizzazione vengono registrate con il prefisso `[SYNC_MANAGER]`

### Gestione degli errori

Tutti i job cron implementano una gestione degli errori completa:
- Le operazioni fallite vengono registrate con i dettagli completi dell'errore
- I fallimenti parziali non impediscono l'elaborazione degli elementi rimanenti
- I conteggi degli errori sono inclusi nella risposta per il monitoraggio
- I fallimenti critici attivano errori console per gli avvisi di aggregazione dei log

## Riferimento pianificazione

| Espressione Cron | Significato |
|----------------|---------|
| `0 3 * * *` | Ogni giorno alle 3:00 AM UTC |
| `0 9 * * *` | Ogni giorno alle 9:00 AM UTC |
| `0 0 * * *` | Ogni giorno a mezzanotte UTC |

Tutti gli orari sono in UTC. Considera la distribuzione del fuso orario della tua base utenti quando modifichi questi orari.
