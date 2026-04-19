---
id: map-providers
title: Provedores de mapas
sidebar_label: Provedores de mapas
sidebar_position: 34
---

# Provedores de mapas

O modelo implementa uma camada de abstração de provedor para mapas interativos, suportando Google Maps e Mapbox GL JS por meio de uma interface unificada. Isso permite trocar de provedor de mapas sem alterar o código do componente.

## Estrutura de arquivo

```
lib/maps/
  index.ts                              # Re-exports types and providers
  types.ts                              # All map-related TypeScript types
  providers/
    index.ts                            # Re-exports provider interface and implementations
    map-provider.interface.ts           # IMapProvider contract and related interfaces
    google-map-provider.ts              # Google Maps implementation
    mapbox-map-provider.ts              # Mapbox GL JS implementation
```

## Interface do provedor (`IMapProvider`)

Cada provedor de mapas implementa a interface `IMapProvider`, que define o contrato para criação de mapas, marcadores, clustering e preenchimento automático de endereço:

```ts
export interface IMapProvider {
  readonly name: 'mapbox' | 'google';

  isLoaded(): boolean;
  loadScript(): Promise<void>;
  createMap(container: HTMLElement, options: MapCreateOptions): Promise<IMapInstance>;
  createMarker(map: IMapInstance, options: MarkerCreateOptions): IMarkerInstance;
  createClusterer(
    map: IMapInstance,
    options: ClusterOptions,
    onClusterClick?: (cluster: ClusterClickData) => void
  ): IClustererInstance;
  createAutocomplete(
    input: HTMLInputElement,
    onSelect: (suggestion: AddressSuggestion) => void
  ): IAutocompleteInstance;
  getStyleUrl(style: MapStyle): string;
  isConfigured(): boolean;
}
```

### Interfaces de instância

Cada provedor envolve seus objetos nativos por trás de interfaces abstratas:

```ts
// Map instance - wraps google.maps.Map or mapboxgl.Map
interface IMapInstance {
  setCenter(coordinates: Coordinates): void;
  setZoom(zoom: number): void;
  getCenter(): Coordinates;
  getZoom(): number;
  getBounds(): MapBounds | null;
  fitBounds(bounds: MapBounds, padding?: number): void;
  resize(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler?: (...args: unknown[]) => void): void;
  destroy(): void;
}

// Marker instance
interface IMarkerInstance {
  setPosition(coordinates: Coordinates): void;
  setDraggable(draggable: boolean): void;
  getPosition(): Coordinates;
  show(): void;
  hide(): void;
  remove(): void;
  onClick(handler: () => void): void;
  onDragEnd(handler: (coordinates: Coordinates) => void): void;
}

// Clusterer instance
interface IClustererInstance {
  addMarkers(markers: MapMarkerData[]): void;
  removeMarkers(markerIds: string[]): void;
  clearMarkers(): void;
  refresh(): void;
  destroy(): void;
}

// Autocomplete instance
interface IAutocompleteInstance {
  clear(): void;
  destroy(): void;
}
```

## Provedor do Google Maps

A classe `GoogleMapProvider` usa `@googlemaps/js-api-loader` para carregamento de script dinâmico e `@googlemaps/markerclusterer` para clustering.

### Características principais

- Usa `AdvancedMarkerElement` para marcadores (requer um ID de mapa)
- Carrega as bibliotecas `maps`, `marker` e `places`
- Requer `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` e opcionalmente `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- O carregamento de script é idempotente com uma proteção de promessa em nível de módulo

```ts
import { GoogleMapProvider } from '@/lib/maps';

const provider = new GoogleMapProvider();

if (provider.isConfigured()) {
  await provider.loadScript();
  const map = await provider.createMap(containerElement, {
    center: { latitude: 40.7128, longitude: -74.006 },
    zoom: 12,
    style: 'streets',
    controls: { showZoomControls: true },
  });

  const marker = provider.createMarker(map, {
    data: {
      id: '1',
      coordinates: { latitude: 40.7128, longitude: -74.006 },
      title: 'New York',
      slug: 'new-york',
    },
  });
}
```

### Mapeamento de estilo

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Provedor de caixa de mapas

A classe `MapboxMapProvider` importa dinamicamente `mapbox-gl` e usa seu cluster nativo baseado em origem GeoJSON.

### Características principais

- Usa marcadores Mapbox GL JS nativos
- O clustering é implementado com fontes GeoJSON e camadas de círculo/símbolo
- O preenchimento automático é construído com a API Mapbox Geocoding
- Requer `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- O carregamento de script é idempotente com uma proteção de promessa em nível de módulo

```ts
import { MapboxMapProvider } from '@/lib/maps';

const provider = new MapboxMapProvider();

if (provider.isConfigured()) {
  await provider.loadScript();
  const map = await provider.createMap(containerElement, {
    center: { latitude: 51.5074, longitude: -0.1278 },
    zoom: 10,
    style: 'streets',
    controls: {
      showZoomControls: true,
      showFullscreenControl: true,
      showScaleControl: true,
    },
  });
}
```

### Mapeamento de estilo

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## Tipos principais

### Coordenadas e Limites

```ts
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### Dados do marcador

```ts
interface MapMarkerData {
  id: string;
  coordinates: Coordinates;
  title: string;
  icon?: string;
  category?: string;
  slug: string;
  description?: string;
}
```

### Opções de cluster

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### Adereços de componentes de mapa

A interface `MapComponentProps` é o contrato de adereços padrão para componentes do mapa React:

```ts
interface MapComponentProps {
  markers?: MapMarkerData[];
  center?: Coordinates;
  zoom?: number;
  style?: MapStyle;
  className?: string;
  height?: string | number;
  width?: string | number;
  controls?: MapControlsConfig;
  enableClustering?: boolean;
  clusterOptions?: ClusterOptions;
  isLoading?: boolean;
  isDisabled?: boolean;
  error?: string | null;
  onMarkerClick?: (marker: MapMarkerData) => void;
  onClusterClick?: (cluster: MapClusterData) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  ariaLabel?: string;
}
```

### Seletor de localização

Os tipos `LocationPickerProps` e `LocationPickerValue` suportam o componente de formulário do seletor de local:

```ts
interface LocationPickerValue {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  serviceArea?: 'local' | 'regional' | 'national' | 'global';
  isRemote?: boolean;
}
```

## Variáveis de ambiente

|Variável|Provedor|Descrição|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|Google|Chave da API JavaScript do Google Maps (referenciador HTTP restrito)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|Google|ID do mapa para marcadores avançados|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|Caixa de mapas|Token de acesso público Mapbox (`pk.*` apenas)|

:::cuidado Segurança
Use apenas chaves de API expostas ao navegador com restrições de domínio adequadas. Nunca use chaves secretas/de servidor (`sk.*` para Mapbox) no código do lado do cliente.
:::

## Seleção de Provedor

A seleção do provedor normalmente é feita no nível de configuração com base nas chaves de API presentes:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## Arquivos relacionados

- `lib/maps/providers/map-provider.interface.ts` - Contrato de interface do provedor
- `lib/maps/providers/google-map-provider.ts` - Implementação do Google Maps
- `lib/maps/providers/mapbox-map-provider.ts` - Implementação de Mapbox
- `lib/maps/types.ts` - Todos os tipos TypeScript relacionados ao mapa
- `lib/types/location.ts` - Tipos compartilhados relacionados à localização
