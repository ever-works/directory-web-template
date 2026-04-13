---
id: internal-endpoints
title: "Endpoint Interni e di Sistema"
sidebar_label: "Interni e di Sistema"
sidebar_position: 17
---

# Endpoint Interni e di Sistema

Questi endpoint forniscono operazioni a livello di sistema: inizializzazione del database, configurazione dei flag di funzionalità, controlli di salute, informazioni sulla versione e sincronizzazione del repository. La maggior parte viene utilizzata dalla piattaforma stessa piuttosto che dagli utenti finali.

**File sorgente:**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## Riepilogo delle Route

| Metodo | Percorso | Autenticazione | Descrizione |
|--------|------|------|-------------|
| GET | `/api/internal/db-init` | Solo dev | Avvia l'inizializzazione del database |
| GET | `/api/config/features` | Nessuna | Ottieni i flag di disponibilità delle funzionalità |
| GET | `/api/health/database` | Nessuna | Controllo di salute del database |
| GET | `/api/version` | Nessuna | Ottieni le informazioni sulla versione dell'applicazione |
| GET | `/api/version/sync` | Nessuna | Ottieni lo stato di sincronizzazione |
| POST | `/api/version/sync` | Nessuna | Avvia la sincronizzazione manuale del repository |

---

## GET `/api/internal/db-init`

Avvia la migrazione automatica del database e il seeding se il database non è ancora inizializzato.

### Sicurezza

Questo endpoint è **disponibile solo in modalità di sviluppo**. In produzione restituisce 403:

```ts
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json(
    { error: 'Not available in production' },
    { status: 403 }
  );
}
```

### Configurazione Runtime

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Risposta: 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Risposta: 403 (Produzione)

```json
{
  "error": "Not available in production"
}
```

---

## GET `/api/config/features`

Restituisce i flag di disponibilità delle funzionalità correnti in base alla configurazione del sistema (principalmente la disponibilità del database). È un **endpoint pubblico** utilizzato dal frontend per gestire in modo elegante le funzionalità mancanti.

### Risposta: 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### Risposta: 200 (Nessun Database)

Quando il database non è configurato, tutte le funzionalità sono disabilitate:

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

Le risposte di successo vengono memorizzate nella cache per 5 minuti con stale-while-revalidate:

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

Le risposte di errore usano `Cache-Control: no-cache`.

### Comportamento in Caso di Errore

In caso di errore, l'endpoint restituisce tutte le funzionalità come disabilitate (con stato 500) per garantire che il frontend si degradi in modo elegante.

---

## GET `/api/health/database`

Un controllo di salute leggero che verifica la connessione al database eseguendo `SELECT 1`.

### Risposta: 200 (Sano)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Risposta: 500 (Non Sano)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Casi d'Uso

- Probe di liveness e readiness per Kubernetes/Docker
- Dashboard di monitoraggio
- Script di verifica del deployment
- Controlli di salute del load balancer

---

## GET `/api/version`

Recupera informazioni complete sulla versione dal repository Git dei contenuti, inclusi i dettagli dell'ultimo commit, le informazioni sull'autore, il branch e lo stato di sincronizzazione.

### Come Funziona

1. Verifica che la directory Git esista nel percorso del contenuto
2. Se la directory `.git` manca, tenta la sincronizzazione (utile per i cold start su Vercel)
3. Legge l'ultimo commit usando `isomorphic-git`
4. Restituisce le informazioni sulla versione formattate con intestazioni di caching

### Risposta: 200

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

### Intestazioni della Risposta

| Intestazione | Valore | Descrizione |
|--------|-------|-------------|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | Cache client di 1 minuto |
| `ETag` | `"a1b2c3d-1705312200000"` | Basato sull'hash del commit |
| `Last-Modified` | `Mon, 15 Jan 2024 10:30:00 GMT` | Timestamp del commit |

### Codici di Errore

Tutti gli errori includono un formato strutturato con codice di errore:

| Stato | Codice | Condizione |
|--------|------|----------|
| 404 | `REPOSITORY_NOT_FOUND` | La directory Git non esiste |
| 404 | `NO_COMMITS` | Il repository non ha commit |
| 500 | `GIT_ERROR` | Impossibile leggere le informazioni del commit |
| 500 | `VALIDATION_ERROR` | I dati del commit mancano dei campi obbligatori |
| 500 | `INTERNAL_ERROR` | Errore imprevisto |

```json
{
  "error": "Data repository not found",
  "code": "REPOSITORY_NOT_FOUND",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "details": "Git directory not found at: /path/to/content/.git"
}
```

---

## GET `/api/version/sync`

Restituisce lo stato di sincronizzazione corrente, incluso se una sincronizzazione è in corso, quando è avvenuta l'ultima sincronizzazione e l'uptime del server.

### Risposta: 200

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": 300000,
  "timeSinceLastSyncHuman": "300s ago",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Risposta: 200 (Mai Sincronizzato)

```json
{
  "syncInProgress": false,
  "lastSyncTime": null,
  "timeSinceLastSync": null,
  "timeSinceLastSyncHuman": "never",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## POST `/api/version/sync`

Avvia manualmente una sincronizzazione in background del repository Git dei contenuti. Impedisce operazioni di sincronizzazione concorrenti (se una sincronizzazione è già in corso, restituisce successo con un messaggio informativo).

### Corpo della Richiesta

Facoltativo. Riservato per uso futuro:

```json
{}
```

### Risposta: 200 (Sincronizzazione Completata)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 1250,
  "message": "Repository synchronized successfully",
  "details": "Updated 5 files, 3 commits ahead"
}
```

### Risposta: 200 (Già in Corso)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 50,
  "message": "Sync was already in progress",
  "details": "Another sync operation is currently running"
}
```

### Risposta: 500

```json
{
  "success": false,
  "error": "Manual sync request failed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 800,
  "details": "Git fetch failed: network timeout"
}
```

Le risposte di GET e POST includono `Cache-Control: no-cache, no-store, must-revalidate` per impedire stati di sincronizzazione obsoleti.

---

## File Sorgente Correlati

| File | Scopo |
|------|-------|
| `template/app/api/internal/db-init/route.ts` | Endpoint di inizializzazione del database |
| `template/app/api/config/features/route.ts` | Endpoint dei flag di funzionalità |
| `template/app/api/health/database/route.ts` | Controllo di salute del database |
| `template/app/api/version/route.ts` | Endpoint informazioni versione |
| `template/app/api/version/sync/route.ts` | Trigger di sincronizzazione e stato |
| `template/lib/db/initialize.ts` | Logica di inizializzazione del database |
| `template/lib/config/feature-flags.ts` | Risoluzione dei flag di funzionalità |
| `template/lib/services/sync-service.ts` | Servizio di sincronizzazione del repository |
| `template/lib/lib.ts` | Utilità per percorso dei contenuti e filesystem |
