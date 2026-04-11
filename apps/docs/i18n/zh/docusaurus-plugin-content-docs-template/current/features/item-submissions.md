---
id: item-submissions
title: 项目提交
sidebar_label: 项目提交
sidebar_position: 31
---

# 项目提交

项目提交系统为用户提供了完整的工作流程来提交、管理和跟踪目录列表。它包括状态跟踪（待定、批准、拒绝）、过滤、统计卡、详细模式、编辑模式和确认删除。

## 架构概述

|模块|路径|目的|
|--------|------|---------|
|提交列表 | 0 |带分页的主列表组件 |
|提交项目 | 1 |个人提交卡|
|提交过滤器 | 2 |状态选项卡和搜索 |
|提交统计卡 | 3 |统计卡概览 |
|编辑提交模式 | 4 |内联编辑模式 |
|提交详细信息模式 | 5 |只读详细视图 |
|删除提交对话框 | 6 |删除确认 |
|垃圾项目 | 7 |废弃物品显示|
|计划卫士| 8 |计划提交限制 |

## 提交数据模型

9 界面代表 UI 中的提交：

```ts
export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  source_url?: string;
}
```

0 帮助器从 API 数据模型进行转换：

```ts
export function toSubmission(
  item: ClientSubmissionData
): Submission {
  const approvedAt =
    item.status === 'approved' ? item.reviewed_at : undefined;
  const rejectedAt =
    item.status === 'rejected' ? item.reviewed_at : undefined;

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    status: (['approved', 'pending', 'rejected'].includes(
      item.status
    )
      ? item.status
      : 'pending') as Submission['status'],
    submittedAt: item.submitted_at || item.updated_at || null,
    approvedAt,
    rejectedAt,
    rejectionReason: item.review_notes,
    category: Array.isArray(item.category)
      ? item.category[0] || 'Uncategorized'
      : item.category || 'Uncategorized',
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    source_url: item.source_url,
  };
}
```

## 提交列表组件

0 组件呈现具有加载、空和已填充状态的提交列表：

```tsx
export interface SubmissionListProps {
  items: ClientSubmissionData[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  emptyStateActionHref?: string;
  skeletonCount?: number;
}
```

关键行为：

- **加载状态** -- 渲染 0 占位符
- **空状态** -- 显示链接到 1 的号召性用语
- **填充状态** -- 通过 2 映射项目并为每个项目渲染 3
- **乐观加载指标** -- 4 和 5 禁用受影响的项目

6 变体添加了分页元数据显示。

## 状态配置

每个提交状态都映射到一个图标、配色方案和翻译键：

```ts
const statusConfig = {
  approved: {
    labelKey: "STATUS_APPROVED",
    icon: FiCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pending: {
    labelKey: "STATUS_PENDING",
    icon: FiClock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  rejected: {
    labelKey: "STATUS_REJECTED",
    icon: FiX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};
```

被拒绝的提交会在红色标注框中显示拒绝原因。

## 提交过滤器

0 组件提供选项卡式状态过滤和文本搜索：

```tsx
export interface SubmissionFiltersProps {
  status: ClientStatusFilter;
  search: string;
  onStatusChange: (status: ClientStatusFilter) => void;
  onSearchChange: (search: string) => void;
  isSearching?: boolean;
  disabled?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}
```

特点：

- **状态选项卡** -- 全部、已批准、待处理和已拒绝的药丸按钮，带有可选的计数徽章
- **搜索输入** -- 带清除按钮和加载微调器的全文搜索
- **紧凑变体** -- 0 使用下拉菜单选择空间受限的布局

## 统计卡

1 组件在网格中显示四个统计卡：

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

四张牌显示：

|卡|关键|颜色 |
|------|-----|--------|
|提交总数 | 0 |蓝色|
|已批准 | 1 |绿色|
|待定 | 2 |黄色|
|被拒绝 | 3 |红色|

每张卡片都有渐变图标背景、动画加载骨架和悬停阴影效果。

## 提交物品卡

每个4 渲染：

- 带有身份徽章的头衔
- 截断的描述（两线夹）
- 最多 5 个带有溢出计数的标签
- 元数据行：类别、提交日期、查看次数、点赞次数
- 操作按钮：查看、编辑、删除
- 操作进行时在编辑/删除按钮上加载微调器
- 批量操作期间禁用状态

## 基于计划的提交限制

计划守护系统控制用户可以提交的数量：

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

提交前检查限制：

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

用于提交的其他计划控制功能：

|特色 |免费|标准|高级|
|---------|------|----------|---------|
|提交项目 |是的 |是的 |是的 |
|最大图像数 | 1 | 5 |无限 |
|描述词 | 200 | 200 500 | 500无限 |
|视频上传|没有 |没有 |是的 |
|已验证徽章 |没有 |是的 |是的 |
|优先审查|没有 |是的 |是的 |
|即时评论 |没有 |没有 |是的 |
|审核时间（天）| 7 | 3 | 1 |

## 提交工作流程

1. **用户提交** -- 填写多步提交表单
2. **验证** - 检查计划限制和输入验证
3. **存储** -- 项目数据通过项目服务存储在基于Git的CMS中
4. **状态：待处理** -- 提交进入管理员审核队列
5. **管理员审核** -- 管理员批准或拒绝并附有可选注释
6. **状态：批准/拒绝** -- 用户在仪表板中看到更新的状态
7. **编辑**——用户可以编辑提交的内容（在计划修改限制内）
8. **删除** -- 用户可以通过确认对话框删除自己的提交内容

## 国际化

所有 UI 文本都使用 1 命名空间下的 0 翻译：

- 2 -- 空状态标题
- 3 -- 空状态描述
- 4 -- 号召性用语按钮
- 5、6、7-- 状态标签
- 8 -- 日期前缀
- 9, 10 -- 带计数参数的公制标签
- 11 -- 拒绝标注标签
- 12 -- 搜索输入占位符
- 13, 14 -- 分页文本

## 相关文档

- [多步表单](/docs/template/features/multi-step-forms) -- 提交表单实现
- [管理员管理](/docs/template/features/admin-management) -- 管理员审核工作流程
- [投票和评论](/docs/template/features/voting-comments) -- 参与提交
