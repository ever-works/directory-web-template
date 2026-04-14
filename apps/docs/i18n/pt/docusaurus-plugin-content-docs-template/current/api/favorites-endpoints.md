---
id: favorites-endpoints
title: "Endpoints de API de Favoritos"
sidebar_label: "Favoritos"
sidebar_position: 13
---

# Endpoints de API de Favoritos

A API de Favoritos permite que usuários autenticados gerenciem sua lista pessoal de itens favoritos. Cada favorito armazena metadados do item (nome, ícone, categoria) para exibição rápida sem exigir um join com a camada de conteúdo.

**Arquivos de origem:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| GET | `/api/favorites` | Sessão | Listar todos os favoritos do usuário atual |
| POST | `/api/favorites` | Sessão | Adicionar um item aos favoritos |
| DELETE | `/api/favorites/{itemSlug}` | Sessão | Remover um item dos favoritos |

Todos os endpoints requerem uma sessão de usuário autenticado e uma conexão de banco de dados funcional (verificada via `checkDatabaseAvailability`).

---

## GET `/api/favorites`

Retorna todos os itens favoritados pelo usuário autenticado, ordenados por data de criação (mais antigo primeiro).

### Solicitação

Nenhum parâmetro de consulta ou corpo é necessário. A autenticação é fornecida via cookie de sessão.

### Formato da resposta

#### 200 -- Sucesso

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

#### 401 -- Não autorizado

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 500 -- Erro do servidor

```json
{
  "success": false,
  "error": "Failed to fetch favorites"
}
```

---

## POST `/api/favorites`

Adiciona um item aos favoritos do usuário autenticado. Inclui verificação de duplicatas para evitar adicionar o mesmo item duas vezes.

### Corpo da solicitação

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `itemSlug` | string | **Sim** | Identificador de slug único do item |
| `itemName` | string | **Sim** | Nome de exibição do item |
| `itemIconUrl` | string | Não | URL para o ícone do item |
| `itemCategory` | string | Não | Nome da categoria do item |

O corpo da solicitação é validado usando um schema Zod:

```ts
const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});
```

### Exemplo de solicitação

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### Formato da resposta

#### 201 -- Criado

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

#### 400 -- Erro de validação

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 -- Não autorizado

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- Conflito (duplicata)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Detecção de duplicatas

Antes de inserir, o handler verifica se existe um favorito com o mesmo usuário e slug de item:

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, validatedData.itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length > 0) {
  return NextResponse.json(
    { success: false, error: "Item is already in favorites" },
    { status: 409 }
  );
}
```

---

## DELETE `/api/favorites/{itemSlug}`

Remove um item específico da lista de favoritos do usuário autenticado.

### Parâmetros de caminho

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `itemSlug` | string | **Sim** | O slug do item a remover |

### Formato da resposta

#### 200 -- Removido com sucesso

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

#### 401 -- Não autorizado

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 -- Não encontrado

Retornado quando o favorito não existe ou não pertence ao usuário atual:

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### Como funciona

O handler verifica a propriedade antes de excluir. Ele primeiro consulta por um favorito correspondente pertencente ao usuário atual, e então exclui apenas se encontrado:

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length === 0) {
  return NextResponse.json(
    { success: false, error: "Favorite not found" },
    { status: 404 }
  );
}

await db
  .delete(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  );
```

---

## Exemplo de uso (fluxo completo)

```ts
// 1. Listar favoritos atuais
const listRes = await fetch('/api/favorites');
const { favorites } = await listRes.json();

// 2. Adicionar um novo favorito
const addRes = await fetch('/api/favorites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemSlug: 'new-tool',
    itemName: 'New Tool',
    itemCategory: 'utilities'
  })
});
const { favorite } = await addRes.json();
```
