---
id: client-api-endpoints
title: "Client API Endpoints"
sidebar_label: "Client API Endpoints"
---

# Client API Eindpunten

De Client API biedt geverifieerde eindpunten voor geregistreerde gebruikers om hun ingediende items te beheren, dashboardstatistieken te bekijken en toegang te krijgen tot geografische gegevens. Alle eindpunten vereisen sessiegerichte authenticatie via `requireClientAuth()`.

**Bronmap:** `template/app/api/client/`

---

## Authenticatie

Elk eindpunt in deze groep vereist een geldige gebruikerssessie. Niet-geverifieerde verzoeken ontvangen:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized. Please sign in to continue."
}
```

---

## Dashboardstatistieken

### Dashboardstatistieken Ophalen

Geeft uitgebreide dashboardstatistieken terug voor de geverifieerde gebruiker.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/client/dashboard/stats` |
| **Auth** | Sessie (gebruiker) |
| **Bron** | `client/dashboard/stats/route.ts` |

#### Antwoord

**Status 200**

```json
{
  "success": true,
  "totalSubmissions": 23,
  "totalViews": 0,
  "totalVotesReceived": 156,
  "totalCommentsReceived": 89,
  "viewsAvailable": false,
  "recentActivity": {
    "newSubmissions": 3,
    "newViews": 0
  },
  "uniqueItemsInteracted": 45,
  "totalActivity": 237,
  "activityChartData": [
    { "date": "Mon", "submissions": 1, "views": 0, "engagement": 5 }
  ],
  "engagementChartData": [
    { "name": "Votes", "value": 156, "color": "#8884d8" }
  ],
  "submissionTimeline": [
    { "month": "Mar", "submissions": 5 }
  ],
  "engagementOverview": [
    { "week": "W1", "votes": 10, "comments": 3 }
  ],
  "statusBreakdown": [
    { "status": "Approved", "value": 15, "color": "#22c55e" },
    { "status": "Pending", "value": 5, "color": "#f59e0b" },
    { "status": "Rejected", "value": 3, "color": "#ef4444" }
  ],
  "topItems": [
    { "id": "item_1", "title": "My Tool", "views": 100, "votes": 25, "comments": 8 }
  ]
}
```

#### curl-voorbeeld

```bash
curl -s http://localhost:3000/api/client/dashboard/stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Geografische Statistieken Ophalen

Geeft geografische dekkingsstatistieken terug voor de items van de geverifieerde gebruiker.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/client/geo-stats` |
| **Auth** | Sessie (gebruiker) |
| **Bron** | `client/geo-stats/route.ts` |

#### Antwoord

**Status 200**

```json
{
  "success": true,
  "total_items": 10,
  "items_with_location": 7,
  "items_remote": 2,
  "service_area_breakdown": [
    { "area": "local", "count": 3 },
    { "area": "regional", "count": 2 }
  ],
  "top_cities": [
    { "city": "New York", "count": 3 }
  ],
  "top_countries": [
    { "country": "United States", "count": 5 }
  ]
}
```

---

### Itemcoördinaten Ophalen

Geeft coördinaten terug voor alle gebruikersitems die locatiegegevens hebben, geschikt voor kaartweergave.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/client/items/coordinates` |
| **Auth** | Sessie (gebruiker) |
| **Bron** | `client/items/coordinates/route.ts` |

#### Antwoord

**Status 200**

```json
{
  "success": true,
  "coordinates": [
    {
      "slug": "my-item",
      "name": "My Item",
      "latitude": 40.7128,
      "longitude": -74.006
    }
  ]
}
```

---

## Itemsbeheer

### Gebruikersitems Weergeven

Geeft een gepagineerde lijst terug van items ingediend door de geverifieerde gebruiker.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/client/items` |
| **Auth** | Sessie (gebruiker) |
| **Bron** | `client/items/route.ts` |

#### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|---------|-----------|-------------|
| `page` | `integer` | Nee | `1` | Paginanummer (min: 1) |
| `limit` | `integer` | Nee | `10` | Items per pagina (1-100) |
| `status` | `string` | Nee | -- | Filter: `all`, `pending`, `approved`, `rejected` |
| `search` | `string` | Nee | -- | Zoeken op itemnaam of beschrijving |
| `sortBy` | `string` | Nee | -- | Sorteerveld |
| `sortOrder` | `string` | Nee | -- | Sorteerrichting |
| `deleted` | `boolean` | Nee | `false` | Als `true`, geeft zachte-verwijderde items terug |

#### Antwoord

**Status 200**

```json
{
  "success": true,
  "items": [ /* item-objecten */ ],
  "total": 23,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "stats": {
    "total": 20,
    "pending": 3,
    "approved": 15,
    "rejected": 2,
    "deleted": 1
  }
}
```

---

### Item Aanmaken

Maakt een nieuwe iteminzending aan. Het item wordt ingesteld op de status `pending` voor admin-beoordeling.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `POST` |
| **Pad** | `/api/client/items` |
| **Auth** | Sessie (gebruiker) |
| **Bron** | `client/items/route.ts` |

#### Verzoeklichaam

```json
{
  "name": "Awesome Tool",
  "description": "A great productivity tool that helps teams collaborate.",
  "source_url": "https://example.com",
  "category": "Productivity",
  "tags": ["collaboration", "remote-work"],
  "icon_url": "https://example.com/icon.png"
}
```

| Veld | Type | Vereist | Beschrijving |
|------|------|---------|-------------|
| `name` | `string` | Ja | Itemnaam (3-100 tekens) |
| `description` | `string` | Ja | Itembeschrijving (10-500 tekens) |
| `source_url` | `string` (URI) | Ja | Hoofd-URL/link voor het item |
| `category` | `string \| string[]` | Nee | Categorienaam of array van categorieën |
| `tags` | `string[]` | Nee | Array van tagstrings |
| `icon_url` | `string` (URI) | Nee | URL naar itemicoon |

#### Antwoord

**Status 201**

```json
{
  "success": true,
  "item": { /* aangemaakt item-object */ },
  "message": "Item submitted successfully. It will be reviewed by our team before being published."
}
```

---

### Enkel Item Ophalen

Geeft details van een specifiek item terug dat eigendom is van de geverifieerde gebruiker.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/client/items/{id}` |
| **Auth** | Sessie (gebruiker, eigenaar) |
| **Bron** | `client/items/[id]/route.ts` |

#### Antwoord

**Status 200**

```json
{
  "success": true,
  "item": { /* item-object */ },
  "engagement": {
    "views": 150,
    "likes": 23
  }
}
```

---

### Item Bijwerken

Werkt een item bij dat eigendom is van de geverifieerde gebruiker. Als het item eerder was goedgekeurd, verandert bijwerken de status naar `pending` voor herbeoordeling.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `PUT` |
| **Pad** | `/api/client/items/{id}` |
| **Auth** | Sessie (gebruiker, eigenaar) |
| **Bron** | `client/items/[id]/route.ts` |

#### Antwoord

**Status 200**

```json
{
  "success": true,
  "item": { /* bijgewerkt item-object */ },
  "statusChanged": true,
  "previousStatus": "approved",
  "message": "Item updated successfully. Since it was previously approved, it has been moved to pending for re-review."
}
```

| Veld | Type | Beschrijving |
|------|------|-------------|
| `statusChanged` | `boolean` | `true` als status gewijzigd is van approved naar pending |
| `previousStatus` | `string` | Status van het item vóór de update |

---

### Item Verwijderen (Zachte Verwijdering)

Verwijdert een item zacht dat eigendom is van de geverifieerde gebruiker. Het item wordt verborgen maar kan later worden hersteld.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `DELETE` |
| **Pad** | `/api/client/items/{id}` |
| **Auth** | Sessie (gebruiker, eigenaar) |
| **Bron** | `client/items/[id]/route.ts` |

#### Antwoord

**Status 200**

```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

---

### Item Herstellen

Herstelt een eerder zacht-verwijderd item.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `POST` |
| **Pad** | `/api/client/items/{id}/restore` |
| **Auth** | Sessie (gebruiker, eigenaar) |
| **Bron** | `client/items/[id]/restore/route.ts` |

#### Antwoord

**Status 200**

```json
{
  "success": true,
  "item": { /* hersteld item-object */ },
  "message": "Item restored successfully"
}
```

---

### Inzendingstatistieken Ophalen

Geeft statistieken terug over de inzendingen van de geverifieerde gebruiker gegroepeerd op status.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/client/items/stats` |
| **Auth** | Sessie (gebruiker) |
| **Bron** | `client/items/stats/route.ts` |

#### Antwoord

**Status 200**

```json
{
  "success": true,
  "stats": {
    "total": 12,
    "draft": 2,
    "pending": 3,
    "approved": 5,
    "rejected": 2,
    "deleted": 1
  }
}
```

---

## Foutantwoordpatroon

Alle client API-eindpunten volgen een consistente foutvorm:

```json
{
  "success": false,
  "error": "Mensleesbaar foutbericht"
}
```

Foutantwoorden gebruiken het hulpprogramma `serverErrorResponse()`, dat gedetailleerde foutinformatie aan de serverzijde logt terwijl slechts een generiek bericht naar de client wordt gestuurd om informatieblootstelling te voorkomen.
