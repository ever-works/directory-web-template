---
id: admin-endpoints
title: 管理 API 端点
sidebar_label: 管理端点
sidebar_position: 1
---

# 管理 API 端点

管理 API 包含跨 19 个资源组的大约 60 个路由处理程序。所有管理端点均受 `withAdminAuth` 中间件保护，该中间件通过数据库查询验证身份验证和管理角色分配。

## 认证

每个管理端点都需要：

1. 有效的 JWT 会话（通过 `auth()` 检查）
2. `user_roles` 表中的管理员角色（通过 `lib/db/roles.ts` 中的 `isAdmin()` 检查）

未经身份验证的请求会收到 `401` 响应。经过身份验证的非管理员请求会收到 `403` 响应。

## 资源组

### 类别 (`/api/admin/categories`)

使用基于 Git 的持久性管理内容类别。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/categories`|列出类别并分页|
|`POST`|`/api/admin/categories`|创建一个新类别|
|`GET`|`/api/admin/categories/all`|获取所有类别（无分页）|
|`POST`|`/api/admin/categories/git`|将类别与 Git 存储库同步|
|`POST`|`/api/admin/categories/reorder`|重新排序类别位置|
|`GET`|`/api/admin/categories/[id]`|根据ID获取类别|
|`PUT`|`/api/admin/categories/[id]`|更新类别|
|`DELETE`|`/api/admin/categories/[id]`|删除类别|

### 客户 (`/api/admin/clients`)

管理客户用户帐户和配置文件。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/clients`|带分页列出客户资料|
|`POST`|`/api/admin/clients/advanced-search`|带过滤器的高级客户搜索|
|`POST`|`/api/admin/clients/bulk`|对客户端进行批量操作|
|`GET`|`/api/admin/clients/dashboard`|客户仪表板统计|
|`GET`|`/api/admin/clients/stats`|客户汇总统计|
|`GET`|`/api/admin/clients/[clientId]`|获取客户资料详细信息|
|`PUT`|`/api/admin/clients/[clientId]`|更新客户资料|
|`DELETE`|`/api/admin/clients/[clientId]`|删除客户帐户|

### 收藏 (`/api/admin/collections`)

管理精选项目集合。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/collections`|列出所有集合|
|`POST`|`/api/admin/collections`|创建一个新集合|
|`GET`|`/api/admin/collections/[id]`|获取集合详细信息|
|`PUT`|`/api/admin/collections/[id]`|更新收藏|
|`DELETE`|`/api/admin/collections/[id]`|删除集合|
|`GET`|`/api/admin/collections/[id]/items`|列出集合中的项目|
|`PUT`|`/api/admin/collections/[id]/items`|更新收藏品|

### 评论 (`/api/admin/comments`)

适度的用户评论。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/comments`|使用审核过滤器列出评论|
|`GET`|`/api/admin/comments/[id]`|获取评论详情|
|`PUT`|`/api/admin/comments/[id]`|更新评论（批准/拒绝）|
|`DELETE`|`/api/admin/comments/[id]`|删除评论|

### 公司 (`/api/admin/companies`)

管理链接到项目的公司资料。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/companies`|上市公司|
|`POST`|`/api/admin/companies`|创建公司|
|`GET`|`/api/admin/companies/[id]`|获取公司详细信息|
|`PUT`|`/api/admin/companies/[id]`|更新公司|
|`DELETE`|`/api/admin/companies/[id]`|删除公司|

### 仪表板 (`/api/admin/dashboard`)

聚合仪表板分析。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/dashboard/stats`|仪表板汇总统计|

### 特色项目 (`/api/admin/featured-items`)

管理特色项目亮点。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/featured-items`|列出特色项目|
|`POST`|`/api/admin/featured-items`|展示一个项目|
|`GET`|`/api/admin/featured-items/[id]`|获取特色商品详细信息|
|`PUT`|`/api/admin/featured-items/[id]`|更新特色项目设置|
|`DELETE`|`/api/admin/featured-items/[id]`|从精选中删除|

### 地理分析 (`/api/admin/geo-analytics`)

地理分析和访客分布数据。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/geo-analytics`|获取地理分析数据|

### 物品 (`/api/admin/items`)

完整的项目内容管理。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/items`|使用过滤器和分页列出项目|
|`POST`|`/api/admin/items`|创建一个新项目|
|`POST`|`/api/admin/items/bulk`|批量项目操作（批准、拒绝、删除）|
|`GET`|`/api/admin/items/stats`|项目汇总统计|
|`GET`|`/api/admin/items/[id]`|获取商品详细信息|
|`PUT`|`/api/admin/items/[id]`|更新项目|
|`DELETE`|`/api/admin/items/[id]`|删除项目|
|`GET`|`/api/admin/items/[id]/history`|获取项目审核历史记录|
|`POST`|`/api/admin/items/[id]/review`|提交项目审核（批准/拒绝）|

### 位置索引 (`/api/admin/location-index`)

管理地理位置搜索索引。

|方法|路径|描述|
|--------|------|-------------|
|`POST`|`/api/admin/location-index`|重建位置搜索索引|

### 导航 (`/api/admin/navigation`)

管理导航配置。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/navigation`|获取导航结构|
|`PUT`|`/api/admin/navigation`|更新导航|

### 通知 (`/api/admin/notifications`)

管理员通知管理。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/notifications`|列出管理员通知|
|`POST`|`/api/admin/notifications/mark-all-read`|将所有通知标记为已读|
|`POST`|`/api/admin/notifications/[id]/read`|将单个通知标记为已读|

### 报告 (`/api/admin/reports`)

内容报告管理和审核。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/reports`|列出内容报告|
|`GET`|`/api/admin/reports/stats`|报告统计|
|`GET`|`/api/admin/reports/[id]`|获取报告详细信息|
|`PUT`|`/api/admin/reports/[id]`|更新报告状态（解决、驳回）|

### 角色 (`/api/admin/roles`)

RBAC 的角色和权限管理。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/roles`|带分页列出角色|
|`POST`|`/api/admin/roles`|创建新角色|
|`GET`|`/api/admin/roles/active`|仅获取活跃角色|
|`GET`|`/api/admin/roles/stats`|角色统计|
|`GET`|`/api/admin/roles/[id]`|获取角色详细信息|
|`PUT`|`/api/admin/roles/[id]`|更新角色|
|`DELETE`|`/api/admin/roles/[id]`|删除角色（软删除）|
|`GET`|`/api/admin/roles/[id]/permissions`|获取角色权限|
|`PUT`|`/api/admin/roles/[id]/permissions`|更新角色权限|

### 设置 (`/api/admin/settings`)

应用程序设置管理。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/settings`|获取所有设置|
|`PUT`|`/api/admin/settings`|更新设置|
|`GET`|`/api/admin/settings/map-status`|获取地图要素状态|

### 赞助商广告 (`/api/admin/sponsor-ads`)

赞助商广告审核。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/sponsor-ads`|列出赞助商广告|
|`GET`|`/api/admin/sponsor-ads/[id]`|获取广告详细信息|
|`PUT`|`/api/admin/sponsor-ads/[id]`|更新广告|
|`POST`|`/api/admin/sponsor-ads/[id]/approve`|批准赞助商广告|
|`POST`|`/api/admin/sponsor-ads/[id]/reject`|拒绝赞助商广告|
|`POST`|`/api/admin/sponsor-ads/[id]/cancel`|取消赞助商广告|

### 标签 (`/api/admin/tags`)

内容标签管理。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/tags`|列出带有分页的标签|
|`POST`|`/api/admin/tags`|创建一个新标签|
|`GET`|`/api/admin/tags/all`|获取所有标签（无分页）|
|`GET`|`/api/admin/tags/[id]`|获取标签详细信息|
|`PUT`|`/api/admin/tags/[id]`|更新标签|
|`DELETE`|`/api/admin/tags/[id]`|删除标签|

### 二十个 CRM (`/api/admin/twenty-crm`)

CRM 集成配置和测试。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/twenty-crm/config`|获取 CRM 配置|
|`PUT`|`/api/admin/twenty-crm/config`|更新 CRM 配置|
|`POST`|`/api/admin/twenty-crm/test-connection`|测试 CRM 连接|

### 用户 (`/api/admin/users`)

管理员用户管理。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/admin/users`|列出用户并分页|
|`POST`|`/api/admin/users`|创建一个新用户|
|`GET`|`/api/admin/users/stats`|用户统计|
|`GET`|`/api/admin/users/check-email`|检查电子邮件可用性|
|`GET`|`/api/admin/users/check-username`|检查用户名可用性|
|`GET`|`/api/admin/users/[id]`|获取用户详细信息|
|`PUT`|`/api/admin/users/[id]`|更新用户|
|`DELETE`|`/api/admin/users/[id]`|删除用户|

## 常见模式

### 批量操作

一些资源支持通过 POST 使用 ID 数组进行批量操作：

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### 统计端点

大多数资源组都包含 `/stats` 端点，返回聚合计数：

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```

### 审计历史

项目支持通过 `/[id]/history` 端点进行审计历史记录跟踪，记录谁进行了更改以及何时进行更改。
