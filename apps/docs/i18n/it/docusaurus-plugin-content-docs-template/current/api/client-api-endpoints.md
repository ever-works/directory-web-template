---
id: client-api-endpoints
title: "Endpoint API Client"
sidebar_label: "API Client"
---

# Endpoint API Client

L'API Client fornisce endpoint per i dati della dashboard utente, le statistiche geografiche, le coordinate degli elementi e la gestione degli elementi dell'utente. Tutti gli endpoint richiedono l'autenticazione dell'utente.

## Percorso base

```
/api/client
```

## Riepilogo delle route

| Metodo | Percorso                           | Auth   | Descrizione                                   |
| ------ | -------------------------------- | ------ | --------------------------------------------- |
| `GET`  | `/api/client/dashboard/stats`    | Utente | Ottieni le statistiche della dashboard        |
| `GET`  | `/api/client/geo-stats`          | Utente | Ottieni le statistiche geografiche            |
| `GET`  | `/api/client/item-coordinates`   | Utente | Ottieni le coordinate degli elementi per la mappa |
| `GET`  | `/api/client/items`              | Utente | Elenca gli elementi dell'utente               |

---

## Statistiche dashboard

```
GET /api/client/dashboard/stats
```

Restituisce le statistiche riepilogative per la dashboard dell'utente corrente.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "totalItems": 12,
    "publishedItems": 8,
    "pendingItems": 2,
    "draftItems": 2,
    "totalViews": 4521,
    "totalVotes": 234,
    "totalComments": 89,
    "totalFavorites": 156
  }
}
```

---

## Statistiche geografiche

```
GET /api/client/geo-stats
```

Restituisce la distribuzione geografica degli elementi dell'utente, inclusi i dati di copertura paese/città.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "byCountry": [
      { "country": "Italy", "count": 5 },
      { "country": "Germany", "count": 3 }
    ],
    "byCity": [
      { "city": "Rome", "count": 3 },
      { "city": "Milan", "count": 2 }
    ],
    "totalWithLocation": 8,
    "totalRemote": 4
  }
}
```

---

## Coordinate elementi

```
GET /api/client/item-coordinates
```

Restituisce le coordinate lat/lng di tutti gli elementi pubblicati dell'utente per la visualizzazione su mappa.

**Risposta (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "item_abc123",
      "name": "My Tool",
      "slug": "my-tool",
      "lat": 41.9028,
      "lng": 12.4964
    }
  ]
}
```

---

## Elenca elementi utente

```
GET /api/client/items
```

Restituisce un elenco paginato degli elementi dell'utente corrente con filtri e ordinamento.

**Parametri di query:**

| Parametro   | Tipo    | Predefinito  | Descrizione                                           |
| ----------- | ------- | ---------- | ----------------------------------------------------- |
| `page`      | intero | `1`        | Numero di pagina                                          |
| `limit`     | intero | `10`       | Risultati per pagina (max 50)                              |
| `status`    | stringa  | --         | Filtra per stato: `draft`, `pending`, `approved`, `rejected` |
| `search`    | stringa  | --         | Cerca per nome o descrizione                           |
| `sortBy`    | stringa  | `updated_at` | Campo di ordinamento: `name`, `updated_at`, `status`  |
| `sortOrder` | stringa  | `desc`     | Direzione: `asc` o `desc`                              |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item_abc123",
        "name": "My Awesome Tool",
        "slug": "my-awesome-tool",
        "status": "approved",
        "views": 342,
        "votes": 28,
        "createdAt": "2024-01-10T09:00:00.000Z",
        "updatedAt": "2024-01-18T14:30:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

---

## Esempi con curl

```bash
# Statistiche dashboard
curl -H "Cookie: session_token=YOUR_TOKEN" \
  https://yourdomain.com/api/client/dashboard/stats

# Elenca elementi
curl -H "Cookie: session_token=YOUR_TOKEN" \
  "https://yourdomain.com/api/client/items?status=approved&page=1"

# Coordinate elementi
curl -H "Cookie: session_token=YOUR_TOKEN" \
  https://yourdomain.com/api/client/item-coordinates
```

---

## Codici di errore

| Stato | Significato                                   |
| ------ | --------------------------------------------- |
| `401`  | Autenticazione richiesta                      |
| `500`  | Errore interno del server                     |

## Documentazione correlata

- [Endpoint Client](./client-endpoints.md) -- panoramica degli endpoint client
- [Endpoint Autenticazione](./auth-endpoints.md) -- gestione delle sessioni
- [Endpoint Admin Elementi](./admin-items-endpoints.md) -- gestione admin degli elementi
