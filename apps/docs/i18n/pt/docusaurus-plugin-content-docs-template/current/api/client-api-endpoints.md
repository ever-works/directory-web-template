---
id: client-api-endpoints
title: Endpoints de API do Cliente
sidebar_label: API do Cliente
sidebar_position: 58
---

# Endpoints de API do Cliente

A API do Cliente fornece endpoints autenticados para usuários registrados gerenciarem seus itens enviados, visualizarem estatísticas do painel e acessarem dados geográficos. Todos os endpoints requerem autenticação baseada em sessão via `requireClientAuth()`.

**Diretório fonte:** `template/app/api/client/`

---

## Autenticação

Todos os endpoints deste grupo requerem uma sessão de usuário válida. Requisições não autenticadas recebem:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized. Please sign in to continue."
}
```

---

## Estatísticas do Painel

### Obter Estatísticas do Painel

Retorna estatísticas abrangentes do painel para o usuário autenticado.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/client/dashboard/stats` |
| **Auth** | Sessão (usuário) |
| **Fonte** | `client/dashboard/stats/route.ts` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "totalSubmissions": 23,
  "totalViews": 0,
  "totalVotesReceived": 156,
  "totalCommentsReceived": 89,
  "viewsAvailable": false,
  "recentActivity": {
    "newSubmissions": 3,
    "newViews": 0
  },
  "uniqueItemsInteracted": 45,
  "totalActivity": 237,
  "activityChartData": [
    { "date": "Mon", "submissions": 1, "views": 0, "engagement": 5 }
  ],
  "engagementChartData": [
    { "name": "Votes", "value": 156, "color": "#8884d8" }
  ],
  "submissionTimeline": [
    { "month": "Mar", "submissions": 5 }
  ],
  "engagementOverview": [
    { "week": "W1", "votes": 10, "comments": 3 }
  ],
  "statusBreakdown": [
    { "status": "Approved", "value": 15, "color": "#22c55e" },
    { "status": "Pending", "value": 5, "color": "#f59e0b" },
    { "status": "Rejected", "value": 3, "color": "#ef4444" }
  ],
  "topItems": [
    { "id": "item_1", "title": "My Tool", "views": 100, "votes": 25, "comments": 8 }
  ]
}
```

#### Exemplo com curl

```bash
curl -s http://localhost:3000/api/client/dashboard/stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Obter Estatísticas Geográficas

Retorna estatísticas de cobertura geográfica dos itens do usuário autenticado.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/client/geo-stats` |
| **Auth** | Sessão (usuário) |
| **Fonte** | `client/geo-stats/route.ts` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "total_items": 10,
  "items_with_location": 7,
  "items_remote": 2,
  "service_area_breakdown": [
    { "area": "local", "count": 3 },
    { "area": "regional", "count": 2 }
  ],
  "top_cities": [
    { "city": "New York", "count": 3 }
  ],
  "top_countries": [
    { "country": "United States", "count": 5 }
  ]
}
```

#### Exemplo com curl

```bash
curl -s http://localhost:3000/api/client/geo-stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Obter Coordenadas dos Itens

Retorna as coordenadas de todos os itens do usuário que possuem dados de localização, adequado para renderização em mapa.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/client/items/coordinates` |
| **Auth** | Sessão (usuário) |
| **Fonte** | `client/items/coordinates/route.ts` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "coordinates": [
    {
      "slug": "my-item",
      "name": "My Item",
      "latitude": 40.7128,
      "longitude": -74.006
    }
  ]
}
```

#### Exemplo com curl

```bash
curl -s http://localhost:3000/api/client/items/coordinates \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Gerenciamento de Itens

### Listar Itens do Usuário

Retorna uma lista paginada de itens enviados pelo usuário autenticado.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/client/items` |
| **Auth** | Sessão (usuário) |
| **Fonte** | `client/items/route.ts` |

#### Parâmetros de consulta

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `page` | `integer` | Não | `1` | Número da página (mín: 1) |
| `limit` | `integer` | Não | `10` | Itens por página (1--100) |
| `status` | `string` | Não | — | Filtro: `all`, `pending`, `approved`, `rejected` |
| `search` | `string` | Não | — | Pesquisar por nome ou descrição do item |
| `sortBy` | `string` | Não | — | Campo de ordenação |
| `sortOrder` | `string` | Não | — | Direção de ordenação |
| `deleted` | `boolean` | Não | `false` | Se `true`, retorna itens excluídos via soft-delete |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "items": [ /* objetos de item */ ],
  "total": 23,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "stats": {
    "total": 20,
    "pending": 3,
    "approved": 15,
    "rejected": 2,
    "deleted": 1
  }
}
```

#### Exemplos com curl

```bash
# Listar itens aprovados, página 2
curl -s "http://localhost:3000/api/client/items?status=approved&page=2&limit=10" \
  -H "Cookie: next-auth.session-token=<session_token>"

# Pesquisar itens
curl -s "http://localhost:3000/api/client/items?search=productivity" \
  -H "Cookie: next-auth.session-token=<session_token>"

# Listar itens excluídos
curl -s "http://localhost:3000/api/client/items?deleted=true" \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Criar Item

Cria um novo envio de item. O item é definido com status `pending` para revisão do administrador.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `POST` |
| **Caminho** | `/api/client/items` |
| **Auth** | Sessão (usuário) |
| **Fonte** | `client/items/route.ts` |

#### Corpo da solicitação

```json
{
  "name": "Awesome Tool",
  "description": "A great productivity tool that helps teams collaborate.",
  "source_url": "https://example.com",
  "category": "Productivity",
  "tags": ["collaboration", "remote-work"],
  "icon_url": "https://example.com/icon.png"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | `string` | Sim | Nome do item (3--100 caracteres) |
| `description` | `string` | Sim | Descrição do item (10--500 caracteres) |
| `source_url` | `string` (URI) | Sim | URL/link principal do item |
| `category` | `string \| string[]` | Não | Nome da categoria ou array de categorias |
| `tags` | `string[]` | Não | Array de strings de tags |
| `icon_url` | `string` (URI) | Não | URL do ícone do item |

#### Resposta

**Status 201**

```json
{
  "success": true,
  "item": { /* objeto do item criado */ },
  "message": "Item submitted successfully. It will be reviewed by our team before being published."
}
```

**Status 400** — Erro de validação

```json
{
  "success": false,
  "error": "Name must be at least 3 characters"
}
```

#### Exemplo com curl

```bash
curl -s -X POST http://localhost:3000/api/client/items \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{
    "name": "Awesome Tool",
    "description": "A great productivity tool that helps teams collaborate effectively.",
    "source_url": "https://example.com",
    "category": "Productivity",
    "tags": ["collaboration"]
  }'
```

---

### Obter Item Individual

Retorna detalhes de um item específico de propriedade do usuário autenticado.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/client/items/{id}` |
| **Auth** | Sessão (usuário, proprietário) |
| **Fonte** | `client/items/[id]/route.ts` |

#### Parâmetros de caminho

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | `string` | ID do item |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "item": { /* objeto do item */ },
  "engagement": {
    "views": 150,
    "likes": 23
  }
}
```

| Status | Descrição |
|--------|-----------|
| 400 | ID de item inválido |
| 401 | Não autorizado |
| 403 | Não é o proprietário do item |
| 404 | Item não encontrado |

---

### Atualizar Item

Atualiza um item de propriedade do usuário autenticado. Se o item estava previamente aprovado, atualizá-lo altera seu status para `pending` para nova revisão.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `PUT` |
| **Caminho** | `/api/client/items/{id}` |
| **Auth** | Sessão (usuário, proprietário) |
| **Fonte** | `client/items/[id]/route.ts` |

#### Corpo da solicitação

Todos os campos são opcionais. Pelo menos um campo deve ser fornecido.

```json
{
  "name": "Updated Tool Name",
  "description": "Updated description with more details.",
  "source_url": "https://example.com/v2",
  "category": ["Productivity", "Developer Tools"],
  "tags": ["collaboration", "ai"],
  "icon_url": "https://example.com/new-icon.png"
}
```

#### Resposta

**Status 200**

```json
{
  "success": true,
  "item": { /* objeto do item atualizado */ },
  "statusChanged": true,
  "previousStatus": "approved",
  "message": "Item updated successfully. Since it was previously approved, it has been moved to pending for re-review."
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `statusChanged` | `boolean` | `true` se o status mudou de aprovado para pendente |
| `previousStatus` | `string` | O status do item antes da atualização |

#### Exemplo com curl

```bash
curl -s -X PUT http://localhost:3000/api/client/items/item_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "name": "Updated Tool Name" }'
```

---

### Excluir Item (Soft Delete)

Exclui (soft-delete) um item de propriedade do usuário autenticado. O item fica oculto mas pode ser restaurado posteriormente.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `DELETE` |
| **Caminho** | `/api/client/items/{id}` |
| **Auth** | Sessão (usuário, proprietário) |
| **Fonte** | `client/items/[id]/route.ts` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

| Status | Descrição |
|--------|-----------|
| 400 | Item já foi excluído |
| 401 | Não autorizado |
| 403 | Não é o proprietário do item |
| 404 | Item não encontrado |

---

### Restaurar Item

Restaura um item previamente excluído via soft-delete.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `POST` |
| **Caminho** | `/api/client/items/{id}/restore` |
| **Auth** | Sessão (usuário, proprietário) |
| **Fonte** | `client/items/[id]/restore/route.ts` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "item": { /* objeto do item restaurado */ },
  "message": "Item restored successfully"
}
```

| Status | Descrição |
|--------|-----------|
| 400 | Item não está excluído (não é possível restaurar item ativo) |
| 401 | Não autorizado |
| 403 | Não é o proprietário do item |
| 404 | Item não encontrado |

#### Exemplo com curl

```bash
curl -s -X POST http://localhost:3000/api/client/items/item_123/restore \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Obter Estatísticas de Envios

Retorna estatísticas sobre os envios do usuário autenticado agrupados por status.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/client/items/stats` |
| **Auth** | Sessão (usuário) |
| **Fonte** | `client/items/stats/route.ts` |

#### Resposta

**Status 200**

```json
{
  "success": true,
  "stats": {
    "total": 12,
    "draft": 2,
    "pending": 3,
    "approved": 5,
    "rejected": 2
  }
}
```
