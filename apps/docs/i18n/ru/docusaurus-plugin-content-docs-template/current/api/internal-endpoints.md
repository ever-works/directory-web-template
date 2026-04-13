---
id: internal-endpoints
title: "内部和系统端点"
sidebar_label: "内部与系统"
sidebar_position: 17
---

# 内部和系统端点

这些端点提供系统级操作：数据库初始化、功能标志配置、运行状况检查、版本信息和存储库同步。大多数由平台本身使用，而不是由最终用户使用。

**源文件：**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## 端点摘要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|获取|`/api/internal/db-init`|仅限开发|触发数据库初始化|
|获取|`/api/config/features`|无|获取功能可用性标志|
|获取|`/api/health/database`|无|数据库健康检查|
|获取|`/api/version`|无|获取应用程序版本信息|
|获取|`/api/version/sync`|无|获取同步状态|
|后处理|`/api/version/sync`|无|触发手动存储库同步|

---

## GET `/api/internal/db-init`

Triggers automatic database migration and seeding if the database is not yet initialized.

### Security

This endpoint is **only available in development mode**. In production, it returns 403:

```ts
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json(
    { error: 'Not available in production' },
    { status: 403 }
  );
}
```

### Runtime Configuration

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Response: 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Response: 403 (Production)

```json
{
  "error": "Not available in production"
}
```

---

## 获取`/api/config/features`

根据系统配置（主要是数据库可用性）返回当前功能可用性标志。这是前端用来优雅处理缺失功能的**公共端点**。

### 回复：200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### 响应：200（无数据库）

当数据库未配置时，所有功能均被禁用：

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### 缓存

成功的响应会通过 stale-while-revalidate 缓存 5 分钟：

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

错误响应使用`Cache-Control: no-cache`。

### 错误行为

出现错误时，端点会将所有功能返回为已禁用（状态为 500），以确保前端正常降级。

---

## GET `/api/health/database`

A lightweight health check that tests the database connection by executing `SELECT 1`.

### Response: 200 (Healthy)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Response: 500 (Unhealthy)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Use Cases

- Kubernetes/Docker liveness and readiness probes
- Monitoring dashboards
- Deployment verification scripts
- Load balancer health checks

---

## 获取`/api/version`

从 Git 内容存储库检索全面的版本信息，包括最新提交详细信息、作者信息、分支和同步状态。

### 它是如何运作的

1. 验证内容路径中是否存在 Git 目录
2. 如果 `.git` 目录丢失，则尝试同步（对于 Vercel 上的冷启动很有用）
3. 使用 `isomorphic-git` 读取最新提交
4. 返回带有缓存标头的格式化版本信息

### 回复：200

```json
{
  "commit": "a1b2c3d",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new feature for user management",
  "author": "John Doe",
  "repository": "https://github.com/user/repo.git",
  "lastSync": "2024-01-15T10:35:00.000Z",
  "branch": "main"
}
```

### 响应头

|标头|价值|描述|
|--------|-------|-------------|
|`Cache-Control`|`public, max-age=60, stale-while-revalidate=300`|1分钟客户端缓存|
|`ETag`|`"a1b2c3d-1705312200000"`|基于提交哈希|
|`Last-Modified`|`Mon, 15 Jan 2024 10:30:00 GMT`|提交时间戳|

### 错误响应

所有错误都包含带有错误代码的结构化格式：

|状态|代码|条件|
|--------|------|-----------|
| 404 |`REPOSITORY_NOT_FOUND`|git目录不存在|
| 404 |`NO_COMMITS`|存储库没有提交|
| 500 |`GIT_ERROR`|读取提交信息失败|
| 500 |`VALIDATION_ERROR`|提交数据缺少必填字段|
| 500 |`INTERNAL_ERROR`|意外错误|

```json
{
  "error": "Data repository not found",
  "code": "REPOSITORY_NOT_FOUND",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "details": "Git directory not found at: /path/to/content/.git"
}
```

---

## GET `/api/version/sync`

Returns the current synchronization status including whether a sync is in progress, when the last sync occurred, and server uptime.

### Response: 200

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": 300000,
  "timeSinceLastSyncHuman": "300s ago",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Response: 200 (Never Synced)

```json
{
  "syncInProgress": false,
  "lastSyncTime": null,
  "timeSinceLastSync": null,
  "timeSinceLastSyncHuman": "never",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## 发布 `/api/version/sync`

手动触发 Git 内容存储库的后台同步。防止并发同步操作（如果同步已在运行，则会返回成功并带有信息性消息）。

### 请求正文

可选。保留供将来使用：

```json
{}
```

### 响应：200（同步完成）

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 1250,
  "message": "Repository synchronized successfully",
  "details": "Updated 5 files, 3 commits ahead"
}
```

### 响应：200（已在进行中）

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 50,
  "message": "Sync was already in progress",
  "details": "Another sync operation is currently running"
}
```

### 回复：500

```json
{
  "success": false,
  "error": "Manual sync request failed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 800,
  "details": "Git fetch failed: network timeout"
}
```

GET 和 POST 响应都包含 `Cache-Control: no-cache, no-store, must-revalidate` 以防止同步状态过时。

---

## Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/internal/db-init/route.ts` | Database initialization endpoint |
| `template/app/api/config/features/route.ts` | Feature flags endpoint |
| `template/app/api/health/database/route.ts` | Database health check |
| `template/app/api/version/route.ts` | Version info endpoint |
| `template/app/api/version/sync/route.ts` | Sync trigger and status |
| `template/lib/db/initialize.ts` | Database initialization logic |
| `template/lib/config/feature-flags.ts` | Feature flag resolution |
| `template/lib/services/sync-service.ts` | Repository sync service |
| `template/lib/lib.ts` | Content path and filesystem utilities |
