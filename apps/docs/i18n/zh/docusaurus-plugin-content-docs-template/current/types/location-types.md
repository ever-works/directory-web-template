---
id: location-types
title: 位置类型定义
sidebar_label: 位置类型
sidebar_position: 7
---

# 位置类型定义

**来源：** `lib/types/location.ts`

位置模块为地理定位功能提供全面的类型定义，包括地图提供程序配置、位置设置、地理查询和位置数据存储。它支持 Mapbox 和 Google 地图提供商。

## 枚举类型

### `MapProvider`

支持的地图提供商选项：

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

地图渲染样式选项：

```typescript
type MapStyle = 'streets' | 'satellite';
```

## 设置类型

### `LocationConfigSettings`

配置设置存储在`config.yml` 中，使用`snake_case` 命名。在解析配置文件的 `settings.location` 部分时使用。

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

使用 `camelCase` 命名的运行时位置设置。在整个应用程序中用于类型安全访问。

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

**与`LocationConfigSettings`的主要区别：**
- 所有字段都是必需的（非可选），因为应用了默认值
- 使用 `camelCase` 命名而不是 `snake_case`
- `default_center` 元组转换为命名的 `{ latitude, longitude }` 对象

## 默认值

### `DEFAULT_LOCATION_SETTINGS`

未配置设置时应用默认值：

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

## 数据类型

### `LocationData`

`item_location_index` 表中存储的项目的位置数据。这是一个仅索引的结构；事实来源仍然在 YAML 文件中。

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

## API 状态类型

### `MapProviderStatus`

单个地图提供程序的状态信息，在管理 UI 中用于显示已配置/未配置状态，而无需公开 API 密钥。

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

来自 `map-status` API 端点的响应，报告两个提供程序的配置状态。

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

## 地理查询类型

### `GeoBoundingBox`

地理空间查询的边界框，在地图上定义矩形区域。

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

基于位置的项目查询选项。支持半径搜索、城市/国家过滤和远程项目包含。

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

基于位置的项目查询的结果，包括距离计算。

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## 功能

### `mapLocationConfigToRuntime`

将 `snake_case` 配置设置从 YAML 映射到 `camelCase` 运行时设置。对任何缺失的字段应用默认值。

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**示例：**

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

## 使用示例

### 按位置查询物品

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### 检查地图提供商状态

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

### 使用边界框进行视口查询

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

## 设计笔记

### 配置与运行时模式

位置模块使用两层类型系统：

1. **配置类型** (`LocationConfigSettings`) 使用`snake_case` 来匹配 YAML 文件约定
2. **运行时类型** (`LocationSettings`) 对于惯用的 TypeScript 使用 `camelCase`
3. `mapLocationConfigToRuntime()` 函数将两者联系起来，应用默认值

此模式可确保 YAML 文件保持人类可读性，同时应用程序代码遵循 TypeScript 约定。

### 仅索引位置数据

`LocationData` 存储在 `item_location_index` 数据库表中以进行快速地理查询，但项目位置的真实来源保留在 YAML 内容文件中。更新项目时会重建索引。

### 隐私考虑因素

`showExactAddress` 设置（默认值：`false`）控制是否显示精确地址。禁用后，仅向用户显示城市/国家级信息。

## 相关类型

- [`ItemLocationData`](./item-types.md) - 项目 YAML 文件中嵌入的位置数据
- [`ItemListOptions`](./item-types.md) - 项目过滤支持 `city`、`country` 和 `includeRemote` 字段
