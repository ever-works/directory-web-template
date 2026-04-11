---
id: notification-system
title: 通知系统深入探讨
sidebar_label: 通知系统
sidebar_position: 34
---

# 通知系统深入探讨

该模板提供了由 PostgreSQL 支持的应用内通知系统。通知由服务器端服务创建，并通过 REST API（主要由管理仪表板）使用。系统支持多种通知类型、批量操作和可扩展的类型定义。

## 架构概述

```
lib/db/schema.ts                    # notifications table definition
lib/services/notification.service.ts # NotificationService with convenience methods

app/api/admin/notifications/
  route.ts                           # GET (list) and POST (create) endpoints
  mark-all-read/route.ts             # POST mark all as read
  [id]/read/route.ts                 # PATCH mark single as read

components/admin/
  admin-notifications.tsx            # Notification dropdown UI
  admin-notification-stats.tsx       # Notification count badges
```

## 数据库架构

通知存储在 0 表中：

```ts
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'),              // JSON string for extra payload
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIndex: index('notifications_user_idx').on(table.userId),
  typeIndex: index('notifications_type_idx').on(table.type),
  isReadIndex: index('notifications_is_read_idx').on(table.isRead),
  createdAtIndex: index('notifications_created_at_idx').on(table.createdAt),
}));
```

### 架构设计

- **0 列** -- 对通知进行分类的自由格式字符串。不是由枚举强制执行的，允许新类型而无需迁移。
- **1 列** -- 将附加上下文存储为 JSON 字符串。在读取时进行解析以访问项目 ID、评论内容或特定于事件的信息。
- **2/ / 3** -- 用于快速未读计数的布尔标志以及用于审核的时间戳。
- **四个索引** -- 涵盖用户查找、类型过滤、未读过滤和时间排序。

## 通知类型

系统使用基于字符串的类型标识符。内置类型包括：

|类型 |触发|典型收件人|
|------|---------|--------------------|
| 4 |管理员批准提交的项目 |项目提交者 |
| 5 |管理员拒绝提交的项目 |项目提交者 |
| 6 |有人对用户的项目发表评论 |物品拥有者 |
| 7 |评论已标记为待审核 |管理员 |
| 8 |项目被标记为需要审核 |管理员 |
| 9 |新用户注册 |管理员 |
| 10 |付款尝试失败 |受影响的用户 |
| 11 |系统级警告或通知|管理员 |

### 添加自定义类型

1. 选择描述性类型字符串（例如 `survey_response_received` ）。
2. 在 13 中添加一个方便的方法来构建正确的有效负载。
3. 从相关API路由或服务调用方法。
4. （可选）更新管理通知下拉列表以呈现自定义图标。

由于 14 是自由格式文本列，因此无需迁移数据库。

## 通知服务

该服务位于15，提供了从服务器端代码创建通知的便捷方法：

```ts
class NotificationService {
  static async create(data: CreateNotificationData);
  static async createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy);
  static async createCommentReportedNotification(adminUserId, commentId, content, reportedBy);
  static async createItemReportedNotification(adminUserId, itemId, itemName, reportedBy);
  static async createUserRegisteredNotification(adminUserId, userName, userEmail);
  static async createPaymentFailedNotification(userId, subscriptionId, errorMessage);
  static async createSystemAlertNotification(adminUserId, title, message);
}
```

每个便利方法在委托给通用 4 方法之前都会构造正确的011、223 有效负载。

＃＃＃ 用法

```ts
import { NotificationService } from '@/lib/services/notification.service';

// After approving an item
await NotificationService.createItemSubmissionNotification(
  adminUserId, item.id, item.name, item.submittedBy
);

// System-level alert
await NotificationService.createSystemAlertNotification(
  adminUserId, 'Database Warning', 'Connection pool reaching capacity'
);
```

## API 端点

所有通知端点都需要管理员身份验证。

### 获取/api/admin/通知

检索经过身份验证的管理员的 50 条最新通知，按最新的在前排序。在单个响应中返回通知和未读计数。

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

为了提高效率，未读计数使用单独的01。

### POST /api/admin/通知

为特定用户创建新通知。

|领域 |必填|描述 |
|--------|----------|-------------|
| 2 |是的 |通知类别标识符 |
| 3 |是的 |短标题文本 |
| 4 |是的 |正文 |
| 5 |是的 |收件人用户 ID |
| 6 |没有 |额外有效负载（自动字符串化）|

### POST /api/admin/notifications/mark-all-read

将当前管理员的所有未读通知标记为已读。在单次批量更新中将7和8设置为当前时间戳。

### 补丁 /api/admin/notifications/[id]/read

将单个通知标记为已按 ID 读取。

## 管理仪表板集成

管理标题显示一个带有未读计数徽章的响铃图标。下拉组件：

1. 从 GET 端点获取通知。
2. 使用特定于类型的图标和颜色编码呈现每个通知。
3. 将单个通知标记为点击时已读。
4. 提供“全部标记为已读”批量操作。
5. 计时器轮询或管理导航刷新。

## 实时考虑

当前的实现使用基于轮询的刷新。对于实时更新，该架构支持扩展点：

- **服务器发送的事件** -- 添加流式传输新通知的 SSE 端点。
- **WebSocket** -- 与 WebSocket 提供程序集成以进行双向通信。
- **轮询间隔** -- 可通过管理通知组件的刷新计时器进行调整。

## 电子邮件集成

通知系统侧重于应用内通知。出站电子邮件通知通过电子邮件服务（重新发送/Novu）单独处理，但共享相同的触发点。通过 9 创建通知时，调用代码可以选择在同一操作中触发电子邮件。

## 数据负载结构

10 列存储具有特定于事件的上下文的 JSON 字符串：

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

这种灵活的模式允许通知渲染器深层链接到相关页面并显示上下文信息。

## 辅助功能

- 响铃图标徽章使用0向屏幕阅读器宣布未读计数。
- 下拉列表中的通知项目可聚焦且可通过键盘导航。
- 特定于类型的图标具有装饰性 (1)，并带有提供上下文的文本标签。
- “全部标记为已读”按钮通过 Toast 通知提供清晰的反馈。
- 时间戳使用相对格式（“2 小时前”），并在 `title` 属性中包含完整日期。

## 相关文档

- [管理组件](/docs/template/components/admin-components) -- 管理通知 UI
- [仪表板组件](/docs/template/components/dashboard-components) -- 通知统计信息
- [报告和审核](/docs/template/features/reports-moderation) -- 报告触发的通知
- [投票和评论](/docs/template/features/voting-comments) -- 评论触发通知
