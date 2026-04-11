---
id: item-history
title: 项目历史记录和审计
sidebar_label: 项目历史记录和审计
sidebar_position: 17
---

# 项目历史记录和审核

Ever Works 模板包括一个全面的审计跟踪系统，可跟踪项目在其整个生命周期中所做的所有更改。每次创建、更新、状态更改、审查、删除和恢复都会记录详细的更改信息、执行者身份和时间戳。

## 架构概述

|组件|路径|目的|
|---|---|---|
| 0 | 1 |用于记录审计操作的服务层 |
| 2 | 3 |数据库查询审计日志CRUD |
| 4 | 5 |用于获取审核日志的 React Query 挂钩 |
| 6 | 7 |用于查看项目历史记录的模态 UI |

## 审计行动

该系统跟踪六种类型的操作：

|行动|恒定|描述 |
|---|---|---|
|创建 | 8 |项目已创建 |
|更新 | 9 |项目字段已修改 |
|状态已更改 | 10 |项目状态已更改 |
|已审核 | 11 |项目已审核（批准/拒绝）|
|已删除 | 12 |项目被删除（软删除或硬删除）|
|恢复 | 13 |项目已从删除中恢复 |

## 跟踪字段

审计服务监视以下字段以进行更改检测：

|领域 |类型 |
|---|---|
| 14 |商品名称 |
| 15 |物品描述 |
| 16 |来源/产品网址 |
| 17 |类别分配 |
| 18 |标签数组 |
| 19 |收集作业|
| 20 |特色状态 |
| 21 |图标/徽标 URL |
| 22 |物品状态 |

## 项目审核服务

23 提供从 API 路由和服务调用的高级日志记录方法。

### 记录项目创建

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### 记录项目更新

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### 记录评论

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### 日志删除和恢复

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### 非阻塞设计

所有审核日志记录都包含在 try-catch 块中，并且不会抛出可能阻止主要操作的错误：

```tsx
async function logAction(params: LogActionParams): Promise<void> {
  try {
    await createItemAuditLog(createParams);
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    console.error('[ItemAuditService] Failed to log action:', error);
  }
}
```

## 变化检测

0 函数比较两个项目状态并返回详细的差异：

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

输出示例：

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

该函数处理数组的深度相等（排序比较），如果没有检测到变化则返回0。

## 数据库层

### 审核日志架构

每个审核日志条目包含：

|领域 |类型 |描述 |
|---|---|---|
| 1 | 2 |唯一ID |
| 3 | 4 |物品块/ID |
| 5 | 6 |行动时的项目名称 |
| 7 | 8 |动作类型|
| 9 | 10 |行动前的状态 |
| 11 | 12 |行动后的状态|
| 13 | 14 |字段级变更详细信息 |
| 15 | 16 |执行操作的用户 ID |
| 17 | 18 |用户显示名称|
| 19 | 20 |附加说明（例如审阅意见）|
| 21 | 22 |额外的上下文数据 |
| 23 | 24 |行动发生时 |

### 查询函数

|功能|描述 |
|---|---|
| 25 |创建新的审核日志条目 |
| 26 |获取包含表演者信息的分页历史记录 |
| 27 |获取最新的日志条目 |
| 28 |按操作类型过滤日志 |
| 29 |按执行者过滤日志 |
| 30 |按操作类型获取计数细分 |

### 分页历史查询

```tsx
import { getItemHistory } from '@/lib/db/queries/item-audit.queries';

const result = await getItemHistory({
  itemId: 'my-item-slug',
  page: 1,
  limit: 20,
  actionFilter: ['updated', 'status_changed']
});

// Returns: { logs, total, page, limit, totalPages }
```

该查询与 0 表连接，以在每个日志条目旁边包含执行者电子邮件。

## 1 钩子

```tsx
import { useItemHistory } from '@/hooks/use-item-history';

function ItemHistoryPanel({ itemId }) {
  const { data, isLoading, isError } = useItemHistory({
    itemId,
    page: 1,
    limit: 20,
    actionFilter: ['updated', 'reviewed'],
    enabled: true
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div>
      <p>Total entries: {data.total}</p>
      {data.logs.map(entry => (
        <div key={entry.id}>
          <span>{entry.action}</span>
          <span>{entry.performedByName}</span>
          <span>{entry.createdAt}</span>
        </div>
      ))}
    </div>
  );
}
```

### 钩子配置

|选项|默认|描述 |
|---|---|---|
| 0 |必填|用于获取历史记录的项目 ID/slug |
| 1 | 2 |页码 |
| 3 | 4 |每页项目 |
| 5 | 6 |要按 | 过滤的操作类型数组
| 7 | 8 |查询是否有效 |
| 9 | 30 秒 |缓存新鲜度|

## 项目历史模态

10 组件提供了用于查看项目审核历史记录的完整 UI：

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### 模态特征

|特色 |描述 |
|---|---|
|动作过滤 |按操作类型（创建、更新等）过滤的下拉列表 |
|颜色编码条目 |每种操作类型都有独特的图标和配色方案 |
|可扩展的变化|单击展开字段级更改详细信息 |
|相对时间戳 | “2 小时前”、“3 天前”，悬停时显示完整日期 |
|表演者展示 |显示用户名、电子邮件或“系统”以进行自动操作 |
|回顾背景 |显示“已批准”/“已拒绝”标签和拒绝原因 |
|分页|历史悠久的内置分页 |
|键盘支持 | Escape 键关闭模式 |

### 动作配色方案

|行动|颜色 |图标|
|---|---|---|
|创建 |绿色|加|
|更新 |蓝色|编辑2 |
|状态已更改 |黄色|刷新Cw |
|已审核 |紫色|检查圆圈 |
|已删除 |红色|垃圾2 |
|恢复 |青色|旋转CCW |

## 关键文件

|文件|路径|
|---|---|
|审计服务| 0 |
|审计查询| 1 |
|历史挂钩| 2 |
|历史模态 | 3 |
