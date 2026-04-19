---
id: favorites-endpoints
title: "Endpoint API Preferiti"
sidebar_label: "Preferiti"
sidebar_position: 13
---

# Endpoint API Preferiti

L'API Preferiti consente agli utenti autenticati di gestire la propria lista personale di elementi preferiti. Ogni preferito memorizza i metadati dell'elemento (nome, icona, categoria) per una visualizzazione rapida senza richiedere un join al livello dei contenuti.

**File sorgente:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## Riepilogo degli endpoint

| Metodo | Percorso | Autenticazione | Descrizione |
|--------|------|------|-------------|
| GET | `/api/favorites` | Sessione | Elenca tutti i preferiti per l'utente corrente |
| POST | `/api/favorites` | Sessione | Aggiungi un elemento ai preferiti |
| DELETE | `/api/favorites/{itemSlug}` | Sessione | Rimuovi un elemento dai preferiti |

Tutti gli endpoint richiedono una sessione utente autenticata e una connessione al database funzionante (verificata tramite `checkDatabaseAvailability`).

---

## GET `/api/favorites`

Restituisce tutti gli elementi contrassegnati come preferiti dall'utente autenticato, ordinati per data di creazione (dal più vecchio al più recente).

### Richiesta

Nessun parametro di query o corpo richiesto. L'autenticazione è fornita tramite cookie di sessione.

### Forma della risposta

#### 200 -- Successo

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

#### 401 -- Non autorizzato

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 500 -- Errore del server

```json
{
  "success": false,
  "error": "Failed to fetch favorites"
}
```

---

## POST `/api/favorites`

Aggiunge un elemento ai preferiti dell'utente autenticato. Include il controllo dei duplicati per evitare di aggiungere lo stesso elemento due volte.

### Corpo della richiesta

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `itemSlug` | string | **Sì** | Identificatore slug univoco dell'elemento |
| `itemName` | string | **Sì** | Nome visualizzato dell'elemento |
| `itemIconUrl` | string | No | URL dell'icona dell'elemento |
| `itemCategory` | string | No | Nome della categoria dell'elemento |

Il corpo della richiesta è validato usando uno schema Zod:

```ts
const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});
```

### Esempio di richiesta

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### Forma della risposta

#### 201 -- Creato

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

#### 400 -- Errore di validazione

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 -- Non autorizzato

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- Conflitto (duplicato)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Rilevamento duplicati

Prima di inserire, il gestore verifica l'esistenza di un preferito con lo stesso utente e slug dell'elemento:

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, validatedData.itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length > 0) {
  return NextResponse.json(
    { success: false, error: "Item is already in favorites" },
    { status: 409 }
  );
}
```

---

## DELETE `/api/favorites/{itemSlug}`

Rimuove un elemento specifico dalla lista dei preferiti dell'utente autenticato.

### Parametri di percorso

| Parametro | Tipo | Richiesto | Descrizione |
|-----------|------|----------|-------------|
| `itemSlug` | string | **Sì** | Lo slug dell'elemento da rimuovere |

### Forma della risposta

#### 200 -- Rimosso con successo

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

#### 401 -- Non autorizzato

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 -- Non trovato

Restituito quando il preferito non esiste o non appartiene all'utente corrente:

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### Come funziona

Il gestore verifica la proprietà prima di eliminare. Prima interroga un preferito corrispondente di proprietà dell'utente corrente, poi elimina solo se trovato:

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length === 0) {
  return NextResponse.json(
    { success: false, error: "Favorite not found" },
    { status: 404 }
  );
}
```

---

## Esempio di utilizzo (flusso completo)

```ts
// 1. Elenca i preferiti correnti
const listRes = await fetch('/api/favorites');
const { favorites } = await listRes.json();

// 2. Aggiungi un nuovo preferito
const addRes = await fetch('/api/favorites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemSlug: 'new-tool',
    itemName: 'New Tool',
    itemCategory: 'utilities'
  })
});
const { favorite } = await addRes.json();

// 3. Rimuovi un preferito
const deleteRes = await fetch('/api/favorites/new-tool', {
  method: 'DELETE'
});
const { message } = await deleteRes.json();
```

## Requisiti del database

- Richiede che la tabella `favorites` esista nello schema del database.
- `checkDatabaseAvailability()` viene chiamato all'inizio di ogni gestore.
- Le risposte di errore utilizzano `safeErrorResponse` per evitare di esporre dettagli interni.

## File sorgente correlati

| File | Scopo |
|------|---------|
| `template/app/api/favorites/route.ts` | Gestori GET (elenca) e POST (aggiungi) |
| `template/app/api/favorites/[itemSlug]/route.ts` | Gestore DELETE |
| `template/lib/db/schema.ts` | Definizione tabella `favorites` |
| `template/lib/utils/database-check.ts` | Verifica disponibilità database |
| `template/lib/utils/api-error.ts` | Utility risposta di errore sicura |
