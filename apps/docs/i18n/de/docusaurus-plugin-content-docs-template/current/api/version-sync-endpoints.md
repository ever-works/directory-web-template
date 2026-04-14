---
id: version-sync-endpoints
title: "Version & Sync API Reference"
sidebar_label: "Version & Sync API Reference"
---

# Version & Sync API-Referenz

## Übersicht

Die Versions- und Sync-Endpunkte bieten Zugriff auf die Versionsinformationen des Anwendungsinhalts und Steuerungsfunktionen für die Repository-Synchronisierung. Der Versions-Endpunkt liest Git-Metadaten aus dem Inhalts-Repository, während die Sync-Endpunkte das Auslösen und Überwachen von Hintergrund-Repository-Synchronisierungsoperationen ermöglichen.

## Endpunkte

### GET /api/version

Ruft umfassende Versionsinformationen aus dem Git-Inhalts-Repository ab, einschließlich der neuesten Commit-Details, Autor, Branch und Synchronisierungszeitstempel. Versucht automatisch, das Repository zu synchronisieren, wenn das Git-Verzeichnis nicht gefunden wird (nützlich für Kaltstarts auf Vercel).

**Anfrage**

Keine Parameter erforderlich.

**Antwort**
```typescript
{
  commit: string;       // Kurzer Commit-Hash (7 Zeichen), z.B. "a1b2c3d"
  date: string;         // Commit-Datum im ISO 8601-Format
  message: string;      // Commit-Nachricht
  author: string;       // Name des Commit-Autors
  repository: string;   // DATA_REPOSITORY-URL oder "unknown"
  lastSync: string;     // Aktueller Zeitstempel (ISO 8601), wann diese Info abgerufen wurde
  branch?: string;      // Aktueller Git-Branch (Standard: "main")
}
```

**Antwort-Header**
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag: "<commit-hash>-<timestamp>"`
- `Last-Modified: <commit-date>`

**Beispiel**
```typescript
const response = await fetch('/api/version');
const version = await response.json();
// { commit: "a1b2c3d", date: "2024-01-15T10:30:00.000Z", message: "Update content", author: "John", ... }
```

### POST /api/version/sync

Löst eine manuelle Hintergrund-Synchronisierung des Git-Inhalts-Repositorys aus. Verhindert gleichzeitige Sync-Operationen – wenn bereits eine Synchronisierung läuft, wird die Anfrage sofort mit einer Statusmeldung zurückgegeben.

**Anfrage**
```typescript
{
  options?: object;   // Für zukünftige Verwendung reserviert (optional)
}
```

Der Anfragekörper ist vollständig optional.

**Antwort**
```typescript
// Erfolgreiche Synchronisierung
{
  success: true;
  timestamp: string;    // ISO 8601 Abschlusszeitstempel
  duration: number;     // Vorgangsdauer in Millisekunden
  message: string;      // z.B. "Repository synchronized successfully"
  details?: string;     // z.B. "Updated 5 files, 3 commits ahead"
}

// Synchronisierung bereits im Gange
{
  success: true;
  timestamp: string;
  duration: number;
  message: "Sync was already in progress";
  details: "Another sync operation is currently running";
}

// Synchronisierung fehlgeschlagen (Status 500)
{
  success: false;
  error: string;        // z.B. "Manual sync request failed"
  timestamp: string;
  duration: number;
  details?: string;     // z.B. "Git fetch failed: network timeout"
}
```

**Beispiel**
```typescript
const response = await fetch('/api/version/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const result = await response.json();
console.log(`Sync abgeschlossen in ${result.duration}ms: ${result.message}`);
```

### GET /api/version/sync

Gibt den aktuellen Synchronisierungsstatus zurück, einschließlich ob eine Synchronisierung läuft, wann die letzte Synchronisierung stattgefunden hat und die Server-Betriebszeit.

**Anfrage**

Keine Parameter erforderlich.

**Antwort**
```typescript
{
  syncInProgress: boolean;              // Ob gerade eine Sync-Operation läuft
  lastSyncTime: string | null;          // ISO 8601 Zeitstempel der letzten erfolgreichen Sync
  timeSinceLastSync: number | null;     // Millisekunden seit der letzten Sync
  timeSinceLastSyncHuman: string;       // Lesbar, z.B. "300s ago" oder "never"
  uptime: number;                       // Server-Betriebszeit in Sekunden
  timestamp: string;                    // Aktueller Server-Zeitstempel (ISO 8601)
}
```

**Beispiel**
```typescript
const response = await fetch('/api/version/sync');
const status = await response.json();

if (status.syncInProgress) {
  console.log('Synchronisierung läuft...');
} else {
  console.log(`Zuletzt synchronisiert: ${status.timeSinceLastSyncHuman}`);
}
```

## Authentifizierung

Alle Versions- und Sync-Endpunkte sind **öffentlich** – keine Authentifizierung erforderlich. Diese Endpunkte sind für Überwachungs-Dashboards und administrative Tools konzipiert.

## Fehlerantworten

### GET /api/version

| Status | Code | Beschreibung |
|--------|------|-------------|
| 404 | `REPOSITORY_NOT_FOUND` | Git-Verzeichnis des Inhalts-Repositorys nicht gefunden |
| 404 | `NO_COMMITS` | Repository vorhanden, aber keine Commits enthalten |
| 500 | `GIT_ERROR` | Git-Log oder Commit-Informationen konnten nicht gelesen werden |
| 500 | `VALIDATION_ERROR` | Commit-Daten fehlen erforderliche Felder |
| 500 | `INTERNAL_ERROR` | Unerwarteter Laufzeitfehler |

Fehlerantworten enthalten einen strukturierten Körper mit den Feldern `error`, `code`, `timestamp` und optionalem `details`.

### POST /api/version/sync

| Status | Beschreibung |
|--------|---------|
| 200 | Synchronisierung erfolgreich abgeschlossen oder bereits im Gange |
| 500 | Sync-Operation fehlgeschlagen (enthält Dauer und Fehlerdetails) |

## Rate-Limiting

- **GET /api/version**: Clientseitig 1 Minute gecacht, mit 5-Minuten stale-while-revalidate. Enthält ETag- und Last-Modified-Header für bedingte Anfragen.
- **GET /api/version/sync** und **POST /api/version/sync**: Kein Caching (`Cache-Control: no-cache, no-store, must-revalidate`). Gleichzeitigkeitsschutz stellt sicher, dass nur eine Synchronisierung gleichzeitig läuft.

## Verwandte Endpunkte

- [Health-Endpunkte](./health-endpoints) – Datenbankverbindungs-Zustandsprüfung
- [Config-Feature-Endpunkte](./config-feature-endpoints) – Feature-Verfügbarkeits-Flags
