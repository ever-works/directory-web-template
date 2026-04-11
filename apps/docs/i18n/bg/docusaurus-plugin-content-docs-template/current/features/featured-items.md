---
id: featured-items
title: Система за избрани артикули
sidebar_label: Представени артикули
sidebar_position: 2
---

# Система за избрани артикули

Системата за представени артикули позволява на администраторите да маркират конкретни артикули на сайта с персонализирано подреждане, дати на изтичане и контроли за активиране.

## Модел на данни

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

## Управление на администратора

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

### API отговор

API за представени елементи връща пагинирани резултати с метаданни за навигация:

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

## Поръчване

Представените елементи поддържат пренареждане чрез плъзгане и пускане чрез функцията `reorderItems` , която приема масив от идентификатори в желания ред на показване:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

Полето `featuredOrder` определя позицията на дисплея в интерфейса.

## Изтичане

Артикулите могат да бъдат представени с незадължителен срок на годност ( `featuredUntil` ). Когато е зададено:
- Артикулът автоматично се изключва от показване след изтичане на срока на годност
- Администраторът може да види артикули с изтекъл срок на годност, като превключи филтъра `showActiveOnly` - Ръчното премахване също се поддържа чрез `removeFeaturedItem` ## Дисплей от страна на клиента

### useFeaturedItemsClient Hook

Обществената кука извлича активни представени елементи за показване:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### useFeatureItemsSection Hook

Кука от по-високо ниво, която осигурява логика за показване на ниво раздел:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## Флаг за функция

Представените елементи спазват флага за функция `featuredItems` :

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

Функцията се дезактивира автоматично, когато `DATABASE_URL` не е конфигуриран.

## API крайни точки

| Метод | Крайна точка | Описание |
|--------|----------|-------------|
| ВЗЕМЕТЕ | `/api/admin/featured-items` | Списък на представените елементи (страничен) |
| ПУБЛИКАЦИЯ | `/api/admin/featured-items` | Добавяне на представен артикул |
| ПОСТАВЕТЕ | `/api/admin/featured-items/:id` | Актуализиране на настройките на избрания елемент |
| ИЗТРИВАНЕ | `/api/admin/featured-items/:id` | Премахване от представените |
| ПОСТАВЕТЕ | `/api/admin/featured-items/reorder` | Пренаредете представените елементи |
| ВЗЕМЕТЕ | `/api/featured-items` | Обществено: вземете активни избрани елементи |
