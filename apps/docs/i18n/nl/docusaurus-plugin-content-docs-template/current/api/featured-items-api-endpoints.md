---
id: featured-items-api-endpoints
title: "Featured Items API Endpoints"
sidebar_label: "Featured Items API Endpoints"
sidebar_position: 63
---

# Uitgelichte Items API Eindpunten

De Uitgelichte Items API biedt een publiek eindpunt voor het ophalen van uitgelichte items die op de website worden weergegeven. Uitgelichte items worden beheerd via het beheerderspaneel en opgeslagen in de database met ondersteuning voor volgorde, activering en vervaldatums.

**Bron:** `template/app/api/featured-items/route.ts`

---

## Uitgelichte Items Ophalen

Geeft een lijst van actieve uitgelichte items terug voor publieke weergave. Filtert automatisch inactieve en (optioneel) verlopen items eruit.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/featured-items` |
| **Authenticatie** | Geen (publiek) |

### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|---------|-----------|--------------|
| `limit` | `integer` | Nee | `6` | Maximum aantal uitgelichte items (1-50) |
| `includeExpired` | `boolean` | Nee | `false` | Of items voorbij hun `featured_until`-datum moeten worden opgenomen |

### Reactie

**Status 200** -- Uitgelichte items succesvol opgehaald.

```json
{
  "success": true,
  "data": [
    {
      "id": "featured_123abc",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemDescription": "Boost your productivity with this amazing tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemImageUrl": "https://example.com/featured/tool-banner.jpg",
      "featuredOrder": 10,
      "isActive": true,
      "featuredAt": "2024-01-20T10:30:00.000Z",
      "featuredUntil": "2024-02-20T10:30:00.000Z",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

### Reactievelden

| Veld | Type | Beschrijving |
|------|------|--------------|
| `data` | `array` | Reeks uitgelichte item-objecten |
| `count` | `number` | Aantal teruggegeven uitgelichte items |
| `data[].id` | `string` | Record-ID van uitgelicht item |
| `data[].itemSlug` | `string` | Slug-identificatie van het item |
| `data[].itemName` | `string` | Weergavenaam van het item |
| `data[].itemDescription` | `string \| null` | Beschrijving van het uitgelichte item |
| `data[].itemIconUrl` | `string \| null` | URL van het itempictogram |
| `data[].itemImageUrl` | `string \| null` | URL van de uitgelichte bannerafbeelding |
| `data[].featuredOrder` | `number` | Weergavevolgorde (hoger = prominenter) |
| `data[].isActive` | `boolean` | Of het item momenteel uitgelicht is |
| `data[].featuredAt` | `string` (ISO 8601) | Wanneer het item uitgelicht werd |
| `data[].featuredUntil` | `string \| null` (ISO 8601) | Vervaldatum (`null` = geen vervaldatum) |
| `data[].createdAt` | `string` (ISO 8601) | Aanmaaktijdstempel van het record |
| `data[].updatedAt` | `string \| null` (ISO 8601) | Tijdstempel van laatste bijwerking |

### Sortering

Items worden gesorteerd op:
1. `featuredOrder` aflopend (hoogste volgorde eerst)
2. `featuredAt` aflopend (meest recentelijk uitgelicht eerst)

### Filterlogica

Het eindpunt past deze filters toe:

1. **Alleen actief:** Alleen items met `isActive = true` worden teruggegeven.
2. **Vervalcontrole** (wanneer `includeExpired` `false` is):
   - Items met `featuredUntil = null` worden altijd opgenomen (geen vervaldatum).
   - Items met `featuredUntil >= huidige datum` worden opgenomen (nog niet verlopen).
   - Items met `featuredUntil < huidige datum` worden uitgesloten.

### Foutreactie

**Status 500**

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### curl-voorbeelden

```bash
# Standaard uitgelichte items ophalen (top 6, verlopende items uitgesloten)
curl -s http://localhost:3000/api/featured-items

# Top 3 uitgelichte items ophalen
curl -s "http://localhost:3000/api/featured-items?limit=3"

# Verlopen uitgelichte items opnemen
curl -s "http://localhost:3000/api/featured-items?includeExpired=true"

# Parameters combineren
curl -s "http://localhost:3000/api/featured-items?limit=10&includeExpired=true"
```

### TypeScript-gebruik

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemDescription: string | null;
  itemIconUrl: string | null;
  itemImageUrl: string | null;
  featuredOrder: number;
  isActive: boolean;
  featuredAt: string;
  featuredUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  count: number;
}

async function getFeaturedItems(
  limit: number = 6,
  includeExpired: boolean = false
): Promise<FeaturedItemsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    ...(includeExpired && { includeExpired: 'true' }),
  });
  const res = await fetch(`/api/featured-items?${params}`);
  return res.json();
}

// Gebruik
const { data: featuredItems, count } = await getFeaturedItems(6);
featuredItems.forEach(item => {
  console.log(`${item.itemName} (volgorde: ${item.featuredOrder})`);
  if (item.featuredUntil) {
    console.log(`  Verloopt: ${item.featuredUntil}`);
  }
});
```

### Implementatienotities

- Databasebeschikbaarheid wordt bij aanvang gecontroleerd via `checkDatabaseAvailability()`.
- De parameter `limit` wordt geparseerd uit de querystring met een standaard van `6`. Invoer boven 50 wordt niet afgekapt (gevalideerd aan de clientzijde).
- Fouten worden alleen in ontwikkelingsmodus gelogd om ruis in productieLogs te voorkomen.
- Uitgelichte items worden beheerd via de beheerderspaneel-eindpunten (zie [Beheerdereindpunten](/template/api/admin-endpoints)).
- Het veld `featuredUntil` ondersteunt zowel permanent uitlichten (`null`) als tijdelijk uitlichten.
