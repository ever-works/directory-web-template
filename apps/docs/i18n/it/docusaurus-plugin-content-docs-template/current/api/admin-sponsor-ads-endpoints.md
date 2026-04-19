---
id: admin-sponsor-ads-endpoints
title: "Endpoint API Admin Annunci Sponsor"
sidebar_label: "Admin Annunci Sponsor"
---

# Endpoint API Admin Annunci Sponsor

L'API Annunci Sponsor gestisce gli annunci pubblicitari sponsor nel sito, inclusi la moderazione, l'approvazione e la gestione del ciclo di vita. Tutti gli endpoint richiedono l'autenticazione come amministratore.

## Percorso base

```
/api/admin/sponsor-ads
```

## Riepilogo delle route

| Metodo   | Percorso                                     | Auth  | Descrizione                         |
| -------- | ---------------------------------------- | ----- | ----------------------------------- |
| `GET`    | `/api/admin/sponsor-ads`                 | Amministratore | Elenca tutti gli annunci sponsor       |
| `GET`    | `/api/admin/sponsor-ads/{id}`            | Amministratore | Ottieni annuncio sponsor per ID       |
| `DELETE` | `/api/admin/sponsor-ads/{id}`            | Amministratore | Elimina annuncio sponsor              |
| `POST`   | `/api/admin/sponsor-ads/{id}/approve`    | Amministratore | Approva un annuncio sponsor           |
| `POST`   | `/api/admin/sponsor-ads/{id}/reject`     | Amministratore | Rifiuta un annuncio sponsor           |
| `POST`   | `/api/admin/sponsor-ads/{id}/cancel`     | Amministratore | Annulla un annuncio sponsor attivo    |

---

## Elenca annunci sponsor

```
GET /api/admin/sponsor-ads
```

Restituisce un elenco paginato di tutti gli annunci sponsor con filtri per stato, inserzionista e intervallo di date.

**Parametri di query:**

| Parametro    | Tipo    | Predefinito | Descrizione                                                     |
| ------------ | ------- | ------- | --------------------------------------------------------------- |
| `page`       | intero | `1`     | Numero di pagina                                                    |
| `limit`      | intero | `10`    | Risultati per pagina (max 100)                                       |
| `status`     | stringa  | --      | Filtro: `pending`, `approved`, `active`, `rejected`, `cancelled`, `expired` |
| `search`     | stringa  | --      | Cerca per titolo o nome inserzionista                              |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "id": "ad_abc123",
        "title": "Amazing Product",
        "advertiser": "Acme Corp",
        "status": "pending",
        "imageUrl": "https://example.com/ad.jpg",
        "targetUrl": "https://acme.com/product",
        "startDate": "2024-02-01",
        "endDate": "2024-02-29",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

## Ottieni annuncio sponsor

```
GET /api/admin/sponsor-ads/{id}
```

Restituisce i dettagli completi di un singolo annuncio sponsor, incluse le statistiche di impressioni e clic.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_abc123",
    "title": "Amazing Product",
    "advertiser": "Acme Corp",
    "contactEmail": "ads@acme.com",
    "status": "approved",
    "imageUrl": "https://example.com/ad.jpg",
    "targetUrl": "https://acme.com/product",
    "description": "Check out our amazing product!",
    "startDate": "2024-02-01",
    "endDate": "2024-02-29",
    "impressions": 1240,
    "clicks": 87,
    "ctr": 7.02,
    "approvedAt": "2024-01-22T14:00:00.000Z",
    "approvedBy": "admin@site.com",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Elimina annuncio sponsor

```
DELETE /api/admin/sponsor-ads/{id}
```

Elimina definitivamente un annuncio sponsor e tutti i dati associati. Questa azione non può essere annullata.

**Risposta (200):**

```json
{ "success": true, "message": "Sponsor ad deleted successfully" }
```

---

## Approva annuncio sponsor

```
POST /api/admin/sponsor-ads/{id}/approve
```

Approva un annuncio sponsor in attesa. Aggiorna lo stato a `approved` e registra chi ha approvato e quando. Invia una notifica email all'inserzionista.

**Corpo della richiesta (opzionale):**

```json
{
  "notes": "Approved as per our advertising guidelines."
}
```

**Risposta (200):**

```json
{
  "success": true,
  "message": "Sponsor ad approved successfully",
  "data": {
    "id": "ad_abc123",
    "status": "approved",
    "approvedAt": "2024-01-22T14:00:00.000Z"
  }
}
```

---

## Rifiuta annuncio sponsor

```
POST /api/admin/sponsor-ads/{id}/reject
```

Rifiuta un annuncio sponsor in attesa. Richiede un motivo di rifiuto. Invia una notifica email all'inserzionista con la spiegazione.

**Corpo della richiesta:**

| Campo    | Tipo   | Richiesto | Descrizione                          |
| -------- | ------ | -------- | ------------------------------------ |
| `reason` | stringa | Sì      | Motivo del rifiuto (min 10 caratteri) |

**Risposta (200):**

```json
{
  "success": true,
  "message": "Sponsor ad rejected",
  "data": {
    "id": "ad_abc123",
    "status": "rejected",
    "rejectedAt": "2024-01-22T15:00:00.000Z",
    "rejectionReason": "Content does not meet our advertising guidelines."
  }
}
```

---

## Annulla annuncio sponsor

```
POST /api/admin/sponsor-ads/{id}/cancel
```

Annulla un annuncio sponsor attivo o approvato. Utile quando un inserzionista richiede la cancellazione anticipata o quando emerge un problema di conformità.

**Corpo della richiesta (opzionale):**

```json
{
  "reason": "Advertiser requested early cancellation."
}
```

**Risposta (200):**

```json
{
  "success": true,
  "message": "Sponsor ad cancelled",
  "data": {
    "id": "ad_abc123",
    "status": "cancelled",
    "cancelledAt": "2024-01-25T10:00:00.000Z"
  }
}
```

---

## Ciclo di vita dello stato

```
pending → approved → active → expired
                  ↓
               rejected

approved/active → cancelled
```

| Transizione         | Endpoint                              | Chi può farlo    |
| ------------------- | ------------------------------------- | ---------------- |
| `pending` → `approved` | `POST /.../{id}/approve`           | Amministratore   |
| `pending` → `rejected` | `POST /.../{id}/reject`            | Amministratore   |
| `approved` → `cancelled` | `POST /.../{id}/cancel`          | Amministratore   |
| `active` → `cancelled` | `POST /.../{id}/cancel`            | Amministratore   |
| `active` → `expired` | Processo automatico (data scadenza)  | Sistema          |

---

## Regole di validazione

| Campo    | Regola                                               |
| -------- | ---------------------------------------------------- |
| `reason` | Obbligatorio per il rifiuto; minimo 10 caratteri     |
| Azione   | Non valida se lo stato corrente non permette la transizione |

## Codici di errore

| Stato | Significato                                                 |
| ------ | ----------------------------------------------------------- |
| `400`  | Validazione fallita, motivo mancante, transizione non valida |
| `401`  | Autenticazione richiesta                                    |
| `403`  | Privilegi amministrativi richiesti                          |
| `404`  | Annuncio sponsor non trovato                                |
| `409`  | Transizione di stato non consentita                         |
| `500`  | Errore interno del server                                   |

## Documentazione correlata

- [Endpoint Admin](./admin-endpoints.md) -- panoramica di tutti i gruppi di risorse admin
- [Endpoint Annunci Sponsor Clienti](./client-api-endpoints.md) -- visualizzazione annunci lato client
