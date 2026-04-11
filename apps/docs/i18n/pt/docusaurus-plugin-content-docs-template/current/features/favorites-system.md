---
id: favorites-system
title: Sistema de Favoritos
sidebar_label: Favoritos
sidebar_position: 33
---

# Sistema de favoritos

O recurso de favoritos permite que usuários autenticados marquem itens do diretório para acesso rápido. Inclui uma página de favoritos dedicada, atualizações de UI otimistas, uma API REST completa apoiada por PostgreSQL e integração com sinalizadores de recursos para renderização condicional.

## Visão geral da arquitetura

```
hooks/
  use-favorites.ts           # React Query hook with optimistic mutations

components/favorites/
  favorites-client.tsx       # Full favorites page with grid, sorting, pagination

app/api/favorites/
  route.ts                   # GET (list) and POST (add) endpoints
  [itemSlug]/route.ts        # DELETE endpoint for removing a favorite

lib/db/schema.ts             # favorites table definition
```

## Esquema de banco de dados

A tabela `favorites` armazena relacionamentos de marcadores entre usuários e itens:

```ts
export const favorites = pgTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemSlug: text('item_slug').notNull(),
  itemName: text('item_name').notNull(),
  itemIconUrl: text('item_icon_url'),
  itemCategory: text('item_category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  userItemIndex: uniqueIndex('user_item_favorite_unique_idx').on(table.userId, table.itemSlug),
  userIdIndex: index('favorites_user_id_idx').on(table.userId),
  itemSlugIndex: index('favorites_item_slug_idx').on(table.itemSlug),
  createdAtIndex: index('favorites_created_at_idx').on(table.createdAt),
}));
```

### Decisões de projeto

- **Metadados desnormalizados** -- `itemName` , `itemIconUrl` e `itemCategory` são armazenados junto com o slug para que a lista de favoritos seja renderizada sem ingressar na tabela de itens.
- **Restrição exclusiva composta** -- o índice `(userId, itemSlug)` evita favoritos duplicados no nível do banco de dados.
- **Pesquisas indexadas** – índices separados em `userId` , `itemSlug` e `createdAt` otimizam padrões de consulta comuns para listagem, contagem e ordem cronológica.

## useFavorites Gancho

A principal API do lado do cliente com suporte completo para atualização otimista:

```ts
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  createdAt: string;
  updatedAt: string;
}

interface AddFavoriteRequest {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}
```

### Valor de retorno

| Propriedade | Tipo | Descrição |
|----------|------|------------|
| `favorites` | `Favorite[]` | Lista atual de favoritos dos usuários |
| `isLoading` | `boolean` | True durante a busca inicial |
| `error` | `Error \| null` | Erro de busca, se houver |
| `refetch` | `() => void` | Buscar novamente os favoritos manualmente |
| `isFavorited` | `(slug: string) => boolean` | Verifique se um item está marcado |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | Adicionar ou remover com base no estado atual |
| `addFavorite` | `(data: AddFavoriteRequest) => void` | Adicione um favorito explicitamente |
| `removeFavorite` | `(slug: string) => void` | Remover um favorito explicitamente |
| `isAdding` | `boolean` | Verdadeiro enquanto a mutação add estiver em andamento |
| `isRemoving` | `boolean` | Verdadeiro enquanto a mutação de remoção está em andamento |

### Fluxo de atualização otimista

Tanto a adição quanto a remoção de mutações seguem o padrão de atualização otimista do React Query:

1. ** `onMutate` ** -- cancela consultas em andamento, tira um instantâneo do estado anterior e aplica a mudança otimista imediatamente. Adicionar mutações cria um favorito temporário com um ID prefixado `temp-` .
2. ** `onError` ** -- reverte para o snapshot se a chamada da API falhar, exibe um alerta de erro.
3. ** `onSuccess` ** -- substitua a entrada otimista por dados confirmados pelo servidor. A mutação add substitui de forma inteligente a entrada temporária combinando `itemSlug` , evitando duplicatas.

A invalidação `onSettled` é omitida intencionalmente para evitar buscas desnecessárias. A atualização otimista mais a atualização de cache `onSuccess` fornecem consistência suficiente.

### Integração de sinalizadores de recursos

A consulta só é habilitada quando ambas as condições são atendidas:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

Quando o sinalizador de recurso `favorites` está desabilitado ou o usuário não está autenticado, o gancho retorna um array vazio sem fazer nenhuma solicitação de rede.

### Uso

```tsx
import { useFavorites } from '@/hooks/use-favorites';

function ItemCard({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();

  return (
    <button
      onClick={() => toggleFavorite({
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.icon,
        itemCategory: item.category,
      })}
      disabled={isAdding || isRemoving}
    >
      {isFavorited(item.slug) ? 'Unfavorite' : 'Favorite'}
    </button>
  );
}
```

## Terminais de API

### GET /api/favoritos

Retorna todos os favoritos do usuário autenticado, ordenados por data de criação.

### POST /api/favoritos

Adiciona um item aos favoritos. Valida com Zod e verifica duplicatas (retorna 409 em conflito).

| Campo | Obrigatório | Descrição |
|-------|----------|------------|
| `itemSlug` | Sim | Identificador único do artigo |
| `itemName` | Sim | Nome de exibição da lista de favoritos |
| `itemIconUrl` | Não | URL do ícone para renderização |
| `itemCategory` | Não | Etiqueta de categoria |

### DELETE /api/favorites/[itemSlug]

Remove um item específico dos favoritos do usuário por slug. Retorna 404 se não for encontrado.

## Página de favoritos

O componente `FavoritesClient` renderiza a página completa de favoritos:

1. **Porta de autenticação** – prompt de login para usuários não autenticados.
2. **Carregando esqueleto** – espaço reservado para grade de 8 cartas durante a busca inicial.
3. **Estado de erro** – mensagem de erro com um botão de nova tentativa.
4. **Estado vazio** - mensagem com uma seção alternativa de "itens populares".
5. **Grade de favoritos** – itens exibidos com classificação, paginação e alternância de layout.

### Opções de classificação

| Valor | Etiqueta |
|-------|-------|
| `popularity` | Popularidade |
| `name-asc` | Nome A-Z |
| `name-desc` | Nome Z-A |
| `date-asc` | Mais antigo |

### Integração de layout

A página integra-se com `useLayoutTheme()` para alternar visualização de grade/lista/cartão. Um `ViewToggle` e `SortMenu` aparecem acima dos itens. A paginação do lado do cliente divide os favoritos em páginas de 12, com `clampAndScrollToTop` na mudança de página.

## Sincronização entre dispositivos

Os favoritos são armazenados no servidor no PostgreSQL, para que sejam sincronizados automaticamente entre dispositivos quando o usuário é autenticado. O cache React Query com um tempo obsoleto de 5 minutos equilibra atualização com desempenho. A sincronização manual está disponível através da função `refetch` .

## Acessibilidade

- O botão de alternância de favoritos é desativado durante mutações pendentes para evitar ações duplas.
- As notificações do Toast fornecem feedback para operações bem-sucedidas e com falha.
- A grade da página de favoritos usa os mesmos componentes de cartão acessíveis da listagem principal.
- Os estados vazio e de erro incluem elementos acionáveis ​​para navegação pelo teclado.

## Documentação Relacionada

- [Feature Flags](/docs/template/configuration/feature-config) -- Ativando/desativando o recurso de favoritos
- [Componentes do cartão compartilhado](/docs/template/components/shared-card-components) -- Renderização do cartão na grade de favoritos
- [Provedores de contexto](/docs/template/components/context-providers) -- Integração de tema de layout
- [Componentes do painel](/docs/template/components/dashboard-components) -- Contagens de favoritos em análises
