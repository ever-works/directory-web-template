---
id: admin-comments-endpoints
title: Endpoints de Comentários do Admin
sidebar_label: Comentários do Admin
sidebar_position: 31
---

# Endpoints de Comentários do Admin

A API de Comentários do Admin fornece capacidades de moderação para gerenciar comentários de usuários. Os administradores podem listar, visualizar, atualizar e excluir comentários com exclusão soft. Todos os endpoints utilizam o runtime Node.js e requerem disponibilidade de banco de dados. As verificações de autenticação retornam `403 Forbidden` para usuários não administradores.

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/api/admin/comments` | Administrador | Listar comentários (paginado, pesquisável) |
| `GET` | `/api/admin/comments/{id}` | Administrador | Obter um único comentário com informações do usuário |
| `PUT` | `/api/admin/comments/{id}` | Administrador | Atualizar conteúdo do comentário |
| `DELETE` | `/api/admin/comments/{id}` | Administrador | Exclusão soft de um comentário |

## Autenticação

Os endpoints de moderação de comentários verificam o status de administrador e retornam `403 Forbidden` (não `401`) para usuários não administradores:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}
```

## Requisito de Banco de Dados

Os endpoints de comentários verificam a disponibilidade do banco de dados antes de processar as solicitações:

```typescript
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

Se o banco de dados não estiver configurado, uma resposta de erro apropriada é retornada antes de qualquer verificação de autenticação.

## Endpoints

### GET `/api/admin/comments`

Retorna uma lista paginada de comentários com informações do usuário associado. Suporta pesquisa de texto completo no conteúdo dos comentários, nomes de usuários e e-mails. Apenas comentários não excluídos são retornados.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | inteiro | `1` | Número da página para paginação |
| `limit` | inteiro | `10` | Comentários por página (1--100) |
| `search` | string | `""` | Pesquisar no conteúdo, nome do usuário ou e-mail |

**Comportamento da Pesquisa:**

A consulta de pesquisa é comparada sem distinção de maiúsculas/minúsculas (usando `ILIKE`) em relação a:
- Conteúdo do comentário
- Nome de exibição do usuário
- Endereço de e-mail do usuário

Os caracteres especiais `%`, `_` e `\` são escapados para evitar injeção de padrão SQL.

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "This is a great product! Highly recommended.",
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

### GET `/api/admin/comments/{id}`

Recupera um comentário específico pelo seu ID com informações completas do perfil do usuário. Inclui um left join na tabela `clientProfiles` para os dados do usuário.

**Parâmetros de caminho:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | Identificador único do comentário |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is a great product! Highly recommended.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
}
```

**Fallback do Usuário:** Se o perfil do usuário não for encontrado (usuário excluído), um objeto de placeholder é retornado:

```json
{
  "user": {
    "id": "",
    "name": "Unknown User",
    "email": "",
    "image": null
  }
}
```

### PUT `/api/admin/comments/{id}`

Atualiza o conteúdo de um comentário específico. Apenas o campo `content` pode ser modificado. O comentário deve existir e não ter sido excluído com soft delete.

**Parâmetros de caminho:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | Identificador único do comentário |

**Corpo da solicitação:**

```json
{
  "content": "This is an updated comment with more details."
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `content` | string | Sim | Novo texto do comentário (não deve estar vazio após remoção de espaços) |

**Regras de Validação:**
- `content` é obrigatório e não deve estar vazio ou conter apenas espaços em branco
- O comentário alvo deve existir e não ter um registro de data/hora `deletedAt`

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is an updated comment with more details.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:15:00.000Z",
    "user": { "id": "user_456def", "name": "John Doe", "email": "john.doe@example.com", "image": null }
  },
  "message": "Comment updated successfully"
}
```

### DELETE `/api/admin/comments/{id}`

Realiza exclusão soft de um comentário definindo o registro de data/hora `deletedAt`. O comentário deve existir e ainda não ter sido excluído. Comentários com exclusão soft são excluídos de todas as consultas de lista.

**Parâmetros de caminho:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | Identificador único do comentário |

**Resposta (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Modelo de Dados de Comentário

| Campo | Tipo | Nulo | Descrição |
|-------|------|------|-----------|
| `id` | string | Não | Identificador único do comentário |
| `content` | string | Não | Conteúdo de texto do comentário |
| `rating` | inteiro | Sim | Valor da avaliação (1--5) |
| `userId` | string | Não | ID do usuário autor |
| `itemId` | string | Não | ID do item associado |
| `createdAt` | datetime | Sim | Registro de data/hora de criação |
| `updatedAt` | datetime | Sim | Registro de data/hora da última atualização |
| `deletedAt` | datetime | Sim | Registro de data/hora da exclusão soft (nulo se ativo) |

## Códigos de erro

| Status | Erro | Causa |
|--------|------|-------|
| `400` | Conteúdo é obrigatório | Conteúdo vazio ou ausente na atualização |
| `403` | Proibido | Usuário não admin tentando acesso |
| `404` | Comentário não encontrado | ID inválido ou já com exclusão soft |
| `500` | Erro Interno do Servidor | Falha no banco de dados ou no servidor |

## Notas de Implementação

- Os comentários usam **exclusão soft** -- o campo `deletedAt` é definido em vez de remover a linha. Isso preserva a integridade dos dados e permite recuperação potencial.
- Todas as consultas de lista filtram com `isNull(comments.deletedAt)` para excluir comentários excluídos.
- Os dados do usuário são obtidos via `LEFT JOIN` em `clientProfiles`, garantindo que comentários de usuários excluídos ainda possam ser recuperados.
- O `runtime` está definido como `"nodejs"` para essas rotas (não Edge).

## Documentação relacionada

- [Visão geral dos Endpoints de Admin](./admin-endpoints.md)
- [Endpoints Públicos de Comentários](./comment-endpoints.md)
- [Padrões de Resposta](./response-patterns.md)
- [Validação de Solicitações](./request-validation.md)
