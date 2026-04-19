---
id: admin-tags-endpoints
title: "Endpoint API Admin Tag"
sidebar_label: "Admin Tag"
---

# Endpoint API Admin Tag

L'API Tag gestisce i tag di classificazione dei contenuti, incluse creazione, aggiornamento, eliminazione e recupero da cache. I tag sono distinti dalle categorie e vengono usati per la classificazione secondaria degli elementi. Tutti gli endpoint richiedono l'autenticazione come amministratore.

## Percorso base

```
/api/admin/tags
```

## Riepilogo delle route

| Metodo   | Percorso                  | Auth  | Descrizione                                |
| -------- | ----------------------- | ----- | ------------------------------------------ |
| `GET`    | `/api/admin/tags`       | Amministratore | Elenca tag con paginazione                    |
| `POST`   | `/api/admin/tags`       | Amministratore | Crea un nuovo tag                          |
| `GET`    | `/api/admin/tags/all`   | Amministratore | Ottieni tutti i tag (dalla cache)          |
| `GET`    | `/api/admin/tags/{id}`  | Amministratore | Ottieni tag per ID                          |
| `PUT`    | `/api/admin/tags/{id}`  | Amministratore | Aggiorna tag                               |
| `DELETE` | `/api/admin/tags/{id}`  | Amministratore | Elimina tag                                |

---

## Elenca tag

```
GET /api/admin/tags
```

Restituisce un elenco paginato di tag con conteggi degli elementi associati.

**Parametri di query:**

| Parametro  | Tipo    | Predefinito | Descrizione                             |
| ---------- | ------- | ------- | --------------------------------------- |
| `page`     | intero | `1`     | Numero di pagina                            |
| `limit`    | intero | `10`    | Risultati per pagina (max 100)               |
| `search`   | stringa  | --      | Cerca tag per nome o slug               |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "tag_abc123",
        "name": "Open Source",
        "slug": "open-source",
        "description": "Free and open source software",
        "itemCount": 245,
        "createdAt": "2024-01-10T08:00:00.000Z"
      }
    ],
    "total": 89,
    "page": 1,
    "limit": 10,
    "totalPages": 9
  }
}
```

---

## Crea tag

```
POST /api/admin/tags
```

Crea un nuovo tag. I nomi e gli slug dei tag devono essere univoci.

**Corpo della richiesta:**

| Campo         | Tipo   | Richiesto | Descrizione                                  |
| ------------- | ------ | -------- | -------------------------------------------- |
| `name`        | stringa | Sì      | Nome visualizzato del tag                     |
| `slug`        | stringa | Sì      | Slug URL-friendly (deve essere univoco)        |
| `description` | stringa | No       | Descrizione opzionale del tag                 |

**Risposta (201):**

```json
{
  "success": true,
  "data": {
    "id": "tag_new123",
    "name": "AI Tools",
    "slug": "ai-tools",
    "description": "Artificial intelligence and machine learning tools",
    "itemCount": 0,
    "createdAt": "2024-01-20T10:00:00.000Z"
  }
}
```

---

## Ottieni tutti i tag (dalla cache)

```
GET /api/admin/tags/all
```

Restituisce tutti i tag senza paginazione. Usa la cache per ridurre il carico del database -- utile per i menu a tendina nella UI admin.

**Risposta (200):**

```json
{
  "success": true,
  "data": [
    { "id": "tag_1", "name": "Open Source", "slug": "open-source", "itemCount": 245 },
    { "id": "tag_2", "name": "AI Tools", "slug": "ai-tools", "itemCount": 112 },
    { "id": "tag_3", "name": "Free", "slug": "free", "itemCount": 389 }
  ]
}
```

---

## Ottieni / Aggiorna / Elimina tag

### Ottieni tag

```
GET /api/admin/tags/{id}
```

Restituisce i dettagli completi di un singolo tag, incluso il conteggio degli elementi che lo usano.

### Aggiorna tag

```
PUT /api/admin/tags/{id}
```

Aggiornamento parziale -- vengono modificati solo i campi forniti. Invalida automaticamente la cache dei tag.

**Corpo della richiesta (tutti i campi opzionali):**

```json
{
  "name": "AI & ML Tools",
  "slug": "ai-ml-tools",
  "description": "Artificial intelligence, machine learning and data science tools"
}
```

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "tag_abc123",
    "name": "AI & ML Tools",
    "slug": "ai-ml-tools",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  }
}
```

### Elimina tag

```
DELETE /api/admin/tags/{id}
```

Elimina definitivamente un tag. I tag utilizzati dagli elementi esistenti non possono essere eliminati finché non vengono dissociati dagli elementi.

**Risposta (200):**

```json
{ "success": true, "message": "Tag deleted successfully" }
```

---

## Modello dati tag

| Campo         | Tipo    | Descrizione                                     |
| ------------- | ------- | ----------------------------------------------- |
| `id`          | stringa  | Identificatore univoco                          |
| `name`        | stringa  | Nome visualizzato del tag                       |
| `slug`        | stringa  | Slug URL-friendly                               |
| `description` | stringa  | Descrizione opzionale                           |
| `itemCount`   | intero  | Numero di elementi che usano questo tag         |
| `createdAt`   | stringa  | Timestamp ISO 8601 di creazione                 |
| `updatedAt`   | stringa  | Timestamp ISO 8601 dell'ultimo aggiornamento    |

---

## Invalidazione della cache

La cache dei tag viene invalidata automaticamente quando:

- Viene creato un nuovo tag
- Un tag esistente viene aggiornato
- Un tag viene eliminato

L'invalidazione avviene tramite `revalidateTag('tags')` di Next.js.

---

## Sorgenti dei dati

| Sorgente             | Quando viene usata                                 |
| -------------------- | -------------------------------------------------- |
| Database (live)      | `GET /tags` con paginazione, `GET /tags/{id}`      |
| Cache Next.js        | `GET /tags/all` (cache ISR)                        |
| Scrittura database   | POST, PUT, DELETE (invalida la cache)              |

## Codici di errore

| Stato | Significato                                              |
| ------ | -------------------------------------------------------- |
| `400`  | Validazione fallita, slug/nome non valido               |
| `401`  | Autenticazione richiesta                                 |
| `403`  | Privilegi amministrativi richiesti                       |
| `404`  | Tag non trovato                                          |
| `409`  | Nome o slug tag già esistente, o tag in uso dagli elementi |
| `500`  | Errore interno del server                                |

## Documentazione correlata

- [Endpoint Categorie Admin](./admin-categories-endpoints.md) -- classificazione principale degli elementi
- [Endpoint Elementi Admin](./admin-items-endpoints.md) -- tag negli elementi
- [Endpoint Admin](./admin-endpoints.md) -- panoramica di tutti i gruppi di risorse admin
