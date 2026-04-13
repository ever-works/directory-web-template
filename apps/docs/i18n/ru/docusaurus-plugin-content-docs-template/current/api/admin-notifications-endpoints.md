---
id: admin-notifications-endpoints
title: 管理通知 API 端点
sidebar_label: 管理员通知
sidebar_position: 33
---

# 管理通知 API 端点

管理员通知 API 管理管理员用户的应用内通知。它支持列出未读计数的通知、为特定用户创建新通知以及将通知标记为已读（单独或批量）。通知存储在数据库中并仅限于单个用户。

## 路线概要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`GET`|`/api/admin/notifications`|管理员|列出当前管理员的通知|
|`POST`|`/api/admin/notifications`|已认证|创建新通知|
|`PATCH`|`/api/admin/notifications/{id}/read`|已认证|将单个通知标记为已读|
|`PATCH`|`/api/admin/notifications/mark-all-read`|已认证|将所有通知标记为已读|

## 认证

通知端点使用两个级别的身份验证：

**仅限管理员（GET 列表）：** 需要身份验证和管理员角色。

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
if (!session.user.isAdmin) {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
```

**经过身份验证的用户（POST、PATCH）：** 需要有效的会话，但不需要管理员角色。标记为已读端点的范围仅限于经过身份验证的用户自己的通知。

## 端点

### 获取`/api/admin/notifications`

检索经过身份验证的管理员用户的最新 50 条通知，按创建日期排序（最新的在前）。还返回未读通知的总数。

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123abc",
        "userId": "user_456def",
        "type": "item_approved",
        "title": "Item Approved",
        "message": "Your item 'Awesome Tool' has been approved and is now live.",
        "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\"}",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "unreadCount": 3
  }
}
```

**行为详情：**
- 每个请求最多返回 50 条通知
- 结果按 `createdAt` 降序排列（最新的在前）
- `unreadCount` 通过对通知进行计数来单独计算，其中`isRead = false`
- 通知的范围仅限于经过身份验证的用户 ID

### 发布 `/api/admin/notifications`

为指定用户创建新通知。 `data` 字段接受一个在存储之前将被 JSON 字符串化的对象。该端点不需要管理员权限——任何经过身份验证的用户都可以创建通知（通常由系统内部调用）。

**请求正文：**

```json
{
  "type": "item_approved",
  "title": "Item Approved",
  "message": "Your item 'Awesome Tool' has been approved and is now live.",
  "userId": "user_456def",
  "data": {
    "itemId": "item_789ghi",
    "itemName": "Awesome Tool",
    "action": "approved"
  }
}
```

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`type`|字符串|是的|通知类型标识符（例如`"item_approved"`、`"comment_received"`）|
|`title`|字符串|是的|简短的通知标题|
|`message`|字符串|是的|完整的通知消息|
|`userId`|字符串|是的|接收通知的目标用户ID|
|`data`|对象|否|附加元数据（存储上的 JSON 字符串化）|

**回复 (200)：**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\", \"action\": \"approved\"}",
    "isRead": false,
    "readAt": null,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### 补丁`/api/admin/notifications/{id}/read`

将特定通知标记为已读。将`isRead`设置为`true`，在`readAt`中记录当前时间戳，并更新`updatedAt`。只有通知所有者可以标记自己的通知 - 查询按通知 ID 和经过身份验证的用户 ID 进行筛选。

**路径参数：**

|参数|类型|描述|
|-----------|------|-------------|
|`id`|字符串|通知唯一标识符|

**回复 (200)：**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "isRead": true,
    "readAt": "2024-01-20T16:45:00.000Z",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### 补丁`/api/admin/notifications/mark-all-read`

在单个批量操作中将经过身份验证的用户的所有未读通知标记为已读。为每个匹配的通知更新 `isRead`、`readAt` 和 `updatedAt`。返回已更新的通知计数。

**回复 (200)：**

```json
{
  "success": true,
  "updatedCount": 5
}
```

**行为详情：**
- 仅更新当前用户 `isRead = false` 的通知
- 如果没有未读通知，`updatedCount` 可能是 `0`
- 所有匹配的通知都在单个数据库查询中更新

## 通知数据模型

|领域|类型|可空|描述|
|-------|------|----------|-------------|
|`id`|字符串|否|唯一的通知标识符|
|`userId`|字符串|否|收到通知的用户ID|
|`type`|字符串|否|通知类型（例如`"item_approved"`、`"comment_received"`）|
|`title`|字符串|否|短显示标题|
|`message`|字符串|否|完整的通知消息|
|`data`|字符串|是的|JSON 字符串化的附加元数据|
|`isRead`|布尔值|否|通知是否已读|
|`readAt`|日期时间|是的|标记为已读时的时间戳|
|`createdAt`|日期时间|否|创建时间戳|
|`updatedAt`|日期时间|是的|最后更新时间戳|

## 错误代码

|状态|错误|原因|
|--------|-------|-------|
| `400` |缺少必填字段|POST 缺少类型、标题、消息或用户 ID|
| `400` |通知 ID 为必填项|ID 参数为空的 PATCH|
| `401` |未经授权|没有活动会话|
| `403` |禁止|GET 列表端点上的非管理员用户|
| `404` |未找到通知|无效 ID 或通知属于其他用户|
| `500` |服务器内部错误|数据库或服务器故障|

## 常见通知类型

`type` 字段是自由格式字符串，但应用程序通常使用以下值：

|类型|描述|
|------|-------------|
|`item_approved`|项目已获得管理员批准|
|`item_rejected`|项目已被拒绝|
|`comment_received`|对某个项目发布了新评论|
|`submission_received`|收到新项目提交|

## 相关文档

- [管理端点概述](./admin-endpoints.md)
- [响应模式](./response-patterns.md)
- [请求验证](./request-validation.md)
