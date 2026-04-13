---
id: moderation-endpoints
title: 审核系统
sidebar_label: 适度
sidebar_position: 28
---

# 审核系统

The moderation system provides programmatic content moderation through a service layer rather than standalone API endpoints.当管理员通过报告 API 解析内容报告时，会自动触发审核操作。系统支持警告用户、暂停帐户、禁止帐户和删除内容，并具有完整的审核历史记录和电子邮件通知。

## 概述

审核不会作为单独的 REST 端点公开。相反，它是通过报告解析工作流程调用的：

```
PUT /api/admin/reports/[id]  -->  resolution triggers moderation action
```

当管理员在报告上设置 `resolution` 值时，相应的审核功能会自动执行。

|分辨率值|审核功能|效果|
|---|---|---|
|`content_removed`|`removeContent()`|软删除举报的评论或项目|
|`user_warned`|`warnUser()`|增加用户的警告计数|
|`user_suspended`|`suspendUser()`|将用户状态设置为`"suspended"`|
|`user_banned`|`banUser()`|将用户状态设置为`"banned"`|
|`no_action`|无|未采取任何调节措施|

## 审核行动

### 删除内容

```typescript
removeContent(contentType, contentId, reportId, adminId): Promise<ModerationResult>
```

根据举报内容的类型删除举报内容。对于注释，这将执行软删除（设置`deletedAt`）。 For items, this deletes the item from the Git-based content repository.

**参数：**

|参数|类型|描述|
|---|---|---|
|`contentType`|`"item"` 或 `"comment"`|要删除的内容类型|
|`contentId`|字符串|内容的 ID 或 slug|
|`reportId`|字符串|关联报告 ID|
|`adminId`|字符串|执行操作的管理员用户|

**处理步骤：**

1. 通过`getContentOwner()`查找内容所有者
2. 如果评论：通过`deleteComment()`软删除
3. 如果项目：通过 `itemRepository.delete()` 从 Git 存储库中删除
4. 使用操作 `CONTENT_REMOVED` 记录审核历史记录
5. 向内容所有者发送内容删除通知电子邮件

**来源：** `template/lib/services/moderation.service.ts`

### 警告用户

```typescript
warnUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

通过增加`warningCount` 字段向用户发出警告。已被禁止的用户无法收到警告。

**参数：**

|参数|类型|描述|
|---|---|---|
|`userId`|字符串|用户的客户端配置文件 ID|
|`reason`|字符串|警告原因|
|`reportId`|字符串|关联报告 ID|
|`adminId`|字符串|执行操作的管理员用户|

**处理步骤：**

1. 验证用户存在并且尚未被禁止
2. 通过 `incrementWarningCount()` 增加警告计数
3. 使用操作 `WARN` 记录审核历史记录
4. 发送包含当前警告计数的警告电子邮件通知

**成功结果：**

```json
{
  "success": true,
  "message": "User warned successfully. Total warnings: 3"
}
```

**来源：** `template/lib/services/moderation.service.ts`

### 暂停用户

```typescript
suspendUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

通过将用户帐户的状态设置为 `"suspended"` 并记录 `suspendedAt` 时间戳来暂停用户帐户。被暂停的用户无法创建评论、提交投票或提交报告。

**守卫：**

- 如果用户已被暂停，则返回错误
- 如果用户已被禁止，则返回错误

**处理步骤：**

1. 验证用户存在并且尚未被暂停或禁止
2. 将状态设置为`"suspended"`，时间戳为`suspendedAt`
3. 使用操作 `SUSPEND` 记录审核历史记录
4. 发送暂停电子邮件通知

**来源：** `template/lib/services/moderation.service.ts`

### 禁止用户

```typescript
banUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

通过将用户帐户的状态设置为 `"banned"` 并记录 `bannedAt` 时间戳来永久禁止用户帐户。被禁止的用户将被阻止执行所有经过身份验证的操作。

**守卫：**

- 如果用户已被禁止，则返回错误

**处理步骤：**

1. 验证用户存在并且尚未被禁止
2. 将状态设置为`"banned"`，时间戳为`bannedAt`
3. 使用操作 `BAN` 记录审核历史记录
4. 发送禁止电子邮件通知

**来源：** `template/lib/services/moderation.service.ts`

## 内容所有者解析

`getContentOwner()` 函数确定谁拥有报告的内容：

|内容类型|业主来源|
|---|---|
|`comment`|注释表中的 `comment.userId` 字段|
|`item`|项目存储库中的 `item.submitted_by` 字段|

所有用户级审核操作（`user_warned`、`user_suspended`、`user_banned`）都使用它来识别操作的目标用户。

**来源：** `template/lib/services/moderation.service.ts`

## 审核历史

所有审核操作都会在 `moderationHistory` 数据库表中创建审核跟踪。

### 历史记录字段

|领域|类型|描述|
|---|---|---|
|`id`|字符串|唯一记录ID|
|`userId`|字符串|受影响用户的客户端配置文件 ID|
|`action`|字符串|`"CONTENT_REMOVED"`、`"WARN"`、`"SUSPEND"` 或 `"BAN"`|
|`reason`|字符串或空|采取审核行动的原因|
|`reportId`|字符串或空|关联报告 ID|
|`performedBy`|字符串或空|执行操作的管理员用户 ID|
|`contentType`|字符串或空|`"item"` 或 `"comment"`（用于内容删除）|
|`contentId`|字符串或空|被删除内容的ID|
|`details`|对象或空|其他上下文（例如警告计数、项目名称）|
|`createdAt`|时间戳|执行该操作时|

### 历史查询

|功能|描述|
|---|---|
|`getModerationHistoryByUser(userId, limit)`|获取用户的所有审核操作（默认限制：50）|
|`getModerationHistoryByReport(reportId)`|获取链接到特定报告的审核操作|

这两种查询功能都通过用户配置文件信息和管理执行者的详细信息丰富了结果。

**来源：** `template/lib/db/queries/moderation.queries.ts`

## 用户状态管理

### 状态值

|状态|描述|
|---|---|
|`active`|普通账户，所有功能可用|
|`suspended`|暂时受限，无法创建内容|
|`banned`|永久受限，禁止一切行动|

### 数据库操作

|功能|描述|
|---|---|
|`suspendUser(userId)`|将状态设置为`"suspended"`，记录`suspendedAt`|
|`unsuspendUser(userId)`|将状态恢复为`"active"`，清除`suspendedAt`|
|`banUser(userId)`|将状态设置为`"banned"`，记录`bannedAt`|
|`unbanUser(userId)`|将状态恢复为`"active"`，清除`bannedAt`|
|`incrementWarningCount(userId)`|使用 SQL `COALESCE` 递增 `warningCount`|

### 被阻止的用户检查

两个辅助函数检查应用程序中的用户状态：

- **`isUserBlocked(status)`** -- 如果状态为 `"suspended"` 或 `"banned"`，则返回 `true`
- **`getBlockReasonMessage(status)`** -- 返回一条面向用户的消息，解释操作受到限制的原因

评论、投票和报告端点使用这些检查来防止被阻止的用户创建内容。

**来源：** `template/lib/db/queries/moderation.queries.ts`

## 电子邮件通知

`EmailNotificationService` 发送用于审核操作的非阻塞通知：

|方法|触发|
|---|---|
|`sendContentRemovedEmail(email, type, reason)`|内容已被管理员删除|
|`sendUserWarningEmail(email, reason, count)`|发出警告|
|`sendUserSuspensionEmail(email, reason)`|帐户被暂停|
|`sendUserBanEmail(email, reason)`|帐户被禁止|

所有电子邮件发送均使用 `.catch()` 来防止失败中断审核工作流程。失败的电子邮件不会导致审核操作本身失败。

## 关键实施细节

- **服务层模式：** 审核逻辑位于 `lib/services/moderation.service.ts` 中，而不是 API 路由处理程序中。这允许跨不同入口点重用。
- **审计跟踪：** 每个审核操作都会创建一个 `moderationHistory` 记录，提供完整的审计日志以供合规性和审查。
- **非阻塞电子邮件：** 电子邮件通知与 `.catch()` 处理程序异步发送。如果电子邮件服务不可用，审核操作仍然会成功。
- **幂等性守卫：** 每个操作在继续之前都会检查当前用户状态。禁止已被禁止的用户会返回错误，而不是创建重复的操作。
- **软删除与硬删除：** 注释被软删除（设置 `deletedAt`），而项目则从 Git 存储库中完全删除。这种差异反映了存储模型（数据库与基于文件的内容）。
