---
id: featured-items-endpoints
title: "Endpoints de API de Itens em Destaque"
sidebar_label: "Itens em Destaque"
sidebar_position: 18
---

# Endpoints de API de Itens em Destaque

A API de Itens em Destaque fornece um endpoint público para recuperar itens que foram destacados para exibição proeminente no site. Os itens em destaque suportam ordenação, datas de expiração e estados ativo/inativo.

**Arquivo de origem:** `template/app/api/featured-items/route.ts`

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| GET | `/api/featured-items` | Nenhuma | Obter itens em destaque ativos para exibição pública |

---

## GET `/api/featured-items`

Retorna uma lista de itens em destaque ativos para exibição pública. Filtra automaticamente itens inativos e opcionalmente exclui itens expirados com base na data `featuredUntil`. Os itens são ordenados por ordem de destaque (decrescente) e data de destaque (decrescente) para apresentação otimizada.

### Parâmetros de consulta

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `limit` | integer | Não | 6 | Máximo de itens a retornar (1-50) |
| `includeExpired` | boolean | Não | `false` | Se deve incluir itens além da data `featuredUntil` |

### Requisito de banco de dados

O endpoint verifica a disponibilidade do banco de dados antes de processar. Se o banco de dados não estiver configurado, a verificação `checkDatabaseAvailability()` retorna uma resposta de erro apropriada.

### Como funciona

A consulta cria condições dinamicamente com base nos parâmetros:

```ts
// Sempre filtrar por itens ativos
const conditions = [eq(featuredItems.isActive, true)];

// Opcionalmente excluir itens expirados
if (!includeExpired) {
  const currentDate = new Date();
  const expirationCondition = or(
    isNull(featuredItems.featuredUntil),
    gte(featuredItems.featuredUntil, currentDate)
  );
  conditions.push(expirationCondition);
}

const featuredItemsList = await db
  .select()
  .from(featuredItems)
  .where(and(...conditions))
  .orderBy(
    desc(featuredItems.featuredOrder),
    desc(featuredItems.featuredAt)
  )
  .limit(limit);
```

### Lógica de ordenação

Os itens são ordenados por dois campos de forma decrescente:

1. **`featuredOrder`** -- Valores maiores aparecem primeiro (prioridade controlada pelo admin)
2. **`featuredAt`** -- Itens destacados mais recentemente aparecem primeiro (critério de desempate)

### Formato da resposta

#### 200 -- Itens em destaque recuperados

```json
{
  "success": true,
  "data": [
    {
      "id": "featured_123abc",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemDescription": "Boost your productivity with this amazing tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemImageUrl": "https://example.com/featured/tool-banner.jpg",
      "featuredOrder": 10,
      "isActive": true,
      "featuredAt": "2024-01-20T10:30:00.000Z",
      "featuredUntil": "2024-02-20T10:30:00.000Z",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "id": "featured_456def",
      "itemSlug": "great-design-app",
      "itemName": "Great Design App",
      "itemDescription": "Create stunning designs effortlessly",
      "itemIconUrl": "https://example.com/icons/design.png",
      "itemImageUrl": "https://example.com/featured/design-banner.jpg",
      "featuredOrder": 8,
      "isActive": true,
      "featuredAt": "2024-01-19T15:20:00.000Z",
      "featuredUntil": null,
      "createdAt": "2024-01-19T15:20:00.000Z",
      "updatedAt": "2024-01-19T15:20:00.000Z"
    }
  ],
  "count": 2
}
```

#### 200 -- Nenhum item em destaque

```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

#### 500 -- Erro do servidor

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Modelo de dados

Cada registro de item em destaque contém:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ID único do registro de item em destaque |
| `itemSlug` | string | Slug do item em destaque |
| `itemName` | string | Nome de exibição |
| `itemDescription` | string (anulável) | Descrição para exibição em destaque |
| `itemIconUrl` | string (anulável) | URL do ícone do item |
| `itemImageUrl` | string (anulável) | URL da imagem de banner em destaque |
| `featuredOrder` | integer | Prioridade de exibição (maior = mais proeminente) |
| `isActive` | boolean | Se está atualmente em destaque |
| `featuredAt` | datetime | Quando o item foi colocado em destaque |
| `featuredUntil` | datetime (anulável) | Data de expiração (null significa sem expiração) |
| `createdAt` | datetime | Timestamp de criação do registro |
| `updatedAt` | datetime (anulável) | Timestamp da última atualização |

### Comportamento de expiração

- Itens com `featuredUntil: null` nunca expiram e são sempre incluídos.
- Itens com data `featuredUntil` no passado são excluídos por padrão.
- Definir `includeExpired=true` ignora o filtro de expiração (útil para visualizações de admin).

### Exemplo de uso

```ts
// Buscar os 3 principais itens em destaque para a seção hero da página inicial
const res = await fetch('/api/featured-items?limit=3');
const { data, count } = await res.json();

if (count > 0) {
  data.forEach(item => {
    console.log(`Em destaque: ${item.itemName} (ordem: ${item.featuredOrder})`);
  });
}
```

### Notas

- Erros são registrados apenas no modo de desenvolvimento (`NODE_ENV === 'development'`).
- Este é um **endpoint público** -- nenhuma autenticação é necessária.
- Os itens em destaque são gerenciados por admins através do painel administrativo (consulte Endpoints de Admin).

---

## Arquivos de origem relacionados

| Arquivo | Finalidade |
|---------|-----------|
| `template/app/api/featured-items/route.ts` | Endpoint público de itens em destaque |
| `template/lib/db/schema.ts` | Definição da tabela `featuredItems` |
| `template/lib/utils/database-check.ts` | Verificação de disponibilidade do banco de dados |
