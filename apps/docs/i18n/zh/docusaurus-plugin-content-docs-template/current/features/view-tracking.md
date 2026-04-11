---
id: view-tracking
title: 查看跟踪和参与度
sidebar_label: 查看跟踪
sidebar_position: 35
---

# 查看跟踪和参与度

该模板包括一个注重隐私的视图跟踪系统，该系统记录每个项目的独特每日视图。它支持项目页面的浏览次数、仪表板分析、趋势项目排名和受欢迎程度评分。

## 架构概述

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## 处理管道

当用户访问项目详细信息页面时，0 组件会触发 POST 请求。服务器通过多级管道对其进行处理：

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### 响应格式

```json
{ "success": true, "counted": true }
```

|回应 |意义|
|----------|---------|
| 0 |记录了新的景色 |
| 1 |今天重复（相同查看者 + 项目 + 日期）|
| 2 |检测到机器人用户代理 |
| 3 |经过身份验证的用户查看自己的项目 |

## 客户端跟踪器

4 是一个客户端组件，在挂载时触发单个 POST 请求：

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

跟踪器使用尽力而为的方法：故障会被默默地忽略，因此视图跟踪永远不会破坏用户体验。

## 机器人检测

0模块维护已知的机器人用户代理模式列表，包括搜索引擎爬虫、监控工具和自动化客户端。当检测到机器人时，端点会返回成功响应 1 而不接触数据库。

## 观众识别

视图归因于存储在第一方纯 HTTP cookie 中的查看者 ID：

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### 隐私属性

- **无个人数据** -- cookie 仅包含随机 UUID，而不包含用户身份。
- **仅限 HTTP** -- JavaScript 无法读取 cookie，从而防止基于 XSS 的跟踪渗漏。
- **同站点宽松** -- 跨源请求时不会发送 cookie。
- **安全标志** -- 在生产中强制要求 HTTPS。
- **无第三方服务** -- 所有跟踪数据都保留在您的数据库中。

## 每日重复数据删除

核心记录逻辑使用PostgreSQL的0：

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

0表对1有唯一的约束。查看器-项目对当天的第一个视图会插入一行并返回2。同一天的后续视图将被默默地跳过。日期按 UTC 3 计算，以实现一致的重复数据删除，无论时区如何。

## 所有者排除

当经过身份验证的用户查看自己的项目时，该查看不会计入：

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

这可以防止项目所有者人为地增加他们的观看次数。

## 聚合查询

0 文件导出多个用于分析的函数：

|功能|返回类型 |描述 |
|----------|-------------|-------------|
| 1 | 2 |项目块的历史总浏览量 |
| 3 | 4 |滑动窗口内的观看次数（默认 7 天）|
| 5 | 6 |迷你图的日期键控地图 |
| 7 | 8 |排名的每项总浏览量 |

## 分析集成

### 人气评分

视图计数输入到共享卡系统使用的对数流行度评分算法中：

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

这确保了具有许多浏览次数的项目在“热门”排序模式中排名更高，同时防止病毒式项目的分数失控。

### 客户端仪表板

0 处的客户端仪表板显示：
- 所有提交项目的总浏览量
- 过去 7 天内的视图以及趋势指标
- 每日浏览量图表，来自 1

### 管理仪表板

管理仪表板使用 2 来表示站点范围的视图指标。地理分析端点提供视图的地理分布。

## 错误处理

视图跟踪错误在生产中以静默方式处理：

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

开发模式记录错误以进行调试。生产抑制控制台输出以避免噪音。

## 配置

视图跟踪自动运行，无需环境变量。系统正常降级：

- **无数据库** -- 端点返回 503，客户端忽略该失败。
- **数据库模拟模式** -- 启用后，将根据模拟数据跟踪视图。
- **功能标志** -- 视图计数根据模板设置有条件地显示。

## 辅助功能

- 0 不渲染任何 DOM 元素，确保对页面布局和屏幕阅读器的影响为零。
- 卡片中显示的视图计数使用屏幕阅读器上下文的1属性。
- 仪表板视图图表包括描述性标题和摘要文本。

## 相关文档

- [仪表板组件](/docs/template/components/dashboard-components) -- 查看统计信息显示
- [共享卡组件](/docs/template/components/shared-card-components) -- 人气评分
- [管理分析](/docs/template/features/admin-analytics) -- 站点范围的视图指标
- [投票和评论](/docs/template/features/voting-comments) -- 其他参与功能
