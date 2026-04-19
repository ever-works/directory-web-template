---
id: version-sync-endpoints
title: "Riferimento API Versione e Sincronizzazione"
sidebar_label: "Versione & Sincronizzazione"
---

# Riferimento API Versione e Sincronizzazione

## Panoramica

Gli endpoint Versione e Sincronizzazione forniscono accesso alle informazioni sulla versione dei contenuti dell'applicazione e ai controlli di sincronizzazione del repository. L'endpoint versione legge i metadati Git dal repository dei contenuti, mentre gli endpoint di sincronizzazione consentono di avviare e monitorare le operazioni di sincronizzazione del repository in background.

## Endpoint

### GET /api/version

Recupera informazioni complete sulla versione dal repository Git dei contenuti, inclusi i dettagli dell'ultimo commit, autore, branch e timestamp di sincronizzazione. Tenta automaticamente di sincronizzare il repository se la directory Git non viene trovata (utile per i cold start su Vercel).

**Richiesta**

Nessun parametro richiesto.

**Risposta**
```typescript
{
  commit: string;       // Hash corto del commit (7 caratteri), es. "a1b2c3d"
  date: string;         // Data del commit in formato ISO 8601
  message: string;      // Messaggio del commit
  author: string;       // Nome dell'autore del commit
  repository: string;   // URL di DATA_REPOSITORY o "unknown"
  lastSync: string;     // Timestamp corrente (ISO 8601) che indica quando questa info è stata recuperata
  branch?: string;      // Branch Git corrente (predefinito: "main")
}
```

**Intestazioni di Risposta**
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag: "<commit-hash>-<timestamp>"`
- `Last-Modified: <commit-date>`

**Esempio**
```typescript
const response = await fetch('/api/version');
const version = await response.json();
// { commit: "a1b2c3d", date: "2024-01-15T10:30:00.000Z", message: "Update content", author: "John", ... }
```

### POST /api/version/sync

Avvia una sincronizzazione manuale in background del repository Git dei contenuti. Previene operazioni di sincronizzazione concorrenti -- se una sincronizzazione è già in corso, restituisce immediatamente un messaggio di stato.

**Richiesta**
```typescript
{
  options?: object;   // Riservato per uso futuro (opzionale)
}
```

Il corpo della richiesta è completamente opzionale.

**Risposta**
```typescript
// Sincronizzazione riuscita
{
  success: true;
  timestamp: string;    // Timestamp di completamento ISO 8601
  duration: number;     // Durata dell'operazione in millisecondi
  message: string;      // es. "Repository synchronized successfully"
  details?: string;     // es. "Updated 5 files, 3 commits ahead"
}

// Sincronizzazione già in corso
{
  success: true;
  timestamp: string;
  duration: number;
  message: "Sync was already in progress";
  details: "Another sync operation is currently running";
}

// Sincronizzazione fallita (stato 500)
{
  success: false;
  error: string;        // es. "Manual sync request failed"
  timestamp: string;
  duration: number;
  details?: string;     // es. "Git fetch failed: network timeout"
}
```

**Esempio**
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

Restituisce lo stato corrente della sincronizzazione, incluso se è in corso una sincronizzazione, quando è avvenuta l'ultima sincronizzazione e il tempo di attività del server.

**Richiesta**

Nessun parametro richiesto.

**Risposta**
```typescript
{
  syncInProgress: boolean;              // Se è in corso un'operazione di sincronizzazione
  lastSyncTime: string | null;          // Timestamp ISO 8601 dell'ultima sincronizzazione riuscita
  timeSinceLastSync: number | null;     // Millisecondi dall'ultima sincronizzazione
  timeSinceLastSyncHuman: string;       // Leggibile dall'utente, es. "300s ago" o "never"
  uptime: number;                       // Tempo di attività del server in secondi
  timestamp: string;                    // Timestamp corrente del server (ISO 8601)
}
```

**Esempio**
```typescript
const response = await fetch('/api/version/sync');
const status = await response.json();

if (status.syncInProgress) {
  console.log('Sync is currently running...');
} else {
  console.log(`Last synced: ${status.timeSinceLastSyncHuman}`);
}
```

## Autenticazione

Tutti gli endpoint versione e sincronizzazione sono **pubblici** -- non è richiesta autenticazione. Questi endpoint sono progettati per dashboard di monitoraggio e strumenti amministrativi.

## Risposte di Errore

### GET /api/version

| Stato | Codice | Descrizione |
|--------|------|-----------|
| 404 | `REPOSITORY_NOT_FOUND` | Directory Git del repository dei contenuti non trovata |
| 404 | `NO_COMMITS` | Il repository esiste ma non contiene commit |
| 500 | `GIT_ERROR` | Impossibile leggere il log Git o le informazioni del commit |
| 500 | `VALIDATION_ERROR` | I dati del commit mancano di campi obbligatori |
| 500 | `INTERNAL_ERROR` | Errore di runtime imprevisto |
