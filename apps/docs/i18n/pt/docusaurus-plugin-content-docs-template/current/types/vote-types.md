---
id: vote-types
title: Definições de tipo de voto
sidebar_label: Tipos de voto
sidebar_position: 5
---

# Definições de tipo de voto

**Fonte:** `lib/types/vote.ts`

O sistema de votação permite que os usuários votem positivamente nos itens. Este módulo define o esquema de dados de votação usando Zod para validação em tempo de execução, juntamente com os tipos de resposta, erro e estado do lado do cliente.

## Esquema Zod

### `voteSchema`

O esquema de dados de votação canônica definido com Zod. Isso serve como validador de tempo de execução e fonte para o tipo `Vote` TypeScript.

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## Tipos

### `Vote`

O tipo de dados de voto, inferido de `voteSchema`:

```typescript
type Vote = z.infer<typeof voteSchema>;
```

Isso resolve para:

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|Campo|Tipo|Descrição|
|-------|------|-------------|
|`id`|`string`|Identificador exclusivo de voto|
|`userId`|`string`|ID do usuário que votou|
|`itemId`|`string`|ID ou slug do item votado|
|`createdAt`|`Date`|Data e hora em que o voto foi lançado|

### `VoteResponse`

Resposta da API retornada após uma operação de alternância de votação.

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|Campo|Tipo|Descrição|
|-------|------|-------------|
|`success`|`boolean`|Se a operação foi concluída com sucesso|
|`voteCount`|`number`|Contagem total de votos atualizada para o item|
|`hasVoted`|`boolean`|Se o usuário atual votou após a operação|
|`message`|`string?`|Mensagem de status opcional|

### `VoteError`

Estrutura de resposta a erros para operações de votação com falha.

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|Campo|Tipo|Descrição|
|-------|------|-------------|
|`error`|`string`|Mensagem de erro legível por humanos|
|`code`|`string?`|Código de erro legível por máquina para tratamento programático|

### `VoteState`

Estado do lado do cliente para o componente de UI de votação. Usado com ganchos React para gerenciar o estado da votação no navegador.

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|Campo|Tipo|Descrição|
|-------|------|-------------|
|`voteCount`|`number`|Contagem total atual de votos exibida ao usuário|
|`hasVoted`|`boolean`|Se o usuário atual votou (controla o estado do botão)|
|`isLoading`|`boolean`|Se uma operação de votação está em andamento (desativa o botão)|
|`error`|`string?`|Mensagem de erro a ser exibida, se houver|

## Exemplos de uso

### Validando dados de votação com Zod

```typescript
import { voteSchema } from '@/lib/types/vote';

const rawData = {
  id: 'vote-123',
  userId: 'user-456',
  itemId: 'my-tool',
  createdAt: new Date(),
};

const result = voteSchema.safeParse(rawData);
if (result.success) {
  console.log('Valid vote:', result.data);
} else {
  console.error('Invalid vote data:', result.error.issues);
}
```

### Gerenciando o estado de votação em um componente React

```typescript
import type { VoteState, VoteResponse } from '@/lib/types/vote';
import { useState } from 'react';

function useVote(initialCount: number, initialVoted: boolean) {
  const [state, setState] = useState<VoteState>({
    voteCount: initialCount,
    hasVoted: initialVoted,
    isLoading: false,
  });

  async function toggleVote(itemId: string) {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const res = await fetch(`/api/items/${itemId}/vote`, {
        method: 'POST',
      });
      const data: VoteResponse = await res.json();

      if (data.success) {
        setState({
          voteCount: data.voteCount,
          hasVoted: data.hasVoted,
          isLoading: false,
        });
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to toggle vote',
      }));
    }
  }

  return { ...state, toggleVote };
}
```

### Lidando com erros de votação

```typescript
import type { VoteError } from '@/lib/types/vote';

function handleVoteError(error: VoteError) {
  switch (error.code) {
    case 'UNAUTHORIZED':
      // Redirect to login
      break;
    case 'RATE_LIMITED':
      // Show rate limit message
      break;
    default:
      // Show generic error
      console.error(error.error);
  }
}
```

## Notas de projeto

### Alternar comportamento

O sistema de votação usa um padrão de alternância: chamar o endpoint de votação para um item adiciona ou remove o voto do usuário. O campo `VoteResponse.hasVoted` indica o novo estado após a alternância.

### Integração Zod + TypeScript

O tipo `Vote` é derivado do esquema Zod em vez de ser definido separadamente. Isso garante que a validação em tempo de execução e a verificação de tipo em tempo de compilação usem a mesma definição:

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### Separação de estado cliente-servidor

- `Vote` representa o registro do banco de dados
- `VoteResponse` é a resposta da API após uma mutação
- `VoteState` é o estado da UI do lado do cliente
- `VoteError` é a estrutura de resposta a erros

Essa separação mantém claras as preocupações entre a camada de dados, a camada API e a camada UI.

## Tipos Relacionados

- [`Comment`](./comment-types.md) - Outro tipo de interação do usuário por item
- [`ItemData`](./item-types.md) - O item pai ao qual os votos pertencem
