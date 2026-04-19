---
id: internal-endpoints
title: "Internal & System Endpoints"
sidebar_label: "Internal & System Endpoints"
---

# Interne en systeemeindpunten

De template bevat interne en systeemeindpunten voor databasebeheer, functies-configuratie, statuscontroles en versiebeheer. Deze eindpunten zijn bedoeld voor beheerders, ontwikkelaars en geautomatiseerde systemen — niet voor eindgebruikers.

## Overzicht

| Eindpunt | Methode | Toegang | Beschrijving |
|---|---|---|---|
| `/api/internal/db-init` | GET | Alleen ontwikkeling | Database initialiseren (alleen `NODE_ENV=development`) |
| `/api/config/features` | GET | Openbaar | Actieve functies-schakelaren ophalen |
| `/api/health/database` | GET | Openbaar | Databaseverbinding controleren |
| `/api/version` | GET | Openbaar | Huidige Git-commitversie ophalen |
| `/api/version/sync` | GET | Openbaar | Status van versiesynchronisatie ophalen |
| `/api/version/sync` | POST | Openbaar | Versiesynchronisatie vanuit Git-repository activeren |

---

## GET /api/internal/db-init

Voert databaseinitialisatie uit, inclusief het uitvoeren van migraties, het seeden van begindata en het valideren van de schema-status.

**Omgevingsbeveiliging:**

Dit eindpunt retourneert **403 Verboden** voor elke aanvraag tenzij `NODE_ENV === 'development'`. Het mag nooit in productie worden aangeroepen.

```
if (process.env.NODE_ENV !== 'development') {
  return Response.json({ error: 'Not allowed in production' }, { status: 403 })
}
```

**Reacties:**

| Status | Beschrijving |
|---|---|
| 200 | Initialisatie geslaagd: `{ success: true, message: "Database initialized successfully" }` |
| 403 | Productieomgeving: `{ error: "Not allowed in production" }` |
| 500 | Initialisatie mislukt: `{ success: false, error: "<bericht>" }` |

**Runtime-configuratie:**

- `export const runtime = 'nodejs'` — Vereist voor database-toegang
- `export const dynamic = 'force-dynamic'` — Schakelt caching uit

**Bron:** `template/app/api/internal/db-init/route.ts`

---

## GET /api/config/features

Retourneert de huidige status van alle functies-schakelaren. Openbaar toegankelijk — authenticatie is niet vereist.

**Reactiestructuur:**

```json
{
  "ratings": true,
  "comments": false,
  "favorites": true,
  "featuredItems": true,
  "surveys": false
}
```

**Geen-database-terugval:**

Als de database niet beschikbaar is, retourneert het eindpunt alle functies als `false` zonder een fout te gooien:

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

**Caching:**

```
Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

De reactie wordt 5 minuten gecached (s-maxage=300) en kan tot 10 minuten oud zijn terwijl een nieuwe wordt opgehaald.

**Bron:** `template/app/api/config/features/route.ts`

---

## GET /api/health/database

Voert een snelle databaseverbindingscontrole uit met `SELECT 1`.

**Hoe het werkt:**

1. Voert `SELECT 1` uit via de Drizzle-databaseclient
2. Retourneert 200 als de query slaagt
3. Retourneert 500 als de query mislukt

**Reacties:**

| Status | Beschrijving |
|---|---|
| 200 | `{ status: "healthy", message: "Database connection is working" }` |
| 500 | `{ status: "unhealthy", message: "Database connection failed", error: "<bericht>" }` |

**Gebruikssituaties:**

- Gereedheidscontroles van load balancers
- Uptime-monitoring
- Kubernetes liveness/readiness probes
- CI/CD pijplijn gezondheidscontroles vóór implementatie

**Bron:** `template/app/api/health/database/route.ts`

---

## GET /api/version

Haalt de huidige Git-commitinformatie op voor de geïmplementeerde versie.

**Hoe het werkt:**

1. Leest `DATA_REPOSITORY` omgevingsvariabele om de Git-repository te vinden
2. Kloont of opent een bestaand kloon in de map `.content/`
3. Haalt de laatste commit-metadata op met `getLastCommit()`
4. Retourneert versie-informatie als gestructureerd JSON

**Reactiestructuur:**

```json
{
  "commit": "a1b2c3d",
  "fullCommit": "a1b2c3d4e5f6...",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Update documentation",
  "author": "Gebruikersnaam",
  "branch": "main",
  "tags": ["v1.2.0"]
}
```

**Reactieheaders:**

| Header | Beschrijving |
|---|---|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=3600` |
| `ETag` | `"<full-commit-hash>"` |
| `Last-Modified` | RFC-7231-datum van de commitdatum |

**Foutcodes:**

| Code | HTTP-status | Beschrijving |
|---|---|---|
| `REPOSITORY_NOT_FOUND` | 404 | `DATA_REPOSITORY` niet geconfigureerd of map bestaat niet |
| `NO_COMMITS` | 404 | Geen commits gevonden in de repository |
| `GIT_ERROR` | 500 | Git-operatie mislukt |
| `VALIDATION_ERROR` | 400 | Ongeldige commitgegevens |
| `INTERNAL_ERROR` | 500 | Onverwachte interne fout |

**Gestructureerd foutlichaam:**

```json
{
  "error": "Versie-informatie niet beschikbaar",
  "code": "REPOSITORY_NOT_FOUND",
  "details": "DATA_REPOSITORY-omgevingsvariabele is niet geconfigureerd"
}
```

**Bron:** `template/app/api/version/route.ts`

---

## GET /api/version/sync

Haalt de huidige status van de versiesynchronisatie op.

**Reactiestructuur (geconfigureerd):**

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": "5 minuten geleden",
  "syncIntervalMinutes": 30,
  "nextSyncTime": "2024-01-15T11:00:00.000Z",
  "currentVersion": {
    "commit": "a1b2c3d",
    "date": "2024-01-15T10:25:00.000Z",
    "message": "Update documentation",
    "author": "Gebruikersnaam"
  }
}
```

**Reactiestructuur (nooit gesynchroniseerd):**

```json
{
  "syncInProgress": false,
  "lastSyncTime": null,
  "timeSinceLastSync": null,
  "syncIntervalMinutes": 30,
  "nextSyncTime": null,
  "currentVersion": null
}
```

**Bron:** `template/app/api/version/sync/route.ts`

---

## POST /api/version/sync

Activeert een handmatige versiesynchronisatie vanuit de geconfigureerde Git-repository.

**Aanvraagbody:**

De aanvraagbody is optioneel. Je kunt een leeg JSON-object `{}` sturen of de body leeg laten.

**Reacties:**

| Status | Beschrijving |
|---|---|
| 200 | Synchronisatie geslaagd: `{ success: true, message: "Version sync completed successfully" }` |
| 200 | Synchronisatie al bezig: `{ success: false, message: "Sync already in progress" }` |
| 500 | Synchronisatie mislukt: `{ success: false, error: "<bericht>" }` |

**Caching:**

```
Cache-Control: no-cache
```

POST-reacties worden nooit gecached.

**Bron:** `template/app/api/version/sync/route.ts`

---

## Gerelateerde bronbestanden

| Bestand | Beschrijving |
|---|---|
| `template/app/api/internal/db-init/route.ts` | Databaseinitialisatie-eindpunt |
| `template/app/api/config/features/route.ts` | Functies-configuratie-eindpunt |
| `template/app/api/health/database/route.ts` | Databasestatus-eindpunt |
| `template/app/api/version/route.ts` | Versie-informatieëindpunt |
| `template/app/api/version/sync/route.ts` | Versiesynchronisatie-eindpunten |
| `template/lib/db/index.ts` | Drizzle-databaseclient |
| `template/lib/services/version-sync-service.ts` | Service voor versiesynchronisatielogica |
| `template/lib/config/server-config.ts` | Server-configuratielading |
