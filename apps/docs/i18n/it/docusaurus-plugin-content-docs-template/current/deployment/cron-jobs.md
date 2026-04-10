---
id: cron-jobs
title: Configurazione Cron Jobs
sidebar_label: Cron Jobs
sidebar_position: 8
---

# Guida alla Configurazione dei Cron Jobs

## Panoramica

Questo template supporta **tre meccanismi di pianificazione** per i job in background:

1. **Locale** - `LocalJobManager` con `setInterval` (sviluppo)
2. **Vercel Crons** - Sistema cron integrato di Vercel (produzione su Vercel)
3. **Trigger.dev** - Servizio di terze parti (opzionale, per directory di grandi dimensioni)

### Ordine di Priorità (Rilevamento automatico)

Il sistema seleziona automaticamente la modalità di pianificazione in base all'ambiente:

```typescript
// From lib/background-jobs/config.ts
export function getSchedulingMode(): SchedulingMode {
  // 1. Check if disabled
  if (DISABLE_AUTO_SYNC === 'true') return 'disabled';
  
  // 2. Trigger.dev (if fully configured in production)
  if (shouldUseTriggerDev()) return 'trigger-dev';
  
  // 3. Vercel (if VERCEL=1)
  if (isVercelEnvironment()) return 'vercel';
  
  // 4. Local (fallback)
  return 'local';
}
```

---

## 📋 Job in Background Registrati

### 1. Sincronizzazione del Repository

**ID Job:** `repository-sync`  
**Pianificazione:** Ogni 5 minuti (`*/5 * * * *`)  
**Descrizione:** Sincronizza i contenuti dal repository CMS basato su Git

- **Endpoint Vercel:** `/api/cron/sync`
- **Intervallo Locale:** `5 * 60 * 1000` ms (5 minuti)
- **Funzione:** `syncManager.performSync()`

### 2. Promemoria Rinnovo Abbonamento

**ID Job:** `subscription-renewal-reminder`  
**Pianificazione:** Ogni giorno alle 9:00 (`0 9 * * *`)  
**Descrizione:** Invia promemoria via email agli utenti con abbonamenti in scadenza tra 7 giorni

- **Endpoint Vercel:** `/api/cron/subscription-reminders`
- **Cron Locale:** `0 9 * * *`
- **Funzione:** `subscriptionRenewalReminderJob()`

### 3. Pulizia Abbonamenti Scaduti

**ID Job:** `subscription-expired-cleanup`  
**Pianificazione:** Ogni giorno a mezzanotte (`0 0 * * *`)  
**Descrizione:** Elabora gli abbonamenti scaduti e invia notifiche di scadenza

- **Endpoint Vercel:** `/api/cron/subscription-expiration`
- **Cron Locale:** `0 0 * * *`
- **Funzione:** `subscriptionService.processExpiredSubscriptions()`

---

## 🚀 Configurazione del Deployment su Vercel

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
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

### Variabili d'Ambiente

**Richieste per Vercel Crons:**

```bash
CRON_SECRET=your-secure-random-secret-here
```

Vercel invia automaticamente questo nell'intestazione `Authorization: Bearer <CRON_SECRET>` quando chiama gli endpoint cron.

**Opzionale (per disabilitare Trigger.dev):**

```bash
# NON impostare queste se si vuole usare Vercel Crons:
# TRIGGER_SECRET_KEY=
# TRIGGER_API_KEY=
# TRIGGER_API_URL=
```

---

## ✅ Come Verificare i Cron Jobs su Vercel

### 1. Controllare il Dashboard di Vercel

**Navigare verso:**
```
https://vercel.com/<team>/<project>/settings/cron-jobs
```

**Esempio:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**Cosa cercare:**
- ✅ Tutti e 3 i cron job dovrebbero essere elencati
- ✅ Pianificazioni corrette (ogni 5 min., ogni giorno alle 9, ogni giorno a mezzanotte)
- ✅ Lo stato dovrebbe essere "Attivo"

### 2. Controllare i Log

**Navigare verso:**
```
https://vercel.com/<team>/<project>/logs
```

**Filtrare per percorso della richiesta:**
- `/api/cron/sync`
- `/api/cron/subscription-reminders`
- `/api/cron/subscription-expiration`

**Cosa cercare:**
- ✅ Timestamp di esecuzione regolari
- ✅ Codici di stato 200 (successo)
- ✅ Nessun errore 401 (errori di autenticazione)
- ✅ Nessun errore 500 (errori interni)

### 3. Controllare i Log dell'Applicazione

**Cercare questi messaggi di log:**

```bash
# Initialization
[BACKGROUND_JOBS] All background jobs registered with BackgroundJobManager

# Sync job
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: ...

# Renewal reminders
[Cron] Subscription reminders job completed

# Expiration cleanup
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: X subscriptions expired
```

### 4. Test Manuale (Sviluppo)

**Testare gli endpoint localmente con curl:**

```bash
# Set your CRON_SECRET
export CRON_SECRET="your-secret"

# Test sync endpoint
curl -X GET http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"

# Test subscription reminders
curl -X GET http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer $CRON_SECRET"

# Test subscription expiration
curl -X GET http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Risposta attesa:**
```json
{
  "success": true,
  "timestamp": "2026-01-06T...",
  "message": "...",
  "duration": 123
}
```

---

## 🔧 Risoluzione dei Problemi

### I Cron Job non vengono eseguiti

**Controllo 1: Variabili d'Ambiente**
```bash
# Verify CRON_SECRET is set in Vercel
vercel env ls

# Should show:
# CRON_SECRET (Production, Preview, Development)
```

**Controllo 2: Deployment**
```bash
# Ensure vercel.json is deployed
git status
git log --oneline -1 -- vercel.json
```

**Controllo 3: Log**
```bash
# Check for errors in Vercel logs
vercel logs --follow
```

### Errori 401 Non Autorizzato

**Problema:** Mancata corrispondenza di `CRON_SECRET`

**Soluzione:**
1. Verificare `CRON_SECRET` nelle variabili d'ambiente di Vercel
2. Ridistribuire il progetto dopo aver aggiornato le variabili d'ambiente
3. Verificare che il segreto non abbia spazi finali

### Job eseguiti troppo frequentemente

**Problema:** Utilizzo della modalità locale invece della modalità Vercel

**Controllo:**
```typescript
// Dovrebbe registrare "vercel" in produzione su Vercel
console.log(getSchedulingMode()); 
```

**Soluzione:**
- Assicurarsi che `VERCEL=1` sia impostato (Vercel lo fa automaticamente)
- Assicurarsi che le variabili d'ambiente di Trigger.dev NON siano impostate

---

## 🔄 Guida alla Migrazione

### Da Locale a Vercel

1. **Aggiungere i cron job a `vercel.json`** (già fatto)
2. **Impostare `CRON_SECRET` nel dashboard di Vercel**
3. **Distribuire su Vercel**
4. **Verificare nei log**

### Da Vercel a Trigger.dev

1. **Creare un account Trigger.dev** su https://trigger.dev
2. **Impostare le variabili d'ambiente:**
   ```bash
   TRIGGER_SECRET_KEY=tr_prod_...
   TRIGGER_API_KEY=...
   TRIGGER_API_URL=https://api.trigger.dev
   TRIGGER_ENABLED=true
   ```
3. **Ridistribuire**
4. **Il sistema passa automaticamente alla modalità Trigger.dev**

### Da Trigger.dev di ritorno a Vercel

1. **Rimuovere le variabili d'ambiente di Trigger.dev:**
   ```bash
   vercel env rm TRIGGER_SECRET_KEY production
   vercel env rm TRIGGER_API_KEY production
   vercel env rm TRIGGER_API_URL production
   vercel env rm TRIGGER_ENABLED production
   ```
2. **Ridistribuire**
3. **Il sistema torna automaticamente alla modalità Vercel**
