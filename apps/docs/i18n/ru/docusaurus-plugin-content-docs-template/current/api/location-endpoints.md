---
id: location-endpoints
title: "位置API参考"
sidebar_label: "地点"
sidebar_position: 51
---

# 位置API参考

## 概述

位置端点提供对目录中项目的空间位置索引的访问。它们支持按城市、国家/地区、基于半径的邻近搜索来查询项目，以及检索用于地图渲染的坐标数据。所有定位端点都需要在系统设置中启用定位功能。

## 端点

### GET /api/位置/城市

从位置索引返回不同城市名称的列表。

**请求**

无需参数。

**回应**
```typescript
{
  success: true;
  data: string[];   // Array of city names, e.g. ["San Francisco", "London", "Tokyo"]
}
```

**示例**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### GET /api/位置/国家/地区

从位置索引返回不同国家/地区名称的列表。

**请求**

无需参数。

**回应**
```typescript
{
  success: true;
  data: string[];   // Array of country names, e.g. ["United States", "United Kingdom"]
}
```

**示例**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### 获取/api/位置/坐标

返回所有索引项的坐标，并可选择按城市或国家/地区进行过滤。用于渲染地图标记。远程项目将自动排除。

**请求**

|参数|类型|在|描述|
|-----------|--------|-------|-------------|
|城市|字符串|查询|按城市名称过滤（不区分大小写）|
|国家|字符串|查询|按国家/地区名称过滤（不区分大小写）|

**回应**
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Item slug identifier
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

**示例**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### GET /api/位置/搜索

使用基于半径的邻近度、城市名称或国家/地区名称按地理位置搜索项目。返回匹配的项目块和可选的距离信息。

**请求**

|参数|类型|在|描述|
|-----------|--------|-------|-------------|
|近纬度|数量|查询|半径搜索的纬度|
|近_lng|数量|查询|半径搜索的经度|
|半径|数量|查询|半径（公里）（默认值：50）|
|城市|字符串|查询|按城市名称过滤|
|国家|字符串|查询|按国家名称过滤|

至少需要一个搜索参数：`near_lat` + `near_lng`、`city` 或 `country`。

**回应**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Array of matching item slugs
    distances: Record<string, number>;  // Slug-to-distance-km map (radius search only)
  };
}
```

**示例**
```typescript
// Radius search: items within 25km of San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// City search
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## 认证

所有位置端点都是**公开**——不需要身份验证。但是，必须在系统设置中启用定位功能。如果禁用位置功能，所有端点都会返回`404` 和`"Location features are disabled"`。

## 错误响应

|状态|描述|
|--------|-------------|
| 400 |坐标无效、半径无效或缺少所需的搜索参数|
| 404 |系统设置中禁用了定位功能|
| 500 |服务器内部错误--数据库查询失败|

## 速率限制

这些端点没有应用明确的速率限制。远程/虚拟项目会自动从坐标结果中排除。

## 相关端点

- [Geocode Endpoints](./geocode-endpoints) -- 正向和反向地理编码（仅限管理员）
