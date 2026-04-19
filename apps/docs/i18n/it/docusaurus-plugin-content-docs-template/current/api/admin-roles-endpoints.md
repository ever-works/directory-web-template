---
id: admin-roles-endpoints
title: "Endpoint API Admin Ruoli"
sidebar_label: "Admin Ruoli"
---

# Endpoint API Admin Ruoli

L'API Ruoli gestisce il sistema di controllo degli accessi basato sui ruoli (RBAC), incluse la creazione dei ruoli, la gestione delle autorizzazioni e l'assegnazione agli utenti. Tutti gli endpoint richiedono l'autenticazione come amministratore.

## Percorso base

```
/api/admin/roles
```

## Riepilogo delle route

| Metodo   | Percorso                               | Auth  | Descrizione                           |
| -------- | ---------------------------------- | ----- | ------------------------------------- |
| `GET`    | `/api/admin/roles`                 | Amministratore | Elenca tutti i ruoli                     |
| `POST`   | `/api/admin/roles`                 | Amministratore | Crea un nuovo ruolo                   |
| `GET`    | `/api/admin/roles/active`          | Amministratore | Elenca solo i ruoli attivi             |
| `GET`    | `/api/admin/roles/stats`           | Amministratore | Ottieni le statistiche dei ruoli            |
| `GET`    | `/api/admin/roles/{id}`            | Amministratore | Ottieni dettagli del ruolo              |
| `PUT`    | `/api/admin/roles/{id}`            | Amministratore | Aggiorna ruolo                        |
| `DELETE` | `/api/admin/roles/{id}`            | Amministratore | Elimina (soft delete) ruolo           |
| `GET`    | `/api/admin/roles/{id}/permissions`| Amministratore | Ottieni le autorizzazioni del ruolo   |
| `PUT`    | `/api/admin/roles/{id}/permissions`| Amministratore | Aggiorna le autorizzazioni del ruolo  |

---

## Elenca ruoli

```
GET /api/admin/roles
```

Restituisce un elenco paginato di tutti i ruoli con conteggi degli utenti assegnati.

**Parametri di query:**

| Parametro | Tipo    | Predefinito | Descrizione                         |
| --------- | ------- | ------- | ----------------------------------- |
| `page`    | intero | `1`     | Numero di pagina                        |
| `limit`   | intero | `10`    | Risultati per pagina (max 100)           |
| `search`  | stringa  | --      | Cerca per nome o descrizione del ruolo |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "role_abc123",
        "name": "Editor",
        "description": "Can edit and publish content",
        "isActive": true,
        "isDefault": false,
        "userCount": 5,
        "createdAt": "2024-01-15T09:00:00.000Z"
      }
    ],
    "total": 8,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## Crea ruolo

```
POST /api/admin/roles
```

Crea un nuovo ruolo con autorizzazioni opzionali. I nomi dei ruoli devono essere univoci.

**Corpo della richiesta:**

| Campo         | Tipo     | Richiesto | Descrizione                                      |
| ------------- | -------- | -------- | ------------------------------------------------ |
| `name`        | stringa   | Sì      | Nome univoco del ruolo                            |
| `description` | stringa   | No       | Descrizione del ruolo                            |
| `isActive`    | booleano  | No       | Se il ruolo è attivo (predefinito: `true`)        |
| `isDefault`   | booleano  | No       | Se è il ruolo predefinito per i nuovi utenti    |
| `permissions` | stringa[] | No       | Array di stringhe di autorizzazioni              |

**Risposta (201):**

```json
{
  "success": true,
  "data": {
    "id": "role_new123",
    "name": "Moderator",
    "description": "Can moderate content",
    "isActive": true,
    "isDefault": false,
    "createdAt": "2024-01-20T10:00:00.000Z"
  }
}
```

---

## Ottieni ruoli attivi

```
GET /api/admin/roles/active
```

Restituisce solo i ruoli dove `isActive: true`. Utile per i menu a tendina di assegnazione ruoli.

**Risposta (200):**

```json
{
  "success": true,
  "data": [
    { "id": "role_1", "name": "Admin", "isDefault": false },
    { "id": "role_2", "name": "Editor", "isDefault": true }
  ]
}
```

---

## Ottieni statistiche ruoli

```
GET /api/admin/roles/stats
```

Restituisce i conteggi aggregati dei ruoli.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "total": 8,
    "active": 6,
    "inactive": 2,
    "default": 1
  }
}
```

---

## Ottieni / Aggiorna / Elimina ruolo

### Ottieni ruolo

```
GET /api/admin/roles/{id}
```

Restituisce i dettagli completi di un ruolo incluse le autorizzazioni associate e il conteggio degli utenti.

### Aggiorna ruolo

```
PUT /api/admin/roles/{id}
```

Aggiorna i metadati di un ruolo. Tutti i campi sono opzionali -- vengono modificati solo i campi forniti.

**Corpo della richiesta (tutti i campi opzionali):**

```json
{
  "name": "Senior Editor",
  "description": "Can edit, publish and manage other editors",
  "isActive": true,
  "isDefault": false
}
```

### Elimina ruolo

```
DELETE /api/admin/roles/{id}
```

Esegue un soft delete del ruolo impostando `isActive: false`. I ruoli con utenti assegnati non possono essere eliminati finché gli utenti non vengono riassegnati.

**Risposta (200):**

```json
{ "success": true, "message": "Role deleted successfully" }
```

---

## Autorizzazioni del ruolo

### Ottieni autorizzazioni

```
GET /api/admin/roles/{id}/permissions
```

Restituisce l'elenco completo delle autorizzazioni associate a un ruolo.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "roleId": "role_abc123",
    "permissions": [
      "items:read",
      "items:write",
      "comments:moderate",
      "users:read"
    ]
  }
}
```

### Aggiorna autorizzazioni

```
PUT /api/admin/roles/{id}/permissions
```

Sostituisce l'intero set di autorizzazioni per un ruolo.

**Corpo della richiesta:**

```json
{
  "permissions": [
    "items:read",
    "items:write",
    "comments:read",
    "comments:moderate"
  ]
}
```

**Risposta (200):**

```json
{
  "success": true,
  "message": "Permissions updated successfully",
  "data": {
    "roleId": "role_abc123",
    "permissions": ["items:read", "items:write", "comments:read", "comments:moderate"]
  }
}
```

---

## Regole di validazione

| Campo       | Regola                                                     |
| ----------- | --------------------------------------------------------- |
| `name`      | Obbligatorio per la creazione; deve essere univoco         |
| `isActive`  | Booleano                                                  |
| `isDefault` | Solo un ruolo può avere `isDefault: true`                 |
| Eliminazione| Bloccata se ci sono utenti con il ruolo assegnato         |

## Codici di errore

| Stato | Significato                                          |
| ------ | ---------------------------------------------------- |
| `400`  | Validazione fallita, nome mancante o non univoco     |
| `401`  | Autenticazione richiesta                             |
| `403`  | Privilegi amministrativi richiesti                   |
| `404`  | Ruolo non trovato                                    |
| `409`  | Nome del ruolo già esistente                         |
| `500`  | Errore interno del server                            |

## Documentazione correlata

- [Endpoint Utenti Admin](./admin-users-endpoints.md) -- assegna ruoli agli utenti
- [Endpoint Admin](./admin-endpoints.md) -- panoramica di tutti i gruppi di risorse admin
