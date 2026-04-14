---
id: admin-analytics-endpoints
title: Endpoints de Análise do Admin
sidebar_label: Análise do Admin
sidebar_position: 22
---

# Endpoints de Análise do Admin

A API de análise do admin fornece dados de análise geográfica para o painel de administração, incluindo estatísticas de cobertura, detalhamentos de distribuição e dados de visualização em mapa. Todos os endpoints requerem autenticação de administrador.

## Visão geral

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/api/admin/geo-analytics` | GET | Administrador | Obter dados de análise geográfica |

## Obter Análise Geográfica

```
GET /api/admin/geo-analytics
```

Retorna análises abrangentes de distribuição geográfica incluindo estatísticas de cobertura, distribuições por país/cidade/área de serviço, coordenadas de localização para marcadores de mapa e dados de mapa de calor. Este endpoint agrega dados do índice de localização e do repositório de itens.

**Autenticação:** Administrador obrigatório (via `checkAdminAuth()`)

**Cache:** Desabilitado -- utiliza `force-dynamic`, `revalidate: 0` e `force-no-store` para garantir dados atualizados no painel de administração.

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalIndexed": 450,
      "totalItems": 500,
      "itemsWithLocation": 420,
      "itemsRemote": 30,
      "coveragePercent": 84.0,
      "indexHealth": {
        "synced": true,
        "indexCount": 390,
        "expectedCount": 390
      },
      "citiesCount": 85,
      "countriesCount": 25,
      "remoteCount": 30,
      "lastIndexedAt": "2024-01-20T10:30:00.000Z",
      "lastRebuildAt": "2024-01-15T08:00:00.000Z"
    },
    "distributions": {
      "byCountry": [
        { "name": "United States", "count": 150 },
        { "name": "United Kingdom", "count": 80 },
        { "name": "Germany", "count": 45 }
      ],
      "byCity": [
        { "name": "San Francisco", "count": 35 },
        { "name": "London", "count": 28 },
        { "name": "Berlin", "count": 20 }
      ],
      "byServiceArea": [
        { "area": "North America", "count": 200 },
        { "area": "Europe", "count": 180 }
      ]
    },
    "locations": [
      {
        "itemSlug": "example-tool",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "city": "San Francisco",
        "country": "United States",
        "isRemote": false
      }
    ],
    "heatmapData": [
      { "lat": 37.7749, "lng": -122.4194 },
      { "lat": 51.5074, "lng": -0.1278 }
    ]
  }
}
```

### Campos da Resposta

#### Objeto Stats

| Campo | Tipo | Descrição |
|---|---|---|
| `totalIndexed` | inteiro | Total de entradas no índice de localização |
| `totalItems` | inteiro | Total de itens no repositório |
| `itemsWithLocation` | inteiro | Itens que possuem dados de localização ou estão marcados como remotos |
| `itemsRemote` | inteiro | Itens marcados como remotos/distribuídos |
| `coveragePercent` | número | Porcentagem de itens com dados de localização (arredondado para 1 decimal) |
| `indexHealth.synced` | booleano | Se a contagem do índice corresponde à contagem esperada |
| `indexHealth.indexCount` | inteiro | Entradas não remotas no índice |
| `indexHealth.expectedCount` | inteiro | Entradas não remotas esperadas com base nos dados de origem |
| `citiesCount` | inteiro | Número de cidades distintas no índice |
| `countriesCount` | inteiro | Número de países distintos no índice |
| `remoteCount` | inteiro | Número de entradas remotas no índice |
| `lastIndexedAt` | string ou nulo | Registro de data/hora ISO da última atualização do índice |
| `lastRebuildAt` | string ou nulo | Registro de data/hora ISO da última reconstrução completa |

#### Objeto Distributions

| Campo | Descrição |
|---|---|
| `byCountry` | Array de nomes de países com contagens, ordenado por contagem decrescente |
| `byCity` | As 20 principais cidades com contagens, ordenado por contagem decrescente |
| `byServiceArea` | Áreas de serviço com contagens, ordenado por contagem decrescente |

#### Array Locations

Cada objeto de localização fornece dados para marcadores de mapa. Itens remotos nas coordenadas `(0, 0)` são filtrados para evitar exibições de mapa enganosas.

#### Dados de Mapa de Calor

Array de pares de latitude/longitude apenas para entradas não remotas, adequado para renderizar mapas de densidade.

### Fontes de Dados

O endpoint agrega dados de três consultas paralelas:

1. **Serviço de Índice de Localização** (`getLocationIndexService().getIndexStats()`) -- fornece estatísticas do índice
2. **Entradas do Índice de Localização** (`getAllLocationEntries()`) -- fornece todas as localizações indexadas para cálculos de distribuição
3. **Repositório de Itens** (`itemRepository.findAll()`) -- fornece dados de itens de origem para cálculos de cobertura

### Cálculo de Cobertura

A porcentagem de cobertura é calculada como:

```
coveragePercent = round((itemsWithLocation / totalItems) * 100, 1)
```

Um item é contado como "tendo localização" se tiver uma coordenada de latitude ou estiver marcado como remoto (`is_remote: true`).

### Saúde do Índice

A saúde do índice compara o número de entradas não remotas no índice de localização com a contagem esperada derivada dos dados de origem:

```
expectedCount = itemsWithLocation - itemsRemote
indexCount = totalIndexed - remoteCount
synced = (indexCount === expectedCount)
```

Quando `synced` é falso, os administradores devem considerar reconstruir o índice de localização através do endpoint `/api/admin/location-index`.

| Status | Condição |
|---|---|
| 401 | Não autenticado como administrador |
| 500 | Erro interno do servidor |

**Fonte:** `template/app/api/admin/geo-analytics/route.ts`
