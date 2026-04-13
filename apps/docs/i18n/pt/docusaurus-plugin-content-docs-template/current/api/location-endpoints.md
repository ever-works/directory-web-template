---
id: location-endpoints
title: "Referência da API de Localização"
sidebar_label: "Localização"
sidebar_position: 51
---

# Referência da API de Localização

## Visão geral

Os endpoints de Localização fornecem acesso ao índice de localização espacial de itens no diretório. Eles suportam consulta de itens por cidade, país, pesquisa de proximidade por raio e recuperação de dados de coordenadas para renderização de mapas. Todos os endpoints de localização requerem que a funcionalidade de localização esteja habilitada nas configurações do sistema.

## Endpoints

### GET /api/location/cities

Retorna uma lista de nomes de cidades distintos do índice de localização.

**Solicitação**

Nenhum parâmetro necessário.

**Resposta**
```typescript
{
  success: true;
  data: string[];   // Array de nomes de cidades, ex: ["San Francisco", "London", "Tokyo"]
}
```

**Exemplo**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### GET /api/location/countries

Retorna uma lista de nomes de países distintos do índice de localização.

**Solicitação**

Nenhum parâmetro necessário.

**Resposta**
```typescript
{
  success: true;
  data: string[];   // Array de nomes de países, ex: ["United States", "United Kingdom"]
}
```

**Exemplo**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### GET /api/location/coordinates

Retorna coordenadas de todos os itens indexados, com filtragem opcional por cidade ou país. Usado para renderizar marcadores no mapa. Itens remotos são automaticamente excluídos.

**Solicitação**

| Parâmetro | Tipo   | Em    | Descrição |
|-----------|--------|-------|----------|
| city      | string | query | Filtrar por nome de cidade (sem distinção de maiúsculas/minúsculas) |
| country   | string | query | Filtrar por nome de país (sem distinção de maiúsculas/minúsculas) |

**Resposta**
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Identificador slug do item
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

**Exemplo**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### GET /api/location/search

Pesquisa itens por localização geográfica usando proximidade baseada em raio, nome de cidade ou nome de país. Retorna slugs de itens correspondentes e informações opcionais de distância.

**Solicitação**

| Parâmetro | Tipo   | Em    | Descrição |
|-----------|--------|-------|----------|
| near_lat  | number | query | Latitude para pesquisa por raio |
| near_lng  | number | query | Longitude para pesquisa por raio |
| radius    | number | query | Raio em km (padrão: 50) |
| city      | string | query | Filtrar por nome de cidade |
| country   | string | query | Filtrar por nome de país |

Pelo menos um parâmetro de pesquisa é obrigatório: `near_lat` + `near_lng`, `city` ou `country`.

**Resposta**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Array de slugs de itens correspondentes
    distances: Record<string, number>;  // Mapa slug-para-distância-km (somente pesquisa por raio)
  };
}
```

**Exemplo**
```typescript
// Pesquisa por raio: itens num raio de 25km de San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// Pesquisa por cidade
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## Autenticação

Todos os endpoints de localização são **públicos** — não é necessária autenticação. No entanto, a funcionalidade de localização deve estar habilitada nas configurações do sistema. Se as funcionalidades de localização estiverem desativadas, todos os endpoints retornam um `404` com `"Location features are disabled"`.

## Códigos de erro

| Status | Descrição |
|--------|-----------|
| 400 | Coordenadas inválidas, raio inválido ou parâmetros de pesquisa obrigatórios ausentes |
| 404 | Funcionalidades de localização desativadas nas configurações do sistema |
| 500 | Erro interno do servidor — falha na consulta ao banco de dados |

## Limitação de taxa

Nenhuma limitação de taxa explícita é aplicada a esses endpoints. Itens remotos/virtuais são automaticamente excluídos dos resultados de coordenadas.

## Documentação relacionada

- [Endpoints de Geocodificação](./geocode-endpoints) — Geocodificação direta e inversa (somente administrador)
