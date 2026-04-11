---
id: location-config
title: "位置配置参考"
sidebar_label: "位置"
sidebar_position: 13
---

# 位置配置参考

本页面记录模板中所有可用的位置和地图设置。配置通过 `SettingsProvider` 从 YAML 内容仓库流向 React 组件。

## 配置来源

位置设置定义在内容仓库 `config.yml` 的 `settings.location` 部分：

```yaml
settings:
  location:
    enabled: true
    provider: mapbox          # 'mapbox' 或 'google'
    map_style: streets        # 'streets' 或 'satellite'
    distance_filter_enabled: true
    distance_sort_enabled: true
    default_radius_km: 50
    show_exact_address: false
    require_location_on_submit: false
    default_center: [40.7128, -74.0060]  # [纬度, 经度]
```

## 配置类型

### LocationConfigSettings（YAML / snake_case）

从 `config.yml` 读取的原始格式，定义在 `lib/types/location.ts`：

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
  default_center?: [number, number];   // [纬度, 经度]
}
```

### LocationSettings（运行时 / camelCase）

应用程序中使用的运行时格式：

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

`mapLocationConfigToRuntime()` 函数将 snake_case YAML 设置转换为 camelCase 运行时格式。

### 设置描述

| 设置 | 类型 | 默认 | 描述 |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | 所有位置功能的主开关 |
| `provider` | `MapProvider` | `'mapbox'` | 地图瓦片和地理编码提供者 |
| `mapStyle` | `MapStyle` | `'streets'` | 地图渲染样式 |
| `distanceFilterEnabled` | `boolean` | `true` | 在搜索中显示距离半径过滤器 |
| `distanceSortEnabled` | `boolean` | `true` | 允许按距离排序结果 |
| `defaultRadiusKm` | `number` | `50` | 默认搜索半径（千米） |
| `showExactAddress` | `boolean` | `false` | 公开显示完整地址 |
| `requireLocationOnSubmit` | `boolean` | `false` | 提交时要求填写位置 |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | 备用地图中心坐标 |

## 地图提供者

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| 提供者 | 环境变量 | 功能 |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | 矢量瓦片、地理编码、聚类 |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | 瓦片、Places API、地理编码 |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

### `MapProviderStatus`

管理界面的 API 密钥状态。

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

来自 `/api/map-status` 端点的响应。

```typescript
interface MapStatusResponse {
  mapbox: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
  google: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
}
```

## 坐标系统

### `Coordinates`

所有地图组件使用的标准地理点类型。

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### `MapBounds`

用于视口计算的边界框。

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `GeoBoundingBox`

用于数据库查询的备用边界框。

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

## 位置数据

### `LocationData`

存储在 `item_location_index` 数据库表中的条目位置。

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

基于距离的条目搜索参数。

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
