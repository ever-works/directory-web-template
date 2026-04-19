---
id: admin-roles-endpoints
title: Endpoints de Funções do Admin
sidebar_label: Funções do Admin
sidebar_position: 35
---

# Endpoints de Funções do Admin

A API de Funções fornece endpoints para gerenciar funções de usuário e suas permissões associadas. As funções controlam os níveis de acesso em toda a aplicação e podem ser atribuídas a usuários por meio da [API de Usuários do Admin](./admin-users-endpoints.md).

## Caminho Base

```
/api/admin/roles
```

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/api/admin/roles` | Administrador | Obter lista paginada de funções |
| `POST` | `/api/admin/roles` | Administrador | Criar nova função |
| `GET` | `/api/admin/roles/active` | Público | Obter todas as funções ativas |
| `GET` | `/api/admin/roles/stats` | Administrador | Obter estatísticas de funções |
| `GET` | `/api/admin/roles/{id}` | Administrador | Obter uma função por ID |
| `PUT` | `/api/admin/roles/{id}` | Administrador | Atualizar uma função |
| `DELETE` | `/api/admin/roles/{id}` | Administrador | Excluir uma função (suave ou permanente) |
| `GET` | `/api/admin/roles/{id}/permissions` | Administrador | Obter permissões de uma função |
| `PUT` | `/api/admin/roles/{id}/permissions` | Administrador | Atualizar permissões de uma função |

---

## Listar Funções

```
GET /api/admin/roles
```

Retorna lista paginada de funções com filtragem e ordenação opcionais.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | inteiro | `1` | Número da página (mínimo: 1) |
| `limit` | inteiro | `10` | Resultados por página (1--100) |
| `status` | string | -- | Filtro: `active` ou `inactive` |
| `sortBy` | string | `name` | Campo de ordenação: `name`, `id`, `created_at` |
| `sortOrder` | string | `asc` | Direção: `asc` ou `desc` |

**Resposta (200):**

```json
{
  "success": true,
  "roles": [
    {
      "id": "admin",
      "name": "Administrator",
      "description": "Full system administrator with all permissions",
      "status": "active",
      "isAdmin": true,
      "permissions": ["users.read", "users.write", "roles.read", "roles.write"],
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

## Criar Função

```
POST /api/admin/roles
```

Cria uma nova função. O ID da função é gerado automaticamente a partir do nome, normalizando e convertendo para um slug URL-seguro (máx. 64 caracteres). Nomes duplicados (incluindo registros excluídos suavemente) são rejeitados.

**Corpo da solicitação:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome da função (3--100 caracteres) |
| `description` | string | Sim | Descrição da função (máx. 500 caracteres) |
| `status` | string | Não | `active` (padrão) ou `inactive` |
| `isAdmin` | booleano | Não | Sinalizador de privilégios de admin (padrão: `false`) |

**Resposta (201):**

```json
{
  "success": true,
  "data": {
    "id": "content-moderator",
    "name": "Content Moderator",
    "description": "Responsible for moderating user-generated content",
    "status": "active",
    "isAdmin": false,
    "permissions": [],
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Role created successfully"
}
```

---

## Obter Funções Ativas

```
GET /api/admin/roles/active
```

Retorna todas as funções com status `active`. Comumente usado para preencher dropdowns de função em formulários de gerenciamento de usuários. Sem autenticação obrigatória.

**Resposta (200):**

```json
{
  "roles": [
    { "id": "admin", "name": "Administrator", "status": "active", "isAdmin": true, "permissions": [] },
    { "id": "moderator", "name": "Moderator", "status": "active", "isAdmin": false, "permissions": [] }
  ]
}
```

---

## Obter Estatísticas de Funções

```
GET /api/admin/roles/stats
```

Retorna estatísticas agregadas sobre funções. Requer sessão de administrador.

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "total": 25,
    "active": 20,
    "inactive": 5,
    "averagePermissions": 4.2
  }
}
```

---

## Obter / Atualizar / Excluir Função

### Obter Função

```
GET /api/admin/roles/{id}
```

Retorna detalhes completos de uma função, incluindo permissões, status e timestamps.

### Atualizar Função

```
PUT /api/admin/roles/{id}
```

Atualização parcial -- apenas os campos fornecidos são modificados. Valida comprimento do nome (3--100) e descrição (máx. 500).

**Corpo da solicitação (todos os campos opcionais):**

```json
{
  "name": "Senior Moderator",
  "description": "Senior content moderator with enhanced permissions",
  "status": "active",
  "isAdmin": false
}
```

### Excluir Função

```
DELETE /api/admin/roles/{id}?hard=false
```

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `hard` | string | `false` | `true` para remoção permanente, `false` para exclusão suave (marca como inativo) |

---

## Permissões de Função

### Obter Permissões

```
GET /api/admin/roles/{id}/permissions
```

Retorna o array de permissões e metadados básicos da função.

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### Atualizar Permissões

```
PUT /api/admin/roles/{id}/permissions
```

Substitui todo o array de permissões. Cada string de permissão é validada contra as definições de permissão do sistema. Permissões inválidas são retornadas na resposta de erro.

**Corpo da solicitação:**

```json
{
  "permissions": ["users.read", "items.read", "items.moderate", "comments.moderate"]
}
```

---

## Regras de Validação

| Campo | Regra |
|-------|-------|
| `name` | 3--100 caracteres; usado para derivar um ID slug único |
| `description` | Máximo de 500 caracteres |
| `status` | Deve ser `active` ou `inactive` |
| `permissions` | Array de strings; cada uma deve ser uma permissão do sistema válida |

## Códigos de erro

| Status | Significado |
|--------|-------------|
| `400` | Erro de validação (parâmetros inválidos, campos ausentes) |
| `401` | Autenticação obrigatória |
| `403` | Privilégios de administrador obrigatórios |
| `404` | Função não encontrada |
| `409` | Nome/ID de função duplicado |
| `500` | Erro interno do servidor |

## Documentação relacionada

- [API de Usuários do Admin](./admin-users-endpoints.md) -- atribuir funções a usuários
- [Autenticação](../architecture/nextauth-configuration.md) -- detalhes de sessão e guarda de admin
- [Sistema de Permissões](../architecture/permissions-system.md) -- definições e validação de permissões
