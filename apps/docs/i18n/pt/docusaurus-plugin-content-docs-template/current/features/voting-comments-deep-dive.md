---
id: voting-comments-deep-dive
title: Votação e comentários aprofundados
sidebar_label: Votação e comentários aprofundados
sidebar_position: 36
---

# Votação e comentários aprofundados

Este mergulho profundo abrange a mecânica interna dos sistemas de votação e comentários, incluindo algoritmos de atualização otimistas, estratégias de gerenciamento de cache, agregação de classificação, coordenação de eventos entre componentes e fluxos de trabalho de moderação administrativa.

## Visão geral da arquitetura

```
hooks/
  use-item-vote.ts           # Vote hook with optimistic mutations and cache utilities
  use-comments.ts            # Comment CRUD hook with rating integration
  use-admin-comments.ts      # Admin moderation hook with pagination

app/api/items/[id]/
  votes/route.ts             # GET/POST/DELETE vote endpoints
  comments/route.ts          # GET/POST comment endpoints
  comments/[commentId]/route.ts  # PUT/DELETE single comment
  comments/rating/route.ts   # POST/PUT/GET rating endpoints

lib/db/schema.ts             # votes and comments table definitions
```

## Sistema de votação interno

### useItemVote Gancho

O gancho gerencia o estado de votação para um único item com suporte completo para atualização otimista:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### Máquina de estado de votação

A função `handleVote` implementa uma máquina de estado baseada em alternância:

| Estado Atual | Ação | Resultado | Variação Líquida |
|-------------|--------|--------|------------|
| Sem votação | Clique para cima | Voto positivo | +1 |
| Sem votação | Clique para baixo | Voto negativo | -1 |
| Votado | Clique para cima | Remover voto (desativar) | -1 |
| Votado | Clique para baixo | Mudar para voto negativo | -2 |
| Votado negativamente | Clique para baixo | Remover voto (desativar) | +1 |
| Votado negativamente | Clique para cima | Mudar para voto positivo | +2 |

Quando o voto atual do usuário corresponde ao tipo solicitado, o gancho chama `unvote()` (DELETE). Caso contrário, ele chama `vote(type)` (POST).

### Cálculo de contagem otimista

A atualização otimista calcula o diferencial de contagem sem esperar pelo servidor:

```ts
onMutate: async (type) => {
  const previousVotes = queryClient.getQueryData(['item-votes', itemId]);
  queryClient.setQueryData(['item-votes', itemId], (old) => {
    if (!old) return { count: type === 'up' ? 1 : -1, userVote: type };
    const countDiff = old.userVote === type ? -1
      : old.userVote === null ? 1
      : 2; // switching direction
    return {
      count: old.count + (type === 'up' ? countDiff : -countDiff),
      userVote: old.userVote === type ? null : type
    };
  });
  return { previousVotes };
},
```

O cálculo `countDiff` lida com três casos: desativação (subtrair 1), votação nova (adicionar 1) e mudar de direção (adicionar 2 para o movimento completo).

### Portão de autenticação

Usuários não autenticados que tentam votar recebem um modal de login em vez de receber um erro:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

O erro é capturado pelo manipulador `onError` da mutação, que verifica a mensagem de autenticação e suprime o brinde do erro.

### Configuração de consulta

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### Utilitários de cache de votação

O gancho `useVoteCache` fornece operações de cache entre componentes:

```ts
function useVoteCache() {
  return {
    invalidateAllVotes,    // Invalidate all vote queries
    invalidateItemVotes,   // Invalidate votes for a specific item
    clearVoteCache,        // Remove all vote data from cache
    prefetchItemVotes,     // Pre-fetch votes for an item (e.g., on hover)
  };
}
```

## Comentários internos do sistema

### useComments Gancho

O gancho fornece operações CRUD completas com suporte de classificação integrado:

```ts
interface CreateCommentData {
  content: string;
  itemId: string;
  rating: number;
}

interface UpdateCommentData {
  commentId: string;
  content?: string;
  rating?: number;
}
```

### Valor de retorno

| Propriedade | Tipo | Descrição |
|----------|------|------------|
| `comments` | `CommentWithUser[]` | Comentários com dados de usuário preenchidos |
| `isPending` | `boolean` | True durante a busca inicial |
| `createComment` | `(data) => Promise` | Crie um novo comentário |
| `updateComment` | `(data) => Promise` | Editar um comentário existente |
| `deleteComment` | `(id) => Promise` | Remover um comentário |
| `rateComment` | `(data) => void` | Avalie um comentário |
| `updateCommentRating` | `(data) => void` | Atualizar uma classificação existente |
| `commentRating` | `number` | Avaliação agregada do item |

### Sistema de eventos entre componentes

O sistema de comentários despacha eventos DOM personalizados para coordenação entre componentes que não compartilham chaves de cache do React Query:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

Isso permite que componentes como o cabeçalho de detalhes do item (que mostra a contagem de comentários) reajam às alterações dos comentários sem serem diretamente acoplados à consulta de comentários.

### Agregação de classificação

Comentários e classificações estão totalmente integrados. Após qualquer mutação de comentário (criar, atualizar, excluir), o gancho força uma nova busca da classificação do item:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

Isso garante que a exibição da classificação por estrelas seja atualizada imediatamente após um usuário enviar ou editar uma avaliação.

### Estabilidade de consulta

A consulta de comentários usa configurações de atualização conservadoras para evitar oscilações da IU:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## Moderação administrativa

### gancho useAdminComments

O gancho de moderação administrativa fornece gerenciamento de comentários paginados:

```ts
function useAdminComments({ page, limit, search }) {
  return {
    comments: AdminCommentItem[],
    totalComments: number,
    totalPages: number,
    isDeleting: string | null,  // ID of comment being deleted
    deleteComment: (id: string) => Promise<boolean>,
  };
}
```

### Fluxo de trabalho de moderação

1. O administrador navega até a página de gerenciamento de comentários.
2. Os comentários são exibidos com pesquisa e paginação.
3. O estado `isDeleting` rastreia qual comentário está sendo removido, desativando sua linha.
4. A exclusão aciona uma notificação ao autor do comentário via `NotificationService` .

## Terminais de API

| Método | Ponto final | Descrição |
|--------|----------|------------|
| OBTER | `/api/items/:id/votes` | Buscar contagem de votos e voto do usuário |
| POSTAR | `/api/items/:id/votes` | Lançar ou alterar um voto |
| EXCLUIR | `/api/items/:id/votes` | Remover um voto |
| OBTER | `/api/items/:id/comments` | Buscar comentários com dados do usuário |
| POSTAR | `/api/items/:id/comments` | Crie um novo comentário |
| COLOCAR | `/api/items/:id/comments/:commentId` | Atualizar um comentário |
| EXCLUIR | `/api/items/:id/comments/:commentId` | Excluir um comentário |
| POSTAR | `/api/items/:id/comments/rating` | Avalie um comentário |
| COLOCAR | `/api/items/:id/comments/rating` | Atualizar uma classificação de comentário |
| OBTER | `/api/items/:id/comments/rating` | Obtenha classificação agregada do item |

## Integração de sinalizadores de recursos

Tanto a votação quanto os comentários respeitam os sinalizadores de recursos:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

Quando o banco de dados não está configurado, esses recursos são desabilitados automaticamente.

## Acessibilidade

- Os botões de votação usam `aria-pressed` para indicar o estado atual da votação.
- O modo de login acionado por tentativas de voto não autenticadas fica com foco bloqueado.
- Os formulários de comentários usam associações `<label>` e mensagens de validação adequadas.
- O componente de classificação por estrelas oferece suporte à navegação pelo teclado com teclas de seta.
- As tabelas de moderação administrativa incluem indicadores de status em nível de linha e ações acessíveis pelo teclado.
- Os estados de carregamento e erro fornecem atributos `aria-busy` e `role="alert"` respectivamente.

## Documentação Relacionada

- [Visão geral de votação e comentários](/docs/template/features/voting-comments) -- Visão geral de alto nível dos recursos
- [Componentes de detalhes do item](/docs/template/components/item-detail-components) -- Onde votos e comentários são renderizados
- [Sistema de Notificação](/docs/template/features/notification-system) -- Notificações acionadas por comentários
- [Componentes do painel](/docs/template/components/dashboard-components) -- Análise de votos e comentários
