---
id: vote-types
title: 投票类型定义
sidebar_label: 投票类型
sidebar_position: 5
---

# 投票类型定义

**来源：** `lib/types/vote.ts`

投票系统允许用户对项目进行投票。该模块使用 Zod 定义投票数据模式进行运行时验证，以及响应、错误和客户端状态类型。

## 佐德模式

### `voteSchema`

使用 Zod 定义的规范投票数据模式。它既充当运行时验证器，又充当 `Vote` TypeScript 类型的源。

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});
```

## 类型

### `Vote`

投票数据类型，从 `voteSchema` 推断：

```typescript
type Vote = z.infer<typeof voteSchema>;
```

这解决了：

```typescript
interface VoteShape {
  id: string;
  userId: string;
  itemId: string;
  createdAt: Date;
}
```

|领域|类型|描述|
|-------|------|-------------|
|`id`|`string`|唯一投票标识符|
|`userId`|`string`|投票用户ID|
|`itemId`|`string`|投票项目的 ID 或 slug|
|`createdAt`|`Date`|投票时的时间戳|

### `VoteResponse`

投票切换操作后返回 API 响应。

```typescript
interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}
```

|领域|类型|描述|
|-------|------|-------------|
|`success`|`boolean`|操作是否成功完成|
|`voteCount`|`number`|更新了该项目的总票数|
|`hasVoted`|`boolean`|操作后当前用户是否已投票|
|`message`|`string?`|可选状态消息|

### `VoteError`

失败投票操作的错误响应结构。

```typescript
interface VoteError {
  error: string;
  code?: string;
}
```

|领域|类型|描述|
|-------|------|-------------|
|`error`|`string`|人类可读的错误消息|
|`code`|`string?`|用于编程处理的机器可读错误代码|

### `VoteState`

投票 UI 组件的客户端状态。与 React hook 一起使用来管理浏览器中的投票状态。

```typescript
interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
}
```

|领域|类型|描述|
|-------|------|-------------|
|`voteCount`|`number`|向用户显示当前总票数|
|`hasVoted`|`boolean`|当前用户是否投票（控制按钮状态）|
|`isLoading`|`boolean`|投票操作是否正在进行（禁用按钮）|
|`error`|`string?`|显示错误消息（如果有）|

## 使用示例

### 使用 Zod 验证投票数据

```typescript
import { voteSchema } from '@/lib/types/vote';

const rawData = {
  id: 'vote-123',
  userId: 'user-456',
  itemId: 'my-tool',
  createdAt: new Date(),
};

const result = voteSchema.safeParse(rawData);
if (result.success) {
  console.log('Valid vote:', result.data);
} else {
  console.error('Invalid vote data:', result.error.issues);
}
```

### 管理 React 组件中的投票状态

```typescript
import type { VoteState, VoteResponse } from '@/lib/types/vote';
import { useState } from 'react';

function useVote(initialCount: number, initialVoted: boolean) {
  const [state, setState] = useState<VoteState>({
    voteCount: initialCount,
    hasVoted: initialVoted,
    isLoading: false,
  });

  async function toggleVote(itemId: string) {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const res = await fetch(`/api/items/${itemId}/vote`, {
        method: 'POST',
      });
      const data: VoteResponse = await res.json();

      if (data.success) {
        setState({
          voteCount: data.voteCount,
          hasVoted: data.hasVoted,
          isLoading: false,
        });
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to toggle vote',
      }));
    }
  }

  return { ...state, toggleVote };
}
```

### 处理投票错误

```typescript
import type { VoteError } from '@/lib/types/vote';

function handleVoteError(error: VoteError) {
  switch (error.code) {
    case 'UNAUTHORIZED':
      // Redirect to login
      break;
    case 'RATE_LIMITED':
      // Show rate limit message
      break;
    default:
      // Show generic error
      console.error(error.error);
  }
}
```

## 设计笔记

### 切换行为

投票系统使用切换模式：调用项目的投票端点可以添加或删除用户的投票。 `VoteResponse.hasVoted` 字段指示切换后的新状态。

### Zod + TypeScript 集成

`Vote` 类型源自 Zod 模式，而不是单独定义。这确保运行时验证和编译时类型检查使用相同的定义：

```typescript
// Single source of truth
const voteSchema = z.object({ ... });

// Type is derived, not duplicated
type Vote = z.infer<typeof voteSchema>;
```

### 客户端-服务器状态分离

- `Vote`代表数据库记录
- `VoteResponse` 是突变后的 API 响应
- `VoteState` 是客户端 UI 状态
- `VoteError` 是错误响应结构体

这种分离使数据层、API 层和 UI 层之间的关注点保持清晰。

## 相关类型

- [`Comment`](./comment-types.md) - 另一种每项用户交互类型
- [`ItemData`](./item-types.md) - 投票所属的父项目
