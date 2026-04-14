---
id: categories-api-endpoints
title: "Categories API Endpoints"
sidebar_label: "Categories API Endpoints"
---

# Categorieën API Eindpunten

De Categorieën API biedt een openbaar eindpunt om te controleren of er categorieën bestaan in het inhoudssysteem. Categorieën zijn afkomstig uit de Git-gebaseerde CMS-inhoudsrepository en vertegenwoordigen de taxonomie op het hoogste niveau voor het organiseren van items.

**Bron:** `template/app/api/categories/exists/route.ts`

---

## Bestaan van Categorieën Controleren

Controleert of er categorieën beschikbaar zijn in het systeem en geeft het aantal terug.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/categories/exists` |
| **Auth** | Geen (openbaar) |

### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|---------|-----------|-------------|
| `locale` | `string` | Nee | `"en"` | Localecode voor het ophalen van categorieën (bijv. `en`, `fr`, `de`) |

### Antwoord

**Status 200** -- Bestaan van categorieën succesvol gecontroleerd.

```json
{
  "exists": true,
  "count": 12
}
```

| Veld | Type | Beschrijving |
|------|------|--------------|
| `exists` | `boolean` | Of er categorieën bestaan |
| `count` | `number` | Aantal gevonden categorieën |

### Foutafhandeling

Bij elke fout geeft het eindpunt een `200`-antwoord met veilige standaardinstellingen in plaats van een foutstatuscode:

```json
{
  "exists": false,
  "count": 0
}
```

Dit veilige gedrag zorgt ervoor dat de UI op een nette manier kan terugvallen als het inhoudssysteem niet beschikbaar is.

### curl-voorbeeld

```bash
# Controleer of categorieën bestaan (standaard locale)
curl -s http://localhost:3000/api/categories/exists

# Controleer categorieën voor de Franstalige locale
curl -s http://localhost:3000/api/categories/exists?locale=fr
```

### TypeScript Gebruik

```typescript
interface CategoriesExistResponse {
  exists: boolean;
  count: number;
}

async function checkCategoriesExist(locale: string = 'en'): Promise<CategoriesExistResponse> {
  const res = await fetch(`/api/categories/exists?locale=${locale}`);
  return res.json();
}

// Gebruik
const { exists, count } = await checkCategoriesExist('en');
if (exists) {
  console.log(`${count} categorieën gevonden`);
}
```

### Implementatienotities

- Categorieën worden opgehaald uit de Git-gebaseerde CMS via `fetchItems()` vanuit `@/lib/content`.
- Het eindpunt vereist geen authenticatie -- het is ontworpen voor gebruik door de publieke UI om categorienavigatie-elementen conditioneel te renderen.
- Fouten worden alleen gelogd in de ontwikkelingsmodus (`NODE_ENV === 'development'`).
- De `locale`-parameter wordt gekoppeld aan de optie `lang` in de inhoudsophalinglaag.
