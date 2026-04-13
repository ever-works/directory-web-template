---
id: items-engagement-endpoints
title: "项目参与 API 参考"
sidebar_label: "项目参与度"
sidebar_position: 54
---

# 项目参与 API 参考

## 概述

项目参与度端点提供对目录项目的参与度指标和受欢迎度分数的访问。其中包括观看次数、投票、评分、收藏和评论。受欢迎程度得分端点还计算加权排名，其中考虑了参与度指标、特色状态和内容新近度。

## 端点

### 获取 /api/items/engagement

在单个批量请求中按多个项目的 slugs 获取参与度指标。

**请求**

|参数|类型|在|描述|
|-----------|--------|-------|-------------|
|蛞蝓|字符串|查询|以逗号分隔的项目列表（必需，最多 200）|

**回应**
```typescript
{
  metrics: Record<string, {
    views: number;
    votes: number;
    avgRating: number;
    favorites: number;
    comments: number;
  }>;
}
```

**示例**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### GET /api/items/人气分数

调试端点返回按计算的受欢迎度得分排序的项目以及评分因素的详细分类。对于理解排序算法如何对项目进行排名很有用。

**请求**

|参数|类型|在|描述|
|-----------|--------|-------|-------------|
|限制|数量|查询|要返回的项目数（默认值：20，最大：100）|
|语言环境|字符串|查询|项目的语言代码（默认值：“en”）|

**回应**
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Total computed score (rounded)
    scoreBreakdown: {
      featured: number;          // 10000 if featured, 0 otherwise
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Decays over 180 days
    };
    engagement: {
      views: number;
      votes: number;
      avgRating: number;
      favorites: number;
      comments: number;
    } | null;
    ageInDays: number;
  }>;
}
```

**示例**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## 认证

两个端点都是**公共**——不需要身份验证。它们被标记为 `force-dynamic` 以确保每个请求都有最新数据。

## 错误响应

|状态|描述|
|--------|-------------|
| 400 |缺少必需的 `slugs` 参数或提供的 slugs 超过 200 个（参与端点）|
| 500 |服务器内部错误--数据库查询失败|

## 速率限制

没有明确的速率限制。参与端点将每个请求的批量大小限制为 200 个 slug，以防止滥用。两个端点都通过 `export const dynamic = 'force-dynamic'` 绕过 Next.js 缓存。

## 相关端点

- [Config Feature Endpoints](./config-feature-endpoints) -- 检查是否启用了评分/收藏夹/评论功能
