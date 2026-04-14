---
id: schema-relationships
title: 模式关系
sidebar_label: 模式关系
sidebar_position: 15
---

# 模式关系

此页面记录了模板数据库架构中的所有表关系、外键和连接表。该模式是使用 Drizzle ORM 和 PostgreSQL 在 `lib/db/schema.ts` 中定义的。

## 实体关系概述

该数据库以三个主要实体为中心：**用户**（管理员）、**client_profiles**（最终用户）和**项目**（存储在 Git 中，由 slug 引用）。大多数参与度和商务表都与这三个相关。

## 核心认证表

### 用户

所有经过身份验证的帐户的顶级身份表。

**参考资料：**
- `accounts.userId`（级联删除）
- `sessions.userId`（级联删除）
- `authenticators.userId`（级联删除）
- `activityLogs.userId`（级联删除）
- `client_profiles.userId`（级联删除）
- `subscriptions.userId`（级联删除）
- `payment_accounts.userId`（级联删除）
- `notifications.user_id`（级联删除）
- `favorites.userId`（级联删除）
- `user_roles.user_id`（级联删除）
- `reports.reviewed_by`（设置为空）
- `sponsor_ads.user_id`（级联删除）
- `moderation_history.performed_by`（设置为空）

### 账户

链接到用户的 OAuth 和凭据帐户。

|关系|目标|删除时|
|-------------|--------|-----------|
|`userId`|`users.id`|级联|

`(provider, providerAccountId)` 上的复合主键。

### 会议

活动登录会话。

|关系|目标|删除时|
|-------------|--------|-----------|
|`userId`|`users.id`|级联|

### 验证器

WebAuthn/密钥凭据。

|关系|目标|删除时|
|-------------|--------|-----------|
|`userId`|`users.id`|级联|

`(userId, credentialID)` 上的复合主键。

## 客户档案系统

### 客户资料

包含计划、状态和位置数据的最终用户配置文件。

|关系|目标|删除时|
|-------------|--------|-----------|
|`userId`|`users.id`|级联|

`userId` 上的唯一索引确保每个用户都有一个配置文件。

**参考资料：**
- `comments.userId`（级联删除）
- `votes.userid`（级联删除）
- `reports.reported_by`（级联删除）
- `moderation_history.user_id`（级联删除）
- `activityLogs.clientId`（级联删除）

## 基于角色的访问控制

RBAC 系统以多对多模式使用三个表。

### 角色

带有管理员标志的命名角色。

### 权限

单独的权限密钥（例如`items:create`）。

### role_permissions（连接表）

将角色链接到权限。

|专栏|目标|删除时|
|--------|--------|-----------|
|`role_id`|`roles.id`|级联|
|`permission_id`|`permissions.id`|级联|

`(role_id, permission_id)` 上的复合主键。

### user_roles（联结表）

为用户分配角色。

|专栏|目标|删除时|
|--------|--------|-----------|
|`user_id`|`users.id`|级联|
|`role_id`|`roles.id`|级联|

`(user_id, role_id)` 上的复合主键。

### RBAC实体图

```
users ---< user_roles >--- roles ---< role_permissions >--- permissions
```

一个用户可以有多个角色，每个角色可以有多个权限，多个用户可以共享同一个角色。

## 订婚表

### 评论

|关系|目标|删除时|
|-------------|--------|-----------|
|`userId`|`client_profiles.id`|级联|

`itemId` 列存储项 slug（不是外键，因为项存在于 Git 中）。

### 投票

|关系|目标|删除时|
|-------------|--------|-----------|
|`userid`|`client_profiles.id`|级联|

`(userid, item_id)` 上的唯一索引确保每个用户每个项目一票。 `item_id` 列存储项目段。

### 收藏夹

|关系|目标|删除时|
|-------------|--------|-----------|
|`userId`|`users.id`|级联|

`(userId, item_slug)` 上的唯一索引确保每个用户对每个项目都有一个收藏夹。 `item_slug` 列存储项目段。

### 项目浏览量

没有外键。使用 `(item_id, viewer_id, viewed_date_utc)` 上的唯一索引进行日常重复数据删除。

## 内容审核表

### 报告

|专栏|目标|删除时|
|--------|--------|-----------|
|`reported_by`|`client_profiles.id`|级联|
|`reviewed_by`|`users.id`|设置为空|

`content_type`、`content_id`、`status`、`reported_by` 和复合 `(content_type, content_id)` 上的索引。

### 审核历史

|专栏|目标|删除时|
|--------|--------|-----------|
|`user_id`|`client_profiles.id`|级联|
|`performed_by`|`users.id`|设置为空|
|`report_id`|`reports.id`|设置为空|

## 付款和订阅表

### 订阅

|关系|目标|删除时|
|-------------|--------|-----------|
|`userId`|`users.id`|级联|

`(payment_provider, subscription_id)` 上的唯一索引。

### 订阅历史

|关系|目标|删除时|
|-------------|--------|-----------|
|`subscription_id`|`subscriptions.id`|级联|

### 支付提供商

没有外键。存储可用的支付提供商。

### 付款账户

|专栏|目标|删除时|
|--------|--------|-----------|
|`userId`|`users.id`|级联|
|`providerId`|`paymentProviders.id`|级联|

`(userId, providerId)` 和 `(customerId, providerId)` 上的唯一索引。

## 赞助商广告

### 赞助商广告

|专栏|目标|删除时|
|--------|--------|-----------|
|`user_id`|`users.id`|级联|
|`reviewed_by`|`users.id`|设置为空|

## 通知系统

### 通知

|关系|目标|删除时|
|-------------|--------|-----------|
|`user_id`|`users.id`|级联|

`user_id`、`type`、`is_read` 和 `created_at` 上的索引。

## 活动记录

### 活动日志

|专栏|目标|删除时|
|--------|--------|-----------|
|`userId`|`users.id`|级联|
|`clientId`|`client_profiles.id`|级联|

两列都可以为空；每个日志条目与管理员用户或客户端用户相关。

## 其他表

### 时事通讯订阅

没有外键。 `email` 列具有唯一索引。

### 密码重置令牌

没有外键。 `(identifier, token)` 上的复合主键。

### 验证令牌

没有外键。 `(identifier, token)` 上的复合主键。

### 特色项目

没有外键。使用 `item_slug` 引用基于 Git 的项目，使用 `featured_by` 作为纯文本字段（不是外键）。

### 调查

没有外键。 `slug` 列具有唯一索引。

### 二十一客户管理配置

没有外键。由唯一表达式索引强制执行的单例模式。

### 集成映射

没有外键。 `(ever_id, object_type)` 上的唯一索引。

### 公司

没有外键。

### 种子状态

在 `id` 上具有唯一索引的单例表。

## 级联删除摘要

当删除 **用户** 时，以下内容将被级联删除：

- 帐户、会话、验证器
- 客户资料（以及传递：该客户的评论、投票、报告、审核历史记录）
- 订阅
- 付款账户
- 通知
- 收藏夹
- 用户角色分配
- 活动日志
- 赞助商广告

当删除**客户配置文件**时：

- 该用户的评论
- 该用户的投票
- 该用户提交的报告
- 该用户的审核历史记录
- 该客户端的活动日志

当 **角色** 被删除时：

- 该角色的所有角色权限分配
- 该角色的所有用户角色分配

## 项目参考

项目存储在基于 Git 的 CMS 中，而不是数据库中。多个表按 slug 引用项目：

- `comments.itemId` -- 物品弹头
- `votes.item_id` -- 物品弹头
- `favorites.item_slug` -- 物品弹头
- `item_views.item_id` -- 物品弹头
- `featured_items.item_slug` -- 物品弹头
- `sponsor_ads.item_slug` -- 物品弹头

这些是没有外键约束的纯文本列。

## 相关文档

- [Schema Reference](/template/database/schema-reference) -- 列级架构文档
- [Drizzle Patterns](/template/database/drizzle-patterns) -- ORM 使用模式
- [迁移指南](/template/database/migrations-guide) -- 数据库迁移
