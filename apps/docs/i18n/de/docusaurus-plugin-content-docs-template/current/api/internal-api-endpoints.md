---
id: internal-api-endpoints
title: "Internal API Endpoints"
sidebar_label: "Internal API Endpoints"
---

# Interne API-Endpunkte

Die interne API stellt systemseitige Endpunkte für Infrastrukturoperationen bereit. Diese Endpunkte sind auf den Entwicklungsmodus beschränkt und sind in der Produktion nicht zugänglich.

**Quellverzeichnis:** `template/app/api/internal/`

---

## Datenbankinitialisierung

Löst automatische Datenbankmigration und -seeding aus, wenn die Datenbank noch nicht initialisiert ist.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `GET` |
| **Pfad** | `/api/internal/db-init` |
| **Authentifizierung** | Nur Entwicklungsmodus |
| **Runtime** | `nodejs` |
| **Caching** | `force-dynamic` |
| **Quelle** | `internal/db-init/route.ts` |

### Sicherheit

Dieser Endpunkt ist **nur im Entwicklungsmodus zugänglich** (`NODE_ENV === 'development'`). In der Produktion gibt er eine `403 Forbidden`-Antwort zurück.

### Antwort

**Status 200** – Datenbankinitialisierung abgeschlossen.

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

**Status 403** – Produktionsumgebung (Zugriff verweigert).

```json
{
  "error": "Not available in production"
}
```

**Status 500** – Initialisierung fehlgeschlagen.

```json
{
  "success": false,
  "error": "Database initialization failed"
}
```

### Funktionsweise

Wenn aufgerufen, importiert und führt der Endpunkt dynamisch `initializeDatabase()` aus `@/lib/db/initialize` aus, was:

1. Ausstehende Drizzle-Datenbankmigrationen ausführt.
2. Initiale Daten seeded, wenn die Datenbank leer ist (z. B. Standard-Admin-Benutzer, Initialkonfiguration).
3. Sicherstellt, dass das Datenbankschema für die Entwicklung aktuell ist.

### curl-Beispiel

```bash
# Datenbank initialisieren (nur Entwicklung)
curl -s http://localhost:3000/api/internal/db-init
```

### TypeScript-Verwendung

```typescript
async function initializeDevDatabase(): Promise<void> {
  const res = await fetch('/api/internal/db-init');
  const data = await res.json();

  if (data.success) {
    console.log('Datenbank erfolgreich initialisiert');
  } else {
    console.error('Datenbankinitialisierung fehlgeschlagen:', data.error);
  }
}
```

### Implementierungshinweise

- Die Funktion `initializeDatabase()` wird dynamisch mit `await import()` importiert, um das Laden von Datenbankinitialisierungscode in Produktions-Bundles zu vermeiden.
- Die Route ist mit `export const runtime = 'nodejs'` konfiguriert (nicht Edge-Runtime).
- Die Route verwendet `export const dynamic = 'force-dynamic'`, um das Caching der Antwort durch Next.js zu verhindern.
- Dieser Endpunkt ist für die Verwendung bei der lokalen Entwicklungseinrichtung und in CI/CD-Pipelines ausgelegt.
