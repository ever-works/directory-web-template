---
id: admin-categories-endpoints
title: Endpoints de Categorias do Admin
sidebar_label: Categorias do Admin
sidebar_position: 30
---

# Endpoints de Categorias do Admin

A API de Categorias do Admin fornece operações CRUD completas para gerenciar categorias de conteúdo, incluindo reordenação e sincronização baseada em Git com um repositório de dados remoto. Todos os endpoints requerem autenticação de administrador via autenticação baseada em sessão.

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/api/admin/categories` | Administrador | Listar categorias (paginado) |
| `POST` | `/api/admin/categories` | Administrador | Criar uma nova categoria |
| `GET` | `/api/admin/categories/all` | Administrador | Obter todas as categorias (do cache de conteúdo) |
| `GET` | `/api/admin/categories/{id}` | Administrador | Obter uma única categoria por ID |
| `PUT` | `/api/admin/categories/{id}` | Administrador | Atualizar uma categoria |
| `DELETE` | `/api/admin/categories/{id}` | Administrador | Exclusão soft ou definitiva de uma categoria |
| `PUT` | `/api/admin/categories/reorder` | Administrador | Reordenar categorias por array de IDs |
| `GET` | `/api/admin/categories/git` | Administrador | Obter status do repositório Git e categorias |
| `POST` | `/api/admin/categories/git` | Administrador | Criar categoria via commit no Git |

## Autenticação

Todos os endpoints de gerenciamento de categorias verificam se há uma sessão ativa com privilégios de administrador:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## Endpoints

### GET `/api/admin/categories`

Retorna uma lista paginada de categorias com filtragem e ordenação opcionais.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | inteiro | `1` | Número da página (mínimo: 1) |
| `limit` | inteiro | `10` | Itens por página (1--100) |
| `includeInactive` | string | `"false"` | Incluir categorias inativas |
| `sortBy` | string | `"name"` | Campo de ordenação: `"name"` ou `"id"` |
| `sortOrder` | string | `"asc"` | Direção da ordenação: `"asc"` ou `"desc"` |

**Resposta (200):**

```json
{
  "success": true,
  "categories": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### POST `/api/admin/categories`

Cria uma nova categoria. O campo `id` é opcional e será gerado automaticamente a partir do nome caso não seja informado. Invalida os caches de conteúdo em caso de sucesso.

**Corpo da solicitação:**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | string | Não | Slug amigável para URL (`^[a-z0-9-]+$`). Gerado automaticamente se omitido. |
| `name` | string | Sim | Nome de exibição (2--100 caracteres) |

**Resposta (201):**

```json
{
  "success": true,
  "category": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 0,
    "createdAt": "2024-01-20T15:30:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  "message": "Category created successfully"
}
```

### GET `/api/admin/categories/all`

Retorna todas as categorias do cache de conteúdo para um determinado locale. Útil para menus suspensos e seletores do admin.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `locale` | string | `"en"` | Código de locale para recuperação de conteúdo |

**Resposta (200):**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### GET `/api/admin/categories/{id}`

Recupera uma única categoria pelo seu identificador único.

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/categories/{id}`

Atualiza o nome de uma categoria existente. Invalida os caches de conteúdo em caso de sucesso.

**Corpo da solicitação:**

```json
{ "name": "Productivity Tools" }
```

**Resposta (200):**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### DELETE `/api/admin/categories/{id}`

Exclui uma categoria. Por padrão realiza uma exclusão soft (desativação). Use o parâmetro de consulta `hard=true` para exclusão permanente. Invalida os caches de conteúdo em caso de sucesso.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `hard` | string | `"false"` | Definir como `"true"` para exclusão permanente |

**Resposta (200):**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### PUT `/api/admin/categories/reorder`

Reordena as categorias com base em um array de IDs de categoria. A posição de cada ID no array determina sua nova ordem de exibição.

**Corpo da solicitação:**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**Regras de validação:**
- `categoryIds` deve ser um array não vazio
- Todos os valores devem ser strings

**Resposta (200):**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### GET `/api/admin/categories/git`

Obtém o status do repositório Git e as categorias do repositório de dados GitHub configurado. Requer as variáveis de ambiente `DATA_REPOSITORY` e `GITHUB_TOKEN`.

**Resposta (200):**

```json
{
  "success": true,
  "status": {
    "repository": "ever-co/awesome-time-tracking-data",
    "branch": "main",
    "lastCommit": "abc123def456",
    "lastCommitDate": "2024-01-20T10:30:00.000Z",
    "isUpToDate": true
  },
  "categories": [],
  "message": "Git repository status retrieved successfully"
}
```

### POST `/api/admin/categories/git`

Cria uma nova categoria e a commita diretamente no repositório de dados do GitHub. Requer as variáveis de ambiente `DATA_REPOSITORY` e `GH_TOKEN`.

**Corpo da solicitação:**

```json
{ "id": "productivity", "name": "Productivity" }
```

Tanto `id` quanto `name` são obrigatórios para a criação baseada em Git.

**Resposta (200):**

```json
{
  "success": true,
  "category": { "id": "productivity", "name": "Productivity" },
  "message": "Category created and committed to Git repository"
}
```

## Códigos de erro

| Status | Erro | Causa |
|--------|------|-------|
| `400` | Parâmetros de paginação inválidos | Página < 1 ou limite fora de 1--100 |
| `400` | Nome de categoria é obrigatório | `name` ausente na solicitação de criação |
| `400` | categoryIds deve ser um array | Payload de reordenação inválido |
| `401` | Não autorizado. Acesso de administrador obrigatório. | Sessão ausente ou não é admin |
| `404` | Categoria não encontrada | ID de categoria inválido |
| `409` | Categoria com este nome já existe | Nome duplicado na criação/atualização |
| `500` | DATA_REPOSITORY não configurado | Variável de ambiente ausente para endpoints Git |
| `500` | Token do GitHub não configurado | `GITHUB_TOKEN` ou `GH_TOKEN` ausente |

## Invalidação de Cache

Todas as operações de escrita (criar, atualizar, excluir, reordenar) chamam `invalidateContentCaches()` para garantir que as alterações sejam imediatamente visíveis em toda a aplicação.

## Documentação relacionada

- [Visão geral dos Endpoints de Admin](./admin-endpoints.md)
- [Endpoints Públicos de Categoria](./category-endpoints.md)
- [Padrões de Resposta](./response-patterns.md)
- [Validação de Solicitações](./request-validation.md)
