---
id: survey-types
title: 调查类型定义
sidebar_label: 调查类型
sidebar_position: 6
---

# 调查类型定义

**来源：** `lib/types/survey.ts`

该模块定义了调查和调查响应的所有共享类型定义。它充当调查服务、调查 API 客户端和 API 路由处理程序使用的调查相关数据结构的单一事实来源。

## 枚举

### `SurveyTypeEnum`

定义调查是适用于全球还是仅限于特定项目。

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|价值|描述|
|-------|-------------|
|`GLOBAL`|调查出现在整个网站范围内，不与任何特定项目相关|
|`ITEM`|调查与特定项目相关（通过`itemId`）|

### `SurveyStatusEnum`

调查的生命周期状态。

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|价值|描述|
|-------|-------------|
|`DRAFT`|调查正在创建/编辑，受访者看不到|
|`PUBLISHED`|调查正在进行中并接受回复|
|`CLOSED`|调查不再接受回复，但数据被保留|

## 接口

### `CreateSurveyData`

创建新调查所需的数据。

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  surveyJson: any;
}
```

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`title`|`string`|是的|显示调查标题|
|`description`|`string`|否|可选描述/副标题|
|`type`|`SurveyTypeEnum`|是的|调查是全球性的还是单项范围的|
|`itemId`|`string`|否|项目 ID（`type` 为 `ITEM` 时需要）|
|`status`|`SurveyStatusEnum`|否|初始状态（默认为`DRAFT`）|
|`surveyJson`|`any`|是的|与 Survey.js 兼容的 JSON 定义|

### `UpdateSurveyData`

用于更新现有调查的数据。所有字段都是可选的。

```typescript
interface UpdateSurveyData {
  title?: string;
  slug?: string;
  description?: string;
  status?: SurveyStatusEnum;
  surveyJson?: any;
}
```

### `SubmitResponseData`

用于提交受访者调查回复的数据。

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;
  itemId?: string;
  data: any;
  ipAddress?: string;
  userAgent?: string;
}
```

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`surveyId`|`string`|是的|正在回复的调查 ID|
|`userId`|`string`|否|经过身份验证的用户 ID（匿名则为空）|
|`itemId`|`string`|否|项目范围调查的项目上下文|
|`data`|`any`|是的|Survey.js 响应数据对象|
|`ipAddress`|`string`|否|用于分析/重复数据删除的受访者 IP|
|`userAgent`|`string`|否|浏览器用户代理字符串|

### `SurveyFilters`

用于查询列表端点中的调查的过滤器。

```typescript
interface SurveyFilters {
  type?: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  page?: number;
  limit?: number;
}
```

### `ResponseFilters`

用于查询调查响应的过滤器。

```typescript
interface ResponseFilters {
  itemId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

|领域|类型|描述|
|-------|------|-------------|
|`itemId`|`string?`|按项目过滤回复|
|`userId`|`string?`|按用户过滤响应|
|`startDate`|`string?`|范围开始的 ISO 日期字符串|
|`endDate`|`string?`|范围结束的 ISO 日期字符串|
|`page`|`number?`|分页页码|
|`limit`|`number?`|每页结果|

## 使用示例

### 创建全球调查

```typescript
import type { CreateSurveyData } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const surveyData: CreateSurveyData = {
  title: 'User Satisfaction Survey',
  description: 'Help us improve by sharing your experience',
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.DRAFT,
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'satisfaction',
            title: 'How satisfied are you with our platform?',
            rateMin: 1,
            rateMax: 5,
          },
          {
            type: 'comment',
            name: 'feedback',
            title: 'Any additional feedback?',
          },
        ],
      },
    ],
  },
};
```

### 创建项目范围的调查

```typescript
import { SurveyTypeEnum } from '@/lib/types/survey';

const itemSurvey: CreateSurveyData = {
  title: 'Product Review',
  type: SurveyTypeEnum.ITEM,
  itemId: 'my-tool-slug',
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'quality',
            title: 'Rate this product',
          },
        ],
      },
    ],
  },
};
```

### 过滤调查

```typescript
import type { SurveyFilters } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const filters: SurveyFilters = {
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.PUBLISHED,
  page: 1,
  limit: 10,
};
```

### 提交回复

```typescript
import type { SubmitResponseData } from '@/lib/types/survey';

const response: SubmitResponseData = {
  surveyId: 'survey-uuid-123',
  userId: 'user-uuid-456',
  data: {
    satisfaction: 4,
    feedback: 'The platform is easy to use!',
  },
};
```

### 按日期范围过滤回复

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## 设计笔记

### Survey.js 集成

`surveyJson` 字段使用 `any` 类型接受 Survey.js JSON 定义。 Survey.js 是一个第三方库，它将调查定义为描述页面、元素及其配置的 JSON 对象。该模板按原样存储此 JSON 并使用 Survey.js React 组件呈现它。

### 调查生命周期

1. **草稿** - 调查已创建并可以自由编辑
2. **已发布** - 调查正在进行中；可以提交回复
3. **结束** - 调查停止接受回复；现有数据被保留

### 全球调查与单项调查

- **全球调查** (`SurveyTypeEnum.GLOBAL`) 出现在整个网站范围内，不与任何项目绑定
- **物品调查** (`SurveyTypeEnum.ITEM`) 显示在特定物品详细信息页面上，并且需要 `itemId`

`ItemData.showSurveys` 字段（来自 `item.ts`）控制调查部分是否显示在项目页面上。

## 相关类型

- [`ItemData.showSurveys`](./item-types.md) - 控制每个项目的调查可见性
- [`ItemData.action`](./item-types.md) - `'start-survey'` 操作链接到一项调查
