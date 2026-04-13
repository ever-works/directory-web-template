---
id: reports-endpoints
title: 报告端点
sidebar_label: 报告
sidebar_position: 20
---

# 报告端点

报告系统允许经过身份验证的用户标记不当内容，并为管理员提供审查、审核和解决报告的工具。报告支持内容类型，包括项目和评论，并具有内置的重复预防功能。

## 概述

|端点|方法|授权|描述|
|---|---|---|---|
|`/api/reports`|后处理|用户|提交内容报告|
|`/api/admin/reports`|获取|管理员|列出带有过滤功能的报告|
|`/api/admin/reports/stats`|获取|管理员|获取报告统计信息|
|`/api/admin/reports/[id]`|获取|管理员|获取单一报告|
|`/api/admin/reports/[id]`|放置|管理员|更新报告状态和解决方案|

## 公共端点

### 提交报告

```
POST /api/reports
```

经过身份验证的用户可以举报不当内容的项目或评论。每个用户只能举报相同内容一次（通过`hasUserReportedContent`检查防止重复）。被阻止（暂停或禁止）的用户将无法提交报告。

**身份验证：** 必需（基于会话）

**请求正文：**

```json
{
  "contentType": "item",
  "contentId": "awesome-productivity-tool",
  "reason": "spam",
  "details": "This tool is promoting malicious software"
}
```

|领域|类型|必填|描述|
|---|---|---|---|
|`contentType`|字符串|是的|内容类型：`"item"` 或 `"comment"`|
|`contentId`|字符串|是的|所报告内容的 ID 或 slug|
|`reason`|字符串|是的|其中之一：`"spam"`、`"harassment"`、`"inappropriate"`、`"other"`|
|`details`|字符串|否|有关该报告的其他背景信息|

**成功响应 (200)：**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "awesome-productivity-tool",
    "reason": "spam",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**错误响应：**

|状态|条件|
|---|---|
| 400 |内容类型无效、内容 ID 缺失或原因无效|
| 401 |用户未经过身份验证|
| 403 |需要客户资料，或者用户被暂停/禁止|
| 404 |未找到客户资料|
| 409 |用户已举报该内容|
| 500 |服务器内部错误|

**来源：** `template/app/api/reports/route.ts`

## 管理端点

所有管理端点都要求 `session.user.isAdmin` 为 true。

### 列表报告

```
GET /api/admin/reports
```

返回包含报告者信息的内容报告的分页列表。支持按状态、内容类型和原因进行过滤，以及跨内容 ID、详细信息和报告者姓名/电子邮件的文本搜索。

**查询参数：**

|参数|类型|默认|描述|
|---|---|---|---|
|`page`|整数| 1 |页码（至少 1）|
|`limit`|整数| 10 |每页结果 (1-100)|
|`search`|字符串| - |搜索内容 ID、详细信息、记者姓名/电子邮件|
|`status`|字符串| - |过滤器：`"pending"`、`"reviewed"`、`"resolved"`、`"dismissed"`|
|`contentType`|字符串| - |筛选器：`"item"`、`"comment"`|
|`reason`|字符串| - |过滤器：`"spam"`、`"harassment"`、`"inappropriate"`、`"other"`|

**成功响应 (200)：**

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "rpt_abc123",
        "contentType": "item",
        "contentId": "some-item-slug",
        "reason": "spam",
        "status": "pending",
        "details": "Suspicious content",
        "reportedBy": "client_456",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

**来源：** `template/app/api/admin/reports/route.ts`

### 获取报告统计数据

```
GET /api/admin/reports/stats
```

返回有关报告的汇总统计信息，包括按状态、内容类型和原因划分的计数。

**成功响应 (200)：**

```json
{
  "success": true,
  "data": {
    "total": 156,
    "pendingCount": 23,
    "resolvedCount": 120,
    "byStatus": {
      "pending": 23,
      "reviewed": 10,
      "resolved": 120,
      "dismissed": 3
    },
    "byContentType": {
      "item": 100,
      "comment": 56
    },
    "byReason": {
      "spam": 80,
      "inappropriate": 45,
      "harassment": 20,
      "other": 11
    }
  }
}
```

**来源：** `template/app/api/admin/reports/stats/route.ts`

### 通过 ID 获取报告

```
GET /api/admin/reports/[id]
```

检索包含完整详细信息（包括报告者和审阅者信息）的单个报告。

**路径参数：**

|参数|类型|描述|
|---|---|---|
|`id`|字符串|报告编号|

**成功响应 (200)：**

```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "some-item-slug",
    "reason": "spam",
    "status": "reviewed",
    "details": "Suspicious content",
    "reportedBy": "client_456",
    "reviewedBy": "admin_789",
    "reviewNote": "Confirmed as spam",
    "resolution": "content_removed",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-21T09:00:00.000Z"
  }
}
```

|状态|条件|
|---|---|
| 403 |不是管理员|
| 404 |未找到报告|

**来源：** `template/app/api/admin/reports/[id]/route.ts`

### 更新报告

```
PUT /api/admin/reports/[id]
```

更新报告的状态、解决方案和审阅说明。设置解决方案后，系统会自动执行相应的审核操作（内容删除、用户警告、暂停或禁止）。

**请求正文：**

```json
{
  "status": "resolved",
  "resolution": "content_removed",
  "reviewNote": "Confirmed spam content, removed from listing"
}
```

|领域|类型|必填|描述|
|---|---|---|---|
|`status`|字符串|否|`"pending"`、`"reviewed"`、`"resolved"`、`"dismissed"`|
|`resolution`|字符串|否|`"content_removed"`、`"user_warned"`、`"user_suspended"`、`"user_banned"`、`"no_action"`|
|`reviewNote`|字符串|否|管理员关于审核的说明|

**按决议采取的审核行动：**

根据分辨率值触发以下自动操作：

|分辨率|行动|
|---|---|
|`content_removed`|致电`removeContent()`删除举报的项目或评论|
|`user_warned`|致电`warnUser()`向内容所有者发出警告|
|`user_suspended`|致电`suspendUser()`以暂停内容所有者的帐户|
|`user_banned`|致电`banUser()`永久禁止内容所有者|
|`no_action`|未采取任何调节措施|

**成功响应 (200)：**

```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "id": "rpt_abc123",
    "status": "resolved",
    "resolution": "content_removed",
    "reviewNote": "Confirmed spam content"
  },
  "moderationResult": {
    "success": true,
    "message": "Content removed successfully"
  }
}
```

|状态|条件|
|---|---|
| 400 |状态或分辨率值无效；找不到用户级操作的内容所有者|
| 403 |不是管理员|
| 404 |未找到报告|

**来源：** `template/app/api/admin/reports/[id]/route.ts`

## 数据模型

报告使用 `lib/db/schema` 中定义的以下枚举：

- **报告内容类型：** `"item"`、`"comment"`
- **报告原因：** `"spam"`、`"harassment"`、`"inappropriate"`、`"other"`
- **报告状态：** `"pending"`、`"reviewed"`、`"resolved"`、`"dismissed"`
- **报告分辨率：** `"content_removed"`、`"user_warned"`、`"user_suspended"`、`"user_banned"`、`"no_action"`

## 整合与适度

当使用用户级解决方案（`user_warned`、`user_suspended`、`user_banned`）解决报告时，系统：

1. 通过`getContentOwner()`查找内容所有者
2. 从 `lib/services/moderation.service` 执行适当的审核功能
3. 使用`reviewNote` 作为审核操作的原因
4. 记录管理员作为审阅者的ID

如果审核操作失败，报告更新仍会成功，但会记录失败。响应中的`moderationResult`字段指示操作是否成功。
