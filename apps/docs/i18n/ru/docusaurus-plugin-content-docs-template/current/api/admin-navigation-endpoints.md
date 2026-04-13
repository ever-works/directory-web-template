---
id: admin-navigation-endpoints
title: 管理导航和位置索引端点
sidebar_label: 管理导航
sidebar_position: 29
---

# 管理导航和位置索引端点

这些管理端点管理自定义站点导航链接和地理位置索引。导航端点允许配置存储在`config.yml`中的自定义页眉和页脚链接。位置索引端点管理用于地理分析和地图特征的空间索引。

## 概述

|端点|方法|授权|描述|
|---|---|---|---|
|`/api/admin/navigation`|获取|管理员|获取自定义导航配置|
|`/api/admin/navigation`|补丁|管理员|更新自定义导航项|
|`/api/admin/location-index`|获取|管理员|获取位置索引统计信息|
|`/api/admin/location-index`|后处理|管理员|重建或清除位置索引|

## 导航端点

### 获取导航配置

```
GET /api/admin/navigation
```

从站点的`config.yml` 文件中检索`custom_header` 和`custom_footer` 导航项。如果未配置自定义导航，则返回空数组。

**身份验证：** 需要管理员（通过`getCachedApiSession`）

**成功响应 (200)：**

```json
{
  "custom_header": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Documentation",
      "path": "/pages/docs"
    }
  ],
  "custom_footer": [
    {
      "label": "GitHub",
      "path": "https://github.com/example"
    },
    {
      "label": "footer.PRIVACY_POLICY",
      "path": "/pages/privacy-policy"
    }
  ]
}
```

每个导航项都有两个字段：

|领域|类型|描述|
|---|---|---|
|`label`|字符串|显示文本（纯文本或 i18n 翻译键，如`"footer.PRIVACY_POLICY"`）|
|`path`|字符串|URL路径（以`/`开头的内部路由或以`http://`/`https://`开头的外部URL）|

|状态|条件|
|---|---|
| 401 |未通过管理员身份验证|
| 500 |读取配置失败|

**来源：** `template/app/api/admin/navigation/route.ts`

### 更新导航配置

```
PATCH /api/admin/navigation
```

更新`config.yml` 中的自定义页眉或页脚导航项。验证每个项目的路径格式，以防止通过危险的 URL 方案进行 XSS 攻击。

**身份验证：** 需要管理员

**请求正文：**

```json
{
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Blog",
      "path": "https://blog.example.com"
    }
  ]
}
```

|领域|类型|必填|描述|
|---|---|---|---|
|`type`|字符串|是的|`"header"` 或 `"footer"`|
|`items`|数组|是的|导航项数组|
|`items[].label`|字符串|是的|非空显示标签|
|`items[].path`|字符串|是的|有效的 URL 路径|

**路径验证：**

`isValidNavigationPath()` 函数强制执行严格的路径格式规则：

|路径格式|允许|示例|
|---|---|---|
|内部航线|是的|`/about`、`/pages/docs`|
|HTTPS 网址|是的|`https://example.com`|
|HTTP URL|是的|`http://example.com`|
|协议相关 URL|否|`//evil.com`|
|JavaScript URL|否|`javascript:alert(1)`|
|数据 URL|否|`data:text/html,...`|
|其他方案|否|`vbscript:`、`file:`|

**成功响应 (200)：**

```json
{
  "success": true,
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    }
  ]
}
```

**错误响应：**

|状态|条件|
|---|---|
| 400 |`type` 不是 `"header"` 或 `"footer"`|
| 400 |`items` 不是数组|
| 400 |项目缺少 `label` 或 `path` 字符串字段|
| 400 |路径格式无效（XSS预防）|
| 401 |未通过管理员身份验证|
| 500 |写入配置失败|

传递一个空的 `items` 数组以清除指定类型的所有自定义导航。

**来源：** `template/app/api/admin/navigation/route.ts`

## 位置索引端点

### 获取位置索引统计信息

```
GET /api/admin/location-index
```

返回有关地理位置索引的统计信息，包括索引项目总数、城市和国家/地区计数以及重建元数据。使用位置索引服务进行数据检索。

**身份验证：** 需要管理员（通过`checkAdminAuth()`）

**缓存：** 禁用 -- 使用 `force-dynamic`、`revalidate: 0` 和 `force-no-store`。

**成功响应 (200)：**

```json
{
  "success": true,
  "data": {
    "totalIndexed": 450,
    "citiesCount": 85,
    "countriesCount": 25,
    "remoteCount": 30,
    "lastIndexedAt": "2024-01-20T10:30:00.000Z",
    "lastRebuildAt": "2024-01-15T08:00:00.000Z"
  }
}
```

|状态|条件|
|---|---|
| 401 |未通过管理员身份验证|
| 500 |服务器内部错误|

**来源：** `template/app/api/admin/location-index/route.ts`

### 管理位置索引

```
POST /api/admin/location-index
```

对位置索引执行管理操作。支持从头重建索引或清除所有条目。

**身份验证：** 需要管理员

**请求正文：**

```json
{
  "action": "rebuild"
}
```

|领域|类型|必填|描述|
|---|---|---|---|
|`action`|字符串|是的|`"rebuild"` 或 `"clear"`|

**行动：**

|行动|描述|
|---|---|
|`rebuild`|从存储库中获取所有项目并重新索引其位置数据。返回重建统计信息。|
|`clear`|从位置索引中删除所有条目。返回已清除条目的数量。|

**成功响应 (200) -- 重建：**

```json
{
  "success": true,
  "data": {
    "indexed": 420,
    "skipped": 80,
    "errors": 0
  }
}
```

**成功响应 (200) -- 清除：**

```json
{
  "success": true,
  "data": {
    "cleared": 450
  }
}
```

**错误响应：**

|状态|条件|
|---|---|
| 400 |无效操作（不是 `"rebuild"` 或 `"clear"`）|
| 401 |未通过管理员身份验证|
| 500 |服务器内部错误|

**来源：** `template/app/api/admin/location-index/route.ts`

## 关键实施细节

- **XSS 预防：** 导航路径验证拒绝除 `/`、`http://` 和 `https://` 之外的所有 URL 方案。这会阻止可用于跨站点脚本编写的 `javascript:`、`data:`、`vbscript:` 和协议相关 URL (`//evil.com`)。
- **配置存储：** 导航项存储在`custom_header` 和`custom_footer` 键下的`config.yml` 中，通过`configManager.updateNestedKey()` 保存。
- **i18n 标签：** 导航标签可以是纯文本或翻译键（例如，`"footer.PRIVACY_POLICY"`）。前端负责解析翻译键。
- **位置索引重建：** 重建操作从 `ItemRepository` 加载所有项目并将它们传递到位置索引服务。对于大型数据集来说，这可能是一项资源密集型操作。
- **缓存清除：**位置索引端点显式禁用所有缓存，以确保管理仪表板始终显示当前数据。
