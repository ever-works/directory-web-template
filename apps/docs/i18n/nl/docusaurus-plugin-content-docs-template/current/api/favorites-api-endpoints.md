---
id: favorites-api-endpoints
title: "Favorites API Endpoints"
sidebar_label: "Favorites API Endpoints"
sidebar_position: 62
---

# Favorieten API Eindpunten

De Favorieten API stelt geauthenticeerde gebruikers in staat om hun favoriete items te beheren. Gebruikers kunnen items van hun persoonlijke favorietenlijst opvragen, toevoegen en verwijderen. Favorietenrecords slaan itemmetadata op (naam, pictogram, categorie) voor snelle weergave zonder een join met de itemstabel nodig te hebben.

**Bronmap:** `template/app/api/favorites/`

---

## Authenticatie

Alle favorieten-eindpunten vereisen sessiegebaseerde authenticatie. Niet-geauthenticeerde verzoeken ontvangen:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Gebruikersfavorieten Ophalen

Geeft alle items terug die door de geauthenticeerde gebruiker zijn toegevoegd aan favorieten.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/favorites` |
| **Authenticatie** | Sessie (gebruiker) |
| **Bron** | `favorites/route.ts` |

### Reactie

**Status 200**

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

| Veld | Type | Beschrijving |
|------|------|--------------|
| `favorites[].id` | `string` | Record-ID van favoriet |
| `favorites[].userId` | `string` | Gebruiker die het item als favoriet heeft gemarkeerd |
| `favorites[].itemSlug` | `string` | Slug-identificatie van het item |
| `favorites[].itemName` | `string` | Weergavenaam van het item |
| `favorites[].itemIconUrl` | `string \| null` | URL van het itempictogram |
| `favorites[].itemCategory` | `string \| null` | Categorie van het item |
| `favorites[].createdAt` | `string` (ISO 8601) | Wanneer het item als favoriet is gemarkeerd |
| `favorites[].updatedAt` | `string \| null` | Tijdstempel van laatste bijwerking |

Favorieten zijn gesorteerd op `createdAt` (oudste eerst).

### curl-voorbeeld

```bash
curl -s http://localhost:3000/api/favorites \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Favoriet Toevoegen

Voegt een item toe aan de favorietenlijst van de geauthenticeerde gebruiker.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `POST` |
| **Pad** | `/api/favorites` |
| **Authenticatie** | Sessie (gebruiker) |
| **Bron** | `favorites/route.ts` |

### Aanvraagbody

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

| Veld | Type | Vereist | Beschrijving |
|------|------|---------|--------------|
| `itemSlug` | `string` | Ja | Unieke slug-identificatie van het item (min. 1 teken) |
| `itemName` | `string` | Ja | Weergavenaam van het item (min. 1 teken) |
| `itemIconUrl` | `string` | Nee | URL van het itempictogram |
| `itemCategory` | `string` | Nee | Categorie van het item |

### Reacties

**Status 201** -- Favoriet succesvol toegevoegd.

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

**Status 400** -- Ongeldige aanvraaggegevens.

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

**Status 409** -- Item staat al in favorieten.

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### curl-voorbeeld

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

## Favoriet Verwijderen

Verwijdert een specifiek item uit de favorietenlijst van de geauthenticeerde gebruiker.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `DELETE` |
| **Pad** | `/api/favorites/{itemSlug}` |
| **Authenticatie** | Sessie (gebruiker) |
| **Bron** | `favorites/[itemSlug]/route.ts` |

### Padparameters

| Parameter | Type | Beschrijving |
|-----------|------|--------------|
| `itemSlug` | `string` | Slug-identificatie van het item dat uit favorieten verwijderd moet worden |

### Reacties

**Status 200** -- Favoriet succesvol verwijderd.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Status 404** -- Favoriet niet gevonden.

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### curl-voorbeeld

```bash
curl -s -X DELETE http://localhost:3000/api/favorites/awesome-productivity-tool \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## TypeScript-gebruik

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

// Alle favorieten ophalen
async function getFavorites(): Promise<Favorite[]> {
  const res = await fetch('/api/favorites');
  const data = await res.json();
  return data.favorites;
}

// Aan favorieten toevoegen
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
    throw new Error('Item staat al in favorieten');
  }

  const data = await res.json();
  return data.favorite;
}

// Uit favorieten verwijderen
async function removeFavorite(itemSlug: string): Promise<void> {
  const res = await fetch(`/api/favorites/${itemSlug}`, {
    method: 'DELETE',
  });

  if (res.status === 404) {
    throw new Error('Favoriet niet gevonden');
  }
}

// Favoriet omschakelen
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

### Implementatienotities

- De favorietentabel gebruikt een samengestelde uniekheidscontrole op `(userId, itemSlug)` om duplicaten te voorkomen.
- Itemmetadata (`itemName`, `itemIconUrl`, `itemCategory`) wordt opgeslagen in het favorietenrecord zelf, wat snelle weergave mogelijk maakt zonder extra query's.
- Verwijdering controleert eigenaarschap -- een gebruiker kan alleen zijn eigen favorieten verwijderen.
- Databasebeschikbaarheid wordt bij aanvang van elk verzoek gecontroleerd via `checkDatabaseAvailability()`.
- Validatiefouten geven Zod-foutdetails terug in het veld `details`.
