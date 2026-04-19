---
id: vote-endpoints
title: Endpoints de Votos
sidebar_label: Votos
sidebar_position: 25
---

# Endpoints de Votos

O sistema de votação fornece endpoints para votar a favor (upvote) e contra (downvote) em itens. Os votos utilizam um modelo de pontuação líquida, em que a contagem representa os upvotes menos os downvotes. Os endpoints públicos retornam a contagem de votos, enquanto os endpoints autenticados permitem registrar, atualizar e remover votos. Usuários bloqueados são impedidos de votar.

## Visão geral

| Endpoint | Método | Autenticação | Descrição |
|---|---|---|---|
| `/api/items/[slug]/votes` | GET | Público | Obter contagem de votos e status do voto do usuário |
| `/api/items/[slug]/votes` | POST | Usuário | Registrar ou atualizar um voto |
| `/api/items/[slug]/votes` | DELETE | Usuário | Remover um voto |
| `/api/items/[slug]/votes/count` | GET | Público | Obter apenas a contagem líquida de votos |
| `/api/items/[slug]/votes/status` | GET | Usuário | Obter o registro completo de voto do usuário |

## Endpoint Combinado de Votos

### Obter Informações de Voto

```
GET /api/items/[slug]/votes
```

Retorna a contagem líquida de votos de um item e o status de voto do usuário atual, se autenticado. Nenhuma autenticação é necessária, mas usuários autenticados recebem seu status de voto na resposta.

**Parâmetros de caminho:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `slug` | string | Slug do item |

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `success` | boolean | Sempre `true` em caso de sucesso |
| `count` | integer | Contagem líquida de votos (upvotes menos downvotes) |
| `userVote` | string ou null | `"up"`, `"down"` ou `null` se não autenticado ou sem voto |

Para usuários não autenticados, `userVote` é sempre `null`. A `count` pode ser negativa se houver mais downvotes do que upvotes.

**Fonte:** `template/app/api/items/[slug]/votes/route.ts`

### Registrar ou Atualizar Voto

```
POST /api/items/[slug]/votes
```

Registra um novo voto ou substitui um voto existente em um item. Se o usuário já possui um voto, o voto anterior é excluído antes de o novo ser criado. Isso significa que mudar de upvote para downvote (ou vice-versa) é uma operação única.

**Autenticação:** Obrigatória

**Corpo da solicitação:**

```json
{
  "type": "up"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `type` | string | Sim | `"up"` para upvote, `"down"` para downvote |

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

A resposta retorna a contagem líquida de votos atualizada após o voto ser aplicado.

**Respostas de Erro:**

| Status | Condição |
|---|---|
| 400 | Tipo de voto inválido (deve ser `"up"` ou `"down"`) |
| 401 | Não autenticado |
| 403 | Usuário está suspenso ou banido |
| 404 | Perfil de cliente não encontrado |

**Fonte:** `template/app/api/items/[slug]/votes/route.ts`

### Remover Voto

```
DELETE /api/items/[slug]/votes
```

Remove o voto do usuário atual de um item. Se nenhum voto existir, a operação é concluída com sucesso sem erro (idempotente). Após a remoção, `userVote` é `null`.

**Autenticação:** Obrigatória

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

| Status | Condição |
|---|---|
| 401 | Não autenticado |
| 404 | Perfil de cliente não encontrado |

**Fonte:** `template/app/api/items/[slug]/votes/route.ts`

## Endpoint de Contagem de Votos

### Obter Contagem de Votos

```
GET /api/items/[slug]/votes/count
```

Retorna apenas a contagem líquida de votos de um item. Este é um endpoint público leve, otimizado para recuperação rápida da contagem de votos sem o status de voto específico do usuário.

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "count": 15
}
```

A contagem pode ser positiva, negativa ou zero, dependendo do equilíbrio entre upvotes e downvotes.

**Fonte:** `template/app/api/items/[slug]/votes/count/route.ts`

## Endpoint de Status de Voto

### Obter Status de Voto do Usuário

```
GET /api/items/[slug]/votes/status
```

Retorna o registro completo de voto do usuário autenticado em um item específico. Retorna `null` se o usuário não votou no item.

**Autenticação:** Obrigatória

**Resposta de Sucesso (200) — Usuário Votou:**

```json
{
  "id": "vote_123abc",
  "userId": "client_456def",
  "itemId": "item_123abc",
  "voteType": "UPVOTE",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**Resposta de Sucesso (200) — Sem Voto:**

```json
null
```

Observe que este endpoint retorna os valores brutos do banco de dados para `voteType` (`"UPVOTE"` ou `"DOWNVOTE"`), em vez do formato simplificado `"up"` / `"down"` usado pelo endpoint combinado.

| Status | Condição |
|---|---|
| 401 | Não autenticado |
| 404 | Perfil de cliente não encontrado |

**Fonte:** `template/app/api/items/[slug]/votes/status/route.ts`

## Detalhes Importantes da Implementação

- **Pontuação Líquida:** A contagem de votos é calculada como upvotes menos downvotes. Uma contagem negativa indica mais downvotes do que upvotes.
- **Substituição de Voto:** Quando um usuário muda o tipo de voto, o voto existente é excluído e um novo é criado. Não há atualização in-place.
- **Prevenção de Usuários Bloqueados:** A verificação `isUserBlocked()` no endpoint POST impede que usuários suspensos ou banidos votem. A verificação de bloqueio só é aplicada na criação do voto, não na remoção.
- **Enum VoteType:** O banco de dados armazena votos como `VoteType.UPVOTE` e `VoteType.DOWNVOTE`. A API traduz esses valores para `"up"` e `"down"` para consumidores externos.
- **Exclusão Idempotente:** Excluir um voto que não existe ainda retorna uma resposta 200 com a contagem atual e `userVote: null`.
