---
id: comment-endpoints
title: "Endpoint Commenti"
sidebar_label: "Commenti"
---

# Endpoint Commenti

L'API Commenti gestisce i commenti degli utenti sugli elementi della directory, incluse la creazione, la moderazione e il sistema di valutazione dei commenti. Gli endpoint pubblici non richiedono autenticazione; gli endpoint autenticati richiedono una sessione utente valida; gli endpoint admin richiedono il ruolo amministratore.

## Percorso base

```
/api/client/comments
```

## Riepilogo delle route

### Endpoint pubblici

| Metodo | Percorso                                    | Auth    | Descrizione                             |
| ------ | ----------------------------------------- | ------- | --------------------------------------- |
| `GET`  | `/api/client/comments`                    | Nessuna | Elenca i commenti di un elemento        |
| `GET`  | `/api/client/comments/rating-stats`       | Nessuna | Statistiche di valutazione commenti     |

### Endpoint autenticati

| Metodo  | Percorso                                | Auth   | Descrizione                              |
| ------- | ------------------------------------- | ------ | ---------------------------------------- |
| `POST`  | `/api/client/comments`                | Utente | Crea un nuovo commento                   |
| `PUT`   | `/api/client/comments/{id}`           | Utente | Aggiorna il proprio commento             |
| `DELETE`| `/api/client/comments/{id}`           | Utente | Elimina il proprio commento              |
| `POST`  | `/api/client/comments/{id}/rating`    | Utente | Aggiungi o aggiorna la valutazione       |

### Endpoint admin

| Metodo  | Percorso                              | Auth  | Descrizione                          |
| ------- | ----------------------------------- | ----- | ------------------------------------ |
| `GET`   | `/api/admin/comments`               | Amministratore | Elenca tutti i commenti con filtri   |
| `GET`   | `/api/admin/comments/{id}`          | Amministratore | Ottieni dettagli commento            |
| `PUT`   | `/api/admin/comments/{id}`          | Amministratore | Aggiorna/modera commento             |
| `DELETE`| `/api/admin/comments/{id}`          | Amministratore | Elimina qualsiasi commento           |

---

## Elenca commenti elemento

```
GET /api/client/comments?itemId={itemId}
```

Restituisce un elenco paginato di commenti approvati per un elemento specifico.

**Parametri di query:**

| Parametro | Tipo    | Predefinito | Descrizione                              |
| --------- | ------- | ------- | ---------------------------------------- |
| `itemId`  | stringa  | --      | Obbligatorio. ID dell'elemento           |
| `page`    | intero | `1`     | Numero di pagina                         |
| `limit`   | intero | `10`    | Risultati per pagina (max 50)            |
| `sortBy`  | stringa  | `created_at` | Campo di ordinamento               |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_abc123",
        "content": "This is a great tool!",
        "authorName": "John Doe",
        "authorAvatar": "https://example.com/avatar.jpg",
        "upvotes": 12,
        "downvotes": 1,
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

## Statistiche di valutazione

```
GET /api/client/comments/rating-stats?itemId={itemId}
```

Restituisce le statistiche aggregate di valutazione (positivo/negativo) per i commenti di un elemento.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "itemId": "item_abc123",
    "totalComments": 45,
    "totalUpvotes": 234,
    "totalDownvotes": 12,
    "averageRating": 4.2
  }
}
```

---

## Crea commento

```
POST /api/client/comments
```

Aggiunge un nuovo commento a un elemento. I commenti vengono messi in attesa di moderazione prima di essere pubblicati (se la moderazione dei commenti è abilitata).

**Corpo della richiesta:**

| Campo    | Tipo   | Richiesto | Descrizione                              |
| -------- | ------ | -------- | ---------------------------------------- |
| `itemId` | stringa | Sì      | ID dell'elemento a cui aggiungere il commento |
| `content`| stringa | Sì      | Testo del commento (max 2000 caratteri)  |

**Risposta (201):**

```json
{
  "success": true,
  "data": {
    "id": "comment_new123",
    "content": "This is a great tool!",
    "status": "pending",
    "createdAt": "2024-01-20T11:00:00.000Z"
  },
  "message": "Comment submitted for review"
}
```

---

## Aggiorna commento

```
PUT /api/client/comments/{id}
```

Permette all'autore del commento di aggiornare il contenuto. Solo i commenti in stato `pending` o `approved` possono essere aggiornati. I commenti aggiornati tornano in stato `pending` per rimoderare.

**Corpo della richiesta:**

```json
{ "content": "Updated comment text." }
```

---

## Elimina commento

```
DELETE /api/client/comments/{id}
```

Permette all'autore del commento di eliminare il proprio commento.

**Risposta (200):**

```json
{ "success": true, "message": "Comment deleted successfully" }
```

---

## Valuta commento

```
POST /api/client/comments/{id}/rating
```

Aggiunge o aggiorna il voto (positivo/negativo) dell'utente per un commento. Ogni utente può esprimere un solo voto per commento.

**Corpo della richiesta:**

| Campo   | Tipo   | Richiesto | Descrizione                     |
| ------- | ------ | -------- | ------------------------------- |
| `value` | intero | Sì      | `1` per positivo, `-1` per negativo |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "commentId": "comment_abc123",
    "upvotes": 13,
    "downvotes": 1,
    "userVote": 1
  }
}
```

---

## Endpoint admin commenti

### Elenca tutti i commenti

```
GET /api/admin/comments
```

Restituisce tutti i commenti con filtri per stato di moderazione.

**Parametri di query:**

| Parametro | Tipo   | Predefinito | Descrizione                                     |
| --------- | ------ | ------- | ----------------------------------------------- |
| `page`    | intero | `1`    | Numero di pagina                                    |
| `limit`   | intero | `20`   | Risultati per pagina                                |
| `status`  | stringa | --     | Filtro: `pending`, `approved`, `rejected`       |
| `itemId`  | stringa | --     | Filtra per ID elemento                          |

### Ottieni / Aggiorna / Elimina commento (Admin)

```
GET    /api/admin/comments/{id}
PUT    /api/admin/comments/{id}
DELETE /api/admin/comments/{id}
```

Gli admin possono approvare, rifiutare o eliminare qualsiasi commento.

**Corpo della richiesta per l'aggiornamento:**

```json
{
  "status": "approved",
  "moderationNote": "Approved after review"
}
```

---

## Codici di errore

| Stato | Significato                                              |
| ------ | -------------------------------------------------------- |
| `400`  | Validazione fallita, contenuto mancante o troppo lungo   |
| `401`  | Autenticazione richiesta per gli endpoint autenticati    |
| `403`  | Permesso negato (es. non autore del commento)            |
| `404`  | Commento non trovato                                     |
| `500`  | Errore interno del server                                |

## Documentazione correlata

- [Endpoint Commenti Admin](./admin-comments-endpoints.md) -- moderazione admin dei commenti
- [Endpoint Client](./client-endpoints.md) -- panoramica degli endpoint client
- [Endpoint Elementi Admin](./admin-items-endpoints.md) -- gestione degli elementi
