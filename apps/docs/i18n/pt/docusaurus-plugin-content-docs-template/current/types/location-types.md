---
id: location-types
title: Definições de tipo de local
sidebar_label: Tipos de localização
sidebar_position: 7
---

# Definições de tipo de local

**Fonte:** `lib/types/location.ts`

O módulo de localização fornece definições de tipo abrangentes para recursos de geolocalização, incluindo configuração do provedor de mapas, configurações de localização, consultas geográficas e armazenamento de dados de localização. Ele oferece suporte a provedores Mapbox e Google Maps.

## Tipos de enumeração

### `MapProvider`

Opções de provedor de mapas suportadas:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

Opções de estilo de renderização de mapa:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Tipos de configurações

### `LocationConfigSettings`

Definições de configuração armazenadas em `config.yml` usando a nomenclatura `snake_case`. Usado ao analisar a seção `settings.location` do arquivo de configuração.

```typescript
interface LocationConfigSettings {
  enabled?: boolean;
  provider?: MapProvider;
  map_style?: MapStyle;
  distance_filter_enabled?: boolean;
  distance_sort_enabled?: boolean;
  default_radius_km?: number;
  show_exact_address?: boolean;
  require_location_on_submit?: boolean;
  default_center?: [number, number]; // [latitude, longitude]
}
```

### `LocationSettings`

Configurações de localização de tempo de execução usando nomenclatura `camelCase`. Usado em todo o aplicativo para acesso com segurança de tipo.

```typescript
interface LocationSettings {
  enabled: boolean;
  provider: MapProvider;
  mapStyle: MapStyle;
  distanceFilterEnabled: boolean;
  distanceSortEnabled: boolean;
  defaultRadiusKm: number;
  showExactAddress: boolean;
  requireLocationOnSubmit: boolean;
  defaultCenter: {
    latitude: number;
    longitude: number;
  };
}
```

**Principais diferenças de `LocationConfigSettings`:**
- Todos os campos são obrigatórios (não opcionais) porque os padrões são aplicados
- Usa nomenclatura `camelCase` em vez de `snake_case`
- `default_center` tupla é convertida em um objeto nomeado `{ latitude, longitude }`

## Valores padrão

### `DEFAULT_LOCATION_SETTINGS`

Valores padrão aplicados quando as configurações não estão definidas:

```typescript
const DEFAULT_LOCATION_SETTINGS: LocationSettings = {
  enabled: false,
  provider: 'mapbox',
  mapStyle: 'streets',
  distanceFilterEnabled: true,
  distanceSortEnabled: true,
  defaultRadiusKm: 50,
  showExactAddress: false,
  requireLocationOnSubmit: false,
  defaultCenter: { latitude: 0, longitude: 0 },
};
```

## Tipos de dados

### `LocationData`

Dados de localização para itens armazenados na tabela `item_location_index`. Esta é uma estrutura somente de índice; a fonte da verdade permanece nos arquivos YAML.

```typescript
interface LocationData {
  item_slug: string;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  service_area: string | null;
  is_remote: boolean;
  indexed_at: Date;
}
```

## Tipos de status de API

### `MapProviderStatus`

Informações de status para um único provedor de mapas, usadas na UI administrativa para mostrar o estado configurado/desconfigurado sem expor chaves de API.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Resposta do endpoint da API `map-status`, relatando o status da configuração para ambos os provedores.

```typescript
interface MapStatusResponse {
  mapbox: {
    isConfigured: boolean;
    isPreviewAvailable: boolean;
    name: string;
  };
  google: {
    isConfigured: boolean;
    isPreviewAvailable: boolean;
    name: string;
  };
}
```

## Tipos de consulta geográfica

### `GeoBoundingBox`

Caixa delimitadora para consultas geoespaciais, definindo uma região retangular no mapa.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

Opções para consultas de itens baseadas em localização. Suporta pesquisa por raio, filtragem de cidade/país e inclusão remota de itens.

```typescript
interface LocationQueryOptions {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  city?: string;
  country?: string;
  includeRemote?: boolean;
}
```

### `LocationQueryResult`

Resultado de uma consulta de item baseada em localização, incluindo cálculo de distância.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Funções

### `mapLocationConfigToRuntime`

Mapeia as configurações do `snake_case` do YAML para as configurações de tempo de execução do `camelCase`. Aplica padrões para quaisquer campos ausentes.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**Exemplo:**

```typescript
import { mapLocationConfigToRuntime } from '@/lib/types/location';

// From config.yml
const yamlConfig = {
  enabled: true,
  provider: 'mapbox' as const,
  default_radius_km: 25,
  default_center: [40.7128, -74.006] as [number, number],
};

const settings = mapLocationConfigToRuntime(yamlConfig);
// Result:
// {
//   enabled: true,
//   provider: 'mapbox',
//   mapStyle: 'streets',           // default applied
//   distanceFilterEnabled: true,   // default applied
//   distanceSortEnabled: true,     // default applied
//   defaultRadiusKm: 25,
//   showExactAddress: false,       // default applied
//   requireLocationOnSubmit: false, // default applied
//   defaultCenter: { latitude: 40.7128, longitude: -74.006 },
// }
```

## Exemplos de uso

### Consultando itens por localização

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### Verificando o status do provedor de mapas

```typescript
import type { MapStatusResponse } from '@/lib/types/location';

async function checkMapStatus(): Promise<MapStatusResponse> {
  const res = await fetch('/api/admin/map-status');
  return res.json();
}

// Usage
const status = await checkMapStatus();
if (status.mapbox.isConfigured) {
  console.log('Mapbox is ready');
}
```

### Usando caixa delimitadora para consultas de viewport

```typescript
import type { GeoBoundingBox } from '@/lib/types/location';

function getViewportBounds(
  center: { lat: number; lng: number },
  radiusKm: number
): GeoBoundingBox {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(center.lat * (Math.PI / 180)));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
```

## Notas de projeto

### Configuração versus padrão de tempo de execução

O módulo de localização usa um sistema do tipo duas camadas:

1. **Tipos de configuração** (`LocationConfigSettings`) use `snake_case` para corresponder às convenções de arquivo YAML
2. **Tipos de tempo de execução** (`LocationSettings`) use `camelCase` para TypeScript idiomático
3. A função `mapLocationConfigToRuntime()` faz a ponte entre as duas, aplicando padrões

Esse padrão garante que os arquivos YAML permaneçam legíveis enquanto o código do aplicativo segue as convenções TypeScript.

### Dados de localização somente de índice

`LocationData` é armazenado na tabela de banco de dados `item_location_index` para consultas geográficas rápidas, mas a fonte da verdade para localizações de itens permanece nos arquivos de conteúdo YAML. O índice é reconstruído quando os itens são atualizados.

### Considerações sobre privacidade

A configuração `showExactAddress` (padrão: `false`) controla se endereços precisos são exibidos. Quando desativado, apenas informações em nível de cidade/país são mostradas aos usuários.

## Tipos Relacionados

- [`ItemLocationData`](./item-types.md) - Dados de localização incorporados em arquivos YAML de item
- [`ItemListOptions`](./item-types.md) - A filtragem de itens suporta os campos `city`, `country` e `includeRemote`
