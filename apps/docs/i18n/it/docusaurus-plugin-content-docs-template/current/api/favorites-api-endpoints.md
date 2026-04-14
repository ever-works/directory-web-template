---
id: favorites-api-endpoints
title: Endpoint API Preferiti
sidebar_label: API Preferiti
sidebar_position: 62
---

# Endpoint API Preferiti

L'API Preferiti consente agli utenti autenticati di gestire i propri elementi preferiti. Gli utenti possono elencare, aggiungere e rimuovere elementi dalla loro lista personale dei preferiti. I record dei preferiti memorizzano i metadati degli elementi (nome, icona, categoria) per una visualizzazione rapida senza join alla tabella degli elementi.

**Directory sorgente:** `template/app/api/favorites/`

---

## Autenticazione

Tutti gli endpoint dei preferiti richiedono l'autenticazione basata su sessione. Le richieste non autenticate ricevono:

**Stato 401**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Elenca preferiti dell'utente

Restituisce tutti gli elementi contrassegnati come preferiti dall'utente autenticato.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/favorites` |
| **Autenticazione** | Sessione (utente) |
| **Sorgente** | `favorites/route.ts` |

### Risposta

**Stato 200**

```json
{
  "success": true,
  "favorites": [
    {
      "id": "fav_123abc",
      "userId": "user_456def",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemCategory": "productivity",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `favorites[].id` | `string` | ID del record dei preferiti |
| `favorites[].userId` | `string` | Utente che ha aggiunto l'elemento ai preferiti |
| `favorites[].itemSlug` | `string` | Identificatore slug dell'elemento |
| `favorites[].itemName` | `string` | Nome visualizzato dell'elemento |
| `favorites[].itemIconUrl` | `string \| null` | URL dell'icona dell'elemento |
| `favorites[].itemCategory` | `string \| null` | Categoria dell'elemento |
| `favorites[].createdAt` | `string` (ISO 8601) | Quando l'elemento è stato aggiunto ai preferiti |
| `favorites[].updatedAt` | `string \| null` | Timestamp dell'ultimo aggiornamento |

I preferiti sono ordinati per `createdAt` (dal più vecchio al più recente).

### Esempio curl

```bash
curl -s http://localhost:3000/api/favorites \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Aggiungi ai preferiti

Aggiunge un elemento alla lista dei preferiti dell'utente autenticato.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `POST` |
| **Percorso** | `/api/favorites` |
| **Autenticazione** | Sessione (utente) |
| **Sorgente** | `favorites/route.ts` |

### Corpo della richiesta

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `itemSlug` | `string` | Sì | Identificatore slug univoco dell'elemento (min 1 char) |
| `itemName` | `string` | Sì | Nome visualizzato dell'elemento (min 1 char) |
| `itemIconUrl` | `string` | No | URL dell'icona dell'elemento |
| `itemCategory` | `string` | No | Categoria dell'elemento |

### Risposte

**Stato 201** -- Preferito aggiunto con successo.

```json
{
  "success": true,
  "favorite": {
    "id": "fav_123abc",
    "userId": "user_456def",
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Stato 400** -- Dati della richiesta non validi.

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

**Stato 409** -- Elemento già nei preferiti.

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Esempio curl

```bash
curl -s -X POST http://localhost:3000/api/favorites \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity"
  }'
```

---

## Rimuovi dai preferiti

Rimuove un elemento specifico dalla lista dei preferiti dell'utente autenticato.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `DELETE` |
| **Percorso** | `/api/favorites/{itemSlug}` |
| **Autenticazione** | Sessione (utente) |
| **Sorgente** | `favorites/[itemSlug]/route.ts` |

### Parametri di percorso

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `itemSlug` | `string` | Identificatore slug dell'elemento da rimuovere dai preferiti |

### Risposte

**Stato 200** -- Preferito rimosso con successo.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Stato 404** -- Preferito non trovato.

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### Esempio curl

```bash
curl -s -X DELETE http://localhost:3000/api/favorites/awesome-productivity-tool \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Utilizzo TypeScript

```typescript
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl: string | null;
  itemCategory: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// Elenca tutti i preferiti
async function getFavorites(): Promise<Favorite[]> {
  const res = await fetch('/api/favorites');
  const data = await res.json();
  return data.favorites;
}

// Aggiungi ai preferiti
async function addFavorite(item: {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}): Promise<Favorite> {
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (res.status === 409) {
    throw new Error('L\'elemento è già nei preferiti');
  }

  const data = await res.json();
  return data.favorite;
}

// Rimuovi dai preferiti
async function removeFavorite(itemSlug: string): Promise<void> {
  const res = await fetch(`/api/favorites/${itemSlug}`, {
    method: 'DELETE',
  });

  if (res.status === 404) {
    throw new Error('Preferito non trovato');
  }
}

// Attiva/disattiva preferito
async function toggleFavorite(
  itemSlug: string,
  itemName: string,
  isFavorited: boolean
): Promise<void> {
  if (isFavorited) {
    await removeFavorite(itemSlug);
  } else {
    await addFavorite({ itemSlug, itemName });
  }
}
```

### Note di implementazione

- La tabella dei preferiti utilizza un controllo di unicità composto su `(userId, itemSlug)` per prevenire i duplicati.
- I metadati degli elementi (`itemName`, `itemIconUrl`, `itemCategory`) sono memorizzati nel record dei preferiti stesso, consentendo una visualizzazione rapida senza query aggiuntive.
- L'eliminazione verifica la proprietà -- un utente può solo rimuovere i preferiti che possiede.
- La disponibilità del database viene verificata all'inizio di ogni richiesta tramite `checkDatabaseAvailability()`.
- Gli errori di validazione restituiscono i dettagli degli errori Zod nel campo `details`.
