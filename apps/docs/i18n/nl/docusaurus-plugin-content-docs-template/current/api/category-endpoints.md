---
id: category-endpoints
title: "Category API Endpoints"
sidebar_label: "Category API Endpoints"
---

# Categorie API Eindpunten

De Categorieën API biedt een lichtgewicht openbaar eindpunt voor het controleren of categorieën bestaan in het systeem. Categorieën zijn afgeleid van de inhoudslaag (Git-gebaseerde CMS) in plaats van een database, waardoor dit eindpunt beschikbaar is zelfs zonder databaseverbinding.

**Bronbestand:** `template/app/api/categories/exists/route.ts`

## Eindpuntoverzicht

| Methode | Pad | Auth | Beschrijving |
|---------|-----|------|--------------|
| GET | `/api/categories/exists` | Geen | Controleer of categorieën bestaan |

---

## GET `/api/categories/exists`

Controleert of er categorieën beschikbaar zijn in de inhoudsrepository. Geeft een boolean `exists`-vlag terug samen met het totale aantal. Dit eindpunt is nuttig voor conditionele UI-rendering -- bijvoorbeeld het verbergen van een categoriefilter wanneer er geen categorieën zijn gedefinieerd.

### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|---------|-----------|-------------|
| `locale` | string | Nee | `"en"` | Localecode voor het ophalen van gelokaliseerde categorieën |

### Hoe Het Werkt

De handler roept `fetchItems` aan vanuit de inhoudslaag met de gevraagde locale en inspecteert vervolgens de teruggegeven `categories`-array:

```ts
const locale = request?.nextUrl?.searchParams?.get('locale') || 'en';
const { categories } = await fetchItems({ lang: locale });

const hasCategories = Array.isArray(categories) && categories.length > 0;

return NextResponse.json({
  exists: hasCategories,
  count: categories?.length || 0
});
```

### Antwoordvorm

#### 200 -- Categorieën Gevonden

```json
{
  "exists": true,
  "count": 12
}
```

#### 200 -- Geen Categorieën

```json
{
  "exists": false,
  "count": 0
}
```

#### Foutafhandeling

Bij elke fout geeft het eindpunt een veilige terugvalwaarde terug in plaats van een 500. Dit zorgt ervoor dat consumenten altijd op de antwoordvorm kunnen vertrouwen:

```json
{
  "exists": false,
  "count": 0
}
```

Fouten worden alleen gelogd in de ontwikkelingsmodus (`NODE_ENV === 'development'`).

### Authenticatie

Dit is een **openbaar eindpunt** -- geen authenticatie vereist.

### Gebruiksvoorbeeld

```ts
// Controleer of categorieën bestaan alvorens filter-UI te renderen
const res = await fetch('/api/categories/exists?locale=fr');
const { exists, count } = await res.json();

if (exists) {
  console.log(`${count} categorieën gevonden`);
  // Render categoriefilter
}
```

### Notities

- Categorieën zijn afkomstig uit de Git-gebaseerde CMS inhoudslaag, niet de database.
- Het eindpunt is locale-bewust, zodat verschillende locales verschillende aantallen categorieën kunnen hebben.
- Fouten worden stil afgehandeld om de UI niet te breken -- het eindpunt geeft altijd geldige JSON terug.
- Er worden geen cache-headers ingesteld door de handler; caching wordt beheerd op infrastructuurniveau.

### Gerelateerde Bronbestanden

| Bestand | Doel |
|---------|------|
| `template/app/api/categories/exists/route.ts` | Route-handler |
| `template/lib/content.ts` | De functie `fetchItems` die categorieën oplost |
