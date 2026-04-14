---
id: favorites-endpoints
title: "Favorites API Endpoints"
sidebar_label: "Favorites API Endpoints"
sidebar_position: 13
---

# Favorieten API Eindpunten

De Favorieten API stelt geauthenticeerde gebruikers in staat om hun persoonlijke lijst van favoriete items te beheren. Elk favoriet slaat itemmetadata op (naam, pictogram, categorie) voor snelle weergave zonder een join met de inhoudslaag nodig te hebben.

**Bronbestanden:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|---------|-----|---------------|--------------|
| GET | `/api/favorites` | Sessie | Alle favorieten van de huidige gebruiker ophalen |
| POST | `/api/favorites` | Sessie | Een item aan favorieten toevoegen |
| DELETE | `/api/favorites/{itemSlug}` | Sessie | Een item uit favorieten verwijderen |

Alle eindpunten vereisen een geauthenticeerde gebruikerssessie en een werkende databaseverbinding (gecontroleerd via `checkDatabaseAvailability`).

---

## GET `/api/favorites`

Geeft alle items terug die door de geauthenticeerde gebruiker als favoriet zijn gemarkeerd, gesorteerd op aanmaakdatum (oudste eerst).

### Verzoek

Geen queryparameters of body vereist. Authenticatie wordt geleverd via sessiecookie.

### Reactievorm

#### 200 -- Geslaagd

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

#### 401 -- Niet geautoriseerd

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 500 -- Serverfout

```json
{
  "success": false,
  "error": "Failed to fetch favorites"
}
```

---

## POST `/api/favorites`

Voegt een item toe aan de favorieten van de geauthenticeerde gebruiker. Bevat dubbele controle om te voorkomen dat hetzelfde item twee keer wordt toegevoegd.

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|------|------|---------|--------------|
| `itemSlug` | string | **Ja** | Unieke slug-identificatie van het item |
| `itemName` | string | **Ja** | Weergavenaam van het item |
| `itemIconUrl` | string | Nee | URL naar het pictogram van het item |
| `itemCategory` | string | Nee | Categorienaam van het item |

De aanvraagbody wordt gevalideerd met een Zod-schema:

```ts
const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});
```

### Aanvraagvoorbeeld

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### Reactievorm

#### 201 -- Aangemaakt

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

#### 400 -- Validatiefout

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 -- Niet geautoriseerd

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- Conflict (Duplicaat)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Dubbele detectie

Voor het invoegen controleert de handler op een bestaand favoriet met dezelfde gebruiker en item-slug:

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

Verwijdert een specifiek item uit de favorietenlijst van de geauthenticeerde gebruiker.

### Padparameters

| Parameter | Type | Vereist | Beschrijving |
|-----------|------|---------|--------------|
| `itemSlug` | string | **Ja** | De slug van het te verwijderen item |

### Reactievorm

#### 200 -- Succesvol verwijderd

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

#### 401 -- Niet geautoriseerd

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 -- Niet gevonden

Wordt teruggegeven wanneer het favoriet niet bestaat of niet aan de huidige gebruiker toebehoort:

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### Werking

De handler verifieert eigenaarschap voor verwijdering. Het zoekt eerst naar een overeenkomend favoriet van de huidige gebruiker en verwijdert het pas als het gevonden is:

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

await db
  .delete(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  );
```

---

## Gebruiksvoorbeeld (Volledige Workflow)

```ts
// 1. Huidige favorieten ophalen
const listRes = await fetch('/api/favorites');
const { favorites } = await listRes.json();

// 2. Een nieuw favoriet toevoegen
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

// 3. Een favoriet verwijderen
const deleteRes = await fetch('/api/favorites/new-tool', {
  method: 'DELETE'
});
const { message } = await deleteRes.json();
```

## Databasevereisten

- Vereist dat de tabel `favorites` bestaat in het databaseschema.
- `checkDatabaseAvailability()` wordt aan het begin van elke handler aangeroepen.
- Foutreacties gebruiken `safeErrorResponse` om te voorkomen dat interne details uitlekken.

## Gerelateerde bronbestanden

| Bestand | Doel |
|---------|------|
| `template/app/api/favorites/route.ts` | GET (opvragen) en POST (toevoegen) handlers |
| `template/app/api/favorites/[itemSlug]/route.ts` | DELETE handler |
| `template/lib/db/schema.ts` | Tabeldefinitie van `favorites` |
| `template/lib/utils/database-check.ts` | Controle op databasebeschikbaarheid |
| `template/lib/utils/api-error.ts` | Hulpprogramma voor veilige foutreacties |
