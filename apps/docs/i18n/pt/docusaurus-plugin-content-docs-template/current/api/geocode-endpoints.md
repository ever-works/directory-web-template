---
id: geocode-endpoints
title: "Referência da API de Geocodificação"
sidebar_label: "Geocodificação"
sidebar_position: 50
---

# Referência da API de Geocodificação

## Visão geral

Os endpoints de Geocodificação fornecem capacidades de geocodificação direta (endereço para coordenadas) e geocodificação inversa (coordenadas para endereço). Os resultados são armazenados em cache por 15 minutos para reduzir chamadas a APIs externas. Esses endpoints requerem autenticação de administrador para evitar abuso de custo dos serviços de geocodificação Mapbox/Google subjacentes.

## Endpoints

### POST /api/geocode

Converte um endereço em coordenadas (geocodificação direta) ou coordenadas em endereço (geocodificação inversa). O corpo da solicitação determina qual operação é realizada com base em se os campos `address` ou `latitude`/`longitude` são fornecidos.

#### Geocodificação direta (endereço para coordenadas)

**Solicitação**
```typescript
{
  address: string;          // 1-500 caracteres, obrigatório
  options?: {
    countryCodes?: string[];  // Códigos ISO 3166-1 alpha-2, ex: ["US", "CA"]
    language?: string;        // Código de idioma ISO 639-1, ex: "en"
    proximity?: {
      latitude: number;       // -90 a 90
      longitude: number;      // -180 a 180
    };
  };
}
```

**Resposta**
```typescript
{
  success: true;
  data: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
    confidence: number;       // 0 a 1
  };
}
```

**Exemplo**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    options: {
      countryCodes: ['US'],
      language: 'en'
    }
  })
});
const data = await response.json();
```

#### Geocodificação inversa (coordenadas para endereço)

**Solicitação**
```typescript
{
  latitude: number;         // -90 a 90, obrigatório
  longitude: number;        // -180 a 180, obrigatório
  options?: {
    language?: string;        // Código de idioma ISO 639-1
  };
}
```

**Resposta**
```typescript
{
  success: true;
  data: {
    formattedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
  };
}
```

**Exemplo**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 37.4224764,
    longitude: -122.0842499,
    options: { language: 'en' }
  })
});
const data = await response.json();
```

### GET /api/geocode

Retorna o status do serviço de geocodificação, incluindo quais provedores estão configurados e estatísticas de cache.

**Solicitação**

Nenhum corpo de solicitação necessário. Autenticação via cookie de sessão.

**Resposta**
```typescript
{
  success: true;
  data: {
    enabled: boolean;         // Se as funcionalidades de localização estão habilitadas
    configured: boolean;      // Se algum provedor de geocodificação está configurado
    providers: {
      mapbox: boolean;
      google: boolean;
    };
    cache: {
      size: number;           // Tamanho atual do cache
      maxSize: number;        // Tamanho máximo do cache (1000)
      ttlMs: number;          // TTL do cache em milissegundos (900000 = 15 min)
    };
  };
}
```

**Exemplo**
```typescript
const response = await fetch('/api/geocode');
const status = await response.json();
// status.data.providers.mapbox === true
```

## Autenticação

- **GET /api/geocode**: Requer sessão autenticada (qualquer usuário).
- **POST /api/geocode**: Requer sessão autenticada com **função de administrador**. Usuários não administradores recebem uma resposta `403 Proibido`. Essa restrição evita abuso de custos de API.

## Códigos de erro

| Status | Descrição |
|--------|-----------|
| 400 | Dados de solicitação inválidos — endereço malformado, coordenadas inválidas ou falha na validação de schema |
| 401 | Não autorizado — sem sessão autenticada |
| 403 | Proibido — acesso de administrador obrigatório (somente POST) |
| 404 | Nenhum resultado de geocodificação encontrado para o endereço ou coordenadas fornecidos |
| 503 | Funcionalidades de localização desativadas nas configurações, ou serviço de geocodificação não configurado |

## Limitação de taxa

Os resultados são armazenados em cache por 15 minutos (TTL de 900.000ms) com tamanho máximo de cache de 1.000 entradas. Todas as solicitações de geocodificação são registradas em auditoria para fins de rastreamento de custos.

## Documentação relacionada

- [Endpoints de Localização](./location-endpoints) — Pesquisa de localização, cidades, países e coordenadas
