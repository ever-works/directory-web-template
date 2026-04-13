---
id: geocode-endpoints
title: "地理编码 API 参考"
sidebar_label: "地理编码"
sidebar_position: 50
---

# 地理编码 API 参考

## 概述

地理编码端点提供正向地理编码（地址到坐标）和反向地理编码（坐标到地址）功能。结果缓存 15 分钟，以减少外部 API 调用。这些端点需要管理员身份验证，以防止底层 Mapbox/Google 地理编码服务的成本滥用。

## 端点

### POST /api/地理编码

将地址转换为坐标（正向地理编码）或将坐标转换为地址（反向地理编码）。请求体根据是否提供`address`或`latitude`/`longitude`字段来确定执行哪个操作。

#### 正向地理编码（地址到坐标）

**请求**
```typescript
{
  address: string;          // 1-500 characters, required
  options?: {
    countryCodes?: string[];  // ISO 3166-1 alpha-2 codes, e.g. ["US", "CA"]
    language?: string;        // ISO 639-1 language code, e.g. "en"
    proximity?: {
      latitude: number;       // -90 to 90
      longitude: number;      // -180 to 180
    };
  };
}
```

**回应**
```typescript
{
  success: true;
  data: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
    confidence: number;       // 0 to 1
  };
}
```

**示例**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    options: {
      countryCodes: ['US'],
      language: 'en'
    }
  })
});
const data = await response.json();
```

#### 反向地理编码（坐标到地址）

**请求**
```typescript
{
  latitude: number;         // -90 to 90, required
  longitude: number;        // -180 to 180, required
  options?: {
    language?: string;        // ISO 639-1 language code
  };
}
```

**回应**
```typescript
{
  success: true;
  data: {
    formattedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
  };
}
```

**示例**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 37.4224764,
    longitude: -122.0842499,
    options: { language: 'en' }
  })
});
const data = await response.json();
```

### 获取/api/地理编码

返回地理编码服务的状态，包括配置的提供程序和缓存统计信息。

**请求**

不需要请求正文。通过会话 cookie 进行身份验证。

**回应**
```typescript
{
  success: true;
  data: {
    enabled: boolean;         // Whether location features are enabled
    configured: boolean;      // Whether any geocoding provider is configured
    providers: {
      mapbox: boolean;
      google: boolean;
    };
    cache: {
      size: number;           // Current cache size
      maxSize: number;        // Maximum cache size (1000)
      ttlMs: number;          // Cache TTL in milliseconds (900000 = 15 min)
    };
  };
}
```

**示例**
```typescript
const response = await fetch('/api/geocode');
const status = await response.json();
// status.data.providers.mapbox === true
```

## 认证

- **GET /api/geocode**：需要经过身份验证的会话（任何用户）。
- **POST /api/geocode**：需要通过**管理员角色**进行身份验证的会话。非管理员用户会收到 `403 Forbidden` 响应。此限制可防止 API 成本滥用。

## 错误响应

|状态|描述|
|--------|-------------|
| 400 |请求数据无效——地址格式错误、坐标无效或模式验证失败|
| 401 |未经授权——没有经过身份验证的会话|
| 403 |禁止 - 需要管理员访问权限（仅限 POST）|
| 404 |未找到给定地址或坐标的地理编码结果|
| 503 |设置中禁用了位置功能，或未配置地理编码服务|

## 速率限制

结果缓存 15 分钟（TTL 900,000 毫秒），最大缓存大小为 1,000 个条目。所有地理编码请求都会进行审核记录，以用于成本跟踪目的。

## 相关端点

- [Location Endpoints](./location-endpoints) -- 位置搜索、城市、国家和坐标
