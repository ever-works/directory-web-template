---
id: featured-items
title: Система избранных предметов
sidebar_label: Рекомендуемые товары
sidebar_position: 2
---

# Система избранных предметов

Система избранных элементов позволяет администраторам выделять определенные элементы на сайте с помощью индивидуального порядка, сроков годности и элементов управления активацией.

## Модель данных

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

## Административное управление

### хук useAdminFeaturedItems

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

### Ответ API

API избранных элементов возвращает результаты с разбивкой на страницы с метаданными навигации:

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

## Заказ

Рекомендуемые элементы поддерживают изменение порядка перетаскиванием с помощью функции `reorderItems` , которая принимает массив идентификаторов в желаемом порядке отображения:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

Поле `featuredOrder` определяет положение отображения на внешнем интерфейсе.

## Срок действия

Предметы могут быть отмечены опциональной датой истечения срока действия ( `featuredUntil` ). Когда установлено:
- Товар автоматически исключается из показа по истечении срока годности
- Администратор может видеть элементы с истекшим сроком действия, переключая фильтр `showActiveOnly` .
- Удаление вручную также поддерживается с помощью `removeFeaturedItem` ## Отображение на стороне клиента

### useFeaturedItemsClient Хук

Публичный хук извлекает для отображения активные избранные элементы:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### хук useFeatureItemsSection

Перехватчик более высокого уровня, обеспечивающий логику отображения на уровне раздела:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## Флаг функции

Рекомендуемые элементы соответствуют флагу функции `featuredItems` :

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

Эта функция автоматически отключается, если `DATABASE_URL` не настроено.

## Конечные точки API

| Метод | Конечная точка | Описание |
|--------|----------|-------------|
| ПОЛУЧИТЬ | `/api/admin/featured-items` | Список избранных элементов (постраничный) |
| ПОСТ | `/api/admin/featured-items` | Добавить избранный элемент |
| ПУТЬ | `/api/admin/featured-items/:id` | Обновить настройки избранного элемента |
| УДАЛИТЬ | `/api/admin/featured-items/:id` | Удалить из избранного |
| ПУТЬ | `/api/admin/featured-items/reorder` | Изменить порядок избранных элементов |
| ПОЛУЧИТЬ | `/api/featured-items` | Общедоступно: получить активные избранные элементы |
