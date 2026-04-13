---
id: admin-items-endpoints
title: "Endpoint API Admin Elementi"
sidebar_label: "Admin Elementi"
---

# Endpoint API Admin Elementi

L'API Elementi fornisce endpoint per la gestione degli elenchi della directory, incluse creazione, aggiornamenti, flussi di lavoro di revisione (approva/rifiuta), cronologia di audit, operazioni bulk e statistiche. Gli elementi seguono un ciclo di vita con gli stati `draft`, `pending`, `approved` e `rejected`. Tutti gli endpoint richiedono l'autenticazione come amministratore.

## Percorso base

```
/api/admin/items
```

## Riepilogo delle route

| Metodo   | Percorso                                  | Auth  | Descrizione                          |
| -------- | ------------------------------------- | ----- | ------------------------------------ |
| `GET`    | `/api/admin/items`                    | Amministratore | Ottieni elenco elementi paginato             |
| `POST`   | `/api/admin/items`                    | Amministratore | Crea un nuovo elemento                    |
| `GET`    | `/api/admin/items/stats`              | Amministratore | Ottieni statistiche degli elementi                  |
| `POST`   | `/api/admin/items/bulk`               | Amministratore | Approva, rifiuta o elimina in bulk      |
| `GET`    | `/api/admin/items/{id}`               | Amministratore | Ottieni elemento per ID                       |
| `PUT`    | `/api/admin/items/{id}`               | Amministratore | Aggiorna elemento                          |
| `DELETE` | `/api/admin/items/{id}`               | Amministratore | Elimina elemento definitivamente              |
| `POST`   | `/api/admin/items/{id}/review`        | Amministratore | Approva o rifiuta un elemento            |
| `GET`    | `/api/admin/items/{id}/history`       | Amministratore | Ottieni la cronologia di audit dell'elemento               |

---

## Elenca elementi

```
GET /api/admin/items
```

Restituisce un elenco paginato di elementi con ricerca, filtri per stato/categoria/tag e ordinamento.

**Parametri di query:**

| Parametro    | Tipo    | Predefinito      | Descrizione                                              |
| ------------ | ------- | ------------ | -------------------------------------------------------- |
| `page`       | intero | `1`          | Numero di pagina (minimo: 1)                                  |
| `limit`      | intero | `10`         | Risultati per pagina (1--100)                                 |
| `search`     | stringa  | --           | Cerca elementi per nome o descrizione                       |
| `status`     | stringa  | --           | Filtro: `draft`, `pending`, `approved`, `rejected`        |
| `categories` | stringa  | --           | Slug di categorie separati da virgola                            |
| `tags`       | stringa  | --           | Slug di tag separati da virgola                                 |
| `sortBy`     | stringa  | `updated_at` | Campo di ordinamento: `name`, `updated_at`, `status`, `submitted_at`|
| `sortOrder`  | stringa  | `desc`       | Direzione di ordinamento: `asc` o `desc`                           |

**Risposta (200):**

```json
{
  "success": true,
  "items": [
    {
      "id": "item_123abc",
      "name": "Awesome Productivity Tool",
      "slug": "awesome-productivity-tool",
      "description": "A powerful tool to boost your productivity",
      "source_url": "https://example.com/tool",
      "category": ["productivity", "business"],
      "tags": ["saas", "productivity"],
      "featured": true,
      "icon_url": "https://example.com/icon.png",
      "status": "approved",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Crea elemento

```
POST /api/admin/items
```

Crea un nuovo elemento con controlli duplicati sia sull'ID che sullo slug. Attiva la sincronizzazione CRM (se abilitata) e l'indicizzazione delle posizioni (se abilitata).

**Corpo della richiesta:**

| Campo        | Tipo     | Richiesto | Descrizione                                    |
| ------------ | -------- | -------- | ---------------------------------------------- |
| `id`         | stringa   | Sì      | Identificatore univoco dell'elemento                         |
| `name`       | stringa   | Sì      | Nome dell'elemento                                      |
| `slug`       | stringa   | Sì      | Slug URL-friendly (deve essere univoco)             |
| `description`| stringa   | Sì      | Descrizione dell'elemento                               |
| `source_url` | stringa   | Sì      | URL sorgente dell'elemento                          |
| `category`   | stringa[] | No       | Array di slug di categorie                        |
| `tags`       | stringa[] | No       | Array di slug di tag                             |
| `brand`      | stringa   | No       | Nome del brand (usato per la sincronizzazione CRM dell'azienda)         |
| `featured`   | booleano  | No       | Flag di evidenza (predefinito: `false`)               |
| `icon_url`   | stringa   | No       | URL dell'icona                                       |
| `status`     | stringa   | No       | Stato iniziale (predefinito: `draft`)              |
| `location`   | oggetto   | No       | Dati di posizione per la geo-indicizzazione                 |

**Risposta (201):**

```json
{
  "success": true,
  "item": {
    "id": "item_123abc",
    "name": "Awesome Productivity Tool",
    "slug": "awesome-productivity-tool",
    "status": "draft",
    "created_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Item created successfully"
}
```

---

## Ottieni statistiche elementi

```
GET /api/admin/items/stats
```

Restituisce i conteggi per stato. Supporta filtri opzionali per delimitare le statistiche.

**Parametri di query:**

| Parametro    | Tipo   | Descrizione                        |
| ------------ | ------ | ---------------------------------- |
| `search`     | stringa | Filtra le statistiche per termine di ricerca        |
| `categories` | stringa | Slug di categorie separati da virgola     |
| `tags`       | stringa | Slug di tag separati da virgola          |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "total": 1247,
    "draft": 45,
    "pending": 23,
    "approved": 1156,
    "rejected": 23
  }
}
```

---

## Azioni bulk

```
POST /api/admin/items/bulk
```

Esegue l'approvazione, il rifiuto o l'eliminazione bulk su un massimo di 100 elementi. Ogni elemento viene elaborato individualmente; i fallimenti parziali non interrompono l'intera operazione. Invia notifiche email ai mittenti in caso di approvazione/rifiuto.

**Corpo della richiesta:**

| Campo    | Tipo     | Richiesto           | Descrizione                                          |
| -------- | -------- | ------------------ | ---------------------------------------------------- |
| `action` | stringa   | Sì                | `approve`, `reject` o `delete`                     |
| `ids`    | stringa[] | Sì                | ID degli elementi da elaborare (1--100, nessun duplicato)          |
| `reason` | stringa   | Sì (per `reject`) | Motivo del rifiuto (minimo 10 caratteri)             |

**Risposta (200):**

```json
{
  "success": true,
  "message": "Bulk approve completed: 3 approved, 0 failed",
  "results": [
    { "id": "item_1", "success": true },
    { "id": "item_2", "success": true },
    { "id": "item_3", "success": false, "error": "Item not found" }
  ],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Ottieni / Aggiorna / Elimina elemento

### Ottieni elemento

```
GET /api/admin/items/{id}
```

Restituisce i dettagli completi dell'elemento inclusi metadati, categorie, tag, note di revisione e metriche di coinvolgimento.

### Aggiorna elemento

```
PUT /api/admin/items/{id}
```

Aggiornamento parziale -- vengono modificati solo i campi forniti. Attiva la sincronizzazione CRM quando viene fornito `brand` e la ri-indicizzazione delle posizioni quando cambiano i dati di posizione.

**Corpo della richiesta (tutti i campi opzionali):**

```json
{
  "name": "Updated Tool Name",
  "slug": "updated-tool-name",
  "description": "Updated description",
  "source_url": "https://example.com/updated",
  "category": ["productivity", "automation"],
  "tags": ["saas", "ai"],
  "brand": "Acme Corp",
  "featured": true,
  "icon_url": "https://example.com/new-icon.png",
  "status": "approved"
}
```

### Elimina elemento

```
DELETE /api/admin/items/{id}
```

Elimina definitivamente un elemento e lo rimuove dall'indice delle posizioni (se abilitato). Questa azione non può essere annullata.

**Risposta (200):**

```json
{ "success": true, "message": "Item deleted successfully" }
```

---

## Revisiona elemento

```
POST /api/admin/items/{id}/review
```

Approva o rifiuta un elemento. Registra la decisione di revisione con note opzionali. Invia una notifica email al mittente originale (se il mittente è un utente registrato).

**Corpo della richiesta:**

| Campo          | Tipo   | Richiesto | Descrizione                          |
| -------------- | ------ | -------- | ------------------------------------ |
| `status`       | stringa | Sì      | `approved` o `rejected`             |
| `review_notes` | stringa | No       | Spiegazione della decisione di revisione   |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "item_123abc",
    "status": "approved",
    "review_notes": "Great tool, approved for listing.",
    "reviewed_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Item approved successfully"
}
```

---

## Ottieni cronologia di audit elemento

```
GET /api/admin/items/{id}/history
```

Restituisce la traccia di audit completa per un elemento, incluse creazione, aggiornamenti, cambi di stato, revisioni, eliminazioni e ripristini.

**Parametri di query:**

| Parametro | Tipo    | Predefinito | Descrizione                                                            |
| --------- | ------- | ------- | ---------------------------------------------------------------------- |
| `page`    | intero | `1`     | Numero di pagina                                                             |
| `limit`   | intero | `20`    | Risultati per pagina (max 100)                                              |
| `action`  | stringa  | --      | Filtro separato da virgola: `created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored` |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_abc123",
        "itemId": "awesome-tool",
        "action": "reviewed",
        "previousStatus": "pending",
        "newStatus": "approved",
        "performedByName": "Admin User",
        "notes": "Approved for listing",
        "createdAt": "2024-01-20T16:45:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## Regole di validazione

| Campo        | Regola                                                       |
| ------------ | ---------------------------------------------------------- |
| `id`         | Obbligatorio; deve essere univoco tra tutti gli elementi                  |
| `name`       | Obbligatorio per la creazione                                      |
| `slug`       | Obbligatorio; deve essere univoco tra tutti gli elementi                  |
| `description`| Obbligatorio per la creazione                                      |
| `source_url` | Obbligatorio per la creazione; formato URL valido                    |
| `status`     | Deve essere `draft`, `pending`, `approved` o `rejected`      |
| `reason`     | Obbligatorio per il rifiuto bulk; minimo 10 caratteri            |
| `ids`        | Bulk: 1--100 stringhe non vuote univoche                      |
| `action`     | Filtro cronologia: solo tipi di azione di audit validi              |

## Codici di errore

| Stato | Significato                                                  |
| ------ | -------------------------------------------------------- |
| `400`  | Errore di validazione, parametri non validi, campi mancanti     |
| `401`  | Autenticazione richiesta                                   |
| `403`  | Privilegi amministrativi richiesti                                 |
| `404`  | Elemento non trovato                                            |
| `409`  | ID o slug elemento duplicato                                 |
| `500`  | Errore interno del server                                     |

## Documentazione correlata

- [API Ruoli Admin](./admin-roles-endpoints.md) -- gestisci i ruoli assegnati agli utenti
- [API Utenti Admin](./admin-users-endpoints.md) -- gestione degli account utente
- [Autenticazione](../architecture/nextauth-configuration.md) -- gestione delle sessioni e guardie
