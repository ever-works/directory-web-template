---
id: config-feature-endpoints
title: "配置和功能标志 API 参考"
sidebar_label: "配置与特点"
sidebar_position: 53
---

# 配置和功能标志 API 参考

## 概述

配置功能端点公开应用程序的当前功能可用性标志。这些标志指示哪些依赖于数据库的功能处于活动状态，从而允许前端在功能不可用时正常降级。这是一个公共的缓存端点，专为高频使用而设计。

## 端点

### 获取 /api/config/features

根据系统配置和数据库可用性返回当前功能可用性。

**请求**

不需要参数或主体。

**回应**
```typescript
{
  ratings: boolean;         // Whether the ratings feature is available
  comments: boolean;        // Whether the comments feature is available
  favorites: boolean;       // Whether the favorites feature is available
  featuredItems: boolean;   // Whether the featured items feature is available
  surveys: boolean;         // Whether the surveys feature is available
}
```

**示例**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Render rating component
}

if (!features.surveys) {
  // Hide survey section
}
```

## 认证

该端点是**公开**——不需要身份验证。它旨在由前端在初始页面加载时使用，以确定应呈现哪些 UI 功能。

## 错误响应

|状态|描述|
|--------|-------------|
| 200 |已成功检索功能标志|
| 500 |内部错误 -- 将所有标志返回为 `false` 以确保安全，并使用 `no-cache` 标头|

出现错误时，端点将所有功能返回为`false`，以确保应用程序安全失败，而不是暴露损坏的功能。

## 速率限制

响应使用以下标头进行缓存：
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- 在 CDN 级别有效缓存 5 分钟，并具有 10 分钟的重新验证失效窗口。

错误响应使用 `Cache-Control: no-cache` 来防止缓存降级状态。

## 相关端点

- [Health Endpoints](./health-endpoints) -- 数据库连接健康检查
