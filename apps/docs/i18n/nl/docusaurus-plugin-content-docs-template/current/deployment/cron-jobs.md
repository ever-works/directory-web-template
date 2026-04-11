---
id: cron-jobs
title: Cron Jobs Configuratie
sidebar_label: Cron Jobs
sidebar_position: 8
---

# Handleiding voor Cron Jobs Configuratie

## Overzicht

Dit sjabloon ondersteunt **drie planneringsmechanismen** voor achtergrondtaken:

1. **Lokaal** - `LocalJobManager` met `setInterval` (ontwikkeling)
2. **Vercel Crons** - Vercel's ingebouwde cron-systeem (productie op Vercel)
3. **Trigger.dev** - Service van derden (optioneel, voor grote directories)

### Prioriteitsvolgorde (Automatische detectie)

Het systeem selecteert automatisch de planneringsmodus op basis van de omgeving:

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

## 📋 Geregistreerde Achtergrondtaken

### 1. Repository-synchronisatie

**Taak-ID:** `repository-sync`  
**Schema:** Elke 5 minuten (`*/5 * * * *`)  
**Beschrijving:** Synchroniseert inhoud uit de Git-gebaseerde CMS-repository

- **Vercel-eindpunt:** `/api/cron/sync`
- **Lokaal interval:** `5 * 60 * 1000` ms (5 minuten)
- **Functie:** `syncManager.performSync()`

### 2. Herinneringen voor abonnementsverlenging

**Taak-ID:** `subscription-renewal-reminder`  
**Schema:** Dagelijks om 9:00 uur (`0 9 * * *`)  
**Beschrijving:** Stuurt e-mailherinneringen naar gebruikers met abonnementen die over 7 dagen verlopen

- **Vercel-eindpunt:** `/api/cron/subscription-reminders`
- **Lokale Cron:** `0 9 * * *`
- **Functie:** `subscriptionRenewalReminderJob()`

### 3. Opschoning van verlopen abonnementen

**Taak-ID:** `subscription-expired-cleanup`  
**Schema:** Dagelijks om middernacht (`0 0 * * *`)  
**Beschrijving:** Verwerkt verlopen abonnementen en stuurt vervalmeldingen

- **Vercel-eindpunt:** `/api/cron/subscription-expiration`
- **Lokale Cron:** `0 0 * * *`
- **Functie:** `subscriptionService.processExpiredSubscriptions()`

---

## 🚀 Vercel Implementatieconfiguratie

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

### Omgevingsvariabelen

**Vereist voor Vercel Crons:**

```bash
CRON_SECRET=your-secure-random-secret-here
```

Vercel stuurt dit automatisch in de header `Authorization: Bearer <CRON_SECRET>` bij het aanroepen van cron-eindpunten.

**Optioneel (om Trigger.dev uit te schakelen):**

```bash
# Stel deze NIET in als u Vercel Crons wilt gebruiken:
# TRIGGER_SECRET_KEY=
# TRIGGER_API_KEY=
# TRIGGER_API_URL=
```

---

## ✅ Hoe Cron Jobs op Vercel te Verificeren

### 1. Vercel Dashboard controleren

**Navigeer naar:**
```
https://vercel.com/<team>/<project>/settings/cron-jobs
```

**Voorbeeld:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**Waar op te letten:**
- ✅ Alle 3 cron-taken moeten worden weergegeven
- ✅ Correcte schema's (elke 5 min., dagelijks om 9 uur, dagelijks om middernacht)
- ✅ Status moet "Actief" zijn

### 2. Logboeken controleren

**Navigeer naar:**
```
https://vercel.com/<team>/<project>/logs
```

**Filteren op aanvraagpad:**
- `/api/cron/sync`
- `/api/cron/subscription-reminders`
- `/api/cron/subscription-expiration`

**Voorbeeld:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```

**Waar op te letten:**
- ✅ Regelmatige uitvoeringstijdstempels
- ✅ 200 statuscodes (succes)
- ✅ Geen 401-fouten (authenticatiefouten)
- ✅ Geen 500-fouten (interne fouten)

### 3. Toepassingslogboeken controleren

**Zoek naar deze logberichten:**

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

### 4. Handmatig testen (Ontwikkeling)

**Eindpunten lokaal testen met curl:**

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

**Verwacht antwoord:**
```json
{
  "success": true,
  "timestamp": "2026-01-06T...",
  "message": "...",
  "duration": 123
}
```

---

## 🔧 Probleemoplossing

### Cron-taken worden niet uitgevoerd

**Controle 1: Omgevingsvariabelen**
```bash
# Verify CRON_SECRET is set in Vercel
vercel env ls

# Should show:
# CRON_SECRET (Production, Preview, Development)
```

**Controle 2: Implementatie**
```bash
# Ensure vercel.json is deployed
git status
git log --oneline -1 -- vercel.json
```

**Controle 3: Logboeken**
```bash
# Check for errors in Vercel logs
vercel logs --follow
```

### 401 Niet-geautoriseerde fouten

**Probleem:** `CRON_SECRET` komt niet overeen

**Oplossing:**
1. Verifieer `CRON_SECRET` in de Vercel-omgevingsvariabelen
2. Implementeer het project opnieuw na het bijwerken van omgevingsvariabelen
3. Controleer of het secret geen afsluitende spaties heeft

### Taken worden te vaak uitgevoerd

**Probleem:** Lokale modus wordt gebruikt in plaats van Vercel-modus

**Controle:**
```typescript
// Moet "vercel" loggen in productie op Vercel
console.log(getSchedulingMode()); 
```

**Oplossing:**
- Zorg ervoor dat `VERCEL=1` is ingesteld (Vercel doet dit automatisch)
- Zorg ervoor dat Trigger.dev-omgevingsvariabelen NIET zijn ingesteld

---

## 🔄 Migratiehandleiding

### Van Lokaal naar Vercel

1. **Cron-taken aan `vercel.json` toevoegen** (al gedaan)
2. **`CRON_SECRET` instellen in Vercel-dashboard**
3. **Implementeren op Vercel**
4. **In logboeken verificeren**

### Van Vercel naar Trigger.dev

1. **Trigger.dev-account aanmaken** op https://trigger.dev
2. **Omgevingsvariabelen instellen:**
   ```bash
   TRIGGER_SECRET_KEY=tr_prod_...
   TRIGGER_API_KEY=...
   TRIGGER_API_URL=https://api.trigger.dev
   TRIGGER_ENABLED=true
   ```
3. **Opnieuw implementeren**
4. **Systeem schakelt automatisch over naar Trigger.dev-modus**

### Van Trigger.dev terug naar Vercel

1. **Trigger.dev-omgevingsvariabelen verwijderen:**
   ```bash
   vercel env rm TRIGGER_SECRET_KEY production
   vercel env rm TRIGGER_API_KEY production
   vercel env rm TRIGGER_API_URL production
   vercel env rm TRIGGER_ENABLED production
   ```
2. **Opnieuw implementeren**
3. **Systeem valt automatisch terug op Vercel-modus**
