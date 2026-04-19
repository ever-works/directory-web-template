---
id: cron-api-endpoints
title: "Cron API Endpoints"
sidebar_label: "Cron API Endpoints"
---

# Cron-API-Endpunkte

Die Cron-API stellt geplante Job-Endpunkte bereit, die von Vercel Cron, externen Schedulern oder dem internen `BackgroundJobManager` ausgelöst werden. Alle Cron-Endpunkte erfordern eine Authentifizierung über die Umgebungsvariable `CRON_SECRET` mittels eines `Bearer`-Tokens im `Authorization`-Header.

**Quellverzeichnis:** `template/app/api/cron/`

---

## Authentifizierung

Cron-Endpunkte verwenden ein gemeinsames Geheimnis zur Autorisierung:

- **Produktion:** Die Umgebungsvariable `CRON_SECRET` muss gesetzt sein. Anfragen müssen `Authorization: Bearer <CRON_SECRET>` enthalten.
- **Entwicklung:** Falls `CRON_SECRET` nicht konfiguriert ist, ist der Zugriff ohne Authentifizierung erlaubt.
- **Sicherheit:** Alle Cron-Endpunkte verwenden `crypto.timingSafeEqual()` für Konstantzeit-Vergleiche zum Schutz vor Timing-Angriffen.

**Nicht autorisierte Antwort (401):**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## Vercel-Cron-Konfiguration

Der Cron-Zeitplan wird in `vercel.json` definiert:

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

| Job | Zeitplan | Beschreibung |
|-----|----------|--------------|
| Inhaltssynchronisierung | Täglich um 3:00 Uhr UTC | Synchronisiert Inhalte aus dem Git-basierten CMS |
| Abonnement-Erinnerungen | Täglich um 9:00 Uhr UTC | Sendet Verlängerungs-Erinnerungs-E-Mails |
| Abonnement-Ablauf | Täglich um Mitternacht UTC | Verarbeitet abgelaufene Abonnements |

---

## Inhaltssynchronisierung

Löst eine Inhaltssynchronisierung aus dem Git-basierten CMS-Repository aus.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `GET` |
| **Pfad** | `/api/cron/sync` |
| **Authentifizierung** | `CRON_SECRET` (Bearer-Token) |
| **Quelle** | `cron/sync/route.ts` |

### Antwort

**Status 200** – Synchronisierung erfolgreich abgeschlossen.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Status 500** – Synchronisierung fehlgeschlagen.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `success` | `boolean` | Ob die Synchronisierung erfolgreich war |
| `timestamp` | `string` (ISO 8601) | Zeitpunkt des Abschlusses |
| `duration` | `number` | Dauer in Millisekunden |
| `message` | `string` | Lesbare Statusmeldung |
| `details` | `string` (optional) | Zusätzliche Details bei Fehler |

### Antwort-Header

Alle Antworten enthalten `Cache-Control: no-cache, no-store, must-revalidate`.

### curl-Beispiel

```bash
curl -s http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Abonnement-Ablauf

Findet und verarbeitet abgelaufene Abonnements, indem deren Status von `active` auf `expired` aktualisiert und Benachrichtigungs-E-Mails gesendet werden.

| Eigenschaft | Wert |
|-------------|------|
| **Methoden** | `GET`, `POST` |
| **Pfad** | `/api/cron/subscription-expiration` |
| **Authentifizierung** | `CRON_SECRET` (Bearer-Token) |
| **Quelle** | `cron/subscription-expiration/route.ts` |

### Antwort

**Status 200** – Erfolgreich verarbeitet.

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

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `data.processed` | `number` | Anzahl der auf `expired` aktualisierten Abonnements |
| `data.affectedUsers` | `array` | Liste der betroffenen Abonnements (ohne PII) |
| `data.errors` | `string[]` | Nicht-kritische Fehler (z. B. E-Mail-Zustellfehler) |
| `data.timestamp` | `string` | Verarbeitungszeitstempel |

---

## Abonnement-Erinnerungen

Sendet Verlängerungs-Erinnerungs-E-Mails an Benutzer mit bald ablaufenden Abonnements.

| Eigenschaft | Wert |
|-------------|------|
| **Methoden** | `GET`, `POST` |
| **Pfad** | `/api/cron/subscription-reminders` |
| **Authentifizierung** | `CRON_SECRET` (Bearer-Token) |
| **Quelle** | `cron/subscription-reminders/route.ts` |

### Antwort

**Status 200** – Job erfolgreich abgeschlossen.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Status 207** – Job mit teilweisen Fehlern abgeschlossen.

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

---

## Hintergrundaufgaben-Initialisierung

Das Hintergrundaufgaben-Modul (`cron/jobs/background-jobs-init.ts`) ist kein API-Endpunkt, sondern ein Singleton-Initialisierungsmodul zum Konfigurieren des Planungsmodus beim Anwendungsstart.

### Planungsmodi

| Modus | Beschreibung |
|-------|--------------|
| `vercel` | Jobs werden von Vercel Cron über `/api/cron/*`-Endpunkte verwaltet |
| `local` | Interner Scheduler (für selbst gehostete Deployments) |
| `trigger-dev` | Trigger.dev-Integration für verwaltete Hintergrundaufgaben |
| `disabled` | Hintergrundsynchronisierung deaktiviert (`DISABLE_AUTO_SYNC=true`) |

## Umgebungsvariablen

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `CRON_SECRET` | Produktion: Ja, Entwicklung: Nein | Gemeinsames Geheimnis für Cron-Endpunkt-Authentifizierung |
| `DISABLE_AUTO_SYNC` | Nein | Auf `true` setzen, um automatische Inhaltssynchronisierung zu deaktivieren |
