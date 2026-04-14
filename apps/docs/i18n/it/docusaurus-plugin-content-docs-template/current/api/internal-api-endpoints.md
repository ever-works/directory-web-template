---
id: internal-api-endpoints
title: Endpoint API Interni
sidebar_label: API Interni
sidebar_position: 64
---

# Endpoint API Interni

Le API Interne forniscono endpoint a livello di sistema utilizzati per le operazioni di infrastruttura. Questi endpoint sono riservati alla modalità di sviluppo e non sono accessibili in produzione.

**Directory sorgente:** `template/app/api/internal/`

---

## Inizializzazione del Database

Avvia la migrazione automatica del database e il seeding se il database non è ancora inizializzato.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/internal/db-init` |
| **Autenticazione** | Solo modalità di sviluppo |
| **Runtime** | `nodejs` |
| **Cache** | `force-dynamic` |
| **Sorgente** | `internal/db-init/route.ts` |

### Sicurezza

Questo endpoint è **accessibile solo in modalità di sviluppo** (`NODE_ENV === 'development'`). In produzione restituisce una risposta `403 Forbidden`.

### Risposta

**Stato 200** -- Inizializzazione del database completata.

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

**Stato 403** -- Ambiente di produzione (accesso negato).

```json
{
  "error": "Not available in production"
}
```

**Stato 500** -- Inizializzazione fallita.

```json
{
  "success": false,
  "error": "Database initialization failed"
}
```

### Cosa Fa

Quando viene chiamato, l'endpoint importa dinamicamente ed esegue `initializeDatabase()` da `@/lib/db/initialize`, che:

1. Esegue le migrazioni del database Drizzle in sospeso.
2. Inizializza i dati iniziali se il database è vuoto (es. utente amministratore predefinito, configurazione iniziale).
3. Assicura che lo schema del database sia aggiornato per lo sviluppo.

### Esempio curl

```bash
# Inizializza il database (solo sviluppo)
curl -s http://localhost:3000/api/internal/db-init
```

### Utilizzo TypeScript

```typescript
// Tipicamente chiamato durante la configurazione di sviluppo
async function initializeDevDatabase(): Promise<void> {
  const res = await fetch('/api/internal/db-init');
  const data = await res.json();

  if (data.success) {
    console.log('Database initialized successfully');
  } else {
    console.error('Database initialization failed:', data.error);
  }
}
```

### Note di Implementazione

- La funzione `initializeDatabase()` viene importata dinamicamente usando `await import()` per evitare di caricare il codice di inizializzazione del database nei bundle di produzione.
- Il percorso è configurato con `export const runtime = 'nodejs'` per assicurare che venga eseguito nel runtime Node.js (non nel runtime Edge), poiché le operazioni sul database richiedono le API complete di Node.js.
- Il percorso usa `export const dynamic = 'force-dynamic'` per impedire a Next.js di memorizzare nella cache la risposta.
- La gestione degli errori usa `safeErrorResponse()` per restituire messaggi di errore generici registrando gli errori dettagliati lato server.
- Questo endpoint è progettato per l'uso durante la configurazione dello sviluppo locale e le pipeline CI/CD. Non dovrebbe mai essere esposto in produzione.

### Comandi Correlati

Per le operazioni manuali sul database al di fuori dell'API, utilizzare i comandi CLI:

```bash
# Genera i file di migrazione
pnpm db:generate

# Esegui le migrazioni
pnpm db:migrate

# Popola il database
pnpm db:seed

# Apri lo studio del database
pnpm db:studio
```
