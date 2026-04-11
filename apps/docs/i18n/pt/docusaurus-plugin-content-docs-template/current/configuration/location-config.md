---
id: location-config
title: "Referência de Configuração de Localização"
sidebar_label: "Localização"
sidebar_position: 13
---

# Referência de Configuração de Localização

Esta página documenta todas as configurações de localização e mapa disponíveis no template. A configuração flui do repositório de conteúdo YAML através do `SettingsProvider` para os componentes React.

## Fonte de Configuração

As configurações de localização são definidas na seção `settings.location` do arquivo `config.yml` do repositório de conteúdo:

```yaml
settings:
  location:
    enabled: true
    provider: mapbox          # 'mapbox' or 'google'
    map_style: streets        # 'streets' or 'satellite'
    distance_filter_enabled: true
    distance_sort_enabled: true
    default_radius_km: 50
    show_exact_address: false
    require_location_on_submit: false
    default_center: [40.7128, -74.0060]  # [latitude, longitude]
```

## Tipos de Configuração

### LocationConfigSettings (YAML / snake_case)

A estrutura bruta lida do `config.yml`, definida em `lib/types/location.ts`:

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
  default_center?: [number, number];   // [latitude, longitude]
}
```

### LocationSettings (Runtime / camelCase)

A estrutura de tempo de execução usada em toda a aplicação:

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
  defaultCenter: { latitude: number; longitude: number };
}
```

A função `mapLocationConfigToRuntime()` converte as configurações YAML em snake_case para o formato de tempo de execução camelCase.

### Descrições das Configurações

| Configuração | Tipo | Padrão | Descrição |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Chave principal para todos os recursos de localização |
| `provider` | `MapProvider` | `'mapbox'` | Provedor de tiles de mapa e geocodificação |
| `mapStyle` | `MapStyle` | `'streets'` | Estilo de renderização do mapa |
| `distanceFilterEnabled` | `boolean` | `true` | Mostrar filtro de raio de distância na pesquisa |
| `distanceSortEnabled` | `boolean` | `true` | Permitir ordenação de resultados por distância |
| `defaultRadiusKm` | `number` | `50` | Raio de pesquisa padrão em quilômetros |
| `showExactAddress` | `boolean` | `false` | Exibir endereços completos publicamente |
| `requireLocationOnSubmit` | `boolean` | `false` | Tornar localização obrigatória para envios |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | Coordenadas de centro do mapa de fallback |

## Provedores de Mapa

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| Provedor | Variável de Ambiente | Funcionalidades |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Tiles vetoriais, geocodificação, clustering |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Tiles, API de Lugares, geocodificação |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

### `MapProviderStatus`

Status da chave de API para a interface administrativa.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Resposta do endpoint `/api/map-status`.

```typescript
interface MapStatusResponse {
  mapbox: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
  google: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
}
```

## Sistema de Coordenadas

### `Coordinates`

O tipo de ponto geográfico padrão usado em todos os componentes de mapa.

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### `MapBounds`

Caixa delimitadora para cálculos de viewport.

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `GeoBoundingBox`

Caixa delimitadora alternativa para consultas de banco de dados.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

## Dados de Localização

### `LocationData`

Localização do item armazenada na tabela de banco de dados `item_location_index`.

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

### `LocationQueryOptions`

Parâmetros para pesquisas de itens baseadas em proximidade.

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

Resultado de uma pesquisa baseada em localização.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Configuração do Componente de Mapa

### `MapComponentProps`

Props para o componente principal `Map`.

```typescript
interface MapComponentProps {
  markers?: MapMarkerData[];
  center?: Coordinates;
  zoom?: number;                    // 1-20
  style?: MapStyle;
  className?: string;
  height?: string | number;
  controls?: MapControlsConfig;
  enableClustering?: boolean;
  clusterOptions?: ClusterOptions;
  isLoading?: boolean;
  onMarkerClick?: (marker: MapMarkerData) => void;
  onViewportChange?: (viewport: MapViewport) => void;
}
```

### `ClusterOptions`

Configuração de clustering de marcadores.

```typescript
interface ClusterOptions {
  radius?: number;      // Cluster radius in pixels (default: 60)
  maxZoom?: number;      // Max zoom for clustering (default: 16)
  minZoom?: number;      // Min zoom for clustering (default: 0)
  minPoints?: number;    // Min points to form cluster (default: 2)
}
```

### `MapControlsConfig`

Alternar controles de UI do mapa.

```typescript
interface MapControlsConfig {
  showZoomControls?: boolean;
  showFullscreenControl?: boolean;
  showNavigationControl?: boolean;
  showScaleControl?: boolean;
}
```

## Preferências de Localização do Usuário

Os usuários podem definir preferências de localização padrão em seu perfil de cliente (armazenado na tabela `client_profiles`):

| Coluna | Tipo | Descrição |
|--------|------|-------------|
| `default_latitude` | `doublePrecision` | Latitude padrão do usuário |
| `default_longitude` | `doublePrecision` | Longitude padrão do usuário |
| `default_city` | `text` | Cidade padrão do usuário |
| `default_country` | `text` | País padrão do usuário |
| `location_privacy` | `text` | `'private'` (padrão) ou `'public'` |

## Variáveis de Ambiente

| Variável de Ambiente | Obrigatória | Descrição |
|---------|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Para Mapbox | Token de acesso Mapbox GL |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Para Google | Chave de API do Google Maps |

## Páginas Relacionadas

- [Tipos de Localização](../types/location-types.md) -- definições completas de tipos para recursos de localização
- [Configuração de Mapa](./map-config.md) -- configuração adicional de UI do mapa
- [Configuração de Funcionalidades](./feature-config.md) -- configurações de sinalizadores de funcionalidades
