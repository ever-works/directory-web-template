---
id: admin-notifications-endpoints
title: "Endpoint API Admin Notifiche"
sidebar_label: "Admin Notifiche"
---

# Endpoint API Admin Notifiche

L'API di notifiche admin gestisce le notifiche di sistema per gli amministratori, incluse le notifiche sugli invii di elementi, le richieste degli utenti e gli avvisi di sistema. Tutti gli endpoint richiedono l'autenticazione come amministratore.

## Percorso base

```
/api/admin/notifications
```

## Riepilogo delle route

| Metodo   | Percorso                                       | Auth  | Descrizione                           |
| -------- | ------------------------------------------- | ----- | ------------------------------------- |
| `GET`    | `/api/admin/notifications`                  | Amministratore | Elenca le notifiche admin               |
| `POST`   | `/api/admin/notifications`                  | Amministratore | Crea una notifica (uso interno)       |
| `PATCH`  | `/api/admin/notifications/{id}/read`        | Amministratore | Segna la notifica come letta          |
| `PATCH`  | `/api/admin/notifications/read-all`         | Amministratore | Segna tutte le notifiche come lette   |

---

## Elenca notifiche

```
GET /api/admin/notifications
```

Restituisce le notifiche per l'amministratore autenticato con supporto per la paginazione e i filtri.

**Parametri di query:**

| Parametro  | Tipo    | Predefinito | Descrizione                                |
| ---------- | ------- | ------- | ------------------------------------------ |
| `page`     | intero | `1`     | Numero di pagina                               |
| `limit`    | intero | `20`    | Risultati per pagina (max 100)                  |
| `unread`   | booleano | --      | Se `true`, filtra solo le non lette        |
| `type`     | stringa  | --      | Filtra per tipo di notifica                |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_abc123",
        "type": "item_submitted",
        "title": "New Item Submitted",
        "message": "\"Awesome Tool\" has been submitted for review",
        "read": false,
        "data": {
          "itemId": "item_xyz",
          "itemName": "Awesome Tool"
        },
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "total": 45,
    "unreadCount": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

## Crea notifica

```
POST /api/admin/notifications
```

Crea una nuova notifica per un amministratore. Utilizzato internamente dal sistema per inviare notifiche durante gli eventi (invii di elementi, registrazioni utenti, ecc.).

**Corpo della richiesta:**

| Campo     | Tipo   | Richiesto | Descrizione                                           |
| --------- | ------ | -------- | ----------------------------------------------------- |
| `type`    | stringa | Sì      | Tipo di notifica (vedi tipi comuni sotto)              |
| `title`   | stringa | Sì      | Titolo breve della notifica                            |
| `message` | stringa | Sì      | Messaggio dettagliato                                  |
| `userId`  | stringa | No       | ID utente destinatario (predefinito: tutti gli admin)  |
| `data`    | oggetto | No       | Payload JSON arbitrario per dati contestuali           |

**Risposta (201):**

```json
{
  "success": true,
  "data": {
    "id": "notif_def456",
    "type": "item_submitted",
    "title": "New Item Submitted",
    "message": "A new item has been submitted for review",
    "read": false,
    "createdAt": "2024-01-20T11:00:00.000Z"
  }
}
```

---

## Segna notifica come letta

```
PATCH /api/admin/notifications/{id}/read
```

Segna una singola notifica come letta. Restituisce `404` se la notifica non esiste o appartiene a un altro utente.

**Risposta (200):**

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## Segna tutte come lette

```
PATCH /api/admin/notifications/read-all
```

Segna tutte le notifiche per l'amministratore autenticato come lette.

**Risposta (200):**

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updated": 12
  }
}
```

---

## Modello dati notifica

| Campo       | Tipo    | Descrizione                                        |
| ----------- | ------- | -------------------------------------------------- |
| `id`        | stringa  | Identificatore univoco                             |
| `type`      | stringa  | Tipo di notifica (vedi tipi comuni)                |
| `title`     | stringa  | Titolo breve della notifica                        |
| `message`   | stringa  | Messaggio dettagliato                              |
| `read`      | booleano | Se l'utente ha letto la notifica                  |
| `data`      | oggetto  | Payload JSON arbitrario per dati contestuali       |
| `userId`    | stringa  | ID dell'utente destinatario                        |
| `createdAt` | stringa  | Timestamp ISO 8601 di creazione                    |

---

## Tipi di notifica comuni

| Tipo                        | Quando viene attivata                            |
| --------------------------- | ------------------------------------------------ |
| `item_submitted`            | Un utente ha inviato un elemento per la revisione|
| `item_approved`             | Un elemento è stato approvato                   |
| `item_rejected`             | Un elemento è stato rifiutato                   |
| `user_registered`           | Un nuovo utente si è registrato                 |
| `report_submitted`          | Un utente ha segnalato un contenuto              |
| `sponsor_ad_submitted`      | Una nuova inserzione sponsor è stata inviata     |
| `system_alert`              | Avviso di sistema (ottimizzazione, errori, ecc.) |

---

## Codici di errore

| Stato | Significato                                         |
| ------ | --------------------------------------------------- |
| `400`  | Parametri di input non validi                       |
| `401`  | Autenticazione richiesta                            |
| `403`  | Privilegi amministrativi richiesti                  |
| `404`  | Notifica non trovata                                |
| `500`  | Errore interno del server                           |

## Documentazione correlata

- [Endpoint Admin](./admin-endpoints.md) -- panoramica di tutti i gruppi di risorse admin
- [Endpoint Utenti Admin](./admin-users-endpoints.md) -- gestione degli account utente
