---
id: items-api-endpoints-deep-dive
title: 项目 API 端点深入研究
sidebar_label: 项目 API 深入探究
sidebar_position: 65
---

# 项目 API 端点深入研究

Items API 提供面向公众的端点用于与项目交互，包括评论、投票、视图跟踪、公司关联和参与度指标。这些端点为目录网站面向用户的核心功能提供支持。

**源码目录：** `template/app/api/items/`

---

## Route Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/items/{slug}/comments` | Public | List item comments |
| `POST` | `/api/items/{slug}/comments` | Session | Create a comment |
| `PUT` | `/api/items/{slug}/comments/{commentId}` | Session (owner) | Update a comment |
| `DELETE` | `/api/items/{slug}/comments/{commentId}` | Session (owner) | Delete a comment |
| `GET` | `/api/items/{slug}/comments/rating` | Public | Get rating statistics |
| `GET` | `/api/items/{slug}/comments/rating/{commentId}` | Public | Get single comment rating |
| `PATCH` | `/api/items/{slug}/comments/rating/{commentId}` | Public | Update comment rating |
| `GET` | `/api/items/{slug}/company` | Admin | Get item's company |
| `POST` | `/api/items/{slug}/company` | Admin | Assign company to item |
| `DELETE` | `/api/items/{slug}/company` | Admin | Remove company from item |
| `POST` | `/api/items/{slug}/views` | Public | Record item view |
| `GET` | `/api/items/{slug}/votes` | Public | Get vote info + user status |
| `POST` | `/api/items/{slug}/votes` | Session | Cast or update vote |
| `DELETE` | `/api/items/{slug}/votes` | Session | Remove vote |
| `GET` | `/api/items/{slug}/votes/count` | Public | Get vote count only |
| `GET` | `/api/items/{slug}/votes/status` | Session | Get user's vote record |
| `GET` | `/api/items/engagement` | Public | Batch engagement metrics |
| `GET` | `/api/items/popularity-scores` | Public | Debug popularity scores |

---

## 评论

### 列出评论

返回特定项目的所有评论，包括用户个人资料信息。

|财产|价值|
|----------|-------|
|**方法**|`GET`|
|**路径**|`/api/items/{slug}/comments`|
|**授权**|无（公开）|
|**来源**|`items/[slug]/comments/route.ts`|

#### 回应

**状态 200**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool! Really helped boost my productivity.",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

#### 卷曲示例

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments
```

---

### Create Comment

Creates a new comment with a rating for an item.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/items/{slug}/comments` |
| **Auth** | Session (user with client profile) |
| **Source** | `items/[slug]/comments/route.ts` |

#### Request Body

```json
{
  "content": "This tool is excellent for team collaboration!",
  "rating": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | `string` | Yes | Comment text (must be non-empty) |
| `rating` | `integer` | Yes | Rating from 1 to 5 |

#### Responses

| Status | Description |
|--------|-------------|
| 200 | Comment created successfully |
| 400 | Invalid content or rating |
| 401 | Authentication required |
| 403 | User is blocked (suspended or banned) |
| 404 | Client profile not found |
| 500 | Server error |

**Status 200**

```json
{
  "success": true,
  "comment": {
    "id": "comment_new123",
    "content": "This tool is excellent for team collaboration!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "awesome-productivity-tool",
    "createdAt": "2024-01-21T14:00:00.000Z",
    "updatedAt": "2024-01-21T14:00:00.000Z",
    "deletedAt": null,
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

#### curl Example

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "content": "Great tool!", "rating": 5 }'
```

:::note Moderation
Blocked users (suspended or banned) receive a 403 response with a message explaining their block status. The `isUserBlocked()` check is performed using the client profile's status field.
:::

---

### 更新评论

更新评论的内容和/或评级。只有评论作者可以更新他们的评论。

|财产|价值|
|----------|-------|
|**方法**|`PUT`|
|**路径**|`/api/items/{slug}/comments/{commentId}`|
|**授权**|会话（评论所有者）|
|**来源**|`items/[slug]/comments/[commentId]/route.ts`|

#### 请求正文

必须至少提供一个字段：

```json
{
  "content": "Updated review text.",
  "rating": 4
}
```

|领域|类型|必填|约束条件|
|-------|------|----------|-------------|
|`content`|`string`|否|1-1000个字符|
|`rating`|`integer`|否| 1-5 |

#### 回应

**状态 200** -- 返回包含用户信息和 `editedAt` 时间戳的更新评论。

```json
{
  "id": "comment_123abc",
  "content": "Updated review text.",
  "rating": 4,
  "userId": "client_456def",
  "itemId": "awesome-productivity-tool",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-21T15:00:00.000Z",
  "editedAt": "2024-01-21T15:00:00.000Z",
  "deletedAt": null,
  "user": {
    "id": "client_456def",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "image": "https://example.com/avatars/john.jpg"
  }
}
```

---

### Delete Comment

Soft-deletes a comment. Only the comment author can delete their comment.

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/items/{slug}/comments/{commentId}` |
| **Auth** | Session (comment owner) |
| **Source** | `items/[slug]/comments/[commentId]/route.ts` |

#### Response

**Status 204** -- No content (comment deleted successfully).

| Status | Description |
|--------|-------------|
| 204 | Comment deleted |
| 401 | Unauthorized |
| 404 | Comment not found or not authorized |

#### curl Example

```bash
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/comments/comment_123 \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### 获取评级统计数据

返回项目的聚合评分统计数据：平均评分和总计数。

|财产|价值|
|----------|-------|
|**方法**|`GET`|
|**路径**|`/api/items/{slug}/comments/rating`|
|**授权**|无（公开）|
|**来源**|`items/[slug]/comments/rating/route.ts`|

#### 回应

**状态 200**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

|领域|类型|描述|
|-------|------|-------------|
|`averageRating`|`number`|平均评分（如果没有评分则为 0，最多 5）|
|`totalRatings`|`number`|带评分的未删除评论总数|

#### 卷曲示例

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments/rating
```

---

### Get/Update Single Comment Rating

#### Get Comment Rating

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Auth** | None (public) |

Returns the full comment object for a specific comment ID.

#### Update Comment Rating

| Property | Value |
|----------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Auth** | None |

**Request Body:**
```json
{
  "rating": 4
}
```

Returns the updated comment object.

---

## 公司协会

仅限管理员端点，用于管理项目和公司之间的关系。

### 获取项目公司

|财产|价值|
|----------|-------|
|**方法**|`GET`|
|**路径**|`/api/items/{slug}/company`|
|**授权**|管理员|
|**来源**|`items/[slug]/company/route.ts`|

#### 回应

**状态 200** -- 公司已找到。

```json
{
  "success": true,
  "data": {
    "id": "company_123",
    "name": "Acme Corp",
    "website": "https://acme.com"
  }
}
```

**状态 200** -- 未指定公司。

```json
{
  "success": true,
  "data": null
}
```

---

### Assign Company to Item

Assigns a company to an item. This operation is idempotent.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/items/{slug}/company` |
| **Auth** | Admin |
| **Source** | `items/[slug]/company/route.ts` |

#### Request Body

```json
{
  "companyId": "company_123"
}
```

#### Responses

**Status 201** -- New association created.

```json
{
  "success": true,
  "data": { /* association object */ },
  "created": true,
  "updated": false
}
```

**Status 200** -- Existing association updated.

```json
{
  "success": true,
  "data": { /* association object */ },
  "created": false,
  "updated": true
}
```

**Status 409** -- Item already linked to a different company.

```json
{
  "error": "Item is already linked to another company"
}
```

---

### 从项目中删除公司

从项目中删除公司关联。此操作是幂等的。

|财产|价值|
|----------|-------|
|**方法**|`DELETE`|
|**路径**|`/api/items/{slug}/company`|
|**授权**|管理员|

#### 回应

**状态 200**

```json
{
  "success": true,
  "deleted": true
}
```

#### 卷曲示例

```bash
# Assign company
curl -s -X POST http://localhost:3000/api/items/awesome-tool/company \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<admin_session>" \
  -d '{ "companyId": "company_123" }'

# Remove company
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/company \
  -H "Cookie: next-auth.session-token=<admin_session>"
```

---

## Views

### Record Item View

Records a unique daily view for an item with built-in deduplication, bot detection, and owner exclusion.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/items/{slug}/views` |
| **Auth** | None (public) |
| **Source** | `items/[slug]/views/route.ts` |

#### Processing Flow

1. **Database check** -- verifies database availability.
2. **Bot detection** -- rejects known bot user agents.
3. **Item validation** -- confirms the item exists (returns 404 if not found).
4. **Owner exclusion** -- if authenticated, skips counting if the viewer is the item owner.
5. **Viewer ID** -- reads or creates a viewer cookie (`VIEWER_COOKIE_NAME`) for anonymous tracking.
6. **Daily deduplication** -- records the view only once per viewer per day.

#### Response

**Status 200** -- View processed.

```json
{ "success": true, "counted": true }
```

| Scenario | `counted` | `reason` |
|----------|-----------|----------|
| New view recorded | `true` | -- |
| Duplicate view (same day) | `false` | -- |
| Bot detected | `false` | `"bot"` |
| Owner viewing own item | `false` | `"owner"` |

**Status 404** -- Item not found.

```json
{ "success": false, "error": "Item not found" }
```

#### curl Example

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/views \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
```

### Implementation Notes

- The viewer cookie is `HttpOnly`, `Secure` in production, and has `SameSite: lax`.
- View deduplication is based on `(itemId, viewerId, viewedDateUtc)` where the date is `YYYY-MM-DD` in UTC.
- The `isBot()` utility checks the user agent against known bot patterns.

---

## 投票数

### 获取投票信息

返回总投票数和当前用户的投票状态（如果经过身份验证）。

|财产|价值|
|----------|-------|
|**方法**|`GET`|
|**路径**|`/api/items/{slug}/votes`|
|**授权**|无（公共；用户状态需要会话）|
|**来源**|`items/[slug]/votes/route.ts`|

#### 回应

**状态 200**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

|领域|类型|描述|
|-------|------|-------------|
|`count`|`number`|净票数（赞成票 - 反对票）|
|`userVote`|`“向上”\|“下”\|空`|用户投票（`null` 如果未经身份验证或没有投票）|

---

### Cast or Update Vote

Casts a new vote or replaces an existing vote.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/items/{slug}/votes` |
| **Auth** | Session (user with client profile) |
| **Source** | `items/[slug]/votes/route.ts` |

#### Request Body

```json
{
  "type": "up"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | Yes | Vote type: `"up"` or `"down"` |

#### Response

**Status 200**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

| Status | Description |
|--------|-------------|
| 200 | Vote cast successfully |
| 400 | Invalid vote type |
| 401 | Unauthorized |
| 403 | User is blocked (suspended/banned) |
| 404 | Client profile not found |

#### curl Example

```bash
# Upvote
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "up" }'

# Downvote
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "down" }'
```

---

### 删除投票

删除当前用户对项目的投票。

|财产|价值|
|----------|-------|
|**方法**|`DELETE`|
|**路径**|`/api/items/{slug}/votes`|
|**授权**|会话（具有客户资料的用户）|
|**来源**|`items/[slug]/votes/route.ts`|

#### 回应

**状态 200**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

---

### Get Vote Count

A lightweight endpoint that returns only the vote count (no user status).

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/{slug}/votes/count` |
| **Auth** | None (public) |
| **Source** | `items/[slug]/votes/count/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "count": 15
}
```

---

### 获取用户投票状态

返回经过身份验证的用户对特定项目投票的完整投票记录。

|财产|价值|
|----------|-------|
|**方法**|`GET`|
|**路径**|`/api/items/{slug}/votes/status`|
|**授权**|会话（用户）|
|**来源**|`items/[slug]/votes/status/route.ts`|

#### 回应

**状态 200** -- 用户已投票。

```json
{
  "id": "vote_123abc",
  "userId": "client_456def",
  "itemId": "item_123abc",
  "voteType": "UPVOTE",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**状态 200** -- 用户尚未投票。

```json
null
```

---

## Engagement Metrics

### Batch Engagement Metrics

Fetches engagement metrics (views, votes, ratings, favorites, comments) for multiple items in a single request.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/items/engagement` |
| **Auth** | None (public) |
| **Caching** | `force-dynamic` |
| **Source** | `items/engagement/route.ts` |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slugs` | `string` | Yes | Comma-separated list of item slugs (max 200) |

#### Response

**Status 200**

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1500,
      "votes": 25,
      "avgRating": 4.2,
      "favorites": 12,
      "comments": 8
    },
    "another-tool": {
      "views": 800,
      "votes": 10,
      "avgRating": 3.8,
      "favorites": 5,
      "comments": 3
    }
  }
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Missing `slugs` parameter or more than 200 slugs |

#### curl Example

```bash
curl -s "http://localhost:3000/api/items/engagement?slugs=awesome-tool,another-tool,third-tool"
```

---

### 受欢迎程度得分（调试）

一个调试端点，返回按计算出的受欢迎程度得分排序的项目以及评分因素的详细分类。

|财产|价值|
|----------|-------|
|**方法**|`GET`|
|**路径**|`/api/items/popularity-scores`|
|**授权**|无（公开）|
|**缓存**|`force-dynamic`|
|**来源**|`items/popularity-scores/route.ts`|

#### 查询参数

|参数|类型|必填|默认|描述|
|-----------|------|----------|---------|-------------|
|`limit`|`integer`|否| `20` |要退货的商品数量（最多 100 件）|
|`locale`|`string`|否|`"en"`|项目语言|

#### 回应

**状态 200**

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Tool",
      "slug": "top-tool",
      "featured": true,
      "score": 15234,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 2500,
        "votes": 1200,
        "rating": 2100,
        "favorites": 900,
        "comments": 234,
        "recency": 300
      },
      "engagement": {
        "views": 5000,
        "votes": 50,
        "avgRating": 4.2,
        "favorites": 30,
        "comments": 15
      },
      "ageInDays": 15
    }
  ]
}
```

#### 评分算法

受欢迎度分数使用对数缩放来防止异常值占主导地位：

|因素|重量|公式|
|--------|--------|---------|
|特色提升| 10000 |特色商品的固定奖金|
|意见| 1000 |`log10(views + 1) * 1000`|
|投票数| 1200 |`log10(max(votes, 0) + 1) * 1200`|
|平均评分| 500 |`avgRating * 500`|
|收藏夹| 1100 |`log10(favorites + 1) * 1100`|
|评论| 1000 |`log10(comments + 1) * 1000`|
|新近度|最多 1000|180 天以下物品的腐烂奖励|

没有参与数据的项目会根据元数据质量（标签计数、名称长度、图标存在、促销代码）获得一个小的启发式分数。

#### 卷曲示例

```bash
curl -s "http://localhost:3000/api/items/popularity-scores?limit=10&locale=en"
```

---

## TypeScript Usage

```typescript
// Fetch comments for an item
const commentsRes = await fetch(`/api/items/${slug}/comments`);
const { comments } = await commentsRes.json();

// Post a comment
const newComment = await fetch(`/api/items/${slug}/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Great tool!', rating: 5 }),
}).then(r => r.json());

// Upvote an item
const voteRes = await fetch(`/api/items/${slug}/votes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'up' }),
}).then(r => r.json());
console.log(`New vote count: ${voteRes.count}`);

// Record a view
await fetch(`/api/items/${slug}/views`, { method: 'POST' });

// Batch fetch engagement for multiple items
const slugList = ['tool-a', 'tool-b', 'tool-c'].join(',');
const { metrics } = await fetch(`/api/items/engagement?slugs=${slugList}`).then(r => r.json());

// Get rating stats
const { averageRating, totalRatings } = await fetch(
  `/api/items/${slug}/comments/rating`
).then(r => r.json());
```

## Moderation Integration

Several endpoints in the Items API integrate with the moderation system:

- **Commenting:** The `POST /api/items/{slug}/comments` endpoint checks if the user is blocked (suspended or banned) before allowing comment creation.
- **Voting:** The `POST /api/items/{slug}/votes` endpoint performs the same block check.
- Blocked users receive a `403` response with a human-readable message explaining their status.

The block check uses `isUserBlocked()` and `getBlockReasonMessage()` from `@/lib/db/queries/moderation.queries`.
