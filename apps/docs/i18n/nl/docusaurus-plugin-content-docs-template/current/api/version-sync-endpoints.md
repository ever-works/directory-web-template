---
id: version-sync-endpoints
title: "Version & Sync API Reference"
sidebar_label: "Version & Sync API Reference"
---

# Versie & Synchronisatie API-referentie

## Overzicht

De versie- en synchronisatie-eindpunten bieden toegang tot de versie-informatie van de applicatiecontent en de besturing van repositorysynchronisatie. Het versie-eindpunt leest Git-metadata uit de contentrepository, terwijl de synchronisatie-eindpunten het activeren en bewaken van achtergrondrepositoryoperaties mogelijk maken.

## Eindpunten

### GET /api/version

Haalt uitgebreide versie-informatie op uit de Git-contentrepository, inclusief de laatste commitdetails, auteur, branch en synchronisatietijdstempel. Probeert automatisch de repository te synchroniseren als de Git-map niet wordt gevonden (handig voor koude starts op Vercel).

**Aanvraag**

Geen parameters vereist.

**Reactie**
```typescript
{
  commit: string;       // Korte commit-hash (7 tekens), bijv. "a1b2c3d"
  date: string;         // Commitdatum in ISO 8601-formaat
  message: string;      // Commitbericht
  author: string;       // Naam van de commitauteur
  repository: string;   // DATA_REPOSITORY-URL of "unknown"
  lastSync: string;     // Huidige tijdstempel (ISO 8601) die aangeeft wanneer deze info werd opgehaald
  branch?: string;      // Huidige Git-branch (standaard "main")
}
```

**Reactieheaders**
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag: "<commit-hash>-<timestamp>"`
- `Last-Modified: <commit-date>`

**Voorbeeld**
```typescript
const response = await fetch('/api/version');
const version = await response.json();
// { commit: "a1b2c3d", date: "2024-01-15T10:30:00.000Z", message: "Update content", author: "John", ... }
```

### POST /api/version/sync

Triggert een handmatige achtergrondssynchronisatie van de Git-contentrepository. Voorkomt gelijktijdige synchronisatieoperaties -- als er al een synchronisatie bezig is, wordt er onmiddellijk een statusbericht teruggegeven.

**Aanvraag**
```typescript
{
  options?: object;   // Gereserveerd voor toekomstig gebruik (optioneel)
}
```

De aanvraagbody is geheel optioneel.

**Reactie**
```typescript
// Geslaagde synchronisatie
{
  success: true;
  timestamp: string;    // ISO 8601-tijdstempel bij voltooiing
  duration: number;     // Duur van de bewerking in milliseconden
  message: string;      // bijv. "Repository synchronized successfully"
  details?: string;     // bijv. "Updated 5 files, 3 commits ahead"
}

// Synchronisatie al bezig
{
  success: true;
  timestamp: string;
  duration: number;
  message: "Sync was already in progress";
  details: "Another sync operation is currently running";
}

// Synchronisatie mislukt (status 500)
{
  success: false;
  error: string;        // bijv. "Manual sync request failed"
  timestamp: string;
  duration: number;
  details?: string;     // bijv. "Git fetch failed: network timeout"
}
```

**Voorbeeld**
```typescript
const response = await fetch('/api/version/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const result = await response.json();
console.log(`Sync completed in ${result.duration}ms: ${result.message}`);
```

### GET /api/version/sync

Geeft de huidige synchronisatiestatus terug, inclusief of er een synchronisatie bezig is, wanneer de laatste synchronisatie plaatsvond en de uptime van de server.

**Aanvraag**

Geen parameters vereist.

**Reactie**
```typescript
{
  syncInProgress: boolean;              // Of er momenteel een synchronisatiebewerking actief is
  lastSyncTime: string | null;          // ISO 8601-tijdstempel van de laatste geslaagde synchronisatie
  timeSinceLastSync: number | null;     // Milliseconden sinds de laatste synchronisatie
  timeSinceLastSyncHuman: string;       // Leesbaar formaat, bijv. "300s ago" of "never"
  uptime: number;                       // Serveruptime in seconden
  timestamp: string;                    // Huidige servertijdstempel (ISO 8601)
}
```

**Voorbeeld**
```typescript
const response = await fetch('/api/version/sync');
const status = await response.json();

if (status.syncInProgress) {
  console.log('Sync is currently running...');
} else {
  console.log(`Last synced: ${status.timeSinceLastSyncHuman}`);
}
```

## Authenticatie

Alle versie- en synchronisatie-eindpunten zijn **openbaar** -- er is geen authenticatie vereist. Deze eindpunten zijn ontworpen voor monitoringdashboards en beheerhulpmiddelen.

## Foutreacties

### GET /api/version

| Status | Code | Beschrijving |
|--------|------|-------------|
| 404 | `REPOSITORY_NOT_FOUND` | Git-map van contentrepository niet gevonden |
| 404 | `NO_COMMITS` | Repository bestaat maar bevat geen commits |
| 500 | `GIT_ERROR` | Kan Git-log of commitinformatie niet lezen |
| 500 | `VALIDATION_ERROR` | Commitgegevens missen verplichte velden |
| 500 | `INTERNAL_ERROR` | Onverwachte runtime-fout |

Foutreacties bevatten een gestructureerde body met velden `error`, `code`, `timestamp` en optioneel `details`.

### POST /api/version/sync

| Status | Beschrijving |
|--------|-------------|
| 200 | Synchronisatie succesvol voltooid of was al bezig |
| 500 | Synchronisatiebewerking mislukt (inclusief duur en foutdetails) |

## Snelheidsbeperking

- **GET /api/version**: Gecacht gedurende 1 minuut aan clientzijde met 5 minuten stale-while-revalidate. Bevat ETag- en Last-Modified-headers voor voorwaardelijke aanvragen.
- **GET /api/version/sync** en **POST /api/version/sync**: Geen caching (`Cache-Control: no-cache, no-store, must-revalidate`). Preventie van gelijktijdige synchronisatie zorgt ervoor dat er slechts één synchronisatie tegelijk wordt uitgevoerd.

## Gerelateerde eindpunten

- [Health Endpoints](./health-endpoints) -- Gezondheidscheck voor databaseconnectiviteit
- [Config Feature Endpoints](./config-feature-endpoints) -- Vlaggen voor beschikbaarheid van functies
