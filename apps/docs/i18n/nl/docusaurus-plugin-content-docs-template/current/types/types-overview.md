---
id: types-overview
title: Typ Systeemoverzicht
sidebar_label: Overzicht
sidebar_position: 0
---

# Typ Systeemoverzicht

De sjabloon maakt gebruik van een uitgebreid TypeScript-typesysteem in `lib/types/`. Deze typedefinities dienen als de enige bron van waarheid voor datastructuren die worden gebruikt in API-routes, services, opslagplaatsen en UI-componenten.

## Typ bestanden

De map `lib/types/` bevat de volgende modules:

|Bestand|Beschrijving|
|------|-------------|
|`item.ts`|Artikelgegevens, CRUD-aanvragen, lijstopties, validatieconstanten en statusdefinities|
|`user.ts`|Beheerdersgegevens, authenticatietypen, Zod-validatieschema's en helperfuncties|
|`profile.ts`|Openbare gebruikersprofielstructuur inclusief sociale links, vaardigheden, portfolio en inzendingen|
|`category.ts`|Categoriegegevens, CRUD-verzoeken, lijstopties en validatieconstanten|
|`comment.ts`|Typen opmerkingen afgeleid van het databaseschema, inclusief door de gebruiker verrijkte opmerkingen|
|`vote.ts`|Stemschema (Zod), reactietypen, fouttypen en stemstatus aan de clientzijde|
|`survey.ts`|Enquête- en enquêtereactietypen, filteropties en status/type-opsommingen|
|`location.ts`|Locatie-instellingen, typen geoquery's, typen kaartaanbieders en coördinaatgegevens|
|`sponsor-ad.ts`|Sponsoradvertentietypen, waaronder verzoeken, reacties, statistieken en dashboardgegevens|
|`client.ts`|Typen klantprofielen voor de klantgerichte portal, inclusief dashboard en statistieken|
|`client-item.ts`|Inzendingstypen voor items aan de klantzijde met betrokkenheidsstatistieken en statusfilters|
|`role.ts`|Rol- en machtigingstypen voor het RBAC-systeem|
|`tag.ts`|Taggegevens, CRUD-verzoeken, lijstopties en validatieconstanten|
|`twenty-crm-config.types.ts`|Twintig configuratie- en verbindingstesttypen voor CRM-integratie|
|`twenty-crm-entities.types.ts`|Twintig CRM-entiteitstypen voor persoons- en bedrijfsrecords|
|`twenty-crm-errors.types.ts`|Gestructureerde fouttypen, foutcodes en typebeschermingen voor CRM-fouten|
|`twenty-crm-sync.types.ts`|Upsert-bewerkingen, cache-items en synchronisatiegerelateerde typen|

## Architectuurpatronen

### Consistent CRUD-patroon

De meeste entiteitstypen volgen een consistent patroon van interfaces:

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### Validatieconstanten

Elke entiteitsmodule exporteert een validatieconstantenobject met `as const` voor typeveiligheid:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

Deze constanten worden gebruikt bij zowel de validatie aan de serverzijde als de formuliervalidatie aan de clientzijde, waardoor consistente regels voor de hele stapel worden gegarandeerd.

### Gediscrimineerde reacties van de Unie

API-antwoordtypen gebruiken gediscrimineerde vakbonden voor typeveilige foutafhandeling:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

Dit patroon wordt gebruikt door `SponsorAdResponse`, `ClientResponse`, `ClientListResponse` en anderen.

### Zod Schema-integratie

Verschillende modules gebruiken Zod voor runtime-validatie naast TypeScript-typen:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

Dit wordt gebruikt in `vote.ts` (voor het stemschema) en `user.ts` (voor gebruikersvalidatie).

### Uitgebreide typen met relaties

Typen die gerelateerde gegevens bevatten, gebruiken het trefwoord `extends`:

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## Importconventies

Typen worden geïmporteerd met het trefwoord `type` voor importen met alleen typen:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

Dit zorgt ervoor dat typen tijdens het compileren worden gewist en de bundelgrootte niet beïnvloeden.

## Configuratie versus runtimetypen

De locatiemodule demonstreert een patroon dat wordt gebruikt voor configuratie:

- **Configtypen** gebruiken `snake_case` om YAML-configuratiebestanden te matchen
- **Runtime-typen** gebruiken `camelCase` voor idiomatisch TypeScript-gebruik
- Een mappingfunctie converteert tussen de twee formaten

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## Statusopsommingen en labels

Statuswaarden worden gedefinieerd als const-objecten met bijbehorende label- en kleurtoewijzingen:

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Database-afgeleide typen

Sommige typen worden rechtstreeks afgeleid uit het Drizzle ORM-schema:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

Deze aanpak zorgt ervoor dat typen automatisch gesynchroniseerd blijven met databasemigraties.

## Gerelateerde documentatie

- [Item Types](./item-types.md) - Kernitemgegevensstructuren
- [Gebruikerstypen](./user-types.md) - Gebruikersauthenticatie en profieltypen
- [Categorietypen](./category-types.md) - Categoriebeheertypen
- [Reactietypen](./comment-types.md) - Typen reacties en recensies
- [Stemtypen](./vote-types.md) - Typen stemsystemen
- [Enquêtetypen](./survey-types.md) - Enquête- en antwoordtypen
- [Locatietypen](./location-types.md) - Geolocatie- en kaarttypen
- [Sponsoradvertentietypen](./sponsor-ad-types.md) - Sponsoring- en advertentietypen
- [CRM-typen](./crm-types.md) - Twintig typen CRM-integratie
