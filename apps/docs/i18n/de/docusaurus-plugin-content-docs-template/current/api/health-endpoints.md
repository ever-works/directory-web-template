---
id: health-endpoints
title: "Health API Reference"
sidebar_label: "Health API Reference"
---

# Health-API-Referenz

## Übersicht

Der Health-Endpunkt bietet eine einfache Datenbankverbindungsprüfung für Monitoring- und Infrastrukturzwecke. Er führt eine leichte Abfrage aus, um zu überprüfen, ob die Datenbankverbindung aktiv und reaktionsfähig ist, und gibt Statusinformationen mit Zeitstempeln zurück.

## Endpunkte

### GET /api/health/database

Führt eine grundlegende Datenbank-Gesundheitsprüfung durch, indem eine `SELECT 1`-Abfrage ausgeführt wird.

**Anfrage**

Keine Parameter oder Anfragekörper erforderlich.

**Antwort**
```typescript
// Gesunde Antwort
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // ISO 8601-Format
  result: object;           // Rohes Abfrageergebnis von SELECT 1
}

// Ungesunde Antwort (Status 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**Beispiel**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('Datenbank verbunden um', health.timestamp);
} else {
  console.error('Datenbank getrennt:', health.error);
}
```

## Authentifizierung

Dieser Endpunkt ist **öffentlich** – keine Authentifizierung erforderlich. Er ist für die Verwendung durch Load Balancer, Uptime-Monitore und Deployment-Gesundheitsprüfungen vorgesehen.

## Fehlerantworten

| Status | Beschreibung |
|--------|--------------|
| 200 | Datenbankverbindung ist gesund |
| 500 | Datenbankverbindung fehlgeschlagen – gibt `"unhealthy"`-Status mit Fehlerdetails zurück |

## Ratenbegrenzung

Keine explizite Ratenbegrenzung angewendet. Dieser Endpunkt ist leichtgewichtig und für häufiges Polling durch Monitoring-Systeme geeignet.

## Verwandte Endpunkte

- [Konfigurations-Feature-Endpunkte](./config-feature-endpoints) – Feature-Verfügbarkeits-Flags (hängt ebenfalls von der Datenbank ab)
- [Version-Sync-Endpunkte](./version-sync-endpoints) – Systemversion und Synchronisierungsstatus
