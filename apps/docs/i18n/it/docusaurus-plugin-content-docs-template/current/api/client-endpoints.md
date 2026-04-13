---
id: client-endpoints
title: "Endpoint Client"
sidebar_label: "Endpoint Client"
---

# Endpoint Client

Gli endpoint client forniscono accesso alle funzionalità rivolte agli utenti, incluse la dashboard, la gestione degli elementi, le interazioni sui contenuti (commenti, voti, visualizzazioni), i preferiti, il profilo utente e i dati pubblici della directory.

## Percorso base

```
/api/client
```

## Riepilogo delle route

### Dashboard e Elementi Client

| Metodo  | Percorso                             | Auth   | Descrizione                              |
| ------- | ---------------------------------- | ------ | ---------------------------------------- |
| `GET`   | `/api/client/dashboard/stats`      | Utente | Statistiche della dashboard utente        |
| `GET`   | `/api/client/geo-stats`            | Utente | Distribuzione geografica degli elementi  |
| `GET`   | `/api/client/item-coordinates`     | Utente | Coordinate elementi per la mappa         |
| `GET`   | `/api/client/items`                | Utente | Elenca gli elementi dell'utente           |

### Interazioni pubbliche sugli elementi

| Metodo  | Percorso                                      | Auth    | Descrizione                          |
| ------- | ------------------------------------------- | ------- | ------------------------------------ |
| `GET`   | `/api/client/comments`                       | Nessuna | Elenca i commenti di un elemento     |
| `POST`  | `/api/client/comments`                       | Utente  | Aggiungi un commento a un elemento   |
| `PUT`   | `/api/client/comments/{id}`                  | Utente  | Aggiorna il proprio commento         |
| `DELETE`| `/api/client/comments/{id}`                  | Utente  | Elimina il proprio commento          |
| `POST`  | `/api/client/comments/{id}/rating`           | Utente  | Vota un commento (positivo/negativo) |
| `GET`   | `/api/client/comments/rating-stats`          | Nessuna | Statistiche di valutazione commenti  |
| `POST`  | `/api/client/votes`                          | Utente  | Vota un elemento                     |
| `POST`  | `/api/client/views`                          | Nessuna | Registra una visualizzazione elemento |
| `POST`  | `/api/client/engagement`                     | Nessuna | Traccia il coinvolgimento elemento   |

### Preferiti

| Metodo  | Percorso                         | Auth   | Descrizione                             |
| ------- | ------------------------------ | ------ | --------------------------------------- |
| `GET`   | `/api/client/favorites`        | Utente | Elenca i preferiti dell'utente          |
| `POST`  | `/api/client/favorites`        | Utente | Aggiungi elemento ai preferiti          |
| `DELETE`| `/api/client/favorites/{id}`   | Utente | Rimuovi elemento dai preferiti          |

### Profilo utente

| Metodo  | Percorso                    | Auth   | Descrizione                              |
| ------- | ------------------------- | ------ | ---------------------------------------- |
| `GET`   | `/api/client/profile`     | Utente | Ottieni il profilo dell'utente           |
| `PUT`   | `/api/client/profile`     | Utente | Aggiorna il profilo utente               |
| `DELETE`| `/api/client/profile`     | Utente | Elimina l'account dell'utente            |

### Utente corrente

| Metodo | Percorso               | Auth   | Descrizione                      |
| ------ | -------------------- | ------ | -------------------------------- |
| `GET`  | `/api/auth/me`       | Utente | Dati dell'utente autenticato     |

### Annunci sponsor utente

| Metodo  | Percorso                               | Auth   | Descrizione                                     |
| ------- | ------------------------------------ | ------ | ----------------------------------------------- |
| `GET`   | `/api/client/sponsor-ads`            | Utente | Elenca gli annunci sponsor dell'utente           |
| `POST`  | `/api/client/sponsor-ads`            | Utente | Invia un nuovo annuncio sponsor                  |
| `GET`   | `/api/client/sponsor-ads/{id}`       | Utente | Ottieni dettagli annuncio sponsor                |
| `PUT`   | `/api/client/sponsor-ads/{id}`       | Utente | Aggiorna annuncio sponsor                        |
| `DELETE`| `/api/client/sponsor-ads/{id}`       | Utente | Annulla annuncio sponsor                         |

### Sondaggi

| Metodo | Percorso                          | Auth    | Descrizione                              |
| ------ | -------------------------------- | ------- | ---------------------------------------- |
| `GET`  | `/api/client/surveys`            | Nessuna | Ottieni i sondaggi attivi                |
| `POST` | `/api/client/surveys/{id}/submit`| Utente  | Invia le risposte a un sondaggio         |

### Rapporti

| Metodo | Percorso              | Auth   | Descrizione                               |
| ------ | ------------------- | ------ | ----------------------------------------- |
| `POST` | `/api/client/reports`| Utente | Segnala un contenuto inappropriato        |

### Endpoint dati pubblici

| Metodo | Percorso                          | Auth    | Descrizione                            |
| ------ | -------------------------------- | ------- | -------------------------------------- |
| `GET`  | `/api/categories`                | Nessuna | Elenca tutte le categorie              |
| `GET`  | `/api/categories/exists`         | Nessuna | Verifica se una categoria esiste       |
| `GET`  | `/api/collections`               | Nessuna | Elenca tutte le collezioni             |
| `GET`  | `/api/collections/exists`        | Nessuna | Verifica se una collezione esiste      |
| `GET`  | `/api/tags`                      | Nessuna | Elenca tutti i tag                     |
| `GET`  | `/api/items/{slug}`              | Nessuna | Ottieni elemento pubblico per slug     |
| `GET`  | `/api/search`                    | Nessuna | Ricerca pubblica degli elementi        |

---

## Pattern di paginazione

Gli endpoint che restituiscono elenchi supportano i seguenti parametri di paginazione:

| Parametro   | Tipo    | Predefinito | Descrizione                  |
| ----------- | ------- | ------- | ---------------------------- |
| `page`      | intero | `1`     | Numero di pagina             |
| `limit`     | intero | `10`    | Risultati per pagina         |

La risposta include sempre i metadati di paginazione:

```json
{
  "success": true,
  "data": { ... },
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15
}
```

## Documentazione correlata

- [Endpoint API Client](./client-api-endpoints.md) -- dettagli degli endpoint dashboard e gestione elementi
- [Endpoint Autenticazione](./auth-endpoints.md) -- gestione sessioni e autenticazione
- [Endpoint Commenti](./comment-endpoints.md) -- dettagli del sistema di commenti
