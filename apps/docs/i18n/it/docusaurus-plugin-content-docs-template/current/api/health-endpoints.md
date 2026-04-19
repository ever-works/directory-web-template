---
id: health-endpoints
title: "Riferimento API Salute del Sistema"
sidebar_label: "Salute del Sistema"
sidebar_position: 52
---

# Riferimento API Salute del Sistema

## Panoramica

L'endpoint di salute del sistema fornisce un semplice controllo della connettività al database per scopi di monitoraggio e infrastruttura. Esegue una query leggera per verificare che la connessione al database sia attiva e reattiva, restituendo informazioni sullo stato con timestamp.

## Endpoint

### GET /api/health/database

Esegue un controllo di salute del database eseguendo una query `SELECT 1` per verificare la connessione.

**Richiesta**

Nessun parametro o corpo richiesto.

**Risposta**
```typescript
// Risposta sana
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // Formato ISO 8601, es. "2024-01-15T10:30:00.000Z"
  result: object;           // Risultato grezzo della query SELECT 1
}

// Risposta non sana (stato 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**Esempio**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('Database is connected at', health.timestamp);
} else {
  console.error('Database is disconnected:', health.error);
}
```

## Autenticazione

Questo endpoint è **pubblico** -- non è richiesta autenticazione. È destinato all'uso da parte di load balancer, monitor di uptime e controlli di salute durante il deployment.

## Codici di Errore

| Stato | Descrizione |
|--------|-------------|
| 200 | La connessione al database è sana |
| 500 | La connessione al database ha fallito -- restituisce lo stato `"unhealthy"` con i dettagli dell'errore |

## Limite di Frequenza

Non viene applicato alcun limite di frequenza esplicito. Questo endpoint è leggero e adatto al polling frequente da parte dei sistemi di monitoraggio.

## Endpoint Correlati

- [Endpoint di Configurazione Funzionalità](./config-feature-endpoints) -- Flag di disponibilità delle funzionalità (dipende anch'esso dal database)
- [Endpoint di Sincronizzazione Versione](./version-sync-endpoints) -- Versione del sistema e stato di sincronizzazione
