---
id: admin-items-endpoints
title: Endpoints de Itens do Admin
sidebar_label: Itens do Admin
sidebar_position: 37
---

# Endpoints de Itens do Admin

A API de Itens fornece endpoints para gerenciar listagens do diretório incluindo criação, atualizações, fluxos de revisão (aprovar/rejeitar), histórico de auditoria, operações em massa e estatísticas. Os itens progridem por um ciclo de vida com os status `draft`, `pending`, `approved` e `rejected`. Todos os endpoints requerem autenticação de administrador.

## Caminho Base

```
/api/admin/items
```

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/api/admin/items` | Administrador | Obter lista paginada de itens |
| `POST` | `/api/admin/items` | Administrador | Criar um novo item |
| `GET` | `/api/admin/items/stats` | Administrador | Obter estatísticas de itens |
| `POST` | `/api/admin/items/bulk` | Administrador | Aprovar, rejeitar ou excluir em massa |
| `GET` | `/api/admin/items/{id}` | Administrador | Obter item por ID |
| `PUT` | `/api/admin/items/{id}` | Administrador | Atualizar item |
| `DELETE` | `/api/admin/items/{id}` | Administrador | Excluir item permanentemente |
| `POST` | `/api/admin/items/{id}/review` | Administrador | Aprovar ou rejeitar um item |
| `GET` | `/api/admin/items/{id}/history` | Administrador | Obter histórico de auditoria do item |

---

## Listar Itens

```
GET /api/admin/items
```

Retorna uma lista paginada de itens com pesquisa, filtragem por status/categoria/tags e ordenação.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | inteiro | `1` | Número da página (mínimo: 1) |
| `limit` | inteiro | `10` | Resultados por página (1--100) |
| `search` | string | -- | Pesquisar itens por nome ou descrição |
| `status` | string | -- | Filtro: `draft`, `pending`, `approved`, `rejected` |
| `categories` | string | -- | Slugs de categoria separados por vírgula |
| `tags` | string | -- | Slugs de tag separados por vírgula |
| `sortBy` | string | `updated_at` | Campo de ordenação: `name`, `updated_at`, `status`, `submitted_at` |
| `sortOrder` | string | `desc` | Direção da ordenação: `asc` ou `desc` |

**Resposta (200):**

```json
{
  "success": true,
  "items": [
    {
      "id": "item_123abc",
      "name": "Awesome Productivity Tool",
      "slug": "awesome-productivity-tool",
      "description": "A powerful tool to boost your productivity",
      "source_url": "https://example.com/tool",
      "category": ["productivity", "business"],
      "tags": ["saas", "productivity"],
      "featured": true,
      "icon_url": "https://example.com/icon.png",
      "status": "approved",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Criar Item

```
POST /api/admin/items
```

Cria um novo item com verificações de duplicação de ID e slug. Aciona sincronização com CRM (se habilitado) e indexação de localização (se habilitado).

**Corpo da solicitação:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | string | Sim | Identificador único do item |
| `name` | string | Sim | Nome do item |
| `slug` | string | Sim | Slug amigável para URL (deve ser único) |
| `description` | string | Sim | Descrição do item |
| `source_url` | string | Sim | URL de origem do item |
| `category` | string[] | Não | Array de slugs de categoria |
| `tags` | string[] | Não | Array de slugs de tag |
| `brand` | string | Não | Nome da marca (usado para sincronização de empresa no CRM) |
| `featured` | booleano | Não | Sinalizador de destaque (padrão: `false`) |
| `icon_url` | string | Não | URL do ícone |
| `status` | string | Não | Status inicial (padrão: `draft`) |
| `location` | objeto | Não | Dados de localização para geo-indexação |

**Resposta (201):**

```json
{
  "success": true,
  "item": {
    "id": "item_123abc",
    "name": "Awesome Productivity Tool",
    "slug": "awesome-productivity-tool",
    "status": "draft",
    "created_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Item created successfully"
}
```

---

## Obter Estatísticas de Itens

```
GET /api/admin/items/stats
```

Retorna contagens por status. Suporta filtros opcionais para limitar o escopo das estatísticas.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `search` | string | Filtrar estatísticas por termo de pesquisa |
| `categories` | string | Slugs de categoria separados por vírgula |
| `tags` | string | Slugs de tag separados por vírgula |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "total": 1247,
    "draft": 45,
    "pending": 23,
    "approved": 1156,
    "rejected": 23
  }
}
```

---

## Ações em Massa

```
POST /api/admin/items/bulk
```

Realiza aprovação, rejeição ou exclusão em massa de até 100 itens. Cada item é processado individualmente; falhas parciais não abortam toda a operação. Envia notificações por e-mail aos submissores ao aprovar/rejeitar.

**Corpo da solicitação:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `action` | string | Sim | `approve`, `reject` ou `delete` |
| `ids` | string[] | Sim | IDs de itens a processar (1--100, sem duplicatas) |
| `reason` | string | Sim (para `reject`) | Motivo da rejeição (mínimo 10 caracteres) |

**Resposta (200):**

```json
{
  "success": true,
  "message": "Bulk approve completed: 3 approved, 0 failed",
  "results": [
    { "id": "item_1", "success": true },
    { "id": "item_2", "success": true },
    { "id": "item_3", "success": false, "error": "Item not found" }
  ],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Obter / Atualizar / Excluir Item

### Obter Item

```
GET /api/admin/items/{id}
```

Retorna detalhes completos do item incluindo metadados, categorias, tags, notas de revisão e métricas de engajamento.

### Atualizar Item

```
PUT /api/admin/items/{id}
```

Atualização parcial -- apenas os campos fornecidos são modificados. Aciona sincronização com CRM quando `brand` é fornecido e re-indexação de localização quando os dados de localização mudam.

**Corpo da solicitação (todos os campos opcionais):**

```json
{
  "name": "Updated Tool Name",
  "slug": "updated-tool-name",
  "description": "Updated description",
  "source_url": "https://example.com/updated",
  "category": ["productivity", "automation"],
  "tags": ["saas", "ai"],
  "brand": "Acme Corp",
  "featured": true,
  "icon_url": "https://example.com/new-icon.png",
  "status": "approved"
}
```

### Excluir Item

```
DELETE /api/admin/items/{id}
```

Exclui permanentemente um item e o remove do índice de localização (se habilitado). Esta ação não pode ser desfeita.

**Resposta (200):**

```json
{ "success": true, "message": "Item deleted successfully" }
```

---

## Revisar Item

```
POST /api/admin/items/{id}/review
```

Aprova ou rejeita um item. Registra a decisão de revisão com notas opcionais. Envia uma notificação por e-mail ao submisor original (se for um usuário registrado).

**Corpo da solicitação:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `status` | string | Sim | `approved` ou `rejected` |
| `review_notes` | string | Não | Explicação da decisão de revisão |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "item_123abc",
    "status": "approved",
    "review_notes": "Great tool, approved for listing.",
    "reviewed_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Item approved successfully"
}
```

---

## Obter Histórico de Auditoria do Item

```
GET /api/admin/items/{id}/history
```

Retorna a trilha de auditoria completa de um item, incluindo criação, atualizações, mudanças de status, revisões, exclusões e restaurações.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | inteiro | `1` | Número da página |
| `limit` | inteiro | `20` | Resultados por página (máx. 100) |
| `action` | string | -- | Filtro separado por vírgula: `created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored` |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_abc123",
        "itemId": "awesome-tool",
        "action": "reviewed",
        "previousStatus": "pending",
        "newStatus": "approved",
        "performedByName": "Admin User",
        "notes": "Approved for listing",
        "createdAt": "2024-01-20T16:45:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## Regras de Validação

| Campo | Regra |
|-------|-------|
| `id` | Obrigatório; deve ser único entre todos os itens |
| `name` | Obrigatório para criação |
| `slug` | Obrigatório; deve ser único entre todos os itens |
| `description` | Obrigatório para criação |
| `source_url` | Obrigatório para criação; formato URL válido |
| `status` | Deve ser `draft`, `pending`, `approved` ou `rejected` |
| `reason` | Obrigatório para rejeição em massa; mínimo 10 caracteres |
| `ids` | Massa: 1--100 strings únicas não vazias |
| `action` | Filtro de histórico: apenas tipos de ação de auditoria válidos |

## Códigos de erro

| Status | Significado |
|--------|-------------|
| `400` | Erro de validação, parâmetros inválidos, campos ausentes |
| `401` | Autenticação obrigatória |
| `403` | Privilégios de administrador obrigatórios |
| `404` | Item não encontrado |
| `409` | ID ou slug de item duplicado |
| `500` | Erro interno do servidor |

## Documentação relacionada

- [API de Funções do Admin](./admin-roles-endpoints.md) -- gerenciar funções atribuídas a usuários
- [API de Usuários do Admin](./admin-users-endpoints.md) -- gerenciamento de contas de usuário
- [Autenticação](../architecture/nextauth-configuration.md) -- gerenciamento de sessão e guardas
