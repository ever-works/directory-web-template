---
id: comment-endpoints
title: Endpoints de Comentários
sidebar_label: Comentários
sidebar_position: 24
---

# Endpoints de Comentários

O sistema de comentários fornece endpoints para criar, ler, atualizar e excluir comentários em itens. Os comentários incluem uma avaliação de 1 a 5 estrelas e suportam acesso público (leitura) e operações autenticadas (criação/edição/exclusão). Os endpoints de administrador fornecem capacidades de moderação.

## Visão geral

### Endpoints Públicos

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/api/items/[slug]/comments` | GET | Público | Listar comentários de um item |
| `/api/items/[slug]/comments/rating` | GET | Público | Obter estatísticas agregadas de avaliação |
| `/api/items/[slug]/comments/rating/[commentId]` | GET | Público | Obter a avaliação de um comentário específico |

### Endpoints Autenticados

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/api/items/[slug]/comments` | POST | Usuário | Criar novo comentário |
| `/api/items/[slug]/comments/[commentId]` | PUT | Proprietário | Atualizar próprio comentário |
| `/api/items/[slug]/comments/[commentId]` | DELETE | Proprietário | Excluir próprio comentário |
| `/api/items/[slug]/comments/rating/[commentId]` | PATCH | Usuário | Atualizar avaliação de um comentário |

### Endpoints de Administrador

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/api/admin/comments` | GET | Administrador | Listar todos os comentários com paginação |
| `/api/admin/comments/[id]` | GET | Administrador | Obter comentário por ID |
| `/api/admin/comments/[id]` | PUT | Administrador | Atualizar conteúdo do comentário |
| `/api/admin/comments/[id]` | DELETE | Administrador | Excluir (soft-delete) um comentário |

## Endpoints Públicos

### Listar Comentários do Item

```
GET /api/items/[slug]/comments
```

Retorna todos os comentários de um item específico incluindo informações do perfil do usuário. Não requer autenticação.

**Parâmetros de caminho:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `slug` | string | Slug do item |

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "Esta é uma ferramenta incrível!",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

**Fonte:** `template/app/api/items/[slug]/comments/route.ts`

### Obter Estatísticas de Avaliação

```
GET /api/items/[slug]/comments/rating
```

Retorna a avaliação média e o número total de avaliações de um item. Conta apenas comentários não excluídos.

**Resposta de sucesso (200):**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

Retorna `averageRating: 0` e `totalRatings: 0` quando não há avaliações.

**Fonte:** `template/app/api/items/[slug]/comments/rating/route.ts`

## Endpoints Autenticados

### Criar Comentário

```
POST /api/items/[slug]/comments
```

Cria um novo comentário com avaliação em um item. Requer autenticação e um perfil de cliente válido. Usuários bloqueados estão impedidos de comentar.

**Autenticação:** Obrigatória

**Corpo da solicitação:**

```json
{
  "content": "Esta é uma ferramenta incrível! Realmente ajudou a aumentar minha produtividade.",
  "rating": 5
}
```

| Campo | Tipo | Obrigatório | Restrições |
|---|---|---|---|
| `content` | string | Sim | Não pode estar vazio após remoção de espaços |
| `rating` | inteiro | Sim | Deve ser entre 1 e 5 inclusive |

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "comment": {
    "id": "comment_123abc",
    "content": "Esta é uma ferramenta incrível!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "item_123abc",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

| Status | Condição |
|---|---|
| 400 | Conteúdo vazio ou avaliação inválida |
| 401 | Não autenticado |
| 403 | Usuário suspenso ou banido |
| 404 | Perfil de cliente não encontrado |

**Fonte:** `template/app/api/items/[slug]/comments/route.ts`

### Atualizar Comentário

```
PUT /api/items/[slug]/comments/[commentId]
```

Atualiza o conteúdo e/ou a avaliação de um comentário existente. Apenas o autor do comentário pode atualizar seu próprio comentário. Pelo menos um dos campos `content` ou `rating` deve ser fornecido.

**Autenticação:** Obrigatória (deve ser o proprietário do comentário)

**Corpo da solicitação:**

```json
{
  "content": "Texto da avaliação atualizado",
  "rating": 4
}
```

| Campo | Tipo | Obrigatório | Restrições |
|---|---|---|---|
| `content` | string | Não | 1--1000 caracteres |
| `rating` | inteiro | Não | Deve ser entre 1 e 5 |

A resposta inclui o comentário atualizado com um timestamp `editedAt`.

| Status | Condição |
|---|---|
| 400 | Nenhum campo fornecido, conteúdo muito longo ou avaliação inválida |
| 401 | Não autenticado |
| 404 | Comentário não encontrado ou usuário não é o autor |

**Fonte:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Excluir Comentário

```
DELETE /api/items/[slug]/comments/[commentId]
```

Exclui (soft-delete) um comentário. Apenas o autor do comentário pode excluir seu próprio comentário. O comentário é marcado com um timestamp `deletedAt` em vez de ser removido permanentemente.

**Autenticação:** Obrigatória (deve ser o proprietário do comentário)

**Resposta de sucesso:** 204 Sem conteúdo

| Status | Condição |
|---|---|
| 401 | Não autenticado |
| 404 | Comentário não encontrado, já excluído ou não pertence ao usuário |

**Fonte:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Atualizar Avaliação de Comentário

```
PATCH /api/items/[slug]/comments/rating/[commentId]
```

Atualiza apenas a avaliação de um comentário específico.

**Corpo da solicitação:**

```json
{
  "rating": 4
}
```

**Fonte:** `template/app/api/items/[slug]/comments/rating/[commentId]/route.ts`

## Endpoints de Administrador

Todos os endpoints de administrador requerem que `session.user.isAdmin` seja verdadeiro.

### Listar Todos os Comentários

```
GET /api/admin/comments
```

Retorna uma lista paginada de todos os comentários (excluindo os excluídos via soft-delete) com informações do usuário. Suporta pesquisa no conteúdo do comentário, nome do usuário e e-mail do usuário.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `page` | inteiro | 1 | Número da página |
| `limit` | inteiro | 10 | Resultados por página (1--100) |
| `search` | string | — | Pesquisar no conteúdo, nome do usuário ou e-mail |

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "Ótimo produto!",
        "rating": 5,
        "userId": "user_456def",
        "itemId": "item_789ghi",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "user": {
          "id": "user_456def",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "image": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

**Fonte:** `template/app/api/admin/comments/route.ts`

### Obter Comentário por ID

```
GET /api/admin/comments/[id]
```

Recupera um comentário específico com informações completas do usuário.

**Fonte:** `template/app/api/admin/comments/[id]/route.ts`

### Atualizar Comentário (Administrador)

```
PUT /api/admin/comments/[id]
```

Permite que administradores atualizem o conteúdo de qualquer comentário, independentemente da propriedade.

**Corpo da solicitação:**

```json
{
  "content": "Este conteúdo foi moderado por um administrador."
}
```

**Fonte:** `template/app/api/admin/comments/[id]/route.ts`

### Excluir Comentário (Administrador)

```
DELETE /api/admin/comments/[id]
```

Exclui (soft-delete) qualquer comentário. O comentário deve existir e não ter sido excluído anteriormente.

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

| Status | Condição |
|---|---|
| 403 | Não é administrador |
| 404 | Comentário não encontrado ou já excluído |

**Fonte:** `template/app/api/admin/comments/[id]/route.ts`

## Detalhes de Implementação

- **Exclusão Suave:** Todas as exclusões definem `deletedAt` em vez de remover registros. As consultas filtram comentários excluídos via `isNull(comments.deletedAt)`.
- **Verificação de Propriedade:** Os endpoints de usuário verificam se o ID do perfil de cliente do usuário autenticado corresponde ao campo `userId` do comentário.
- **Prevenção de Usuários Bloqueados:** A verificação `isUserBlocked()` impede que usuários suspensos ou banidos criem comentários.
- **Pesquisa (Administrador):** Usa ILIKE para pesquisa sem distinção de maiúsculas/minúsculas com escaping adequado de caracteres especiais SQL (`%` e `_`).
