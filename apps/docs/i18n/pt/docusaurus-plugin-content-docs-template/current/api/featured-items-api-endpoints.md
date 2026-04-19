---
id: featured-items-api-endpoints
title: Endpoints de API de Itens em Destaque
sidebar_label: API de Itens em Destaque
sidebar_position: 63
---

# Endpoints de API de Itens em Destaque

A API de Itens em Destaque fornece um endpoint público para recuperar itens em destaque exibidos no site. Os itens em destaque são gerenciados pelo painel administrativo e armazenados no banco de dados com suporte para ordenação, ativação e datas de expiração.

**Origem:** `template/app/api/featured-items/route.ts`

---

## Obter itens em destaque

Retorna uma lista de itens em destaque ativos para exibição pública. Filtra automaticamente itens inativos e (opcionalmente) expirados.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/featured-items` |
| **Auth** | Nenhuma (público) |

### Parâmetros de consulta

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `limit` | `integer` | Não | `6` | Número máximo de itens em destaque a retornar (1-50) |
| `includeExpired` | `boolean` | Não | `false` | Se deve incluir itens além da data `featured_until` |

### Resposta

**Status 200** -- Itens em destaque recuperados com sucesso.

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
    }
  ],
  "count": 1
}
```

### Campos da resposta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `data` | `array` | Array de objetos de item em destaque |
| `count` | `number` | Número de itens em destaque retornados |
| `data[].id` | `string` | ID do registro de item em destaque |
| `data[].itemSlug` | `string` | Identificador de slug do item |
| `data[].itemName` | `string` | Nome de exibição do item |
| `data[].itemDescription` | `string \| null` | Descrição do item em destaque |
| `data[].itemIconUrl` | `string \| null` | URL do ícone do item |
| `data[].itemImageUrl` | `string \| null` | URL da imagem de banner em destaque |
| `data[].featuredOrder` | `number` | Ordem de exibição (maior = mais proeminente) |
| `data[].isActive` | `boolean` | Se o item está atualmente em destaque |
| `data[].featuredAt` | `string` (ISO 8601) | Quando o item foi colocado em destaque |
| `data[].featuredUntil` | `string \| null` (ISO 8601) | Data de expiração (`null` = sem expiração) |
| `data[].createdAt` | `string` (ISO 8601) | Timestamp de criação do registro |
| `data[].updatedAt` | `string \| null` (ISO 8601) | Timestamp da última atualização |

### Ordenação

Os itens são ordenados por:
1. `featuredOrder` decrescente (maior ordem primeiro)
2. `featuredAt` decrescente (mais recentemente destacado primeiro)

### Lógica de filtragem

O endpoint aplica esses filtros:

1. **Somente ativos:** Apenas itens com `isActive = true` são retornados.
2. **Verificação de expiração** (quando `includeExpired` é `false`):
   - Itens com `featuredUntil = null` são sempre incluídos (sem expiração).
   - Itens com `featuredUntil >= data atual` são incluídos (ainda não expirados).
   - Itens com `featuredUntil < data atual` são excluídos.

### Resposta de erro

**Status 500**

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Exemplos com curl

```bash
# Obter itens em destaque padrão (top 6, excluir expirados)
curl -s http://localhost:3000/api/featured-items

# Obter os 3 principais itens em destaque
curl -s "http://localhost:3000/api/featured-items?limit=3"

# Incluir itens em destaque expirados
curl -s "http://localhost:3000/api/featured-items?includeExpired=true"

# Combinar parâmetros
curl -s "http://localhost:3000/api/featured-items?limit=10&includeExpired=true"
```

### Uso em TypeScript

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemDescription: string | null;
  itemIconUrl: string | null;
  itemImageUrl: string | null;
  featuredOrder: number;
  isActive: boolean;
  featuredAt: string;
  featuredUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  count: number;
}

async function getFeaturedItems(
  limit: number = 6,
  includeExpired: boolean = false
): Promise<FeaturedItemsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    ...(includeExpired && { includeExpired: 'true' }),
  });
  const res = await fetch(`/api/featured-items?${params}`);
  return res.json();
}

// Uso
const { data: featuredItems, count } = await getFeaturedItems(6);
featuredItems.forEach(item => {
  console.log(`${item.itemName} (ordem: ${item.featuredOrder})`);
  if (item.featuredUntil) {
    console.log(`  Expira em: ${item.featuredUntil}`);
  }
});
```

### Notas de implementação

- A disponibilidade do banco de dados é verificada no início via `checkDatabaseAvailability()`.
- O parâmetro `limit` é analisado da string de consulta com padrão de `6`. Valores acima de 50 não são truncados (validados pelo lado do cliente).
- Erros são registrados apenas no modo de desenvolvimento para evitar ruído nos logs de produção.
- Os itens em destaque são gerenciados através dos endpoints do painel administrativo (consulte [Endpoints de Admin](/template/api/admin-endpoints)).
- O campo `featuredUntil` suporta tanto destaque permanente (`null`) quanto destaque com tempo limitado.
