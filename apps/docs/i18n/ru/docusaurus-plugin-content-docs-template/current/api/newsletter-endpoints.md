---
id: newsletter-endpoints
title: 新闻通讯服务器操作
sidebar_label: 时事通讯
sidebar_position: 26
---

# 新闻通讯服务器操作

新闻通讯系统使用 Next.js 服务器操作而不是传统的 API 路由处理程序。这些操作管理电子邮件订阅，包括订阅、取消订阅和检索统计信息。使用可配置的电子邮件提供商发送订阅和取消订阅事件的电子邮件通知。

## 概述

|行动|授权|描述|
|---|---|---|
|`subscribeToNewsletter`|公共|订阅时事通讯的电子邮件|
|`unsubscribeFromNewsletter`|公共|取消订阅时事通讯的电子邮件|
|`getNewsletterStatistics`|无|获取订阅统计信息|

这些是使用 `'use server'` 定义的服务器操作，并通过表单提交或直接调用从 React 组件调用，而不是通过 HTTP 端点。

## 服务器操作

### 订阅时事通讯

```typescript
subscribeToNewsletter(data: { email: string })
```

使用电子邮件地址订阅时事通讯。使用 Zod 验证电子邮件、检查重复的活动订阅、创建数据库记录并发送欢迎电子邮件。电子邮件会自动标准化为小写并进行修剪。

**输入验证（Zod）：**

|领域|类型|必填|约束条件|
|---|---|---|---|
|`email`|字符串|是的|必须是有效的电子邮件格式|

**成功响应：**

```json
{
  "success": true
}
```

**错误响应：**

```json
{
  "error": "Email is already subscribed to the newsletter",
  "email": "user@example.com"
}
```

|错误|条件|
|---|---|
|`"Please enter a valid email address"`|电子邮件格式无效（Zod 验证）|
|`"Email is already subscribed to the newsletter"`|有效订阅已存在|
|`"Failed to create subscription. Please try again."`|数据库插入失败|
|`"Failed to subscribe to newsletter. Please try again."`|意外错误|

**处理步骤：**

1. 验证和规范化电子邮件（小写、修剪）
2. 通过 `getNewsletterSubscriptionByEmail` 检查现有的有效订阅
3. 通过 `createNewsletterSubscription` 创建源 `"footer"` 的订阅记录
4. 使用配置的电子邮件提供商（Resend 或 Novu）发送欢迎电子邮件

电子邮件发送失败会被静默捕获，并且不会阻止订阅成功。

**来源：** `template/app/[locale]/newsletter/actions.ts`

### 取消订阅时事通讯

```typescript
unsubscribeFromNewsletter(data: { email: string })
```

通过将 `isActive` 设置为 `false` 取消订阅时事通讯的电子邮件。发送取消订阅确认电子邮件。

**成功响应：**

```json
{
  "success": true
}
```

**错误响应：**

|错误|条件|
|---|---|
|`"Email is not subscribed to the newsletter"`|未找到有效订阅|
|`"Failed to unsubscribe. Please try again."`|数据库更新失败|

**来源：** `template/app/[locale]/newsletter/actions.ts`

### 获取新闻通讯统计数据

```typescript
getNewsletterStatistics()
```

返回聚合新闻通讯统计数据。无需输入参数。

**成功响应：**

```json
{
  "success": true,
  "data": {
    "totalActive": 1250,
    "recentSubscriptions": 45
  }
}
```

|领域|类型|描述|
|---|---|---|
|`totalActive`|整数|当前活跃订阅数量|
|`recentSubscriptions`|整数|过去 30 天内创建的订阅|

如果查询失败，则两个字段都返回零，以确保正常降级。

**来源：** `template/app/[locale]/newsletter/actions.ts`

## 数据库查询

时事通讯订阅数据通过`lib/db/queries/newsletter.queries.ts`中的专用查询功能进行管理。

### 订阅操作

|功能|描述|
|---|---|
|`createNewsletterSubscription(email, source)`|创造新的订阅记录|
|`getNewsletterSubscriptionByEmail(email)`|通过电子邮件查找订阅|
|`updateNewsletterSubscription(email, updates)`|更新订阅字段|
|`unsubscribeFromNewsletter(email)`|设置`isActive: false`并记录`unsubscribedAt`|
|`resubscribeToNewsletter(email)`|设置 `isActive: true` 并清除 `unsubscribedAt`|
|`getNewsletterStats()`|返回活跃计数和 30 天订阅计数|

所有电子邮件查找都会在查询之前将输入规范化为小写并修剪空格。

**来源：** `template/lib/db/queries/newsletter.queries.ts`

## 配置

时事通讯配置常量在 `lib/newsletter/config.ts` 中定义：

```
NEWSLETTER_CONFIG.DEFAULT_PROVIDER = "resend"
NEWSLETTER_CONFIG.DEFAULT_FROM = "onboarding@resend.dev"
NEWSLETTER_CONFIG.DEFAULT_COMPANY_NAME = "Ever Works"
```

### 订阅来源

|来源|描述|
|---|---|
|`footer`|从网站页脚表格订阅|
|`popup`|从弹出对话框订阅|
|`signup`|用户注册时订阅|

### 验证模式

导出两个 Zod 模式以进行验证：

- **`emailSchema`** -- 验证并规范化单个电子邮件字段
- **`newsletterSubscriptionSchema`** -- 验证电子邮件和来源（默认为`"footer"`）

### 电子邮件提供商

系统支持通过 `config.yml` 和环境变量配置的两个电子邮件提供商：

|提供者|环境变量|描述|
|---|---|---|
|重新发送|`RESEND_API_KEY`|默认电子邮件提供商|
|诺武|`NOVU_API_KEY`|具有模板支持的替代提供商|

根据`config.yml` 中的`mail.provider` 字段选择提供商。电子邮件配置是使用 `createEmailConfig()` 从应用程序配置动态构建的。

**来源：** `template/lib/newsletter/config.ts`

## 关键实施细节

- **服务器操作：** 这些不是 REST API 端点。他们使用 `lib/auth/middleware` 中的 `validatedAction` 包装器，该包装器在操作执行之前提供 Zod 模式验证。
- **电子邮件标准化：** 所有电子邮件均标准化为小写，并在操作级别和数据库查询级别进行修剪，以实现一致的查找。
- **优雅的电子邮件失败：** 欢迎和取消订阅确认电子邮件通过 `sendEmailSafely()` 发送，它会默默地捕获错误。失败的电子邮件不会阻止订阅操作完成。
- **重复预防：** 在创建订阅之前，系统使用 `validateExistingSubscription()` 检查现有的活动订阅。
- **软取消订阅：** 取消订阅设置 `isActive: false` 而不是删除记录，保留订阅历史记录。
