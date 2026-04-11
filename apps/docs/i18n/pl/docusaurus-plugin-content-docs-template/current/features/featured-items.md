---
id: featured-items
title: System polecanych przedmiotów
sidebar_label: Polecane przedmioty
sidebar_position: 2
---

# System polecanych przedmiotów

System polecanych pozycji umożliwia administratorom wyróżnianie określonych pozycji w witrynie za pomocą niestandardowej kolejności, dat ważności i kontroli aktywacji.

## Model danych

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

## Zarządzanie administracyjne

### hak useAdminFeaturedItems

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

### Odpowiedź API

Interfejs API polecanych elementów zwraca wyniki podzielone na strony z metadanymi nawigacji:

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

## Zamawianie

Polecane elementy obsługują zmianę kolejności metodą „przeciągnij i upuść” za pomocą funkcji `reorderItems` , która akceptuje tablicę identyfikatorów w żądanej kolejności wyświetlania:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

Pole `featuredOrder` określa pozycję wyświetlacza na froncie.

## Wygaśnięcie

Przedmioty mogą być wyróżnione opcjonalną datą ważności ( `featuredUntil` ). Po ustawieniu:
- Artykuł jest automatycznie wykluczany z ekspozycji po upływie daty ważności
- Administrator może zobaczyć wygasłe elementy, przełączając filtr `showActiveOnly` - Ręczne usuwanie jest również obsługiwane przez `removeFeaturedItem` ## Wyświetlacz po stronie klienta

### useFeaturedItemsClient Hook

Hak widoczny publicznie pobiera aktywne polecane elementy do wyświetlenia:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### hak useFeatureItemsSection

Hak wyższego poziomu, który zapewnia logikę wyświetlania na poziomie sekcji:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## Flaga funkcji

Polecane elementy są zgodne z flagą funkcji `featuredItems` :

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

Funkcja jest automatycznie wyłączona, jeśli `DATABASE_URL` nie jest skonfigurowana.

## Punkty końcowe interfejsu API

| Metoda | Punkt końcowy | Opis |
|--------|----------|------------|
| OTRZYMAJ | `/api/admin/featured-items` | Lista polecanych elementów (stronicowana) |
| POST | `/api/admin/featured-items` | Dodaj wyróżniony przedmiot |
| POSTAW | `/api/admin/featured-items/:id` | Zaktualizuj ustawienia polecanego elementu |
| USUŃ | `/api/admin/featured-items/:id` | Usuń z polecanych |
| POSTAW | `/api/admin/featured-items/reorder` | Zmień kolejność polecanych elementów |
| OTRZYMAJ | `/api/featured-items` | Publiczne: uzyskaj aktywne polecane elementy |
