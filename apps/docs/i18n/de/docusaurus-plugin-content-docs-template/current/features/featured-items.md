---
id: featured-items
title: Featured Items-System
sidebar_label: Ausgewählte Artikel
sidebar_position: 2
---

# Featured Items System

Das System für hervorgehobene Artikel ermöglicht es Administratoren, bestimmte Artikel auf der Website mit benutzerdefinierten Bestell-, Ablaufdaten- und Aktivierungskontrollen hervorzuheben.

## Datenmodell

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

## Admin-Verwaltung

### useAdminFeaturedItems Hook

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

### API-Antwort

Die API für vorgestellte Artikel gibt paginierte Ergebnisse mit Navigationsmetadaten zurück:

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

Empfohlene Elemente unterstützen die Neuordnung per Drag-and-Drop über die Funktion `reorderItems` , die eine Reihe von IDs in der gewünschten Anzeigereihenfolge akzeptiert:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

Das Feld `featuredOrder` bestimmt die Anzeigeposition im Frontend.

## Ablauf

Artikel können mit einem optionalen Ablaufdatum ( `featuredUntil` ) gekennzeichnet werden. Wenn eingestellt:
- Der Artikel wird nach Ablauf des Ablaufdatums automatisch von der Anzeige ausgeschlossen
- Der Administrator kann abgelaufene Artikel sehen, indem er den `showActiveOnly` -Filter umschaltet
- Manuelles Entfernen wird auch über `removeFeaturedItem` unterstützt

## Clientseitige Anzeige

### useFeaturedItemsClient Hook

Der öffentlich zugängliche Hook ruft aktive vorgestellte Elemente zur Anzeige ab:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### useFeatureItemsSection Hook

Hook auf höherer Ebene, der Anzeigelogik auf Abschnittsebene bereitstellt:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## Feature-Flag

Hervorgehobene Artikel respektieren das `featuredItems` -Feature-Flag:

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

Die Funktion wird automatisch deaktiviert, wenn `DATABASE_URL` nicht konfiguriert ist.

## API-Endpunkte

| Methode | Endpunkt | Beschreibung |
|--------|----------|-------------|
| GET | `/api/admin/featured-items` | Empfohlene Artikel auflisten (paginiert) |
| POST | `/api/admin/featured-items` | Einen vorgestellten Artikel hinzufügen |
| PUT | `/api/admin/featured-items/:id` | Einstellungen für ausgewählte Artikel aktualisieren |
| LÖSCHEN | `/api/admin/featured-items/:id` | Aus den Empfehlungen entfernen |
| PUT | `/api/admin/featured-items/reorder` | Empfohlene Artikel neu anordnen |
| GET | `/api/featured-items` | Öffentlich: Aktive ausgewählte Artikel erhalten |
