---
id: favorites-api-endpoints
title: Endpoints de API de Favoritos
sidebar_label: API de Favoritos
sidebar_position: 62
---

# Endpoints de API de Favoritos

A API de Favoritos permite que usuários autenticados gerenciem seus itens favoritos. Os usuários podem listar, adicionar e remover itens de sua lista pessoal de favoritos. Os registros de favoritos armazenam metadados do item (nome, ícone, categoria) para exibição rápida sem precisar fazer join com a tabela de itens.

**Diretório de origem:** `template/app/api/favorites/`

---

## Autenticação

Todos os endpoints de favoritos requerem autenticação baseada em sessão. Solicitações não autenticadas recebem:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Listar favoritos do usuário

Retorna todos os itens favoritados pelo usuário autenticado.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/favorites` |
| **Auth** | Sessão (usuário) |
| **Origem** | `favorites/route.ts` |

### Resposta

**Status 200**

```json
{
  "success": true,
  "favorites": [
    {
      "id": "fav_123abc",
      "userId": "user_456def",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemCategory": "productivity",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `favorites[].id` | `string` | ID do registro de favorito |
| `favorites[].userId` | `string` | Usuário que favoritou o item |
| `favorites[].itemSlug` | `string` | Identificador de slug do item |
| `favorites[].itemName` | `string` | Nome de exibição do item |
| `favorites[].itemIconUrl` | `string \| null` | URL do ícone do item |
| `favorites[].itemCategory` | `string \| null` | Categoria do item |
| `favorites[].createdAt` | `string` (ISO 8601) | Quando o item foi favoritado |
| `favorites[].updatedAt` | `string \| null` | Timestamp da última atualização |

Os favoritos são ordenados por `createdAt` (mais antigo primeiro).

### Exemplo com curl

```bash
curl -s http://localhost:3000/api/favorites \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Adicionar favorito

Adiciona um item à lista de favoritos do usuário autenticado.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `POST` |
| **Caminho** | `/api/favorites` |
| **Auth** | Sessão (usuário) |
| **Origem** | `favorites/route.ts` |

### Corpo da solicitação

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `itemSlug` | `string` | Sim | Identificador de slug único do item (mín. 1 caractere) |
| `itemName` | `string` | Sim | Nome de exibição do item (mín. 1 caractere) |
| `itemIconUrl` | `string` | Não | URL do ícone do item |
| `itemCategory` | `string` | Não | Categoria do item |

### Respostas

**Status 201** -- Favorito adicionado com sucesso.

```json
{
  "success": true,
  "favorite": {
    "id": "fav_123abc",
    "userId": "user_456def",
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Status 400** -- Dados da solicitação inválidos.

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

**Status 409** -- Item já está nos favoritos.

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Exemplo com curl

```bash
curl -s -X POST http://localhost:3000/api/favorites \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity"
  }'
```

---

## Remover favorito

Remove um item específico da lista de favoritos do usuário autenticado.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `DELETE` |
| **Caminho** | `/api/favorites/{itemSlug}` |
| **Auth** | Sessão (usuário) |
| **Origem** | `favorites/[itemSlug]/route.ts` |

### Parâmetros de caminho

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `itemSlug` | `string` | Identificador de slug do item a remover dos favoritos |

### Respostas

**Status 200** -- Favorito removido com sucesso.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Status 404** -- Favorito não encontrado.

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### Exemplo com curl

```bash
curl -s -X DELETE http://localhost:3000/api/favorites/awesome-productivity-tool \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Uso em TypeScript

```typescript
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl: string | null;
  itemCategory: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// Listar todos os favoritos
async function getFavorites(): Promise<Favorite[]> {
  const res = await fetch('/api/favorites');
  const data = await res.json();
  return data.favorites;
}

// Adicionar aos favoritos
async function addFavorite(item: {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}): Promise<Favorite> {
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (res.status === 409) {
    throw new Error('Item já está nos favoritos');
  }

  const data = await res.json();
  return data.favorite;
}

// Remover dos favoritos
async function removeFavorite(itemSlug: string): Promise<void> {
  const res = await fetch(`/api/favorites/${itemSlug}`, {
    method: 'DELETE',
  });

  if (res.status === 404) {
    throw new Error('Favorito não encontrado');
  }
}

// Alternar favorito
async function toggleFavorite(
  itemSlug: string,
  itemName: string,
  isFavorited: boolean
): Promise<void> {
  if (isFavorited) {
    await removeFavorite(itemSlug);
  } else {
    await addFavorite({ itemSlug, itemName });
  }
}
```

### Notas de implementação

- A tabela de favoritos usa uma verificação de unicidade composta em `(userId, itemSlug)` para evitar duplicatas.
- Os metadados do item (`itemName`, `itemIconUrl`, `itemCategory`) são armazenados no próprio registro de favorito, permitindo exibição rápida sem consultas adicionais.
- A exclusão verifica a propriedade -- um usuário só pode remover favoritos que lhe pertencem.
- A disponibilidade do banco de dados é verificada no início de cada solicitação via `checkDatabaseAvailability()`.
- Erros de validação retornam detalhes de erro do Zod no campo `details`.
