---
id: items-api-endpoints-deep-dive
title: Approfondimento Endpoint API Elementi
sidebar_label: Approfondimento API Elementi
sidebar_position: 65
---

# Approfondimento Endpoint API Elementi

Le API Elementi forniscono endpoint pubblici per interagire con gli elementi, inclusi commenti, voti, tracciamento delle visualizzazioni, associazioni aziendali e metriche di coinvolgimento. Questi endpoint alimentano le funzionalità principali rivolte agli utenti del sito web della directory.

**Directory sorgente:** `template/app/api/items/`

---

## Mappa delle Route

| Metodo | Percorso | Autenticazione | Descrizione |
|--------|------|------|-------------|
| `GET` | `/api/items/{slug}/comments` | Pubblica | Elenca i commenti dell'elemento |
| `POST` | `/api/items/{slug}/comments` | Sessione | Crea un commento |
| `PUT` | `/api/items/{slug}/comments/{commentId}` | Sessione (proprietario) | Aggiorna un commento |
| `DELETE` | `/api/items/{slug}/comments/{commentId}` | Sessione (proprietario) | Elimina un commento |
| `GET` | `/api/items/{slug}/comments/rating` | Pubblica | Ottieni le statistiche di valutazione |
| `GET` | `/api/items/{slug}/comments/rating/{commentId}` | Pubblica | Ottieni la valutazione di un singolo commento |
| `PATCH` | `/api/items/{slug}/comments/rating/{commentId}` | Pubblica | Aggiorna la valutazione del commento |
| `GET` | `/api/items/{slug}/company` | Admin | Ottieni l'azienda dell'elemento |
| `POST` | `/api/items/{slug}/company` | Admin | Assegna un'azienda all'elemento |
| `DELETE` | `/api/items/{slug}/company` | Admin | Rimuovi l'azienda dall'elemento |
| `POST` | `/api/items/{slug}/views` | Pubblica | Registra una visualizzazione dell'elemento |
| `GET` | `/api/items/{slug}/votes` | Pubblica | Ottieni informazioni sui voti e stato dell'utente |
| `POST` | `/api/items/{slug}/votes` | Sessione | Esprimi o aggiorna un voto |
| `DELETE` | `/api/items/{slug}/votes` | Sessione | Rimuovi il voto |
| `GET` | `/api/items/{slug}/votes/count` | Pubblica | Ottieni solo il conteggio dei voti |
| `GET` | `/api/items/{slug}/votes/status` | Sessione | Ottieni il record di voto dell'utente |
| `GET` | `/api/items/engagement` | Pubblica | Metriche di coinvolgimento in batch |
| `GET` | `/api/items/popularity-scores` | Pubblica | Punteggi di popolarità di debug |

---

## Commenti

### Elenca Commenti

Restituisce tutti i commenti per un elemento specifico, incluse le informazioni del profilo utente.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/items/{slug}/comments` |
| **Autenticazione** | Nessuna (pubblica) |
| **Sorgente** | `items/[slug]/comments/route.ts` |

#### Risposta

**Stato 200**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool! Really helped boost my productivity.",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

#### Esempio curl

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments
```

---

### Crea Commento

Crea un nuovo commento con una valutazione per un elemento.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `POST` |
| **Percorso** | `/api/items/{slug}/comments` |
| **Autenticazione** | Sessione (utente con profilo client) |
| **Sorgente** | `items/[slug]/comments/route.ts` |

#### Corpo della Richiesta

```json
{
  "content": "This tool is excellent for team collaboration!",
  "rating": 5
}
```

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `content` | `string` | Sì | Testo del commento (non deve essere vuoto) |
| `rating` | `integer` | Sì | Valutazione da 1 a 5 |

#### Risposte

| Stato | Descrizione |
|--------|-------------|
| 200 | Commento creato con successo |
| 400 | Contenuto o valutazione non validi |
| 401 | Autenticazione richiesta |
| 403 | Utente bloccato (sospeso o bannato) |
| 404 | Profilo client non trovato |
| 500 | Errore del server |

**Stato 200**

```json
{
  "success": true,
  "comment": {
    "id": "comment_new123",
    "content": "This tool is excellent for team collaboration!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "awesome-productivity-tool",
    "createdAt": "2024-01-21T14:00:00.000Z",
    "updatedAt": "2024-01-21T14:00:00.000Z",
    "deletedAt": null,
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

#### Esempio curl

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "content": "Great tool!", "rating": 5 }'
```

:::note Moderazione
Gli utenti bloccati (sospesi o bannati) ricevono una risposta 403 con un messaggio che spiega il loro stato di blocco. Il controllo `isUserBlocked()` viene eseguito usando il campo status del profilo client.
:::

---

### Aggiorna Commento

Aggiorna il contenuto e/o la valutazione di un commento. Solo l'autore del commento può aggiornare il proprio commento.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `PUT` |
| **Percorso** | `/api/items/{slug}/comments/{commentId}` |
| **Autenticazione** | Sessione (proprietario del commento) |
| **Sorgente** | `items/[slug]/comments/[commentId]/route.ts` |

#### Corpo della Richiesta

È necessario fornire almeno un campo:

```json
{
  "content": "Updated review text.",
  "rating": 4
}
```

| Campo | Tipo | Richiesto | Vincoli |
|-------|------|----------|---------|
| `content` | `string` | No | 1-1000 caratteri |
| `rating` | `integer` | No | 1-5 |

#### Risposta

**Stato 200** -- Restituisce il commento aggiornato con le informazioni utente e un timestamp `editedAt`.

```json
{
  "id": "comment_123abc",
  "content": "Updated review text.",
  "rating": 4,
  "userId": "client_456def",
  "itemId": "awesome-productivity-tool",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-21T15:00:00.000Z",
  "editedAt": "2024-01-21T15:00:00.000Z",
  "deletedAt": null,
  "user": {
    "id": "client_456def",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "image": "https://example.com/avatars/john.jpg"
  }
}
```

---

### Elimina Commento

Elimina temporaneamente un commento. Solo l'autore del commento può eliminare il proprio commento.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `DELETE` |
| **Percorso** | `/api/items/{slug}/comments/{commentId}` |
| **Autenticazione** | Sessione (proprietario del commento) |
| **Sorgente** | `items/[slug]/comments/[commentId]/route.ts` |

#### Risposta

**Stato 204** -- Nessun contenuto (commento eliminato con successo).

| Stato | Descrizione |
|--------|-------------|
| 204 | Commento eliminato |
| 401 | Non autorizzato |
| 404 | Commento non trovato o non autorizzato |

#### Esempio curl

```bash
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/comments/comment_123 \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Ottieni Statistiche di Valutazione

Restituisce le statistiche aggregate della valutazione per un elemento: valutazione media e conteggio totale.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/items/{slug}/comments/rating` |
| **Autenticazione** | Nessuna (pubblica) |
| **Sorgente** | `items/[slug]/comments/rating/route.ts` |

#### Risposta

**Stato 200**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `averageRating` | `number` | Valutazione media (0 se nessuna valutazione, max 5) |
| `totalRatings` | `number` | Numero totale di commenti non eliminati con valutazioni |

#### Esempio curl

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments/rating
```

---

### Ottieni/Aggiorna Valutazione Singolo Commento

#### Ottieni Valutazione del Commento

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Autenticazione** | Nessuna (pubblica) |

Restituisce l'oggetto commento completo per un ID commento specifico.

#### Aggiorna Valutazione del Commento

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `PATCH` |
| **Percorso** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Autenticazione** | Nessuna |

**Corpo della Richiesta:**
```json
{
  "rating": 4
}
```

Restituisce l'oggetto commento aggiornato.

---

## Associazione Aziendale

Endpoint solo per amministratori per gestire la relazione tra elementi e aziende.

### Ottieni Azienda dell'Elemento

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/items/{slug}/company` |
| **Autenticazione** | Admin |
| **Sorgente** | `items/[slug]/company/route.ts` |

#### Risposta

**Stato 200** -- Azienda trovata.

```json
{
  "success": true,
  "data": {
    "id": "company_123",
    "name": "Acme Corp",
    "website": "https://acme.com"
  }
}
```

**Stato 200** -- Nessuna azienda assegnata.

```json
{
  "success": true,
  "data": null
}
```

---

### Assegna Azienda all'Elemento

Assegna un'azienda a un elemento. Questa operazione è idempotente.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `POST` |
| **Percorso** | `/api/items/{slug}/company` |
| **Autenticazione** | Admin |
| **Sorgente** | `items/[slug]/company/route.ts` |

#### Corpo della Richiesta

```json
{
  "companyId": "company_123"
}
```

#### Risposte

**Stato 201** -- Nuova associazione creata.

```json
{
  "success": true,
  "data": { /* oggetto associazione */ },
  "created": true,
  "updated": false
}
```

**Stato 200** -- Associazione esistente aggiornata.

```json
{
  "success": true,
  "data": { /* oggetto associazione */ },
  "created": false,
  "updated": true
}
```

**Stato 409** -- L'elemento è già collegato a un'altra azienda.

```json
{
  "error": "Item is already linked to another company"
}
```

---

### Rimuovi Azienda dall'Elemento

Rimuove l'associazione aziendale da un elemento. Questa operazione è idempotente.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `DELETE` |
| **Percorso** | `/api/items/{slug}/company` |
| **Autenticazione** | Admin |

#### Risposta

**Stato 200**

```json
{
  "success": true,
  "deleted": true
}
```

#### Esempio curl

```bash
# Assegna azienda
curl -s -X POST http://localhost:3000/api/items/awesome-tool/company \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<admin_session>" \
  -d '{ "companyId": "company_123" }'

# Rimuovi azienda
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/company \
  -H "Cookie: next-auth.session-token=<admin_session>"
```

---

## Visualizzazioni

### Registra Visualizzazione Elemento

Registra una visualizzazione giornaliera unica per un elemento con deduplicazione integrata, rilevamento dei bot ed esclusione del proprietario.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `POST` |
| **Percorso** | `/api/items/{slug}/views` |
| **Autenticazione** | Nessuna (pubblica) |
| **Sorgente** | `items/[slug]/views/route.ts` |

#### Flusso di Elaborazione

1. **Controllo del database** -- verifica la disponibilità del database.
2. **Rilevamento bot** -- rifiuta gli user agent di bot noti.
3. **Validazione elemento** -- conferma l'esistenza dell'elemento (restituisce 404 se non trovato).
4. **Esclusione proprietario** -- se autenticato, salta il conteggio se il visualizzatore è il proprietario dell'elemento.
5. **ID visualizzatore** -- legge o crea un cookie visualizzatore (`VIEWER_COOKIE_NAME`) per il tracciamento anonimo.
6. **Deduplicazione giornaliera** -- registra la visualizzazione solo una volta per visualizzatore al giorno.

#### Risposta

**Stato 200** -- Visualizzazione elaborata.

```json
{ "success": true, "counted": true }
```

| Scenario | `counted` | `reason` |
|----------|-----------|----------|
| Nuova visualizzazione registrata | `true` | -- |
| Visualizzazione duplicata (stesso giorno) | `false` | -- |
| Bot rilevato | `false` | `"bot"` |
| Proprietario che visualizza il proprio elemento | `false` | `"owner"` |

**Stato 404** -- Elemento non trovato.

```json
{ "success": false, "error": "Item not found" }
```

#### Esempio curl

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/views \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
```

### Note di Implementazione

- Il cookie del visualizzatore è `HttpOnly`, `Secure` in produzione e ha `SameSite: lax`.
- La deduplicazione delle visualizzazioni è basata su `(itemId, viewerId, viewedDateUtc)` dove la data è `YYYY-MM-DD` in UTC.
- L'utilità `isBot()` controlla lo user agent rispetto agli schemi di bot noti.

---

## Voti

### Ottieni Informazioni sui Voti

Restituisce il conteggio totale dei voti e lo stato del voto dell'utente corrente (se autenticato).

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/items/{slug}/votes` |
| **Autenticazione** | Nessuna (pubblica; lo stato utente richiede sessione) |
| **Sorgente** | `items/[slug]/votes/route.ts` |

#### Risposta

**Stato 200**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `count` | `number` | Conteggio netto dei voti (voti positivi - voti negativi) |
| `userVote` | `"up" \| "down" \| null` | Voto dell'utente (`null` se non autenticato o nessun voto) |

---

### Esprimi o Aggiorna Voto

Esprime un nuovo voto o sostituisce un voto esistente.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `POST` |
| **Percorso** | `/api/items/{slug}/votes` |
| **Autenticazione** | Sessione (utente con profilo client) |
| **Sorgente** | `items/[slug]/votes/route.ts` |

#### Corpo della Richiesta

```json
{
  "type": "up"
}
```

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `type` | `string` | Sì | Tipo di voto: `"up"` o `"down"` |

#### Risposta

**Stato 200**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

| Stato | Descrizione |
|--------|-------------|
| 200 | Voto espresso con successo |
| 400 | Tipo di voto non valido |
| 401 | Non autorizzato |
| 403 | Utente bloccato (sospeso/bannato) |
| 404 | Profilo client non trovato |

#### Esempio curl

```bash
# Voto positivo
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "up" }'

# Voto negativo
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "down" }'
```

---

### Rimuovi Voto

Rimuove il voto dell'utente corrente da un elemento.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `DELETE` |
| **Percorso** | `/api/items/{slug}/votes` |
| **Autenticazione** | Sessione (utente con profilo client) |
| **Sorgente** | `items/[slug]/votes/route.ts` |

#### Risposta

**Stato 200**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

---

### Ottieni Conteggio Voti

Un endpoint leggero che restituisce solo il conteggio dei voti (senza lo stato dell'utente).

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/items/{slug}/votes/count` |
| **Autenticazione** | Nessuna (pubblica) |
| **Sorgente** | `items/[slug]/votes/count/route.ts` |

#### Risposta

**Stato 200**

```json
{
  "success": true,
  "count": 15
}
```

---

### Ottieni Stato Voto Utente

Restituisce il record di voto completo per il voto dell'utente autenticato su un elemento specifico.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/items/{slug}/votes/status` |
| **Autenticazione** | Sessione (utente) |
| **Sorgente** | `items/[slug]/votes/status/route.ts` |

#### Risposta

**Stato 200** -- L'utente ha votato.

```json
{
  "id": "vote_123abc",
  "userId": "client_456def",
  "itemId": "item_123abc",
  "voteType": "UPVOTE",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**Stato 200** -- L'utente non ha votato.

```json
null
```

---

## Metriche di Coinvolgimento

### Metriche di Coinvolgimento in Batch

Recupera le metriche di coinvolgimento (visualizzazioni, voti, valutazioni, preferiti, commenti) per più elementi in una singola richiesta.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/items/engagement` |
| **Autenticazione** | Nessuna (pubblica) |
| **Cache** | `force-dynamic` |
| **Sorgente** | `items/engagement/route.ts` |

#### Parametri di Query

| Parametro | Tipo | Richiesto | Descrizione |
|-----------|------|----------|-------------|
| `slugs` | `string` | Sì | Elenco separato da virgole di slug degli elementi (max 200) |

#### Risposta

**Stato 200**

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1500,
      "votes": 25,
      "avgRating": 4.2,
      "favorites": 12,
      "comments": 8
    },
    "another-tool": {
      "views": 800,
      "votes": 10,
      "avgRating": 3.8,
      "favorites": 5,
      "comments": 3
    }
  }
}
```

#### Codici di Errore

| Stato | Descrizione |
|--------|-------------|
| 400 | Parametro `slugs` mancante o più di 200 slug |

#### Esempio curl

```bash
curl -s "http://localhost:3000/api/items/engagement?slugs=awesome-tool,another-tool,third-tool"
```

---

### Punteggi di Popolarità (Debug)

Un endpoint di debug che restituisce gli elementi ordinati per punteggio di popolarità calcolato con una suddivisione dettagliata dei fattori di punteggio.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/items/popularity-scores` |
| **Autenticazione** | Nessuna (pubblica) |
| **Cache** | `force-dynamic` |
| **Sorgente** | `items/popularity-scores/route.ts` |

#### Parametri di Query

| Parametro | Tipo | Richiesto | Predefinito | Descrizione |
|-----------|------|----------|---------|-------------|
| `limit` | `integer` | No | `20` | Numero di elementi da restituire (max 100) |
| `locale` | `string` | No | `"en"` | Lingua per gli elementi |

#### Risposta

**Stato 200**

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Tool",
      "slug": "top-tool",
      "featured": true,
      "score": 15234,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 2500,
        "votes": 1200,
        "rating": 2100,
        "favorites": 900,
        "comments": 234,
        "recency": 300
      },
      "engagement": {
        "views": 5000,
        "votes": 50,
        "avgRating": 4.2,
        "favorites": 30,
        "comments": 15
      },
      "ageInDays": 15
    }
  ]
}
```

#### Algoritmo di Punteggio

Il punteggio di popolarità usa la scalatura logaritmica per evitare che i valori anomali dominino:

| Fattore | Peso | Formula |
|--------|--------|---------|
| Boost in evidenza | 10000 | Bonus fisso per gli elementi in evidenza |
| Visualizzazioni | 1000 | `log10(views + 1) * 1000` |
| Voti | 1200 | `log10(max(votes, 0) + 1) * 1200` |
| Valutazione media | 500 | `avgRating * 500` |
| Preferiti | 1100 | `log10(favorites + 1) * 1100` |
| Commenti | 1000 | `log10(comments + 1) * 1000` |
| Recenza | fino a 1000 | Bonus decrescente per elementi sotto i 180 giorni |

Gli elementi senza dati di coinvolgimento ricevono un piccolo punteggio euristico basato sulla qualità dei metadati (numero di tag, lunghezza del nome, presenza di icona, codice promo).

#### Esempio curl

```bash
curl -s "http://localhost:3000/api/items/popularity-scores?limit=10&locale=en"
```

---

## Utilizzo TypeScript

```typescript
// Recupera i commenti per un elemento
const commentsRes = await fetch(`/api/items/${slug}/comments`);
const { comments } = await commentsRes.json();

// Pubblica un commento
const newComment = await fetch(`/api/items/${slug}/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Great tool!', rating: 5 }),
}).then(r => r.json());

// Vota positivamente un elemento
const voteRes = await fetch(`/api/items/${slug}/votes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'up' }),
}).then(r => r.json());
console.log(`New vote count: ${voteRes.count}`);

// Registra una visualizzazione
await fetch(`/api/items/${slug}/views`, { method: 'POST' });

// Recupera il coinvolgimento in batch per più elementi
const slugList = ['tool-a', 'tool-b', 'tool-c'].join(',');
const { metrics } = await fetch(`/api/items/engagement?slugs=${slugList}`).then(r => r.json());

// Ottieni le statistiche di valutazione
const { averageRating, totalRatings } = await fetch(
  `/api/items/${slug}/comments/rating`
).then(r => r.json());
```
