---
id: internal-api-endpoints
title: "Internal API Endpoints"
sidebar_label: "Internal API Endpoints"
---

# Interne API-eindpunten

Interne API-eindpunten zijn bedoeld voor beheerders en ontwikkeling, niet voor gebruik door eindgebruikers. Ze bieden toegang tot systeemniveau-operaties zoals databaseinitialisatie, schema-synchronisatie en functionele configuratie.

## Databaseinitialisatie

### Eindpunteigenschappen

| Eigenschap | Waarde |
|---|---|
| Methode | GET |
| Pad | `/api/internal/db-init` |
| Authenticatie | Alleen ontwikkeling (`NODE_ENV === 'development'`) |
| Runtime | `nodejs` |
| Caching | `force-dynamic` |
| Bron | `template/app/api/internal/db-init/route.ts` |

### Beveiliging

Dit eindpunt is uitsluitend beschikbaar in de ontwikkelomgeving. Aanvragen die binnenkomen wanneer `NODE_ENV !== 'development'` ontvangen onmiddellijk een 403-reactie:

```
GET /api/internal/db-init
→ 403 { "error": "Not allowed in production" }
```

### Reacties

**Succes (200):**

```json
{
  "success": true,
  "message": "Database initialized successfully"
}
```

**Productieomgeving (403):**

```json
{
  "error": "Not allowed in production"
}
```

**Initialisatiefout (500):**

```json
{
  "success": false,
  "error": "Foutbericht van de databaseoperatie"
}
```

### Wat het doet

Bij aanroep in een ontwikkelomgeving:

1. Voert alle uitstaande Drizzle-databasemigraties uit
2. Seeded begingegevens (categorieën, configuratie, beheerdersaccount)
3. Garandeert dat het schema gesynchroniseerd en actueel is

### curl-voorbeeld

```bash
curl -X GET http://localhost:3000/api/internal/db-init
```

### TypeScript-gebruiksvoorbeeld

```typescript
const response = await fetch('/api/internal/db-init')
const result = await response.json()

if (result.success) {
  console.log('Database geïnitialiseerd')
} else {
  console.error('Initialisatie mislukt:', result.error)
}
```

### Implementatienotities

- Gebruikt dynamische imports (`await import(...)`) om zware databasemodules alleen te laden wanneer het eindpunt wordt aangeroepen
- Vereist de `nodejs`-runtime omdat de Edge-runtime geen databasemigraties ondersteunt
- `force-dynamic` zorgt ervoor dat Next.js het eindpunt nooit statisch rendert of cachet
- Interne fouten worden afgevangen via `safeErrorResponse` om veilige foutinformatie te retourneren
- Dit eindpunt is bedoeld als alternatief voor het handmatig uitvoeren van CLI-migratieopdrachten tijdens lokale ontwikkeling

### Gerelateerde CLI-opdrachten

In de meeste gevallen verdient het de voorkeur om de CLI-scripts direct uit te voeren via `apps/web/`:

| Opdracht | Beschrijving |
|---|---|
| `pnpm db:generate` | Migratiescripts genereren vanuit schemawijzigingen |
| `pnpm db:migrate` | Uitstaande migraties uitvoeren |
| `pnpm db:seed` | Database seeden met begingegevens |
| `pnpm db:studio` | Drizzle Studio openen voor database-inspectie |
