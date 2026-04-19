---
id: auth-endpoints
title: "Endpoint di Autenticazione"
sidebar_label: "Autenticazione"
---

# Endpoint di Autenticazione

La gestione dell'autenticazione è basata su NextAuth.js v5, che fornisce sia i flussi di autenticazione OAuth che quelli con credenziali email/password. Gli endpoint di autenticazione gestiscono accessi, disconnessioni, callback OAuth, gestione delle password e recupero delle sessioni.

## Percorso base

```
/api/auth
```

## Riepilogo delle route

| Metodo  | Percorso                           | Auth    | Descrizione                                         |
| ------- | -------------------------------- | ------- | --------------------------------------------------- |
| `GET`   | `/api/auth/[...nextauth]`        | Nessuna | Handler NextAuth (callback OAuth, check sessione)   |
| `POST`  | `/api/auth/[...nextauth]`        | Nessuna | Handler NextAuth (login, logout, aggiorna sessione) |
| `POST`  | `/api/auth/forgot-password`      | Nessuna | Invia il link per il reset della password            |
| `POST`  | `/api/auth/reset-password`       | Nessuna | Reimposta la password con un token valido           |
| `GET`   | `/api/auth/me`                   | Utente  | Ottieni i dati dell'utente corrente                 |

---

## Handler NextAuth

```
GET /api/auth/[...nextauth]
POST /api/auth/[...nextauth]
```

Questo è il catch-all handler di NextAuth.js v5, che gestisce tutti i flussi di autenticazione. I percorsi specifici vengono risolti dinamicamente da NextAuth.

### Sotto-percorsi comuni

| Percorso                              | Metodo | Descrizione                               |
| ------------------------------------- | ------ | ----------------------------------------- |
| `/api/auth/signin`                    | GET    | Mostra la pagina di accesso               |
| `/api/auth/signout`                   | POST   | Disconnette l'utente corrente             |
| `/api/auth/callback/{provider}`       | GET    | Gestisce il callback OAuth dal provider   |
| `/api/auth/session`                   | GET    | Restituisce i dati della sessione corrente|
| `/api/auth/csrf`                      | GET    | Restituisce il token CSRF                 |
| `/api/auth/providers`                 | GET    | Elenca i provider di autenticazione configurati |

### Provider configurati

| Provider      | Tipo         | Configurazione richiesta                          |
| ------------- | ------------ | ------------------------------------------------- |
| `credentials` | Email + password | `AUTH_SECRET`, tabella utenti nel database    |
| `github`      | OAuth        | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`            |
| `google`      | OAuth        | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`            |
| `discord`     | OAuth        | `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`          |

---

## Flusso di callback OAuth

Quando un utente si autentica tramite un provider OAuth, il flusso è il seguente:

1. L'utente viene reindirizzato a `GET /api/auth/signin`
2. L'utente sceglie un provider OAuth e autorizza l'app
3. Il provider reindirizza a `GET /api/auth/callback/{provider}`
4. NextAuth crea o aggiorna il record utente nel database
5. Viene creata una sessione JWT e impostato il cookie
6. L'utente viene reindirizzato all'URL di callback configurato

---

## Pagine personalizzate

Le pagine di autenticazione sono pagine Next.js personalizzate (non le pagine predefinite di NextAuth):

| Percorso              | Descrizione                                |
| --------------------- | ------------------------------------------ |
| `/login`              | Pagina di accesso personalizzata           |
| `/register`           | Pagina di registrazione                    |
| `/forgot-password`    | Pagina per il recupero della password      |
| `/reset-password`     | Pagina per il reset della password         |

---

## Gestione password

### Dimentica password

```
POST /api/auth/forgot-password
```

Invia un link di reset della password all'indirizzo email dell'utente. Restituisce sempre `200` per prevenire l'enumerazione degli utenti.

**Corpo della richiesta:**

```json
{ "email": "user@example.com" }
```

**Risposta (200):**

```json
{
  "success": true,
  "message": "If that email address is in our system, we have sent a password reset link."
}
```

### Reimposta password

```
POST /api/auth/reset-password
```

Reimposta la password dell'utente usando un token valido. I token scadono dopo 1 ora.

**Corpo della richiesta:**

| Campo        | Tipo   | Richiesto | Descrizione                          |
| ------------ | ------ | -------- | ------------------------------------ |
| `token`      | stringa | Sì      | Token di reset ricevuto via email    |
| `password`   | stringa | Sì      | Nuova password (minimo 8 caratteri)  |

**Risposta (200):**

```json
{ "success": true, "message": "Password reset successfully" }
```

**Codici di errore:**

| Stato | Significato                                      |
| ------ | ------------------------------------------------ |
| `400`  | Token mancante, password non valida              |
| `401`  | Token scaduto o non valido                       |
| `500`  | Errore interno del server                        |

---

## Endpoint utente corrente

```
GET /api/auth/me
```

Restituisce il profilo dell'utente autenticato corrente, inclusi i dati del ruolo e le informazioni sul profilo.

**Autenticazione:** Token sessione NextAuth richiesto.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "image": "https://example.com/avatar.jpg",
    "role": {
      "id": "role_admin",
      "name": "Admin"
    },
    "createdAt": "2024-01-10T09:00:00.000Z"
  }
}
```

**Risposta (401) -- Non autenticato:**

```json
{ "success": false, "error": "Unauthorized" }
```

---

## Gestione del token di sessione

NextAuth v5 archivia i token di sessione come cookie JWT sicuri:

| Cookie                       | Descrizione                                     |
| ---------------------------- | ----------------------------------------------- |
| `__Secure-next-auth.session-token` | Sessione crittografata JWT (HTTPS)         |
| `next-auth.session-token`    | Sessione JWT in sviluppo (HTTP)                 |
| `next-auth.csrf-token`       | Protezione CSRF                                 |

---

## Codici di errore

| Stato | Significato                                      |
| ------ | ------------------------------------------------ |
| `400`  | Dati della richiesta non validi                  |
| `401`  | Non autenticato o sessione scaduta               |
| `403`  | Accesso negato (token non valido)                |
| `404`  | Utente non trovato                               |
| `500`  | Errore interno del server                        |

## Documentazione correlata

- [Configurazione NextAuth](../architecture/nextauth-configuration.md) -- dettagli di configurazione
- [Endpoint Utenti Admin](./admin-users-endpoints.md) -- gestione degli account utente
- [Endpoint Profilo Client](./client-endpoints.md) -- endpoint del profilo utente
