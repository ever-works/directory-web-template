---
id: location-types
title: Définitions des types d'emplacement
sidebar_label: Types d'emplacement
sidebar_position: 7
---

# Définitions des types d'emplacement

**Source :** `lib/types/location.ts`

Le module de localisation fournit des définitions de type complètes pour les fonctionnalités de géolocalisation, notamment la configuration du fournisseur de cartes, les paramètres de localisation, les requêtes géographiques et le stockage des données de localisation. Il prend en charge les fournisseurs Mapbox et Google Maps.

## Types d'énumérations

### `MapProvider`

Options du fournisseur de cartes prises en charge :

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

Options de style de rendu de la carte :

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Types de paramètres

### `LocationConfigSettings`

Paramètres de configuration tels que stockés dans `config.yml` en utilisant le nom `snake_case`. Utilisé lors de l'analyse de la section `settings.location` du fichier de configuration.

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

Paramètres d'emplacement d'exécution à l'aide de la dénomination `camelCase`. Utilisé dans toute l’application pour un accès sécurisé.

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

**Différences clés par rapport à `LocationConfigSettings` :**
- Tous les champs sont obligatoires (non facultatifs) car les valeurs par défaut sont appliquées
- Utilise le nom `camelCase` au lieu de `snake_case`
- `default_center` tuple est converti en un objet nommé `{ latitude, longitude }`

## Valeurs par défaut

### `DEFAULT_LOCATION_SETTINGS`

Valeurs par défaut appliquées lorsque les paramètres ne sont pas configurés :

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

## Types de données

### `LocationData`

Données de localisation des éléments stockés dans la table `item_location_index`. Il s'agit d'une structure d'index uniquement ; la source de vérité reste dans les fichiers YAML.

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

## Types de statut d'API

### `MapProviderStatus`

Informations d'état pour un seul fournisseur de cartes, utilisées dans l'interface utilisateur d'administration pour afficher l'état configuré/non configuré sans exposer les clés API.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Réponse du point de terminaison de l'API `map-status`, signalant l'état de configuration des deux fournisseurs.

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

## Types de requêtes géographiques

### `GeoBoundingBox`

Cadre de délimitation pour les requêtes géospatiales, définissant une région rectangulaire sur la carte.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

Options pour les requêtes d'éléments basées sur la localisation. Prend en charge la recherche par rayon, le filtrage des villes/pays et l'inclusion d'éléments à distance.

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

Résultat d'une requête d'élément basée sur la localisation, y compris le calcul de la distance.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Fonctions

### `mapLocationConfigToRuntime`

Mappe les paramètres de configuration `snake_case` de YAML aux paramètres d'exécution `camelCase`. Applique les valeurs par défaut pour tous les champs manquants.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**Exemple :**

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

## Exemples d'utilisation

### Interroger des éléments par emplacement

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### Vérification de l'état du fournisseur de cartes

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

### Utilisation du cadre de délimitation pour les requêtes de fenêtre

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

## Notes de conception

### Configuration et modèle d'exécution

Le module de localisation utilise un système de type double couche :

1. **Types de configuration** (`LocationConfigSettings`) utilisent `snake_case` pour correspondre aux conventions de fichiers YAML
2. **Types d'exécution** (`LocationSettings`) utilisent `camelCase` pour TypeScript idiomatique
3. La fonction `mapLocationConfigToRuntime()` relie les deux en appliquant les valeurs par défaut

Ce modèle garantit que les fichiers YAML restent lisibles par l'homme tandis que le code de l'application suit les conventions TypeScript.

### Données de localisation indexées uniquement

`LocationData` est stocké dans la table de base de données `item_location_index` pour des requêtes géographiques rapides, mais la source de vérité pour les emplacements des éléments reste dans les fichiers de contenu YAML. L'index est reconstruit lorsque les éléments sont mis à jour.

### Considérations relatives à la confidentialité

Le paramètre `showExactAddress` (par défaut : `false`) contrôle si les adresses précises sont affichées. Lorsqu'elle est désactivée, seules les informations au niveau de la ville/du pays sont affichées aux utilisateurs.

## Types associés

- [`ItemLocationData`](./item-types.md) - Données de localisation intégrées dans les fichiers YAML d'élément
- [`ItemListOptions`](./item-types.md) - Le filtrage des éléments prend en charge les champs `city`, `country` et `includeRemote`
