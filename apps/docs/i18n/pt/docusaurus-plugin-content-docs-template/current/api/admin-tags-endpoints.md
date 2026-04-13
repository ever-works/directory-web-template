---
id: admin-tags-endpoints
title: Endpoints de Tags do Admin
sidebar_label: Tags do Admin
---

# Endpoints de Tags do Admin

A API de Tags do Admin fornece operações CRUD completas para gerenciar tags de conteúdo. As tags são usadas para classificar e filtrar itens no diretório. A API suporta listagem paginada, criação com estados ativo/inativo, atualizações, exclusão e recuperação por localidade a partir do cache de conteúdo. Todas as operações de escrita invalidam caches de conteúdo para visibilidade imediata. Todos os endpoints requerem autenticação de administrador.

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| `GET` | `/api/admin/tags` | Administrador | Listar tags (paginado) |
| `POST` | `/api/admin/tags` | Administrador | Criar nova tag |
| `GET` | `/api/admin/tags/all` | Administrador | Obter todas as tags (do cache de conteúdo) |
| `GET` | `/api/admin/tags/{id}` | Administrador | Obter uma tag por ID |
| `PUT` | `/api/admin/tags/{id}` | Administrador | Atualizar uma tag |
| `DELETE` | `/api/admin/tags/{id}` | Administrador | Excluir uma tag permanentemente |

## Endpoints

### GET `/api/admin/tags`

Retorna lista paginada de todas as tags. Os parâmetros de paginação são validados com o utilitário compartilhado `validatePaginationParams`.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | inteiro | `1` | Número da página (mínimo: 1) |
| `limit` | inteiro | `10` | Itens por página (1--100) |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "productivity",
        "name": "Productivity",
        "isActive": true,
        "itemCount": 156,
        "created_at": "2024-01-20T10:30:00.000Z",
        "updated_at": "2024-01-20T10:30:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### POST `/api/admin/tags`

Cria uma nova tag com ID, nome e status ativo opcional. Invalida caches de conteúdo no sucesso.

**Corpo da solicitação:**

```json
{
  "id": "artificial-intelligence",
  "name": "Artificial Intelligence",
  "isActive": true
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | string | Sim | Identificador slug amigável para URL |
| `name` | string | Sim | Nome da tag legível (2--50 caracteres) |
| `isActive` | booleano | Não | Se a tag está ativa (padrão: `true`) |

**Regras de validação:**
- `id` e `name` são obrigatórios
- O nome da tag deve ter entre 2 e 50 caracteres
- O ID da tag deve ser único entre todas as tags existentes
- O nome da tag deve ser único entre todas as tags existentes

**Resposta (201):**

```json
{
  "success": true,
  "tag": {
    "id": "artificial-intelligence",
    "name": "Artificial Intelligence",
    "isActive": true,
    "itemCount": 0,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### GET `/api/admin/tags/all`

Retorna todas as tags do cache de conteúdo para uma determinada localidade. Lê da camada de conteúdo em cache em vez do banco de dados, sendo adequado para preencher seletores de tag na interface do admin.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `locale` | string | `"en"` | Código de localidade para recuperação de conteúdo |

### GET `/api/admin/tags/{id}`

Retorna uma única tag pelo seu identificador único com detalhes completos incluindo estatísticas de uso.

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/tags/{id}`

Atualiza o nome e/ou status ativo de uma tag. O ID da tag não pode ser alterado após a criação. Invalida caches de conteúdo no sucesso.

**Corpo da solicitação:**

```json
{
  "name": "Productivity & Efficiency",
  "isActive": true
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome de exibição atualizado da tag |
| `isActive` | booleano | Não | Status ativo atualizado |

**Resposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity & Efficiency",
    "isActive": true,
    "updatedAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Tag updated successfully"
}
```

### DELETE `/api/admin/tags/{id}`

Exclui permanentemente uma tag do sistema. Também remove a tag de todos os itens associados. Invalida caches de conteúdo no sucesso.

**Resposta (200):**

```json
{
  "success": true,
  "message": "Tag deleted successfully"
}
```

:::caution
A exclusão de tags é permanente e não pode ser desfeita. Todas as associações de itens com a tag excluída serão removidas. Considere desativar a tag (definindo `isActive` como `false` via PUT) em vez de excluí-la se quiser preservar a integridade dos dados.
:::

## Modelo de dados de tag

| Campo | Tipo | Anulável | Descrição |
|-------|------|----------|-----------|
| `id` | string | Não | Identificador único amigável para URL |
| `name` | string | Não | Nome de exibição legível |
| `isActive` | booleano | Não | Se a tag pode ser atribuída a itens |
| `itemCount` | inteiro | Não | Número de itens usando esta tag |
| `created_at` | datetime | Não | Timestamp de criação |
| `updated_at` | datetime | Não | Timestamp da última atualização |

## Códigos de erro

| Status | Erro | Causa |
|--------|------|-------|
| `400` | ID e nome da tag são obrigatórios | Campos obrigatórios ausentes na criação |
| `400` | Nome da tag é obrigatório | Nome ausente na atualização |
| `400` | Nome da tag deve ter entre 2 e 50 caracteres | Falha na validação do comprimento do nome |
| `400` | Parâmetro page/limit inválido | Parâmetro de paginação fora do intervalo |
| `401` | Não autorizado | Sessão ausente ou não administrativa |
| `404` | Tag não encontrada | Nenhuma tag com o ID fornecido |
| `409` | Tag com este ID já existe | ID duplicado na criação |
| `409` | Tag com este nome já existe | Nome duplicado na criação/atualização |
| `500` | Falha ao buscar/criar/atualizar/excluir tag | Erro de servidor ou banco de dados |

## Invalidação de Cache

Todas as operações de escrita (criar, atualizar, excluir) chamam `invalidateContentCaches()` para garantir que as alterações nas tags sejam imediatamente refletidas no conteúdo público:

```typescript
await invalidateContentCaches();
```

Isso limpa tanto o cache de conteúdo em memória quanto quaisquer caches CDN que possam estar ativos.

## Fontes de Dados

A API de tags usa duas fontes de dados diferentes dependendo do endpoint:

| Endpoint | Fonte de dados | Caso de uso |
|----------|---------------|-------------|
| `GET /api/admin/tags` | `tagRepository` (banco de dados) | Gerenciamento admin com paginação |
| `POST /api/admin/tags` | `tagRepository` (banco de dados) | Criar novas tags |
| `GET /api/admin/tags/all` | `getCachedItems()` (cache de conteúdo) | Seletores dropdown, consultas rápidas |
| `GET /api/admin/tags/{id}` | `tagRepository` (banco de dados) | Visualização detalhada da tag |
| `PUT /api/admin/tags/{id}` | `tagRepository` (banco de dados) | Atualizar propriedades da tag |
| `DELETE /api/admin/tags/{id}` | `tagRepository` (banco de dados) | Remover tags |

## Documentação relacionada

- [Visão geral dos Endpoints de Admin](./admin-endpoints.md)
- [Endpoints de Categorias do Admin](./admin-categories-endpoints.md) -- Padrão semelhante para gerenciamento de categorias
- [Padrões de Resposta](./response-patterns.md)
- [Validação de Requisições](./request-validation.md)
