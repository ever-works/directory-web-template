---
id: cron-jobs
title: Cron Jobs Konfiguration
sidebar_label: Cron Jobs
sidebar_position: 8
---

# Cron Jobs Konfigurationshandbuch

## Übersicht

Diese Vorlage unterstützt **drei Planungsmechanismen** für Hintergrundjobs:

1. **Lokal** - `LocalJobManager` mit `setInterval` (Entwicklung)
2. **Vercel Crons** - Vercels integriertes Cron-System (Produktion auf Vercel)
3. **Trigger.dev** - Drittanbieterdienst (optional, für große Verzeichnisse)

### Prioritätsreihenfolge (Automatische Erkennung)

Das System wählt automatisch den Planungsmodus basierend auf der Umgebung aus:

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

## 📋 Registrierte Hintergrundjobs

### 1. Repository-Synchronisierung

**Job-ID:** `repository-sync`  
**Zeitplan:** Alle 5 Minuten (`*/5 * * * *`)  
**Beschreibung:** Synchronisiert Inhalte aus dem Git-basierten CMS-Repository

- **Vercel-Endpunkt:** `/api/cron/sync`
- **Lokales Intervall:** `5 * 60 * 1000` ms (5 Minuten)
- **Funktion:** `syncManager.performSync()`

### 2. Erinnerungen zur Abonnementverlängerung

**Job-ID:** `subscription-renewal-reminder`  
**Zeitplan:** Täglich um 9:00 Uhr (`0 9 * * *`)  
**Beschreibung:** Sendet E-Mail-Erinnerungen an Benutzer mit Abonnements, die in 7 Tagen ablaufen

- **Vercel-Endpunkt:** `/api/cron/subscription-reminders`
- **Lokaler Cron:** `0 9 * * *`
- **Funktion:** `subscriptionRenewalReminderJob()`

### 3. Bereinigung abgelaufener Abonnements

**Job-ID:** `subscription-expired-cleanup`  
**Zeitplan:** Täglich um Mitternacht (`0 0 * * *`)  
**Beschreibung:** Verarbeitet abgelaufene Abonnements und sendet Ablaufbenachrichtigungen

- **Vercel-Endpunkt:** `/api/cron/subscription-expiration`
- **Lokaler Cron:** `0 0 * * *`
- **Funktion:** `subscriptionService.processExpiredSubscriptions()`

---

## 🚀 Vercel-Deployment-Konfiguration

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

### Umgebungsvariablen

**Erforderlich für Vercel Crons:**

```bash
CRON_SECRET=your-secure-random-secret-here
```

Vercel sendet dies automatisch im Header `Authorization: Bearer <CRON_SECRET>`, wenn Cron-Endpunkte aufgerufen werden.

**Optional (um Trigger.dev zu deaktivieren):**

```bash
# Setzen Sie diese NICHT, wenn Sie Vercel Crons verwenden möchten:
# TRIGGER_SECRET_KEY=
# TRIGGER_API_KEY=
# TRIGGER_API_URL=
```

---

## ✅ So überprüfen Sie Cron Jobs auf Vercel

### 1. Vercel Dashboard überprüfen

**Navigieren Sie zu:**
```
https://vercel.com/<team>/<project>/settings/cron-jobs
```

**Beispiel:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**Worauf zu achten ist:**
- ✅ Alle 3 Cron Jobs sollten aufgelistet sein
- ✅ Korrekte Zeitpläne (alle 5 Min., täglich um 9 Uhr, täglich um Mitternacht)
- ✅ Status sollte „Aktiv" sein

### 2. Protokolle überprüfen

**Navigieren Sie zu:**
```
https://vercel.com/<team>/<project>/logs
```

**Nach Anfragepfad filtern:**
- `/api/cron/sync`
- `/api/cron/subscription-reminders`
- `/api/cron/subscription-expiration`

**Beispiel:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```

**Worauf zu achten ist:**
- ✅ Regelmäßige Ausführungszeitstempel
- ✅ 200-Statuscodes (Erfolg)
- ✅ Keine 401-Fehler (Authentifizierungsfehler)
- ✅ Keine 500-Fehler (interne Fehler)

### 3. Anwendungsprotokolle überprüfen

**Suchen Sie nach diesen Protokollmeldungen:**

```bash
# Initialisierung
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

### 4. Manuell testen (Entwicklung)

**Endpunkte lokal mit curl testen:**

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

**Erwartete Antwort:**
```json
{
  "success": true,
  "timestamp": "2026-01-06T...",
  "message": "...",
  "duration": 123
}
```

---

## 🔧 Fehlerbehebung

### Cron Jobs laufen nicht

**Überprüfung 1: Umgebungsvariablen**
```bash
# Verify CRON_SECRET is set in Vercel
vercel env ls

# Should show:
# CRON_SECRET (Production, Preview, Development)
```

**Überprüfung 2: Bereitstellung**
```bash
# Ensure vercel.json is deployed
git status
git log --oneline -1 -- vercel.json

# Verify last deployment includes vercel.json changes
```

**Überprüfung 3: Protokolle**
```bash
# Check for errors in Vercel logs
vercel logs --follow
```

### 401 Nicht autorisierte Fehler

**Problem:** `CRON_SECRET`-Diskrepanz

**Lösung:**
1. Überprüfen Sie `CRON_SECRET` in den Vercel-Umgebungsvariablen
2. Stellen Sie das Projekt nach dem Aktualisieren der Umgebungsvariablen erneut bereit
3. Überprüfen Sie, ob das Secret keine abschließenden Leerzeichen hat

### Jobs laufen zu häufig

**Problem:** Lokaler Modus wird statt Vercel-Modus verwendet

**Überprüfung:**
```typescript
// Sollte "vercel" in der Produktion auf Vercel protokollieren
console.log(getSchedulingMode()); 
```

**Lösung:**
- Stellen Sie sicher, dass `VERCEL=1` gesetzt ist (Vercel setzt dies automatisch)
- Stellen Sie sicher, dass Trigger.dev-Umgebungsvariablen NICHT gesetzt sind

---

## 🔄 Migrationshandbuch

### Von Lokal zu Vercel

1. **Cron Jobs zu `vercel.json` hinzufügen** (bereits erledigt)
2. **`CRON_SECRET` im Vercel-Dashboard setzen**
3. **Auf Vercel bereitstellen**
4. **In Protokollen überprüfen**

### Von Vercel zu Trigger.dev

1. **Trigger.dev-Konto erstellen** unter https://trigger.dev
2. **Umgebungsvariablen setzen:**
   ```bash
   TRIGGER_SECRET_KEY=tr_prod_...
   TRIGGER_API_KEY=...
   TRIGGER_API_URL=https://api.trigger.dev
   TRIGGER_ENABLED=true
   ```
3. **Erneut bereitstellen**
4. **System wechselt automatisch in den Trigger.dev-Modus**

### Von Trigger.dev zurück zu Vercel

1. **Trigger.dev-Umgebungsvariablen entfernen:**
   ```bash
   vercel env rm TRIGGER_SECRET_KEY production
   vercel env rm TRIGGER_API_KEY production
   vercel env rm TRIGGER_API_URL production
   vercel env rm TRIGGER_ENABLED production
   ```
2. **Erneut bereitstellen**
3. **System fällt automatisch auf den Vercel-Modus zurück**
