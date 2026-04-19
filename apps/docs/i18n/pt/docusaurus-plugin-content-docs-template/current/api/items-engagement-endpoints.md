---
id: items-engagement-endpoints
title: "Referência da API de Engajamento de Itens"
sidebar_label: "Engajamento de Itens"
sidebar_position: 54
---

# Referência da API de Engajamento de Itens

## Visão geral

Os endpoints de Engajamento de Itens fornecem acesso a métricas de engajamento e pontuações de popularidade para itens do diretório. Isso inclui contagens de visualizações, votos, avaliações, favoritos e comentários. O endpoint de pontuações de popularidade também calcula um ranking ponderado que considera métricas de engajamento, status de destaque e atualidade do conteúdo.

## Endpoints

### GET /api/items/engagement

Busca métricas de engajamento para múltiplos itens identificados por seus slugs em uma única solicitação em lote.

**Solicitação**

| Parâmetro | Tipo   | Em    | Descrição |
|-----------|--------|-------|----------|
| slugs     | string | query | Lista separada por vírgulas de slugs de itens (obrigatório, máx. 200) |

**Resposta**
```typescript
{
  metrics: Record<string, {
    views: number;
    votes: number;
    avgRating: number;
    favorites: number;
    comments: number;
  }>;
}
```

**Exemplo**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### GET /api/items/popularity-scores

Endpoint de depuração que retorna itens ordenados por pontuação de popularidade calculada, com detalhamento dos fatores de pontuação. Útil para entender como o algoritmo de ordenação classifica os itens.

**Solicitação**

| Parâmetro | Tipo   | Em    | Descrição |
|-----------|--------|-------|----------|
| limit     | number | query | Número de itens a retornar (padrão: 20, máx. 100) |
| locale    | string | query | Código de idioma para os itens (padrão: "en") |

**Resposta**
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Pontuação total calculada (arredondada)
    scoreBreakdown: {
      featured: number;          // 10000 se destacado, 0 caso contrário
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Decai ao longo de 180 dias
    };
    engagement: {
      views: number;
      votes: number;
      avgRating: number;
      favorites: number;
      comments: number;
    } | null;
    ageInDays: number;
  }>;
}
```

**Exemplo**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## Autenticação

Ambos os endpoints são **públicos** — não é necessária autenticação. Eles são marcados como `force-dynamic` para garantir dados atualizados em cada solicitação.
