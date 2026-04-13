---
id: admin-users-endpoints
title: Endpoints de Usuários do Admin
sidebar_label: Usuários do Admin
---

# Endpoints de Usuários do Admin

A API de Usuários fornece endpoints para gerenciar contas de usuário, incluindo criação, atualizações, alterações de status, atribuição de funções e utilitários de validação. Todos os endpoints requerem autenticação de administrador, salvo indicação contrária.

## Caminho Base

```
/api/admin/users
```

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/api/admin/users` | Administrador | Obter lista paginada de usuários |
| `POST` | `/api/admin/users` | Administrador | Criar novo usuário |
| `GET` | `/api/admin/users/stats` | Administrador | Obter estatísticas de usuários |
| `POST` | `/api/admin/users/check-email` | Administrador | Verificar disponibilidade de e-mail |
| `POST` | `/api/admin/users/check-username` | Administrador | Verificar disponibilidade de nome de usuário |
| `GET` | `/api/admin/users/{id}` | Administrador | Obter usuário por ID |
| `PUT` | `/api/admin/users/{id}` | Administrador | Atualizar usuário |
| `DELETE` | `/api/admin/users/{id}` | Administrador | Excluir usuário |

---

## Listar Usuários

```
GET /api/admin/users
```

Retorna lista paginada de usuários com pesquisa, filtragem e ordenação.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | inteiro | `1` | Número da página (mínimo: 1) |
| `limit` | inteiro | `10` | Resultados por página (1--100) |
| `search` | string | -- | Pesquisar por nome, e-mail ou nome de usuário (máx. 100 caracteres) |
| `role` | string | -- | Filtrar por ID da função (máx. 50 caracteres) |
| `status` | string | -- | Filtro: `active` ou `inactive` |
| `sortBy` | string | `name` | Campo de ordenação: `name`, `username`, `email`, `role`, `created_at` |
| `sortOrder` | string | `asc` | Direção: `asc` ou `desc` |
| `includeInactive` | booleano | `false` | Incluir usuários inativos nos resultados |

**Resposta (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_123abc",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "title": "Senior Developer",
      "avatar": "https://example.com/avatars/john.jpg",
      "role": "admin",
      "status": "active",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z",
      "last_login": "2024-01-20T16:20:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Criar Usuário

```
POST /api/admin/users
```

Cria um novo usuário com validação abrangente. A função deve existir no sistema (validada contra a tabela de funções).

**Corpo da solicitação:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `username` | string | Sim | 3--30 caracteres, alfanumérico mais `-` e `_` |
| `email` | string | Sim | Formato de e-mail válido |
| `name` | string | Sim | Nome completo (2--100 caracteres) |
| `password` | string | Sim | Mínimo 8 caracteres (validado pelo Zod `passwordSchema`) |
| `role` | string | Sim | Deve referenciar um ID de função existente |
| `title` | string | Não | Cargo (máx. 100 caracteres) |
| `avatar` | string | Não | URL do avatar (máx. 500 caracteres) |

**Resposta (201):**

```json
{
  "success": true,
  "data": {
    "id": "user_123abc",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "admin",
    "status": "active",
    "created_at": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Obter Estatísticas de Usuários

```
GET /api/admin/users/stats
```

Retorna estatísticas abrangentes para o painel de administração.

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": 1247,
    "activeUsers": 1156,
    "inactiveUsers": 91,
    "recentRegistrations": 67,
    "roleDistribution": {
      "admin": 5,
      "moderator": 23,
      "user": 1219
    },
    "averageLoginFrequency": 12.5,
    "topActiveUsers": [
      {
        "id": "user_123abc",
        "username": "johndoe",
        "name": "John Doe",
        "loginCount": 45,
        "lastLogin": "2024-01-20T16:20:00.000Z"
      }
    ]
  }
}
```

---

## Verificar Disponibilidade de E-mail

```
POST /api/admin/users/check-email
```

Verifica se um endereço de e-mail já está em uso. Suporta parâmetro `excludeId` para cenários de atualização onde o e-mail do usuário atual deve ser excluído da verificação de duplicatas.

**Corpo da solicitação:**

```json
{
  "email": "john.doe@example.com",
  "excludeId": "user_123abc"
}
```

**Resposta (200):**

```json
{ "available": true, "exists": false }
```

---

## Verificar Disponibilidade de Nome de Usuário

```
POST /api/admin/users/check-username
```

Verifica se um nome de usuário já está em uso. Mesmo padrão de `excludeId` que a verificação de e-mail.

**Corpo da solicitação:**

```json
{
  "username": "johndoe",
  "excludeId": "user_123abc"
}
```

**Resposta (200):**

```json
{ "available": false, "exists": true }
```

---

## Obter / Atualizar / Excluir Usuário

### Obter Usuário

```
GET /api/admin/users/{id}
```

Retorna informações completas do perfil de um único usuário.

### Atualizar Usuário

```
PUT /api/admin/users/{id}
```

Atualização parcial -- apenas os campos fornecidos são modificados. Valida formato de e-mail, comprimento do nome de usuário (3--50), comprimento do nome (2--100) e que a função existe no sistema.

**Corpo da solicitação (todos os campos opcionais):**

```json
{
  "username": "johndoe_updated",
  "email": "john.updated@example.com",
  "name": "John Updated Doe",
  "title": "Lead Developer",
  "avatar": "https://example.com/avatars/john_new.jpg",
  "role": "moderator",
  "status": "active"
}
```

### Excluir Usuário

```
DELETE /api/admin/users/{id}
```

Exclui permanentemente um usuário. Inclui guarda contra auto-exclusão: um administrador não pode excluir sua própria conta.

**Resposta (200):**

```json
{ "success": true, "message": "User deleted successfully" }
```

---

## Regras de Validação

| Campo | Regra |
|-------|-------|
| `username` | 3--30 caracteres; regex `^[a-zA-Z0-9_-]{3,30}$` (criação), 3--50 caracteres (atualização) |
| `email` | Formato de e-mail válido via utilitário `isValidEmail` |
| `name` | 2--100 caracteres |
| `password` | Mínimo 8 caracteres; validado pelo Zod `passwordSchema` |
| `role` | Deve referenciar uma função existente no banco de dados |
| `status` | Deve ser `active` ou `inactive` |
| `title` | Máximo 100 caracteres |
| `avatar` | Máximo 500 caracteres |

## Códigos de erro

| Status | Significado |
|--------|-------------|
| `400` | Erro de validação, auto-exclusão, e-mail/nome de usuário duplicado |
| `401` | Autenticação obrigatória |
| `403` | Privilégios de administrador obrigatórios |
| `404` | Usuário não encontrado |
| `500` | Erro interno do servidor |

## Documentação relacionada

- [API de Funções do Admin](./admin-roles-endpoints.md) -- gerenciar funções atribuídas a usuários
- [Autenticação](../architecture/nextauth-configuration.md) -- gerenciamento de sessão e guardas
- [API de Clientes do Admin](./admin-clients-endpoints.md) -- gerenciamento de perfil de clientes
