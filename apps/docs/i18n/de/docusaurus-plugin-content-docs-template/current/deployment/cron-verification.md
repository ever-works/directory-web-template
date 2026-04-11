---
id: cron-verification
title: Vercel Cron Verifizierung
sidebar_label: Cron Verifizierung
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – Verifizierungs-Checkliste

## 🎯 Schnelle Antworten auf Ihre Fragen

### Frage 1: Funktioniert es auf Vercel ohne Trigger.dev?
**✅ JA** – Das System ist korrekt konfiguriert, um Vercel Crons zu verwenden, wenn:
- `VERCEL=1` (automatisch von Vercel gesetzt)
- Trigger.dev-Umgebungsvariablen sind **NICHT** gesetzt

### Frage 2: Wie kann ich überprüfen, ob es funktioniert?
**✅ Folgen Sie den 4 Schritten unten**

---

## 📊 Aktueller Konfigurationsstatus

### ✅ Was behoben wurde

| Komponente | Status | Details |
|-----------|--------|---------|
| `vercel.json` | ✅ **BEHOBEN** | Enthält jetzt **alle 3** Cron Jobs (vorher nur 1) |
| `initialize-jobs.ts` | ✅ **BEHOBEN** | Registriert jetzt **alle 3** Jobs (vorher nur 2) |
| API-Endpunkte | ✅ **OK** | Alle 3 Endpunkte existieren und funktionieren |
| Dokumentation | ✅ **ERSTELLT** | Neues `CRON_JOBS.md`-Handbuch |

### 📋 Vollständige Liste der Cron Jobs

| # | Jobname | Endpunkt | Zeitplan | Zweck |
|---|----------|----------|----------|---------|
| 1 | Repository-Sync | `/api/cron/sync` | `*/5 * * * *` | Synchronisiert Inhalte alle 5 Minuten |
| 2 | Verlängerungserinnerungen | `/api/cron/subscription-reminders` | `0 9 * * *` | Sendet Erinnerungs-E-Mails täglich um 9 Uhr |
| 3 | Ablaufbereinigung | `/api/cron/subscription-expiration` | `0 0 * * *` | Verarbeitet abgelaufene Abonnements um Mitternacht |

---

## 🔍 4-Schritte-Verifizierungsprozess

### Schritt 1: Vercel Dashboard überprüfen – Cron Jobs

**URL-Vorlage:**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**Für awesome-time-tracking-website:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**Worauf zu achten ist:**
- [ ] Zeigt **3 Cron Jobs** an (nicht nur 1)
- [ ] Jeder hat den richtigen Zeitplan
- [ ] Alle zeigen Status „Aktiv"

**Erwartetes Ergebnis:**

| Pfad | Zeitplan | Status |
|------|----------|--------|
| `/api/cron/sync` | Alle 5 Minuten | ✅ Aktiv |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ Aktiv |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ Aktiv |

---

### Schritt 2: Vercel-Protokolle überprüfen

**URL-Vorlage:**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**Jeden Endpunkt überprüfen:**

#### A. Sync-Protokolle
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] Protokolle erscheinen alle 5 Minuten
- [ ] Statuscodes sind 200 (Erfolg)
- [ ] Keine 401-Fehler (Authentifizierung)
- [ ] Keine 500-Fehler (Abstürze)

#### B. Erinnerungsprotokolle
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] Protokolle erscheinen einmal täglich um 9:00 Uhr
- [ ] Statuscodes sind 200 oder 207 (Erfolg/Teilerfolg)

#### C. Ablaufprotokolle
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] Protokolle erscheinen einmal täglich um Mitternacht
- [ ] Statuscodes sind 200 (Erfolg)

---

### Schritt 3: Anwendungsprotokolle überprüfen

**Suchen Sie nach diesen Protokollmeldungen:**

#### Beim Anwendungsstart
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ Dies bestätigt:** System hat Vercel-Umgebung erkannt

#### Bei jedem Sync (alle 5 Min.)
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### Bei Verlängerungserinnerungen (täglich 9 Uhr)
```
[Cron] Subscription reminders job completed
```

#### Bei Ablaufbereinigung (täglich Mitternacht)
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### Schritt 4: Umgebungsvariablen überprüfen

**Erforderlich:**
```bash
CRON_SECRET=<in-vercel-gesetzt>
```

**NICHT gesetzt (um Vercel statt Trigger.dev zu verwenden):**
```bash
TRIGGER_SECRET_KEY=<sollte-leer-sein>
TRIGGER_API_KEY=<sollte-leer-sein>
TRIGGER_API_URL=<sollte-leer-sein>
```

**Über Vercel CLI überprüfen:**
```bash
vercel env ls
```

**Über Dashboard überprüfen:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/environment-variables
```

---

## 🚨 Häufige Probleme & Lösungen

### Problem 1: Nur 1 Cron Job in Vercel sichtbar

**Ursache:** Alte `vercel.json` wurde bereitgestellt  
**Lösung:**
1. ✅ `vercel.json` ist jetzt behoben (3 Crons)
2. Erneut auf Vercel bereitstellen: `git push` oder `vercel --prod`
3. 1–2 Minuten warten, bis Vercel neue Crons registriert

---

### Problem 2: 401 Nicht autorisierte Fehler

**Ursache:** `CRON_SECRET` nicht gesetzt oder Diskrepanz  
**Lösung:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

---

### Problem 3: Jobs laufen überhaupt nicht

**Ursache:** Trigger.dev-Modus wird statt Vercel-Modus verwendet

**Überprüfung:**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
