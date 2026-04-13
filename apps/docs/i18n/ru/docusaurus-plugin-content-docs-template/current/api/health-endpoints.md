---
id: health-endpoints
title: "健康 API 参考"
sidebar_label: "健康"
sidebar_position: 52
---

# 健康 API 参考

## 概述

运行状况端点提供了简单的数据库连接检查，用于监控和基础设施目的。它执行轻量级查询来验证数据库连接是否处于活动状态且响应良好，并返回带有时间戳的状态信息。

## 端点

### 获取/api/健康/数据库

通过执行 `SELECT 1` 查询来验证数据库连接，从而执行基本数据库运行状况检查。

**请求**

不需要参数或主体。

**回应**
```typescript
// Healthy response
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // ISO 8601 format, e.g. "2024-01-15T10:30:00.000Z"
  result: object;           // Raw query result from SELECT 1
}

// Unhealthy response (status 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**示例**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('Database is connected at', health.timestamp);
} else {
  console.error('Database is disconnected:', health.error);
}
```

## 认证

该端点是**公开**——不需要身份验证。它旨在供负载均衡器、正常运行时间监视器和部署运行状况检查使用。

## 错误响应

|状态|描述|
|--------|-------------|
| 200 |数据库连接正常|
| 500 |数据库连接失败 -- 返回 `"unhealthy"` 状态以及错误详细信息|

## 速率限制

没有应用明确的速率限制。该端点是轻量级的，适合监控系统频繁轮询。

## 相关端点

- [Config Feature Endpoints](./config-feature-endpoints) -- 功能可用性标志（也取决于数据库）
- [Version Sync Endpoints](./version-sync-endpoints) -- 系统版本和同步状态
