---
id: admin-users-endpoints
title: "Endpoint API Admin Utenti"
sidebar_label: "Admin Utenti"
---

# Endpoint API Admin Utenti

L'API Utenti Admin fornisce endpoint per la gestione degli account utente, incluse creazione, aggiornamento, eliminazione e verifica della disponibilità di email e nome utente. Tutti gli endpoint richiedono l'autenticazione come amministratore.

## Percorso base

```
/api/admin/users
```

## Riepilogo delle route

| Metodo   | Percorso                               | Auth  | Descrizione                                     |
| -------- | ---------------------------------- | ----- | ----------------------------------------------- |
| `GET`    | `/api/admin/users`                 | Amministratore | Elenca utenti con paginazione                    |
| `POST`   | `/api/admin/users`                 | Amministratore | Crea un nuovo utente                            |
| `GET`    | `/api/admin/users/stats`           | Amministratore | Ottieni le statistiche degli utenti              |
| `GET`    | `/api/admin/users/check-email`     | Amministratore | Verifica disponibilità email                    |
| `GET`    | `/api/admin/users/check-username`  | Amministratore | Verifica disponibilità nome utente              |
| `GET`    | `/api/admin/users/{id}`            | Amministratore | Ottieni dettagli utente                         |
| `PUT`    | `/api/admin/users/{id}`            | Amministratore | Aggiorna utente                                 |
| `DELETE` | `/api/admin/users/{id}`            | Amministratore | Elimina utente (soft delete)                    |

---

## Elenca utenti

```
GET /api/admin/users
```

Restituisce un elenco paginato di utenti con ricerca, filtri per ruolo e stato, e opzioni di ordinamento.

**Parametri di query:**

| Parametro   | Tipo    | Predefinito  | Descrizione                                                    |
| ----------- | ------- | ---------- | -------------------------------------------------------------- |
| `page`      | intero | `1`        | Numero di pagina                                                   |
| `limit`     | intero | `10`       | Risultati per pagina (max 100)                                      |
| `search`    | stringa  | --         | Cerca per nome, email o nome utente                             |
| `role`      | stringa  | --         | Filtra per ID ruolo                                             |
| `isActive`  | booleano | --         | Filtra per stato attivo/inattivo                                |
| `sortBy`    | stringa  | `created_at` | Campo di ordinamento: `name`, `email`, `created_at`, `last_login` |
| `sortOrder` | stringa  | `desc`     | Direzione: `asc` o `desc`                                       |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_abc123",
        "name": "John Doe",
        "email": "john@example.com",
        "username": "johndoe",
        "isActive": true,
        "role": { "id": "role_1", "name": "Editor" },
        "lastLogin": "2024-01-19T15:30:00.000Z",
        "createdAt": "2024-01-10T09:00:00.000Z"
      }
    ],
    "total": 234,
    "page": 1,
    "limit": 10,
    "totalPages": 24
  }
}
```

---

## Crea utente

```
POST /api/admin/users
```

Crea un nuovo account utente. L'email e il nome utente devono essere univoci. La password viene automaticamente hashata.

**Corpo della richiesta:**

| Campo      | Tipo   | Richiesto | Descrizione                                    |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `name`     | stringa | Sì      | Nome completo dell'utente                       |
| `email`    | stringa | Sì      | Indirizzo email (deve essere univoco)           |
| `username` | stringa | Sì      | Nome utente (deve essere univoco)               |
| `password` | stringa | Sì      | Password (minimo 8 caratteri)                  |
| `roleId`   | stringa | No       | ID del ruolo da assegnare                       |
| `isActive` | booleano| No       | Se l'account è attivo (predefinito: `true`)    |

**Risposta (201):**

```json
{
  "success": true,
  "data": {
    "id": "user_new123",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "username": "janesmith",
    "isActive": true,
    "createdAt": "2024-01-20T10:00:00.000Z"
  },
  "message": "User created successfully"
}
```

---

## Ottieni statistiche utenti

```
GET /api/admin/users/stats
```

Restituisce i conteggi aggregati degli utenti.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "total": 1842,
    "active": 1750,
    "inactive": 92,
    "newThisMonth": 145,
    "newThisWeek": 32
  }
}
```

---

## Verifica disponibilità email

```
GET /api/admin/users/check-email?email={email}
```

Verifica se un indirizzo email è già registrato nel sistema. Utile per la validazione in tempo reale durante la creazione dell'utente.

**Parametri di query:**

| Parametro | Tipo   | Richiesto | Descrizione            |
| --------- | ------ | -------- | ---------------------- |
| `email`   | stringa | Sì      | Email da verificare    |
| `userId`  | stringa | No       | Escludi questo utente dal controllo (per gli aggiornamenti) |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "available": true,
    "email": "newuser@example.com"
  }
}
```

---

## Verifica disponibilità nome utente

```
GET /api/admin/users/check-username?username={username}
```

Verifica se un nome utente è già in uso.

**Parametri di query:**

| Parametro  | Tipo   | Richiesto | Descrizione                 |
| ---------- | ------ | -------- | --------------------------- |
| `username` | stringa | Sì      | Nome utente da verificare   |
| `userId`   | stringa | No       | Escludi questo utente dal controllo |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "available": false,
    "username": "johndoe"
  }
}
```

---

## Ottieni / Aggiorna / Elimina utente

### Ottieni utente

```
GET /api/admin/users/{id}
```

Restituisce i dettagli completi dell'utente inclusi ruolo assegnato, data dell'ultimo accesso e profilo.

### Aggiorna utente

```
PUT /api/admin/users/{id}
```

Aggiornamento parziale di un utente. Se viene fornita `password`, viene automaticamente hashata.

**Corpo della richiesta (tutti i campi opzionali):**

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "username": "updatedusername",
  "password": "newpassword123",
  "roleId": "role_new",
  "isActive": true
}
```

### Elimina utente

```
DELETE /api/admin/users/{id}
```

Esegue un soft delete dell'utente impostando `isActive: false`. I dati utente vengono conservati per la cronologia di audit.

**Risposta (200):**

```json
{ "success": true, "message": "User deleted successfully" }
```

---

## Regole di validazione

| Campo      | Regola                                                        |
| ---------- | ------------------------------------------------------------- |
| `email`    | Formato email valido; deve essere univoca                     |
| `username` | Solo alfanumerici e trattino basso; deve essere univoco       |
| `password` | Minimo 8 caratteri                                            |
| `name`     | Obbligatorio per la creazione; stringa non vuota              |
| `roleId`   | Deve essere un ID ruolo valido esistente                      |

## Codici di errore

| Stato | Significato                                              |
| ------ | -------------------------------------------------------- |
| `400`  | Validazione fallita, campi mancanti obbligatori          |
| `401`  | Autenticazione richiesta                                 |
| `403`  | Privilegi amministrativi richiesti                       |
| `404`  | Utente non trovato                                       |
| `409`  | Email o nome utente già esistente                        |
| `500`  | Errore interno del server                                |

## Documentazione correlata

- [Endpoint Ruoli Admin](./admin-roles-endpoints.md) -- gestisci i ruoli utente
- [Endpoint Clienti Admin](./admin-clients-endpoints.md) -- profili cliente degli utenti registrati
- [Endpoint Admin](./admin-endpoints.md) -- panoramica di tutti i gruppi di risorse admin
