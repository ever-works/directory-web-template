---
id: featured-items
title: Uitgelichte items-systeem
sidebar_label: Uitgelichte artikelen
sidebar_position: 2
---

# Uitgelichte items-systeem

Met het systeem voor aanbevolen items kunnen beheerders specifieke items op de site markeren met aangepaste volgorde, vervaldatums en activeringsopties.

## Gegevensmodel

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;        // Display position
  featuredUntil?: string;       // Expiration date (ISO string)
  isActive: boolean;
  featuredBy: string;           // Admin user ID
  featuredAt: string;           // When it was featured
  createdAt: string;
  updatedAt: string;
}
```

## Beheerderbeheer

### gebruikAdminFeaturedItems Hook

```typescript
import { useAdminFeaturedItems } from '@/hooks/use-admin-featured-items';

const {
  // Data
  featuredItems,        // FeaturedItem[]
  allItems,             // ItemData[] (for picker)
  filteredItems,        // FeaturedItem[] (after local search/filter)

  // State
  isLoading, isSubmitting,
  currentPage, totalPages, totalItems,
  searchTerm, showActiveOnly,

  // Actions
  setSearchTerm,        // (term: string) => void
  setShowActiveOnly,    // (active: boolean) => void
  addFeaturedItem,      // (data) => Promise<boolean>
  updateFeaturedItem,   // (id, data) => Promise<boolean>
  removeFeaturedItem,   // (id) => Promise<boolean>
  reorderItems,         // (orderedIds: string[]) => Promise<boolean>
  refetch, refreshData,
} = useAdminFeaturedItems({ page: 1, limit: 20 });
```

### API-reactie

De API voor aanbevolen items retourneert gepagineerde resultaten met navigatiemetagegevens:

```typescript
interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## Bestellen

Uitgelichte items ondersteunen het herschikken via slepen en neerzetten via de functie `reorderItems` , die een reeks ID's in de gewenste weergavevolgorde accepteert:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

Het veld `featuredOrder` bepaalt de weergavepositie op de frontend.

## Vervaldatum

Artikelen kunnen worden weergegeven met een optionele vervaldatum ( `featuredUntil` ). Indien ingesteld:
- Het artikel wordt na de vervaldatum automatisch uitgesloten van weergave
- De beheerder kan verlopen items zien door het `showActiveOnly` filter in of uit te schakelen
- Handmatige verwijdering wordt ook ondersteund via `removeFeaturedItem` ## Weergave aan de clientzijde

### gebruikFeaturedItemsClient Hook

De naar het publiek gerichte haak haalt actieve aanbevolen items op voor weergave:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### gebruikFeatureItemsSection Hook

Hook op een hoger niveau die weergavelogica op sectieniveau biedt:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## Functievlag

Uitgelichte items respecteren de functievlag `featuredItems` :

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

De functie wordt automatisch uitgeschakeld als `DATABASE_URL` niet is geconfigureerd.

## API-eindpunten

| Werkwijze | Eindpunt | Beschrijving |
|--------|----------|------------|
| KRIJG | `/api/admin/featured-items` | Lijst aanbevolen items (gepagineerd) |
| POST | `/api/admin/featured-items` | Voeg een uitgelicht item toe |
| ZET | `/api/admin/featured-items/:id` | Instellingen voor aanbevolen items bijwerken |
| VERWIJDEREN | `/api/admin/featured-items/:id` | Verwijderen uit aanbevolen |
| ZET | `/api/admin/featured-items/reorder` | Uitgelichte items opnieuw ordenen |
| KRIJG | `/api/featured-items` | Openbaar: ontvang actieve aanbevolen items |
