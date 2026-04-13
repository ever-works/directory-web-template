---
id: client-endpoints
title: 客户端 API 端点
sidebar_label: 客户端端点
sidebar_position: 2
---

# 客户端 API 端点

面向客户端的 API 端点为经过身份验证的最终用户（非管理员）提供服务。这些路由处理客户端仪表板、项目提交、收藏夹管理以及公共项目交互（例如评论、投票和视图）。

## 客户仪表板和项目 (`/api/client`)

所有`/api/client/*` 路由都需要使用有效`clientProfileId` 进行经过身份验证的会话。

### 仪表板

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/client/dashboard/stats`|客户仪表板统计数据（项目数、浏览量、参与度）|

### 客户项目

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/client/items`|列出当前客户提交的项目|
|`POST`|`/api/client/items`|提交新项目以供审核|
|`GET`|`/api/client/items/stats`|客户项目统计（已发布、待处理、已拒绝）|
|`GET`|`/api/client/items/coordinates`|获取客户物品的坐标|
|`GET`|`/api/client/items/[id]`|获取商品详细信息|
|`PUT`|`/api/client/items/[id]`|更新自己的项目|
|`DELETE`|`/api/client/items/[id]`|删除自己的项目（软删除）|
|`POST`|`/api/client/items/[id]/restore`|恢复软删除的项目|

### 地理统计

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/client/geo-stats`|客户项目的地理统计|

## 公共项目互动 (`/api/items`)

这些端点处理面向公众的项目功能。有些需要身份验证（例如投票），而另一些则是完全公开的（例如查看）。

### 评论

|方法|路径|描述|授权|
|--------|------|-------------|------|
|`GET`|`/api/items/[slug]/comments`|列出对某个项目的评论|公共|
|`POST`|`/api/items/[slug]/comments`|添加评论|必填|
|`GET`|`/api/items/[slug]/comments/[commentId]`|获取评论详情|公共|
|`PUT`|`/api/items/[slug]/comments/[commentId]`|更新自己的评论|必填|
|`DELETE`|`/api/items/[slug]/comments/[commentId]`|删除自己的评论|必填|

### 评论评级

|方法|路径|描述|授权|
|--------|------|-------------|------|
|`GET`|`/api/items/[slug]/comments/rating`|获取评级摘要|公共|
|`POST`|`/api/items/[slug]/comments/rating`|提交评级|必填|
|`GET`|`/api/items/[slug]/comments/rating/[commentId]`|获取评论的评分|公共|

### 投票数

|方法|路径|描述|授权|
|--------|------|-------------|------|
|`GET`|`/api/items/[slug]/votes/count`|获取票数|公共|
|`GET`|`/api/items/[slug]/votes/status`|获取当前用户的投票状态|必填|
|`POST`|`/api/items/[slug]/votes`|对项目进行投票（赞成/反对）|必填|

### 意见

|方法|路径|描述|授权|
|--------|------|-------------|------|
|`POST`|`/api/items/[slug]/views`|记录页面视图|公共|

### 参与度和受欢迎程度

|方法|路径|描述|授权|
|--------|------|-------------|------|
|`GET`|`/api/items/engagement`|获取项目的参与度指标|公共|
|`GET`|`/api/items/popularity-scores`|获取计算的受欢迎程度分数|公共|

### 公司简介

|方法|路径|描述|授权|
|--------|------|-------------|------|
|`GET`|`/api/items/[slug]/company`|获取商品的公司信息|公共|

## 收藏夹 (`/api/favorites`)

管理用户最喜欢的项目。所有收藏夹端点都需要身份验证。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/favorites`|列出当前用户最喜欢的项目|
|`POST`|`/api/favorites/[itemSlug]`|切换项目的收藏夹状态|
|`DELETE`|`/api/favorites/[itemSlug]`|从收藏夹中删除项目|

## 用户个人资料 (`/api/user`)

用户配置文件和订阅管理端点。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/user/profile/location`|获取用户检测到的位置|
|`GET`|`/api/user/currency`|获取用户检测到/首选的货币|
|`GET`|`/api/user/plan-status`|获取当前订阅计划状态|
|`GET`|`/api/user/subscription`|获取订阅详细信息|
|`GET`|`/api/user/payments`|获取付款历史记录|

## 当前用户 (`/api/current-user`)

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/current-user`|获取经过身份验证的用户会话数据|

## 赞助商广告 - 用户 (`/api/sponsor-ads/user`)

用户管理自己的赞助广告的端点。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/sponsor-ads/user`|列出用户的赞助商广告|
|`GET`|`/api/sponsor-ads/user/stats`|用户广告效果统计|
|`GET`|`/api/sponsor-ads/user/[id]`|获取广告详细信息|
|`PUT`|`/api/sponsor-ads/user/[id]`|更新自己的广告|
|`POST`|`/api/sponsor-ads/user/[id]/cancel`|取消自己的广告|
|`POST`|`/api/sponsor-ads/user/[id]/renew`|续订过期广告|

## 调查 (`/api/surveys`)

调查管理和回复收集。

|方法|路径|描述|授权|
|--------|------|-------------|------|
|`GET`|`/api/surveys`|列出已发布的调查|公共|
|`GET`|`/api/surveys/[surveyId]`|获取调查详情|公共|
|`POST`|`/api/surveys/[surveyId]/responses`|提交调查回复|公共|
|`GET`|`/api/surveys/responses/[responseId]`|获取回复详细信息|必填|

## 报告 (`/api/reports`)

|方法|路径|描述|授权|
|--------|------|-------------|------|
|`POST`|`/api/reports`|提交内容报告|必填|

## 公共数据端点

这些端点不需要身份验证：

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/categories/exists`|检查类别 slug 是否存在|
|`GET`|`/api/collections/exists`|检查集合 slug 是否存在|
|`GET`|`/api/featured-items`|列出特色项目|
|`GET`|`/api/sponsor-ads`|获取活跃的赞助商广告进行展示|
|`POST`|`/api/sponsor-ads/checkout`|启动赞助商广告结帐|

## 分页模式

面向客户端的列表端点支持标准分页参数：

```
GET /api/client/items?page=1&limit=10&sort=createdAt&order=desc
GET /api/items/[slug]/comments?page=1&limit=20
GET /api/favorites?page=1&limit=50
```

响应包括分页元数据：

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```
