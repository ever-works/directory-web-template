---
id: reports-endpoints
title: "Endpoint Segnalazioni"
sidebar_label: "Segnalazioni"
---

# Endpoint Segnalazioni

Il sistema di segnalazioni consente agli utenti autenticati di segnalare contenuti inappropriati e fornisce agli amministratori strumenti per esaminare, moderare e risolvere le segnalazioni. Le segnalazioni supportano tipi di contenuto inclusi elementi e commenti, con prevenzione integrata dei duplicati.

## Panoramica

| Endpoint | Metodo | Auth | Descrizione |
|---|---|---|---|
| `/api/reports` | POST | Utente | Invia una segnalazione di contenuto |
| `/api/admin/reports` | GET | Amministratore | Elenca le segnalazioni con filtri |
| `/api/admin/reports/stats` | GET | Amministratore | Ottieni le statistiche delle segnalazioni |
| `/api/admin/reports/[id]` | GET | Amministratore | Ottieni una singola segnalazione |
| `/api/admin/reports/[id]` | PUT | Amministratore | Aggiorna lo stato e la risoluzione della segnalazione |

## Endpoint Pubblici

### Invia una Segnalazione

```
POST /api/reports
```

Gli utenti autenticati possono segnalare elementi o commenti per contenuti inappropriati. Ogni utente può segnalare lo stesso contenuto una sola volta (prevenzione dei duplicati tramite il controllo `hasUserReportedContent`). Gli utenti bloccati (sospesi o bannati) non possono inviare segnalazioni.

**Autenticazione:** Richiesta (basata su sessione)

**Corpo della Richiesta:**

```json
{
  "contentType": "item",
  "contentId": "awesome-productivity-tool",
  "reason": "spam",
  "details": "This tool is promoting malicious software"
}
```

| Campo | Tipo | Richiesto | Descrizione |
|---|---|---|---|
| `contentType` | string | Sì | Tipo di contenuto: `"item"` o `"comment"` |
| `contentId` | string | Sì | ID o slug del contenuto segnalato |
| `reason` | string | Sì | Uno tra: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |
| `details` | string | No | Contesto aggiuntivo sulla segnalazione |

**Risposta di Successo (200):**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "awesome-productivity-tool",
    "reason": "spam",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Risposte di Errore:**

| Stato | Condizione |
|---|---|
| 400 | Tipo di contenuto non valido, ID contenuto mancante o motivo non valido |
| 401 | Utente non autenticato |
| 403 | Profilo cliente richiesto, o utente sospeso/bannato |
| 404 | Profilo cliente non trovato |
| 409 | L'utente ha già segnalato questo contenuto |
| 500 | Errore interno del server |

**Fonte:** `template/app/api/reports/route.ts`

## Endpoint Amministrativi

Tutti gli endpoint amministrativi richiedono che `session.user.isAdmin` sia true.

### Elenca Segnalazioni

```
GET /api/admin/reports
```

Restituisce un elenco paginato di segnalazioni di contenuto con le informazioni sul segnalatore. Supporta il filtraggio per stato, tipo di contenuto e motivo, oltre alla ricerca testuale su ID contenuto, dettagli e nome/email del segnalatore.

**Parametri di Query:**

| Parametro | Tipo | Predefinito | Descrizione |
|---|---|---|---|
| `page` | integer | 1 | Numero di pagina (minimo 1) |
| `limit` | integer | 10 | Risultati per pagina (1-100) |
| `search` | string | - | Cerca su ID contenuto, dettagli, nome/email del segnalatore |
| `status` | string | - | Filtro: `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `contentType` | string | - | Filtro: `"item"`, `"comment"` |
| `reason` | string | - | Filtro: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |

**Risposta di Successo (200):**

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "rpt_abc123",
        "contentType": "item",
        "contentId": "some-item-slug",
        "reason": "spam",
        "status": "pending",
        "details": "Suspicious content",
        "reportedBy": "client_456",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

**Fonte:** `template/app/api/admin/reports/route.ts`

### Ottieni Statistiche Segnalazioni

```
GET /api/admin/reports/stats
```

Restituisce statistiche aggregate sulle segnalazioni inclusi i conteggi per stato, tipo di contenuto e motivo.

**Risposta di Successo (200):**

```json
{
  "success": true,
  "data": {
    "total": 156,
    "pendingCount": 23,
    "resolvedCount": 120,
    "byStatus": {
      "pending": 23,
      "reviewed": 10,
      "resolved": 120,
      "dismissed": 3
    },
    "byContentType": {
      "item": 100,
      "comment": 56
    },
    "byReason": {
      "spam": 80,
      "inappropriate": 45,
      "harassment": 20,
      "other": 11
    }
  }
}
```

**Fonte:** `template/app/api/admin/reports/stats/route.ts`

### Ottieni Segnalazione per ID

```
GET /api/admin/reports/[id]
```

Recupera una singola segnalazione con i dettagli completi incluse le informazioni sul segnalatore e sul revisore.

**Parametri di Percorso:**

| Parametro | Tipo | Descrizione |
|---|---|---|
| `id` | string | ID della segnalazione |

**Risposta di Successo (200):**

```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "some-item-slug",
    "reason": "spam",
    "status": "reviewed",
    "details": "Suspicious content",
    "reportedBy": "client_456",
    "reviewedBy": "admin_789",
    "reviewNote": "Confirmed as spam",
    "resolution": "content_removed",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-21T09:00:00.000Z"
  }
}
```

| Stato | Condizione |
|---|---|
| 403 | Non è un amministratore |
| 404 | Segnalazione non trovata |

**Fonte:** `template/app/api/admin/reports/[id]/route.ts`

### Aggiorna Segnalazione

```
PUT /api/admin/reports/[id]
```

Aggiorna lo stato, la risoluzione e la nota di revisione di una segnalazione. Quando viene impostata una risoluzione, il sistema esegue automaticamente l'azione di moderazione corrispondente (rimozione del contenuto, avviso utente, sospensione o ban).

**Corpo della Richiesta:**

```json
{
  "status": "resolved",
  "resolution": "content_removed",
  "reviewNote": "Confirmed spam content, removed from listing"
}
```

| Campo | Tipo | Richiesto | Descrizione |
|---|---|---|---|
| `status` | string | No | `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `resolution` | string | No | `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"` |
| `reviewNote` | string | No | Note amministrative sulla revisione |

**Azioni di Moderazione per Risoluzione:**

| Risoluzione | Azione |
|---|---|
| `content_removed` | Chiama `removeContent()` per rimuovere l'elemento o il commento segnalato |
| `user_warned` | Chiama `warnUser()` per emettere un avviso al proprietario del contenuto |
| `user_suspended` | Chiama `suspendUser()` per sospendere l'account del proprietario del contenuto |
| `user_banned` | Chiama `banUser()` per bannare permanentemente il proprietario del contenuto |
| `no_action` | Nessuna azione di moderazione viene eseguita |

**Risposta di Successo (200):**

```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "id": "rpt_abc123",
    "status": "resolved",
    "resolution": "content_removed",
    "reviewNote": "Confirmed spam content"
  },
  "moderationResult": {
    "success": true,
    "message": "Content removed successfully"
  }
}
```

| Stato | Condizione |
|---|---|
| 400 | Stato o valore di risoluzione non valido; proprietario del contenuto non trovato per azioni a livello utente |
| 403 | Non è un amministratore |
| 404 | Segnalazione non trovata |

**Fonte:** `template/app/api/admin/reports/[id]/route.ts`

## Modello dei Dati

Le segnalazioni utilizzano i seguenti enum definiti in `lib/db/schema`:

- **ReportContentType:** `"item"`, `"comment"`
- **ReportReason:** `"spam"`, `"harassment"`, `"inappropriate"`, `"other"`
- **ReportStatus:** `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"`
- **ReportResolution:** `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"`

## Integrazione con la Moderazione

Quando una segnalazione viene risolta con una risoluzione a livello utente (`user_warned`, `user_suspended`, `user_banned`), il sistema:

1. Cerca il proprietario del contenuto tramite `getContentOwner()`
2. Esegue la funzione di moderazione appropriata da `lib/services/moderation.service`
3. Utilizza il `reviewNote` come motivo per l'azione di moderazione
4. Registra l'ID dell'amministratore come revisore

Se l'azione di moderazione fallisce, l'aggiornamento della segnalazione ha comunque successo ma il fallimento viene registrato. Il campo `moderationResult` nella risposta indica se l'azione è riuscita.
