---
id: admin-settings-endpoints
title: 管理设置端点
sidebar_label: 管理设置
sidebar_position: 23
---

# 管理设置端点

管理设置 API 提供用于读取和修改存储在 `config.yml` 中的站点配置的端点。这包括常规设置和地图提供商状态。所有端点都需要管理员身份验证。

## 概述

|端点|方法|授权|描述|
|---|---|---|---|
|`/api/admin/settings`|获取|管理员|获取所有设置|
|`/api/admin/settings`|补丁|管理员|更新特定设置|
|`/api/admin/settings/map-status`|获取|管理员|获取地图提供商配置状态|

## 获取设置

```
GET /api/admin/settings
```

从站点的`config.yml` 文件中检索完整的`settings` 部分。

**身份验证：** 需要管理员（通过`getCachedApiSession`）

**成功响应 (200)：**

```json
{
  "settings": {
    "theme": "light",
    "itemsPerPage": 20,
    "enableComments": true,
    "enableVoting": true,
    "enableNewsletter": true,
    "mapProvider": "mapbox",
    "defaultLanguage": "en"
  }
}
```

`settings` 对象的确切形状取决于站点的 `config.yml` 配置。端点返回 `settings` 密钥下存储的任何内容。

|状态|条件|
|---|---|
| 401 |未通过管理员身份验证|
| 500 |读取配置失败|

**来源：** `template/app/api/admin/settings/route.ts`

## 更新设置

```
PATCH /api/admin/settings
```

更新`config.yml` 的`settings` 部分中的单个设置值。密钥的范围自动限定为`settings`命名空间（例如，提供密钥`"theme"`会更新配置文件中的`settings.theme`）。

**身份验证：** 需要管理员

**请求正文：**

```json
{
  "key": "itemsPerPage",
  "value": 30
}
```

|领域|类型|必填|描述|
|---|---|---|---|
|`key`|字符串|是的|要更新的设置密钥（相对`settings.`）|
|`value`|任何|是的|设置的新值|

**成功响应 (200)：**

```json
{
  "success": true,
  "key": "itemsPerPage",
  "value": 30
}
```

更新通过 `configManager.updateNestedKey()` 进行持久化，这会修改底层 `config.yml` 文件。在传递到配置管理器之前，密钥会自动以 `settings.` 为前缀。

**错误响应：**

|状态|条件|
|---|---|
| 400 |请求正文中缺少 `key` 字段|
| 401 |未通过管理员身份验证|
| 500 |写入配置失败|

**来源：** `template/app/api/admin/settings/route.ts`

## 地图提供商状态

### 获取地图状态

```
GET /api/admin/settings/map-status
```

返回支持的地图提供程序的配置状态，而不暴露实际的 API 密钥。这允许管理仪表板显示哪些地图提供商可供使用。

**身份验证：** 需要管理员

**成功响应 (200)：**

```json
{
  "status": {
    "mapbox": {
      "isConfigured": true,
      "isPreviewAvailable": true,
      "name": "Mapbox"
    },
    "google": {
      "isConfigured": false,
      "isPreviewAvailable": false,
      "name": "Google Maps"
    }
  }
}
```

|领域|类型|描述|
|---|---|---|
|`mapbox.isConfigured`|布尔值|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`是否设置|
|`mapbox.isPreviewAvailable`|布尔值|与 `isConfigured` 相同 - 预览需要令牌|
|`google.isConfigured`|布尔值|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`是否设置|
|`google.isPreviewAvailable`|布尔值|与`isConfigured`相同|

端点检查环境变量是否存在：

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` Mapbox
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 用于 Google 地图

响应中没有公开实际的键值。

|状态|条件|
|---|---|
| 401 |未通过管理员身份验证|
| 500 |服务器内部错误|

**来源：** `template/app/api/admin/settings/map-status/route.ts`

## 配置架构

设置系统构建在 `lib/config-manager` 的 `configManager` 单例之上：

- **存储：** 设置存储在 YAML 配置文件中 (`config.yml`)
- **访问：** `configManager.getConfig()` 方法读取完整配置
- **更新：** `configManager.updateNestedKey()` 方法修改特定的嵌套键
- **缓存：** 会话通过 `getCachedApiSession()` 进行缓存以提高性能

所有设置更新的范围都在配置文件中的 `settings` 命名空间下。这可以防止通过设置 API 意外修改顶级配置键。
