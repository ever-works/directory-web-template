---
id: schema-reference
title: 架构参考
sidebar_label: 架构参考
sidebar_position: 1
---

# 架构参考

所有数据库表均在`lib/db/schema.ts` 中定义。本文档对每个表、其关键列、关系和用途进行了分类。

## 用户和身份验证

### 用户

核心用户表，由 NextAuth.js 用于身份验证。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|UUID，自动生成|
|`email`|文字|独特|
|`image`|文字|个人资料图片网址|
|`emailVerified`|时间戳|电子邮件验证日期|
|`passwordHash`|文字|用于凭据身份验证的 Bcrypt 哈希|
|`createdAt`|时间戳|自动设置|
|`updatedAt`|时间戳|自动设置|
|`deletedAt`|时间戳|软删除|

**索引**：`users_created_at_idx`

### 账户

OAuth 和凭据帐户链接，遵循 NextAuth.js 适配器架构。

|专栏|类型|注释|
|--------|------|-------|
|`userId`|文本（外文）|参考文献`users.id`（级联删除）|
|`type`|文字|帐户类型（oauth、凭据等）|
|`provider`|文字|提供商名称（google、github、凭据）|
|`providerAccountId`|文字|提供商特定的帐户 ID|
|`email`|文字|账户邮箱|
|`passwordHash`|文字|对于客户端凭据身份验证|
|`refresh_token`|文字|OAuth 刷新令牌|
|`access_token`|文字|OAuth 访问令牌|
|`expires_at`|整数|令牌过期|

**主键**：复合 (`provider`, `providerAccountId`)
**索引**：`accounts_email_idx`、`accounts_provider_idx`

### 会议

活跃用户会话。

|专栏|类型|注释|
|--------|------|-------|
|`sessionToken`|文字（PK）|会话标识符|
|`userId`|文本（外文）|参考文献`users.id`|
|`expires`|时间戳|会话过期|

### 验证令牌

电子邮件验证令牌。

|专栏|类型|注释|
|--------|------|-------|
|`identifier`|文字|用户标识符|
|`email`|文字|电子邮件地址|
|`token`|文字|验证令牌|
|`expires`|时间戳|令牌过期|

**主键**：复合 (`identifier`, `token`)

### 验证器

WebAuthn/FIDO2 凭证存储。

|专栏|类型|注释|
|--------|------|-------|
|`credentialID`|文字|唯一凭证标识符|
|`userId`|文本（外文）|参考文献`users.id`|
|`providerAccountId`|文字|提供商帐户参考|
|`credentialPublicKey`|文字|用于验证的公钥|
|`counter`|整数|认证柜台|

### 密码重置令牌

用于忘记密码流程的密码重置令牌。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`email`|文字|目标邮箱|
|`token`|文字|唯一的重置令牌|
|`expires`|时间戳|令牌过期|

### 活动日志

出于审计目的跟踪用户和客户端活动。

|专栏|类型|注释|
|--------|------|-------|
|`id`|系列（PK）|自动递增|
|`userId`|文本（外文）|参考文献`users.id`（可为空）|
|`clientId`|文本（外文）|参考文献`clientProfiles.id`（可为空）|
|`action`|文字|活动类型（SIGN_UP、SIGN_IN 等）|
|`timestamp`|时间戳|活动发生时|
|`ipAddress`|varchar(45)|客户端IP地址|

**Indexes**: `activity_logs_user_idx`, `activity_logs_timestamp_idx`, `activity_logs_action_idx`

## 角色和权限

### 角色

RBAC 的角色定义。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|角色标识符（例如“admin”、“client”）|
|`name`|文字|独特的角色名称|
|`description`|文字|人类可读的描述|
|`isAdmin`|布尔值|这是否是管理员角色|
|`status`|文字|“活跃”或“不活跃”|
|`created_by`|文字|谁创建了这个角色|

### 权限

细粒度的权限定义。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`key`|文字|唯一的权限密钥（例如“items:create”）|
|`description`|文字|人类可读的描述|

### 角色权限

Many-to-many join table linking roles to permissions.

|专栏|类型|注释|
|--------|------|-------|
|`roleId`|文本（外文）|参考文献`roles.id`（级联）|
|`permissionId`|文本（外文）|参考文献`permissions.id`（级联）|

**主键**：复合 (`roleId`, `permissionId`)

### 用户角色

将用户链接到角色的多对多联接表。

|专栏|类型|注释|
|--------|------|-------|
|`userId`|文本（外文）|参考文献`users.id`（级联）|
|`roleId`|文本（外文）|参考文献`roles.id`（级联）|

**主键**：复合 (`userId`, `roleId`)

## 客户资料

### 客户档案

Extended profile information for registered client users.

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`userId`|文本（外文）|参考文献`users.id`（唯一，级联）|
|`email`|文字|客户邮箱|
|`name`|文字|全名|
|`displayName`|文字|显示名称|
|`username`|文字|唯一的用户名|
|`bio`|文字|用户简介|
|`jobTitle`|文字|职称|
|`company`|文字|公司名称|
|`industry`|文字|工业部门|
|`phone`|文字|电话号码|
|`website`|文字|个人网站|
|`location`|文字|位置字符串|
|`avatar`|文字|头像网址|
|`accountType`|文字|“个人”、“企业”或“企业”|
|`status`|文字|“有效”、“无效”、“暂停”、“禁止”、“试用”|
|`plan`|文字|“免费”、“标准”或“高级”|
|`timezone`|文字|时区（默认“UTC”）|
|`language`|文字|首选语言（默认“en”）|
|`country`|文字|国家代码|
|`currency`|文字|首选货币（默认“美元”）|
|`defaultLatitude`|双|默认位置纬度|
|`defaultLongitude`|双|默认位置经度|
|`twoFactorEnabled`|布尔值|2FA 状态|
|`totalSubmissions`|整数|提交数量|
|`warningCount`|整数|审核警告计数|
|`suspendedAt`|时间戳|暂停时|
|`bannedAt`|时间戳|被禁止时|

**索引**：`userId`、`email`、`status`、`plan`、`accountType`、`username`、`createdAt` 上的多个索引

## 内容和参与度

### 评论

用户对项目的评论。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`content`|文字|评论文字|
|`userId`|文本（外文）|参考文献`clientProfiles.id`|
|`itemId`|文字|物品子弹|
|`rating`|整数|评级（0-5）|
|`editedAt`|时间戳|最后编辑时间|
|`deletedAt`|时间戳|软删除|

### 投票

对项目投赞成票/反对票。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`userId`|文本（外文）|参考文献`clientProfiles.id`|
|`itemId`|文字|物品子弹|
|`voteType`|文字|“赞成票”或“反对票”|

**唯一索引**：(`userId`, `itemId`) -- 每个用户每个项目一票

### 收藏夹

用户收藏夹（书签）。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`userId`|文本（外文）|参考文献`users.id`|
|`itemSlug`|文字|物品子弹|
|`itemName`|文字|非规范化项目名称|
|`itemIconUrl`|文字|非规范化项目图标|
|`itemCategory`|文字|非规范化类别|

**唯一索引**：(`userId`, `itemSlug`)

### 项目视图

跟踪独特的每日项目视图以进行分析。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`itemId`|文字|物品子弹|
|`viewerId`|文字|基于 cookie 的匿名观看者 ID|
|`viewedDateUtc`|文字|YYYY-MM-DD 格式的日期|
|`viewedAt`|时间戳|准确观看时间|

**唯一索引**：(`itemId`、`viewerId`、`viewedDateUtc`) -- 每个观看者每天观看一次

## 订阅和付款

### 订阅

支持多个支付提供商的用户订阅记录。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`userId`|文本（外文）|参考文献`users.id`|
|`planId`|文字|计划标识符（免费、标准、高级）|
|`status`|文字|有效、已取消、已过期、待定、已暂停|
|`paymentProvider`|文字|条纹、lemonsqueezy、极地、solidgate|
|`subscriptionId`|文字|提供商订阅 ID|
|`customerId`|文字|提供商客户 ID|
|`autoRenewal`|布尔值|启用自动续订|
|`cancelAtPeriodEnd`|布尔值|期末取消|
|`amount`|整数|认购金额（分）|
|`currency`|文字|货币代码|
|`interval`|文字|计费间隔（月、年）|

**索引**：`user_subscription_idx`、`subscription_status_idx`、`provider_subscription_idx`（唯一）

### 订阅历史

订阅变更的审计跟踪。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`subscriptionId`|文本（外文）|参考文献`subscriptions.id`|
|`action`|文字|改变行动|
|`previousStatus`|文字|变更前状态|
|`newStatus`|文字|变更后状态|

### 支付提供商

可用支付提供商的注册表。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`name`|文字|提供商名称（唯一）|
|`isActive`|布尔值|是否启用提供者|

### 付款账户

将用户链接到他们的支付提供商帐户。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`userId`|文本（外文）|参考文献`users.id`|
|`providerId`|文本（外文）|参考文献`paymentProviders.id`|
|`customerId`|文字|提供商客户 ID|

**唯一索引**：(`userId`、`providerId`)、(`customerId`、`providerId`)

## 管理与审核

### 通知

应用内管理通知。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`userId`|文本（外文）|参考文献`users.id`|
|`type`|文字|item_submission、comment_reported 等|
|`title`|文字|通知标题|
|`message`|文字|通知正文|
|`isRead`|布尔值|读取状态|

### 报告

项目和评论的内容报告系统。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`contentType`|文字|“项目”或“评论”|
|`contentId`|文字|报告的内容 ID|
|`reason`|文字|垃圾邮件、骚扰、不当、其他|
|`status`|文字|待决、已审查、已解决、已驳回|
|`resolution`|文字|content_removed、user_warned 等|
|`reportedBy`|文本（外文）|参考文献`clientProfiles.id`|
|`reviewedBy`|文本（外文）|参考文献`users.id`|

### 节制历史

完整的审核操作历史记录。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`userId`|文本（外文）|参考文献`clientProfiles.id`|
|`action`|文字|警告、暂停、禁止、取消暂停、取消禁止、content_removed|
|`reportId`|文本（外文）|参考文献`reports.id`|
|`performedBy`|文本（外文）|参考文献`users.id`|
|`details`|jsonb|额外的背景信息|

### 项目审计日志

跟踪管理面板中项目的更改。

|专栏|类型|注释|
|--------|------|-------|
|`id`|文字（PK）|通用唯一标识符|
|`itemId`|文字|项目 slug（不是 FK；项目位于 Git 中）|
|`itemName`|文字|非规范化项目名称|
|`action`|文字|创建、更新、状态更改、审核、删除、恢复|
|`changes`|jsonb|字段级变更详细信息|
|`performedBy`|文本（外文）|参考文献`users.id`|

## 其他表

### 赞助商广告

具有完整付款生命周期的赞助商品广告。

键列：`userId`、`itemSlug`、`status`（待付款、待处理、拒绝、有效、过期、取消）、`interval`（每周、每月）、`amount`、`paymentProvider`、`subscriptionId`。

### 公司/项目公司

目录列表的公司记录和项目-公司关联。

### 调查/调查回复

具有基于 JSON 的问题定义和响应存储的调查生成器。

### 二十CrmConfig / 集成映射

用于二十个 CRM 同步功能的 CRM 集成表。配置表强制采用单例模式（仅允许一行）。

### 时事通讯订阅

带有订阅/取消订阅时间戳的电子邮件通讯订阅跟踪。

### 种子状态

单例表跟踪数据库播种状态（播种、完成、失败）以防止并发种子操作。

## 类型 出口

模式文件使用 Drizzle 的推理导出每个表的 TypeScript 类型：

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
// ... and so on for all tables
```

这些类型在整个应用程序中用于类型安全的数据库操作。
