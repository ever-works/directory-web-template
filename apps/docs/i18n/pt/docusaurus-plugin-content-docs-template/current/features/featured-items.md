---
id: featured-items
title: Sistema de itens em destaque
sidebar_label: Itens em destaque
sidebar_position: 2
---

# Sistema de itens em destaque

O sistema de itens em destaque permite que os administradores destaquem itens específicos no site com pedidos personalizados, datas de validade e controles de ativação.

## Modelo de dados

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

## Gerenciamento administrativo

### gancho useAdminFeaturedItems

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

### Resposta da API

A API de itens em destaque retorna resultados paginados com metadados de navegação:

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

## Pedido

Os itens em destaque suportam a reordenação de arrastar e soltar por meio da função `reorderItems` , que aceita uma matriz de IDs na ordem de exibição desejada:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

O campo `featuredOrder` determina a posição de exibição no frontend.

## Expiração

Os itens podem ser apresentados com uma data de validade opcional ( `featuredUntil` ). Quando definido:
- O item é automaticamente excluído da exibição após a data de validade
- O administrador pode ver os itens expirados alternando o filtro `showActiveOnly` - A remoção manual também é suportada via `removeFeaturedItem` ## Exibição do lado do cliente

### useFeaturedItemsClient Gancho

O gancho voltado ao público busca itens ativos em destaque para exibição:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### useFeatureItemsSection Gancho

Gancho de nível superior que fornece lógica de exibição em nível de seção:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## Sinalizador de recurso

Os itens em destaque respeitam o sinalizador de recurso `featuredItems` :

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

O recurso é desativado automaticamente quando `DATABASE_URL` não está configurado.

## Terminais de API

| Método | Ponto final | Descrição |
|--------|----------|------------|
| OBTER | `/api/admin/featured-items` | Listar itens em destaque (paginado) |
| POSTAR | `/api/admin/featured-items` | Adicionar um item em destaque |
| COLOCAR | `/api/admin/featured-items/:id` | Atualizar configurações de itens em destaque |
| EXCLUIR | `/api/admin/featured-items/:id` | Remover dos destaques |
| COLOCAR | `/api/admin/featured-items/reorder` | Reordenar itens em destaque |
| OBTER | `/api/featured-items` | Público: obtenha itens em destaque ativos |
