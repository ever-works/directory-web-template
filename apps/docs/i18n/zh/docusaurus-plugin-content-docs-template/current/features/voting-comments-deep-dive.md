---
id: voting-comments-deep-dive
title: 投票和评论深入探讨
sidebar_label: 投票和评论深入探讨
sidebar_position: 36
---

# 投票和评论深入探讨

本次深入探讨涵盖了投票和评论系统的内部机制，包括乐观更新算法、缓存管理策略、评级聚合、跨组件事件协调和管理审核工作流程。

## 架构概述

```
hooks/
  use-item-vote.ts           # Vote hook with optimistic mutations and cache utilities
  use-comments.ts            # Comment CRUD hook with rating integration
  use-admin-comments.ts      # Admin moderation hook with pagination

app/api/items/[id]/
  votes/route.ts             # GET/POST/DELETE vote endpoints
  comments/route.ts          # GET/POST comment endpoints
  comments/[commentId]/route.ts  # PUT/DELETE single comment
  comments/rating/route.ts   # GET rating endpoint

lib/db/schema.ts             # votes and comments table definitions
```

## 投票系统内部结构

### useItemVote 挂钩

该钩子管理单个项目的投票状态，并提供完全乐观的更新支持：

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### 投票状态机

`handleVote` 函数实现基于切换的状态机：

| 当前状态 | 行动 | 结果 | 净变化 |
|--------------|--------|--------|------------|
| 没有投票 | 点击向上 | 点赞 | +1 |
| 没有投票 | 单击向下 | 否决票 | -1 |
| 已投票 | 点击向上 | 删除投票（关闭） | -1 |
| 已投票 | 单击向下 | 切换到否决票 | -2 |
| 投了反对票 | 单击向下 | 删除投票（关闭） | +1 |
| 投了反对票 | 点击向上 | 切换到点赞 | +2 |

当用户当前的投票与请求的类型匹配时，挂钩调用 `unvote()`（DELETE）。否则它会调用 `vote(type)` (POST)。

### 乐观计数计算

乐观更新无需等待服务器即可计算计数差异：

```ts
onMutate: async (type) => {
  const previousVotes = queryClient.getQueryData(['item-votes', itemId]);
  queryClient.setQueryData(['item-votes', itemId], (old) => {
    if (!old) return { count: type === 'up' ? 1 : -1, userVote: type };
    const countDiff = old.userVote === type ? -1
      : old.userVote === null ? 1
      : 2; // switching direction
    return {
      count: old.count + (type === 'up' ? countDiff : -countDiff),
      userVote: old.userVote === type ? null : type
    };
  });
  return { previousVotes };
},
```

`countDiff` 计算处理三种情况：切换（减 1）、新投票（加 1）和切换方向（全范围加 2）。

### 身份验证门

未经身份验证的用户尝试投票时会看到登录弹窗，并且 `handleVote` 会在启动变更之前抛出错误：

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

该错误会传给调用 `handleVote` 的代码：不会发送请求，变更的 `onError` 处理程序也不会运行。`onError` 只处理失败的投票请求：它回滚乐观更新并显示错误提示（当消息与登录有关时，投票变更不显示该提示）。

### 查询配置

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### 投票缓存实用程序

`useVoteCache` 钩子提供跨组件缓存操作：

```ts
function useVoteCache() {
  return {
    invalidateAllVotes,    // Invalidate all vote queries
    invalidateItemVotes,   // Invalidate votes for a specific item
    clearVoteCache,        // Remove all vote data from cache
    prefetchItemVotes,     // Pre-fetch votes for an item (e.g., on hover)
  };
}
```

## 评论系统内部结构

### useComments 挂钩

该钩子提供完整的 CRUD 操作以及集成的评级支持：

```ts
interface CreateCommentData {
  content: string;
  itemId: string;
  rating: number;
}

interface UpdateCommentData {
  commentId: string;
  content?: string;
  rating?: number;
}
```

### 返回值

| 属性 | 类型 | 描述 |
|----------|------|-------------|
| `comments` | `CommentWithUser[]` | 带有填充用户数据的评论 |
| `isPending` | `boolean` | 初始获取期间为 True |
| `createComment` | `(data) => Promise` | 创建新评论 |
| `updateComment` | `(data) => Promise` | 编辑现有评论 |
| `deleteComment` | `(id) => Promise` | 删除评论 |
| `commentRating` | `{ averageRating: number; totalRatings: number }` | 项目的综合评分 |

### 跨组件事件系统

评论系统调度自定义 DOM 事件以在不共享 React Query 缓存键的组件之间进行协调：

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

这允许诸如项目详细信息标题（显示评论计数）之类的组件对评论更改做出反应，而无需直接耦合到评论查询。

### 评级聚合

评论和评分紧密结合。在任何评论突变（创建、更新、删除）之后，挂钩会强制重新获取项目评级：

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

这可确保星级显示在用户提交或编辑评论后立即更新。

### 查询稳定性

评论查询使用保守的刷新设置来防止 UI 闪烁：

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## 管理员审核

### useAdminComments 挂钩

管理员审核挂钩提供分页评论管理：

```ts
function useAdminComments({ page, limit, search }) {
  return {
    comments: AdminCommentItem[],
    totalComments: number,
    totalPages: number,
    isDeleting: string | null,  // ID of comment being deleted
    deleteComment: (id: string) => Promise<boolean>,
  };
}
```

### 审核工作流程

1. 管理员导航至评论管理页面。
2.评论显示带有搜索和分页。
3. `isDeleting` 状态跟踪正在删除的评论，禁用其行。
4. 删除会触发通过 `NotificationService` 向评论作者发出通知。

## API 端点

| 方法 | 端点 | 描述 |
|--------|----------|-------------|
| GET | `/api/items/:slug/votes` | 获取投票数和用户的投票 |
| POST | `/api/items/:slug/votes` | 投票或更改投票 |
| DELETE | `/api/items/:slug/votes` | 删除投票 |
| GET | `/api/items/:slug/comments` | 获取带有用户数据的评论 |
| POST | `/api/items/:slug/comments` | 创建新评论 |
| PUT | `/api/items/:slug/comments/:commentId` | 更新评论 |
| DELETE | `/api/items/:slug/comments/:commentId` | 删除评论 |
| GET | `/api/items/:slug/comments/rating` | 获取总项目评级 |

## 功能标志集成

投票和评论都尊重功能标志：

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

当数据库未配置时，这些功能将自动禁用。

## 辅助功能

- 投票按钮使用 `aria-pressed` 指示当前投票状态。
- 未经身份验证的投票尝试触发的登录模式受到焦点限制。
- 评论表单使用正确的 `<label>` 关联和验证消息。
- 星级组件支持带有方向键的键盘导航。
- 管理审核表包括行级状态指示器和键盘可访问的操作。
- 加载和错误状态分别提供 `aria-busy` 和 `role="alert"` 属性。

## 相关文档

- [投票和评论概述](/docs/template/features/voting-comments) -- 高级功能概述
- [Item Detail Components](/docs/template/components/item-detail-components) -- 投票和评论呈现的位置
- [通知系统](/docs/template/features/notification-system) -- 评论触发通知
- [仪表板组件](/docs/template/components/dashboard-components) -- 投票和评论分析
