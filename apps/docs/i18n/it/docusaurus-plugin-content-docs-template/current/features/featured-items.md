---
id: featured-items
title: Sistema di articoli in primo piano
sidebar_label: Articoli in evidenza
sidebar_position: 2
---

# Sistema di articoli in primo piano

Il sistema degli elementi in primo piano consente agli amministratori di evidenziare elementi specifici sul sito con ordini personalizzati, date di scadenza e controlli di attivazione.

## Modello di dati

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

## Gestione amministrativa

### usaAdminFeaturedItems Hook

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

### Risposta dell'API

L'API degli elementi in primo piano restituisce risultati impaginati con metadati di navigazione:

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

## Ordinazione

Gli elementi in evidenza supportano il riordino tramite trascinamento tramite la funzione `reorderItems` , che accetta una serie di ID nell'ordine di visualizzazione desiderato:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

Il campo `featuredOrder` determina la posizione di visualizzazione sul frontend.

## Scadenza

Gli articoli possono essere contrassegnati con una data di scadenza opzionale ( `featuredUntil` ). Quando impostato:
- L'articolo viene automaticamente escluso dalla visualizzazione dopo la data di scadenza
- L'amministratore può vedere gli articoli scaduti attivando il filtro `showActiveOnly` - La rimozione manuale è supportata anche tramite `removeFeaturedItem` ## Visualizzazione lato client

### usaFeaturedItemsClient Hook

L'hook rivolto al pubblico recupera gli elementi in primo piano attivi per la visualizzazione:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### useFeatureItemsSection Hook

Hook di livello superiore che fornisce la logica di visualizzazione a livello di sezione:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## Flag di funzionalità

Gli articoli in evidenza rispettano il flag di funzionalità `featuredItems` :

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

La funzione viene automaticamente disabilitata quando `DATABASE_URL` non è configurato.

## Endpoint API

| Metodo | Punto finale | Descrizione |
|--------|----------|-------------|
| OTTIENI | `/api/admin/featured-items` | Elenca gli articoli in primo piano (impaginati) |
| POST | `/api/admin/featured-items` | Aggiungi un articolo in evidenza |
| METTERE | `/api/admin/featured-items/:id` | Aggiorna le impostazioni degli elementi in primo piano |
| ELIMINA | `/api/admin/featured-items/:id` | Rimuovi da in primo piano |
| METTERE | `/api/admin/featured-items/reorder` | Riordina gli articoli in evidenza |
| OTTIENI | `/api/featured-items` | Pubblico: ottieni articoli in evidenza attivi |
