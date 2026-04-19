---
id: cron-endpoints
title: "Cron Job API Endpoints"
sidebar_label: "Cron Job API Endpoints"
---

# Cron-Job-API-Endpunkte

Das Template enthält drei Cron-Job-Endpunkte, die in geplanten Intervallen über Vercel Cron ausgeführt werden. Diese Endpunkte verwalten die Inhaltssynchronisierung, Abonnement-Erinnerungen und die Verarbeitung abgelaufener Abonnements.

## Cron-Konfiguration

Cron-Zeitpläne werden in `vercel.json` definiert:

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

## Inhaltssynchronisierung (`/api/cron/sync`)

| Methode | Pfad | Zeitplan | Beschreibung |
|---------|------|----------|--------------|
| `GET` | `/api/cron/sync` | Täglich um 3:00 Uhr UTC | Git-basiertes Inhalts-Repository synchronisieren |

### Funktionsweise

Der Sync-Cron-Job ruft die neuesten Inhalte aus dem konfigurierten Git-Daten-Repository (`DATA_REPOSITORY`) ab und aktualisiert den lokalen Inhalts-Cache. Dadurch spiegelt die Anwendung alle Änderungen wider, die direkt am Inhalts-Repository vorgenommen wurden (z. B. über einen GitHub-PR-Merge).

### Synchronisierungsprozess

```
1. CRON_SECRET-Autorisierung verifizieren
2. Prüfen, ob Synchronisierung bereits läuft (Mutex-Lock)
3. Neueste Änderungen aus dem Remote-Git-Repository abrufen
4. Aktualisierte YAML-Inhaltsdateien parsen und validieren
5. Lokalen Inhalts-Cache aktualisieren
6. Synchronisierungsergebnis mit Dauer zurückgeben
```

### Wesentliche Verhaltensweisen

- **Mutex-Lock**: Es kann jeweils nur eine Synchronisierung laufen. Gleichzeitige Anfragen werden abgelehnt.
- **Timeout**: Synchronisierungsoperationen haben ein 5-Minuten-Timeout.
- **Wiederholungslogik**: Fehlgeschlagene Synchronisierungen werden bis zu 3-mal wiederholt.
- **Entwicklungsmodus**: Auto-Sync kann über `DISABLE_AUTO_SYNC=true` deaktiviert werden.

### Antwort

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## Abonnement-Erinnerungen (`/api/cron/subscription-reminders`)

| Methode | Pfad | Zeitplan | Beschreibung |
|---------|------|----------|--------------|
| `GET` | `/api/cron/subscription-reminders` | Täglich um 9:00 Uhr UTC | Abonnement-Verlängerungs-Erinnerungen senden |

### Funktionsweise

Abfragt Abonnements, die sich ihrem Verlängerungsdatum nähern, und sendet E-Mail-Erinnerungen an Abonnenten. Dies hilft, unfreiwillige Abwanderung zu reduzieren, indem Benutzer vor der Zahlungsverarbeitung benachrichtigt werden.

### Erinnerungszeiträume

- **7 Tage vor Verlängerung**: Erste Erinnerung
- **1 Tag vor Verlängerung**: Letzte Erinnerung

### Antwort

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

## Abonnement-Ablauf (`/api/cron/subscription-expiration`)

| Methode | Pfad | Zeitplan | Beschreibung |
|---------|------|----------|--------------|
| `GET` | `/api/cron/subscription-expiration` | Täglich um Mitternacht UTC | Abgelaufene Abonnements verarbeiten |

### Funktionsweise

Identifiziert Abonnements, deren Ablaufdatum in der Vergangenheit liegt, und aktualisiert deren Status.

### Antwort

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

## Sicherheit

### CRON_SECRET-Verifizierung

Alle Cron-Endpunkte verifizieren einen `CRON_SECRET`-Header oder -Abfrageparameter:

```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

| Umgebungsvariable | Beschreibung |
|-------------------|--------------|
| `CRON_SECRET` | Gemeinsames Geheimnis für Cron-Job-Autorisierung |

### Manuelle Ausführung

Cron-Endpunkte können zum Debuggen manuell ausgeführt werden:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/sync
```

## Fehlerbehandlung

Alle Cron-Jobs implementieren eine umfassende Fehlerbehandlung:
- Fehlgeschlagene Operationen werden mit vollständigen Fehlerdetails protokolliert.
- Teilfehler verhindern nicht die Verarbeitung der verbleibenden Elemente.
- Fehlerzählungen sind in der Antwort zur Überwachung enthalten.
