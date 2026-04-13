---
id: admin-analytics-endpoints
title: 管理分析端点
sidebar_label: 管理分析
sidebar_position: 22
---

# 管理分析端点

管理分析 API 为管理仪表板提供地理分析数据，包括覆盖范围统计、分布细分和地图可视化数据。所有端点都需要管理员身份验证。

## 概述

|端点|方法|授权|描述|
|---|---|---|---|
|`/api/admin/geo-analytics`|获取|管理员|获取地理分析数据|

## 获取地理分析

```
GET /api/admin/geo-analytics
```

返回全面的地理分布分析，包括覆盖统计数据、国家/城市/服务区分布、地图标记的位置坐标和热图数据。该端点聚合来自位置索引和项目存储库的数据。

**身份验证：** 需要管理员（通过`checkAdminAuth()`）

**缓存：** 禁用 - 使用 `force-dynamic`、`revalidate: 0` 和 `force-no-store` 确保管理仪表板的最新数据。

**成功响应 (200)：**

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

### 响应字段

#### 统计对象

|领域|类型|描述|
|---|---|---|
|`totalIndexed`|整数|位置索引中的总条目数|
|`totalItems`|整数|存储库中的总项目数|
|`itemsWithLocation`|整数|具有位置数据或标记为远程的项目|
|`itemsRemote`|整数|标记为远程/分布式的项目|
|`coveragePercent`|数量|具有位置数据的项目的百分比（四舍五入到小数点后 1 位）|
|`indexHealth.synced`|布尔值|索引计数是否与预期计数匹配|
|`indexHealth.indexCount`|整数|索引中的非远程条目|
|`indexHealth.expectedCount`|整数|基于源数据的预期非远程条目|
|`citiesCount`|整数|指数中不同城市的数量|
|`countriesCount`|整数|指数中不同国家的数量|
|`remoteCount`|整数|索引中的远程条目数|
|`lastIndexedAt`|字符串或空|上次索引更新的 ISO 时间戳|
|`lastRebuildAt`|字符串或空|上次完全重建的 ISO 时间戳|

#### 分布对象

|领域|描述|
|---|---|
|`byCountry`|包含计数的国家/地区名称数组，按计数降序排序|
|`byCity`|计数排名前 20 的城市，按计数降序排列|
|`byServiceArea`|具有计数的服务区，按计数降序排序|

#### 位置数组

每个位置对象都提供地图标记的数据。坐标 `(0, 0)` 处的远程项目将被过滤掉，以避免误导地图显示。

#### 热图数据

仅用于非远程条目的纬度/经度对数组，适合渲染密度热图。

### 数据来源

端点聚合来自三个并行查询的数据：

1. **位置索引服务** (`getLocationIndexService().getIndexStats()`) -- 提供索引统计
2. **位置索引条目** (`getAllLocationEntries()`) -- 提供所有索引位置以进行分布计算
3. **项目存储库** (`itemRepository.findAll()`) -- 提供用于覆盖率计算的源项目数据

### 覆盖率计算

覆盖率计算如下：

```
coveragePercent = round((itemsWithLocation / totalItems) * 100, 1)
```

如果某个项目具有纬度坐标或标记为远程 (`is_remote: true`)，则该项目被视为“具有位置”。

### 指数健康状况

索引运行状况将位置索引中的非远程条目数与从源数据派生的预期计数进行比较：

```
expectedCount = itemsWithLocation - itemsRemote
indexCount = totalIndexed - remoteCount
synced = (indexCount === expectedCount)
```

当 `synced` 为 false 时，管理员应考虑通过 `/api/admin/location-index` 端点重建位置索引。

|状态|条件|
|---|---|
| 401 |未通过管理员身份验证|
| 500 |服务器内部错误|

**来源：** `template/app/api/admin/geo-analytics/route.ts`
