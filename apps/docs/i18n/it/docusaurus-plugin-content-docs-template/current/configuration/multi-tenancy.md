---
id: multi-tenancy
title: Configurazione Multi-Tenant
sidebar_label: Multi-Tenant
sidebar_position: 13
---

# Configurazione Multi-Tenant

Questo documento spiega come funziona il supporto multi-tenant nel Directory Web Template.

## Panoramica

Il template utilizza un approccio di **database condiviso con isolamento a livello di riga**:

- Un singolo database PostgreSQL serve più **tenant** (siti web directory).
- Ogni tabella ha una colonna `tenant_id` che circoscrive i dati a un tenant specifico.
- Tutte le query filtrano automaticamente per il tenant corrente — nessuna perdita di dati tra tenant.

## Configurazione Rapida

### 1. Impostare la Variabile d'Ambiente

Nella piattaforma di deployment (Vercel, Docker, ecc.) o in `.env.local`:

```bash
TENANT_ID="your-unique-tenant-id"
```

Può essere qualsiasi stringa univoca (es. un UUID o uno slug leggibile come `"my-directory"`).

### 2. Eseguire il Deploy

Al primo avvio, l'applicazione:

1. Eseguirà le migrazioni del database (aggiunge la colonna `tenant_id` se non presente)
2. Creerà una riga tenant corrispondente al valore `TENANT_ID`
3. Migrerà i dati `tenant_id` NULL esistenti al tenant corrente
4. Eseguirà il seed dei dati predefiniti (utente amministratore, ruoli, permessi)

Non è necessario SQL manuale — tutto è automatico.

### 3. Verificare

Controllare i log del server per:

```
[DB Init] Ensured environment tenant 'your-unique-tenant-id' exists
[Tenant Migration] ✓ users: updated 3 rows
[Tenant Migration] ✅ Migration complete: 15 total rows updated across all tables.
```

## Come Funziona la Risoluzione del Tenant

Quando l'applicazione deve determinare il tenant corrente, utilizza una strategia a **cascata**:

| Priorità | Sorgente          | Descrizione                                                         |
| -------- | ----------------- | ------------------------------------------------------------------- |
| 1        | **Sessione**      | `user.tenantId` dal token JWT (utenti autenticati)                  |
| 2        | **Variabile Env** | Variabile d'ambiente `TENANT_ID`                                    |
| 3        | **Header HTTP**   | Header `x-tenant-domain` (per routing su sottodominio)              |
| 4        | **Database**      | Prima riga tenant attiva (fallback finale)                          |

La funzione `getTenantId()` di `lib/auth/tenant.ts` implementa questa catena e viene chiamata da ogni query al database.

## Architettura

### File Principali

| File                                     | Scopo                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `lib/auth/tenant.ts`                     | `getTenantId()` — risoluzione tenant lato server con caching             |
| `lib/config/env.ts`                      | Validazione variabile d'ambiente `TENANT_ID`                             |
| `lib/db/schema.ts`                       | Tabella tenant + FK `tenant_id` su tutte le tabelle                      |
| `lib/db/initialize.ts`                   | Crea automaticamente il tenant dell'ambiente + esegue la migrazione dati all'avvio |
| `lib/db/migrate-tenant-data.ts`          | Assegna le righe con `tenant_id` NULL al tenant corrente                 |
| `lib/auth/index.ts`                      | Le callback JWT/sessione iniettano `tenantId`                            |
| `components/context/tenant-provider.tsx` | Contesto React per accesso al tenant lato client                         |
| `app/api/tenant/route.ts`                | `GET /api/tenant` — restituisce le informazioni del tenant corrente      |

### Flusso dei Dati

```
Richiesta Utente → getTenantId() → Risolve da sessione/env/headers/DB
                                            ↓
                             Tutte le query DB filtrano per questo tenant_id
                                            ↓
                               Solo i dati per questo tenant vengono restituiti
```

### Integrazione Autenticazione

- **Login con credenziali**: Gli utenti admin e client ottengono il loro `tenantId` dalla colonna `users.tenant_id`.
- **Login OAuth**: L'adapter Drizzle è avvolto per iniettare `tenantId` alla creazione dell'utente.
- **Callback JWT**: Legge `tenantId` dal record utente e lo include nel token.
- **Callback sessione**: Propaga `tenantId` a `session.user.tenantId`.
- **Componenti client**: Usano l'hook `useTenant()` da `TenantProvider` per le informazioni sul tenant.

## Directory Multiple (Multi-Tenant)

Per eseguire più siti web directory su un singolo database:

1. **Ogni sito web** imposta un `TENANT_ID` diverso nel suo ambiente:
    - Sito A: `TENANT_ID="directory-a-uuid"`
    - Sito B: `TENANT_ID="directory-b-uuid"`

2. **Tutti i siti web** si connettono allo **stesso database** (`DATABASE_URL`).

3. **L'isolamento dei dati** è automatico — il Sito A vede solo le righe dove `tenant_id = 'directory-a-uuid'`.

4. **Utenti, ruoli, commenti, abbonamenti** e tutti gli altri dati sono completamente isolati per tenant.

## Gestione dei Dati Esistenti

Quando si aggiorna da una versione non-tenant:

- La colonna `tenant_id` viene aggiunta come **nullable** (non rompe i dati esistenti)
- Al primo avvio, `migrateNullTenantIds()` assegna automaticamente le righe NULL al tenant risolto
- Questa migrazione è **idempotente** — sicura da eseguire più volte
- Dopo la migrazione, tutti i dati esistenti sono visibili sotto il tenant corrente

## Routing per Sottodominio (Avanzato)

Per il routing tenant basato su sottodominio (es. `tenant-a.example.com`):

1. Configurare il reverse proxy per aggiungere l'header `x-tenant-domain`
2. Creare i record tenant con i campi `domain` o `slug`:
    ```sql
    INSERT INTO tenant (id, name, domain, slug, status)
    VALUES ('uuid', 'Tenant A', 'tenant-a.example.com', 'tenant-a', 'active');
    ```
3. La strategia `resolveFromHeaders()` farà corrispondere il dominio e risolverà il tenant

## Schema della Tabella Tenant

```sql
CREATE TABLE tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  domain TEXT UNIQUE,
  slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
