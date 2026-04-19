---
id: admin-clients-endpoints
title: "Endpoint API Admin Clienti"
sidebar_label: "Admin Clienti"
---

# Endpoint API Admin Clienti

L'API Clienti fornisce endpoint per la gestione dei profili cliente, incluse creazione, aggiornamenti, ricerca avanzata, operazioni bulk, analisi della dashboard e statistiche complete. I clienti rappresentano profili utente collegati agli account di autenticazione. Tutti gli endpoint richiedono l'autenticazione come amministratore.

## Percorso base

```
/api/admin/clients
```

## Riepilogo delle route

| Metodo   | Percorso                                    | Auth  | Descrizione                          |
| -------- | --------------------------------------- | ----- | ------------------------------------ |
| `GET`    | `/api/admin/clients`                    | Amministratore | Ottieni elenco clienti paginato           |
| `POST`   | `/api/admin/clients`                    | Amministratore | Crea un nuovo profilo cliente          |
| `GET`    | `/api/admin/clients/stats`              | Amministratore | Ottieni statistiche complete dei clienti  |
| `GET`    | `/api/admin/clients/dashboard`          | Amministratore | Ottieni dati combinati della dashboard          |
| `GET`    | `/api/admin/clients/advanced-search`    | Amministratore | Ricerca avanzata multi-filtro         |
| `PUT`    | `/api/admin/clients/bulk`               | Amministratore | Aggiornamento bulk dei profili cliente          |
| `DELETE` | `/api/admin/clients/bulk`               | Amministratore | Eliminazione bulk dei profili cliente          |
| `GET`    | `/api/admin/clients/{clientId}`         | Amministratore | Ottieni cliente per ID                     |
| `PUT`    | `/api/admin/clients/{clientId}`         | Amministratore | Aggiorna profilo cliente                |
| `DELETE` | `/api/admin/clients/{clientId}`         | Amministratore | Elimina profilo cliente                |

---

## Elenca clienti

```
GET /api/admin/clients
```

Restituisce un elenco paginato di profili cliente con filtri base.

**Parametri di query:**

| Parametro     | Tipo    | Predefinito | Descrizione                                            |
| ------------- | ------- | ------- | ------------------------------------------------------ |
| `page`        | intero | `1`     | Numero di pagina (minimo: 1)                                |
| `limit`       | intero | `10`    | Risultati per pagina (1--100)                               |
| `search`      | stringa  | --      | Cerca per nome o email                                 |
| `status`      | stringa  | --      | Filtro: `active`, `inactive`, `suspended`, `trial`      |
| `plan`        | stringa  | --      | Filtro: `free`, `standard`, `premium`                   |
| `accountType` | stringa  | --      | Filtro: `individual`, `business`, `enterprise`          |
| `provider`    | stringa  | --      | Filtro per provider di autenticazione                       |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client_123abc",
        "displayName": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Tech Corp Inc",
        "status": "active",
        "plan": "premium",
        "accountType": "business",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastActiveAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10
  }
}
```

---

## Crea cliente

```
POST /api/admin/clients
```

Crea un nuovo profilo cliente. Se non esiste un account utente per l'email fornita, viene creato automaticamente un nuovo utente con una password temporanea. Attiva la sincronizzazione CRM quando abilitata.

**Corpo della richiesta:**

| Campo            | Tipo    | Richiesto | Descrizione                                  |
| ---------------- | ------- | -------- | -------------------------------------------- |
| `email`          | stringa  | Sì      | Indirizzo email del cliente                         |
| `displayName`    | stringa  | No       | Nome visualizzato (predefinito: prefisso email)      |
| `username`       | stringa  | No       | Nome utente univoco                              |
| `bio`            | stringa  | No       | Biografia del cliente                             |
| `jobTitle`       | stringa  | No       | Titolo professionale                                    |
| `company`        | stringa  | No       | Nome dell'azienda                                 |
| `industry`       | stringa  | No       | Settore industriale                              |
| `phone`          | stringa  | No       | Numero di telefono                                  |
| `website`        | stringa  | No       | URL del sito web                                  |
| `location`       | stringa  | No       | Posizione                                     |
| `accountType`    | stringa  | No       | `individual` (predefinito), `business`, `enterprise` |
| `status`         | stringa  | No       | `active` (predefinito), `inactive`, `suspended`, `trial` |
| `plan`           | stringa  | No       | `free` (predefinito), `standard`, `premium`      |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "client_789ghi",
    "displayName": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "plan": "premium",
    "accountType": "business",
    "createdAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Client created successfully"
}
```

---

## Ottieni statistiche clienti

```
GET /api/admin/clients/stats
```

Restituisce analisi complete su tutti i clienti, raggruppate per panoramica, crescita, piani, tipi di account, coinvolgimento, dati demografici e provider di autenticazione.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 1247,
      "activeClients": 1156,
      "inactiveClients": 67,
      "suspendedClients": 24,
      "trialClients": 89
    },
    "growth": {
      "newClientsToday": 3,
      "newClientsThisWeek": 18,
      "newClientsThisMonth": 45,
      "growthRate": 3.8
    },
    "plans": {
      "free": 856,
      "standard": 267,
      "premium": 124,
      "conversionRate": 31.4
    },
    "accountTypes": {
      "individual": 789,
      "business": 356,
      "enterprise": 102
    },
    "engagement": {
      "averageSubmissions": 12.5,
      "totalSubmissions": 15587,
      "activeThisWeek": 892,
      "activeThisMonth": 1034
    },
    "demographics": {
      "topCountries": [{ "country": "United States", "count": 456 }],
      "topCompanies": [{ "company": "Tech Corp Inc", "count": 25 }],
      "topIndustries": [{ "industry": "Technology", "count": 234 }]
    },
    "providers": { "google": 567, "github": 234, "email": 446 }
  }
}
```

---

## Dashboard

```
GET /api/admin/clients/dashboard
```

Restituisce una risposta combinata con un elenco clienti paginato, statistiche aggregate e metadati di paginazione. Supporta tutti i filtri di base più i parametri di intervallo di date.

**Parametri di query aggiuntivi (oltre ai parametri dell'elenco):**

| Parametro       | Tipo   | Descrizione                                |
| --------------- | ------ | ------------------------------------------ |
| `createdAfter`  | stringa | Data ISO o `YYYY-MM-DD` -- creato dopo  |
| `createdBefore` | stringa | Data ISO o `YYYY-MM-DD` -- creato prima |

---

## Ricerca avanzata

```
GET /api/admin/clients/advanced-search
```

Esegue una ricerca multidimensionale nei profili cliente. Oltre ai filtri dell'elenco base, supporta ricerche per campo specifico, intervalli numerici, flag booleani e intervalli di date. Restituisce metadati di ricerca inclusi i filtri applicati e il tempo di esecuzione.

**Parametri di query aggiuntivi:**

| Parametro          | Tipo    | Descrizione                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `sortBy`           | stringa  | `createdAt`, `updatedAt`, `name`, `email`, `company`, `totalSubmissions` |
| `sortOrder`        | stringa  | `asc` o `desc`                                |
| `createdAfter`     | stringa  | Filtro data-ora ISO                           |
| `createdBefore`    | stringa  | Filtro data-ora ISO                           |
| `emailDomain`      | stringa  | Filtro per dominio email (es. `example.com`)   |
| `companySearch`    | stringa  | Ricerca nei nomi azienda                    |
| `locationSearch`   | stringa  | Ricerca nelle posizioni                        |
| `industrySearch`   | stringa  | Ricerca nei settori industriali                       |
| `minSubmissions`   | intero | Numero minimo di sottomissioni                       |
| `maxSubmissions`   | intero | Numero massimo di sottomissioni                       |
| `emailVerified`    | booleano | Filtro per stato di verifica email            |
| `twoFactorEnabled` | booleano | Filtro per stato 2FA                          |
| `hasAvatar`        | booleano | Filtra clienti con/senza avatar             |
| `hasWebsite`       | booleano | Filtra clienti con/senza sito web            |
| `hasPhone`         | booleano | Filtra clienti con/senza telefono              |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "clients": [{ "id": "client_123abc", "...": "..." }],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 },
    "searchMetadata": {
      "appliedFilters": { "status": "active", "plan": "premium" },
      "searchTime": 45.2
    }
  }
}
```

---

## Operazioni bulk

### Aggiornamento bulk

```
PUT /api/admin/clients/bulk
```

Aggiorna più profili cliente in una singola richiesta. Ogni oggetto cliente deve includere un campo `id` più i campi da aggiornare. I singoli fallimenti non interrompono l'intero batch.

**Corpo della richiesta:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### Eliminazione bulk

```
DELETE /api/admin/clients/bulk
```

Elimina definitivamente più profili cliente. Ogni oggetto nell'array deve includere un campo `id`.

**Corpo della richiesta:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**Risposta (200) -- entrambi gli endpoint bulk:**

```json
{
  "success": true,
  "message": "Bulk update completed: 2 successful, 1 failed",
  "results": [{ "index": 0, "success": true }],
  "errors": [{ "index": 2, "error": "Client not found" }],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Ottieni / Aggiorna / Elimina cliente

### Ottieni cliente

```
GET /api/admin/clients/{clientId}
```

Restituisce il profilo cliente completo, inclusi nome visualizzato, azienda, piano, tipo di account e timestamp di attività.

### Aggiorna cliente

```
PUT /api/admin/clients/{clientId}
```

Aggiornamento parziale -- vengono modificati solo i campi forniti. Attiva la sincronizzazione CRM quando cambiano i dati aziendali o del profilo.

**Corpo della richiesta (tutti i campi opzionali):**

```json
{
  "displayName": "John Doe Updated",
  "username": "johndoe_updated",
  "bio": "Senior Developer",
  "jobTitle": "Lead Developer",
  "company": "Tech Corp Inc",
  "status": "active",
  "plan": "premium",
  "accountType": "business"
}
```

### Elimina cliente

```
DELETE /api/admin/clients/{clientId}
```

Elimina definitivamente un profilo cliente. Questa azione non può essere annullata.

**Risposta (200):**

```json
{ "success": true, "message": "Client deleted successfully" }
```
