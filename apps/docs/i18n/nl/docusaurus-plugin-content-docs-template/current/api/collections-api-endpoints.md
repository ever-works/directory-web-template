---
id: collections-api-endpoints
title: "Collections API Endpoints"
sidebar_label: "Collections API Endpoints"
---

# Collecties API Eindpunten

De Collecties API biedt een openbaar eindpunt om te controleren of er actieve collecties bestaan in de database. Collecties zijn samengestelde groeperingen van items die worden beheerd via het adminpaneel en opgeslagen in de database via de collectierepository.

**Bron:** `template/app/api/collections/exists/route.ts`

---

## Bestaan van Collecties Controleren

Controleert of er actieve collecties beschikbaar zijn in het systeem.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/collections/exists` |
| **Auth** | Geen (openbaar) |

### Queryparameters

Geen.

### Antwoord

**Status 200** -- Bestaan van collecties succesvol gecontroleerd.

```json
{
  "exists": true,
  "count": 5
}
```

| Veld | Type | Beschrijving |
|------|------|-------------|
| `exists` | `boolean` | Of er actieve collecties bestaan |
| `count` | `number` | Aantal actieve collecties |

### Foutantwoord

**Status 500** -- Interne serverfout.

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

| Veld | Type | Beschrijving |
|------|------|-------------|
| `exists` | `boolean` | Altijd `false` bij fout |
| `count` | `number` | Altijd `0` bij fout |
| `error` | `string` | Generieke foutmelding (gedetailleerde fouten worden alleen aan serverzijde gelogd) |

### curl-voorbeeld

```bash
# Controleer of actieve collecties bestaan
curl -s http://localhost:3000/api/collections/exists
```

### TypeScript Gebruik

```typescript
interface CollectionsExistResponse {
  exists: boolean;
  count: number;
  error?: string;
}

async function checkCollectionsExist(): Promise<CollectionsExistResponse> {
  const res = await fetch('/api/collections/exists');
  return res.json();
}

// Gebruik
const { exists, count } = await checkCollectionsExist();
if (exists) {
  console.log(`${count} actieve collecties gevonden`);
} else {
  console.log('Geen collecties beschikbaar');
}
```

### Implementatienotities

- Collecties worden opgehaald uit de database via `collectionRepository.findAll()` met `includeInactive: false`, wat betekent dat alleen actieve collecties worden geteld.
- In tegenstelling tot het categorieën-eindpunt geeft dit eindpunt een correcte `500`-status terug bij fouten in plaats van stilzwijgend veilige standaarden te retourneren.
- Het foutantwoord bevat een generiek `error`-veld -- gedetailleerde foutinformatie wordt aan de serverzijde gelogd om informatieblootstelling te voorkomen.
- Dit eindpunt wordt door de frontend gebruikt om de collectienavigatie-sectie conditioneel te renderen.
