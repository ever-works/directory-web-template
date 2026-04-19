---
id: internal-endpoints
title: "Internal & System Endpoints"
sidebar_label: "Internal & System Endpoints"
---

# Interne & System-Endpunkte

Diese Endpunkte stellen systemseitige Operationen bereit: Datenbankinitialisierung, Feature-Flag-Konfiguration, Gesundheitsprüfungen, Versionsinformationen und Repository-Synchronisierung. Die meisten werden von der Plattform selbst verwendet, nicht von Endbenutzern.

**Quelldateien:**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## Endpunktübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|-------------------|--------------|
| GET | `/api/internal/db-init` | Nur Entwicklung | Datenbankinitialisierung auslösen |
| GET | `/api/config/features` | Keine | Feature-Verfügbarkeits-Flags abrufen |
| GET | `/api/health/database` | Keine | Datenbank-Gesundheitsprüfung |
| GET | `/api/version` | Keine | Anwendungsversion abrufen |
| GET | `/api/version/sync` | Keine | Synchronisierungsstatus abrufen |
| POST | `/api/version/sync` | Keine | Manuelle Repository-Synchronisierung auslösen |

---

## GET `/api/internal/db-init`

Löst automatische Datenbankmigration und -seeding aus, wenn die Datenbank noch nicht initialisiert ist.

### Sicherheit

Dieser Endpunkt ist **nur im Entwicklungsmodus verfügbar**. In der Produktion gibt er 403 zurück.

### Antwort: 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Antwort: 403 (Produktion)

```json
{
  "error": "Not available in production"
}
```

---

## GET `/api/config/features`

Gibt aktuelle Feature-Verfügbarkeits-Flags basierend auf der Systemkonfiguration zurück. Dies ist ein **öffentlicher Endpunkt**, der vom Frontend für graceful Feature-Degradierung verwendet wird.

### Antwort: 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### Antwort: 200 (Keine Datenbank)

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### Caching

Erfolgreiche Antworten werden 5 Minuten gecacht mit Stale-While-Revalidate. Fehlerantworten verwenden `Cache-Control: no-cache`.

---

## GET `/api/health/database`

Eine leichte Gesundheitsprüfung, die die Datenbankverbindung durch Ausführen von `SELECT 1` testet.

### Antwort: 200 (Gesund)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Antwort: 500 (Ungesund)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## GET `/api/version`

Ruft umfassende Versionsinformationen aus dem Git-Inhalts-Repository ab, einschließlich der neuesten Commit-Details.

### Antwort: 200

```json
{
  "commit": "a1b2c3d",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new feature for user management",
  "author": "John Doe",
  "repository": "https://github.com/user/repo.git",
  "lastSync": "2024-01-15T10:35:00.000Z",
  "branch": "main"
}
```

### Antwort-Header

| Header | Wert | Beschreibung |
|--------|------|--------------|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | 1-Minuten-Client-Cache |
| `ETag` | `"a1b2c3d-1705312200000"` | Basierend auf Commit-Hash |
| `Last-Modified` | `Mon, 15 Jan 2024 10:30:00 GMT` | Commit-Zeitstempel |

### Fehlerantworten

| Status | Code | Bedingung |
|--------|------|-----------|
| 404 | `REPOSITORY_NOT_FOUND` | Git-Verzeichnis existiert nicht |
| 404 | `NO_COMMITS` | Repository hat keine Commits |
| 500 | `GIT_ERROR` | Commit-Informationen konnten nicht gelesen werden |
| 500 | `VALIDATION_ERROR` | Commit-Daten haben fehlende Pflichtfelder |
