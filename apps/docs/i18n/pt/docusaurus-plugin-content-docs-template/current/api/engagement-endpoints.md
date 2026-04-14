---
id: engagement-endpoints
title: "Endpoints de API de Engajamento"
sidebar_label: "Engajamento"
sidebar_position: 12
---

# Endpoints de API de Engajamento

A API de Engajamento fornece endpoints para recuperar métricas de engajamento (visualizações, votos, avaliações, favoritos, comentários) e calcular pontuações de popularidade para itens. Esses endpoints alimentam os recursos de ordenação, classificação e análise do template.

**Arquivos de origem:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| GET | `/api/items/engagement` | Nenhuma | Buscar métricas de engajamento para múltiplos itens |
| GET | `/api/items/popularity-scores` | Nenhuma | Obter itens ordenados por pontuação de popularidade calculada |

Ambos os endpoints usam `dynamic = 'force-dynamic'` para garantir dados frescos em cada solicitação.

---

## GET `/api/items/engagement`

Busca métricas de engajamento para múltiplos itens identificados por seus slugs. Retorna um mapa de slug para métricas.

### Parâmetros de consulta

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `slugs` | string | **Sim** | -- | Lista de slugs de itens separados por vírgula |

### Restrições

- O parâmetro `slugs` é **obrigatório**. Omiti-lo retorna um erro 400.
- Máximo de **200 slugs** por solicitação. Exceder esse limite retorna um erro 400.

### Como funciona

```ts
const slugsParam = searchParams.get('slugs');
const slugs = slugsParam
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (slugs.length > 200) {
  return NextResponse.json(
    { error: 'Too many slugs. Maximum 200 allowed per request.' },
    { status: 400 }
  );
}

const metricsMap = await getEngagementMetricsPerItem(slugs);
```

### Formato da resposta

#### 200 -- Métricas recuperadas

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 200 -- Vazio (nenhum slug fornecido após análise)

```json
{
  "metrics": {}
}
```

#### 400 -- Slugs ausentes

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Slugs em excesso

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Erro do servidor

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Exemplo de uso

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Acessar métricas de item individual
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## GET `/api/items/popularity-scores`

Um endpoint de depuração/análise que retorna itens ordenados pela pontuação de popularidade calculada. O algoritmo de pontuação usa escala logarítmica e considera múltiplos sinais de engajamento além da atualidade.

### Parâmetros de consulta

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `limit` | integer | Não | `20` | Número de itens a retornar (máx. 100) |
| `locale` | string | Não | `"en"` | Locale para busca de dados do item |

### Algoritmo de pontuação

A pontuação de popularidade é calculada como a soma de componentes ponderados:

| Componente | Peso | Fórmula |
|------------|------|---------|
| Bônus de destaque | +10.000 | Bônus fixo para itens em destaque |
| Visualizações | 1.000x | `log10(views + 1) * 1000` |
| Votos | 1.200x | `log10(max(votes, 0) + 1) * 1200` |
| Avaliação média | 500x | `avgRating * 500` |
| Favoritos | 1.100x | `log10(favorites + 1) * 1100` |
| Comentários | 1.000x | `log10(comments + 1) * 1000` |
| Atualidade (menos de 30 dias) | até +1.000 | Decaimento linear ao longo de 30 dias |
| Atualidade (30-90 dias) | até +500 | Decaimento linear ao longo dos próximos 60 dias |
| Atualidade (90-180 dias) | até +250 | Decaimento linear ao longo dos próximos 90 dias |

Itens sem dados de engajamento recebem uma pontuação de fallback heurística baseada na contagem de tags, comprimento do nome, presença de ícone e existência de código promocional.

### Formato da resposta

#### 200 -- Pontuações recuperadas

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```

### Exemplo de uso

```ts
// Buscar os 10 itens mais populares
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Pontuação: ${item.score}`);
});
```

### Notas

- O algoritmo de pontuação corresponde à lógica de ordenação de produção em `sort-utils.ts`.
- A escala logarítmica impede que itens com contagens de visualizações extremamente altas dominem a classificação.
- O bônus de atualidade garante que itens recém-adicionados recebam um impulso temporário de visibilidade.
- Os itens são ordenados por pontuação decrescente; empates são desfeitos alfabeticamente pelo nome.

### Arquivos de origem relacionados

| Arquivo | Finalidade |
|---------|-----------|
| `template/app/api/items/engagement/route.ts` | Endpoint de métricas de engajamento |
| `template/app/api/items/popularity-scores/route.ts` | Endpoint de pontuação de popularidade |
| `template/lib/db/queries/engagement.queries.ts` | Consultas de banco de dados para dados de engajamento |
| `template/lib/content.ts` | `getCachedItems` para dados de itens |
