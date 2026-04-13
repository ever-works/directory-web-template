---
id: admin-comments-endpoints
title: "Endpoint API Admin Commenti"
sidebar_label: "Admin Commenti"
---

# Endpoint API Admin Commenti

L'API Admin Commenti fornisce funzionalità di moderazione per la gestione dei commenti degli utenti. Gli amministratori possono elencare, visualizzare, aggiornare ed eseguire l'eliminazione soft dei commenti. Tutti gli endpoint utilizzano il runtime Node.js e richiedono la disponibilità del database. I controlli di autenticazione restituiscono `403 Vietato` per gli utenti non amministratori.

## Riepilogo delle route

| Metodo | Percorso | Auth | Descrizione |
|--------|------|------|-------------|
| `GET` | `/api/admin/comments` | Amministratore | Elenca commenti (paginati, ricercabili) |
| `GET` | `/api/admin/comments/{id}` | Amministratore | Ottieni un singolo commento con info utente |
| `PUT` | `/api/admin/comments/{id}` | Amministratore | Aggiorna il contenuto del commento |
| `DELETE` | `/api/admin/comments/{id}` | Amministratore | Eliminazione soft di un commento |

## Autenticazione

Gli endpoint di moderazione dei commenti verificano lo stato amministratore e restituiscono `403 Vietato` (non `401`) per gli utenti non amministratori:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}
```

## Requisito database

Gli endpoint dei commenti verificano la disponibilità del database prima di elaborare le richieste:

```typescript
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

Se il database non è configurato, viene restituita una risposta di errore appropriata prima di qualsiasi controllo di autenticazione.

## Endpoint

### GET `/api/admin/comments`

Restituisce un elenco paginato di commenti con informazioni sull'utente associato. Supporta la ricerca full-text nel contenuto dei commenti, nei nomi degli utenti e nelle email degli utenti. Vengono restituiti solo i commenti non eliminati.

**Parametri di query:**

| Parametro | Tipo | Predefinito | Descrizione |
|-----------|------|---------|-------------|
| `page` | intero | `1` | Numero di pagina per la paginazione |
| `limit` | intero | `10` | Commenti per pagina (1--100) |
| `search` | stringa | `""` | Cerca nel contenuto, nel nome utente o nell'email |

**Comportamento della ricerca:**

La query di ricerca viene confrontata senza distinzione tra maiuscole e minuscole (usando `ILIKE`) con:
- Contenuto del commento
- Nome visualizzato dell'utente
- Indirizzo email dell'utente

I caratteri speciali `%`, `_` e `\` vengono escapati per prevenire l'iniezione di pattern SQL.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "This is a great product! Highly recommended.",
        "rating": 5,
        "userId": "user_456def",
        "itemId": "item_789ghi",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "user": {
          "id": "user_456def",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "image": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

### GET `/api/admin/comments/{id}`

Recupera un commento specifico tramite il suo ID con informazioni complete sul profilo utente. Include un left join alla tabella `clientProfiles` per i dati utente.

**Parametri di percorso:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `id` | stringa | Identificatore univoco del commento |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is a great product! Highly recommended.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
}
```

**Fallback utente:** Se il profilo utente non viene trovato (utente eliminato), viene restituito un oggetto segnaposto:

```json
{
  "user": {
    "id": "",
    "name": "Unknown User",
    "email": "",
    "image": null
  }
}
```

### PUT `/api/admin/comments/{id}`

Aggiorna il contenuto di un commento specifico. Solo il campo `content` può essere modificato. Il commento deve esistere e non deve essere stato eliminato con eliminazione soft.

**Parametri di percorso:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `id` | stringa | Identificatore univoco del commento |

**Corpo della richiesta:**

```json
{
  "content": "This is an updated comment with more details."
}
```

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `content` | stringa | Sì | Nuovo testo del commento (non deve essere vuoto dopo il trim) |

**Regole di validazione:**
- `content` è obbligatorio e non deve essere vuoto o composto solo da spazi bianchi
- Il commento di destinazione deve esistere e non deve avere un timestamp `deletedAt`

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is an updated comment with more details.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:15:00.000Z",
    "user": { "id": "user_456def", "name": "John Doe", "email": "john.doe@example.com", "image": null }
  },
  "message": "Comment updated successfully"
}
```

### DELETE `/api/admin/comments/{id}`

Esegue un'eliminazione soft di un commento impostando il timestamp `deletedAt`. Il commento deve esistere e non deve essere già stato eliminato. I commenti eliminati con eliminazione soft vengono esclusi da tutte le query di elenco.

**Parametri di percorso:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `id` | stringa | Identificatore univoco del commento |

**Risposta (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Modello dati del commento

| Campo | Tipo | Nullable | Descrizione |
|-------|------|----------|-------------|
| `id` | stringa | No | Identificatore univoco del commento |
| `content` | stringa | No | Contenuto testuale del commento |
| `rating` | intero | Sì | Valore del voto (1--5) |
| `userId` | stringa | No | ID dell'autore |
| `itemId` | stringa | No | ID dell'elemento associato |
| `createdAt` | datetime | Sì | Timestamp di creazione |
| `updatedAt` | datetime | Sì | Timestamp dell'ultimo aggiornamento |
| `deletedAt` | datetime | Sì | Timestamp di eliminazione soft (null se attivo) |

## Codici di errore

| Stato | Errore | Causa |
|--------|-------|-------|
| `400` | Il contenuto è obbligatorio | Contenuto vuoto o mancante nell'aggiornamento |
| `403` | Vietato | Utente non amministratore che tenta l'accesso |
| `404` | Commento non trovato | ID non valido o già eliminato con eliminazione soft |
| `500` | Errore interno del server | Errore del database o del server |

## Note di implementazione

- I commenti utilizzano l'**eliminazione soft** -- il campo `deletedAt` viene impostato invece di rimuovere la riga. Questo preserva l'integrità dei dati e consente il potenziale recupero.
- Tutte le query di elenco filtrano con `isNull(comments.deletedAt)` per escludere i commenti eliminati.
- I dati utente vengono recuperati tramite un `LEFT JOIN` su `clientProfiles`, garantendo che i commenti degli utenti eliminati siano ancora recuperabili.
- Il `runtime` è impostato su `"nodejs"` per queste route (non Edge).

## Documentazione correlata

- [Panoramica degli endpoint Admin](./admin-endpoints.md)
- [Endpoint pubblici dei commenti](./comment-endpoints.md)
- [Pattern di risposta](./response-patterns.md)
- [Validazione delle richieste](./request-validation.md)
