---
id: engagement-endpoints
title: "参与 API 端点"
sidebar_label: "参与度"
sidebar_position: 12
---

# 参与 API 端点

Engagement API 提供用于检索参与度指标（视图、投票、评级、收藏夹、评论）和计算项目受欢迎度分数的端点。这些端点为模板的排序、排名和分析功能提供支持。

**源文件：**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## 端点摘要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|获取|`/api/items/engagement`|无|获取多个项目的参与度指标|
|获取|`/api/items/popularity-scores`|无|获取按计算的受欢迎度得分排序的项目|

两个端点都使用`dynamic = 'force-dynamic'`来确保每个请求都有最新数据。

---

## GET `/api/items/engagement`

Fetches engagement metrics for multiple items identified by their slugs. Returns a map of slug to metrics.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `slugs` | string | **Yes** | -- | Comma-separated list of item slugs |

### Constraints

- The `slugs` parameter is **required**. Omitting it returns a 400 error.
- Maximum of **200 slugs** per request. Exceeding this limit returns a 400 error.

### How It Works

```ts
const slugsParam = searchParams.get('slugs');
const slugs = slugsParam
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (slugs.length > 200) {
  return NextResponse.json(
    { error: 'Too many slugs. Maximum 200 allowed per request.' },
    { status: 400 }
  );
}

const metricsMap = await getEngagementMetricsPerItem(slugs);
```

### Response Shape

#### 200 -- Metrics Retrieved

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 200 -- Empty (no slugs provided after parsing)

```json
{
  "metrics": {}
}
```

#### 400 -- Missing Slugs

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Too Many Slugs

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Server Error

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Usage Example

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Access individual item metrics
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## 获取`/api/items/popularity-scores`

一个调试/分析端点，返回按计算的受欢迎度分数排序的项目。评分算法使用对数缩放，并考虑多个参与信号和新近度。

### 查询参数

|参数|类型|必填|默认|描述|
|-----------|------|----------|---------|-------------|
|`limit`|整数|否| `20` |要退货的商品数量（最多 100 件）|
|`locale`|字符串|否|`"en"`|用于获取项目数据的区域设置|

### 评分算法

流行度分数计算为加权分量的总和：

|组件|重量|公式|
|-----------|--------|---------|
|特色提升| +10,000 |特色商品的固定奖金|
|意见|1,000x|`log10(views + 1) * 1000`|
|投票数|1,200x|`log10(max(votes, 0) + 1) * 1200`|
|平均评分|500倍|`avgRating * 500`|
|收藏夹|1,100x|`log10(favorites + 1) * 1100`|
|评论|1,000x|`log10(comments + 1) * 1000`|
|新近度（30 天以内）|高达 +1,000|30天内线性衰减|
|新近度（30-90 天）|最多+500|未来 60 天内线性衰减|
|新近度（90-180 天）|高达+250|未来 90 天内线性衰减|

没有参与数据的项目会收到基于标签计数、名称长度、图标存在和促销代码存在的启发式后备分数。

### 响应形状

#### 200 -- 检索分数

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```

### 使用示例

```ts
// Fetch top 10 most popular items
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Score: ${item.score}`);
});
```

### 注释

- 评分算法与`sort-utils.ts`中的产生式排序逻辑相匹配。
- 对数缩放可防止观看次数极高的项目主导排名。
- 新近奖励可确保新添加的项目获得暂时的可见度提升。
- 项目按分数降序排列；关系按姓名字母顺序断开。

### 相关源文件

|文件|目的|
|------|---------|
|`template/app/api/items/engagement/route.ts`|参与度指标端点|
|`template/app/api/items/popularity-scores/route.ts`|人气评分端点|
|`template/lib/db/queries/engagement.queries.ts`|数据库查询参与数据|
|`template/lib/content.ts`|`getCachedItems` 用于项目数据|
