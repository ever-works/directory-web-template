---
id: surveys
title: 调查系统
sidebar_label: 调查
sidebar_position: 11
---

# 调查系统

Ever Works 模板包括一个内置调查系统，支持全局调查（站点范围反馈）和特定项目调查（附加到单个目录项目）。调查通过管理仪表板进行管理，并从经过身份验证的用户收集回复。

＃＃ 建筑学

```
Surveys System
  |
  +-- SurveyService (lib/services/survey.service.ts)
  |     Server-side business logic singleton
  |
  +-- Database Queries (lib/db/queries/)
  |     Survey and response CRUD operations
  |
  +-- Admin Pages (app/[locale]/admin/surveys/)
  |     Create, edit, preview, publish, view responses
  |
  +-- API Client (lib/api/survey-api.client.ts)
  |     Client-side API wrapper
  |
  +-- Database Schema (lib/db/schema.ts)
        surveys + survey_responses tables
```

## 调查类型

|类型 |描述 |使用案例|
|------|-------------|----------|
| **全球** |全站调查，不与任何项目绑定 |一般反馈、NPS 调查、用户满意度 |
| **特定项目** |通过 0 链接到特定项目产品反馈、服务评论、功能请求 |

## 调查服务

1类(22)处理所有业务逻辑。它是仅服务器端的服务（不导入客户端组件）。

### CRUD 操作

|方法|描述 |
|--------|-------------|
| 3 |使用自动生成的小标题创建新调查 |
| 4 |通过 ID 获取调查 |
| 5 |通过 URL 友好的 slug 获取调查 |
| 6 |列出带有分页、过滤和完成状态的调查 |
| 7 |更新调查字段并处理状态转换 |
| 8 |删除调查（如果存在回复则被阻止）|

### 响应操作

|方法|描述 |
|--------|-------------|
| 9 |提交调查回复（验证调查是否已发布）|
| 10 |获取调查的分页回复 |
| 11 |获得单一回复 |

### 弹头生成

调查标题是根据标题自动生成的，支持 Unicode：

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

如果检测到冲突，该服务会通过附加计数器来确保段的唯一性。

## 调查生命周期

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

|状态 |描述 |
|--------|-------------|
| 0 |调查正在编辑，用户不可见 |
| 1 |调查正在进行中并接受回复 |
| 2 |调查不再接受回复 |

状态转换更新元数据时间戳：

- 将状态设置为3设置4
- 将状态设置为5设置6

## 调查数据结构

调查使用存储在 7 列中的基于 JSON 的问题定义。这允许灵活的调查结构，而无需更改模式。

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: 'global' | 'item';
  itemId?: string;          // Required when type is 'item'
  status?: 'draft' | 'published' | 'closed';
  surveyJson: object;       // Question definitions
}
```

### 调查回复结构

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;          // Authenticated user ID
  itemId?: string;          // Item ID for item-specific surveys
  data: object;             // Response data matching surveyJson
  ipAddress?: string;       // For rate limiting
  userAgent?: string;       // For analytics
}
```

## 管理员管理

管理调查页面提供完整的生命周期管理界面：

### 管理路由

|路线 |描述 |
|--------|-------------|
| 0 |带有状态选项卡的调查列表 |
| 1 |新的调查创建表格 |
| 2 |编辑现有调查 |
| 3 |发布前预览调查 |
| 4 |查看并分析回复 |

### 管理能力

- **创建调查**，包含标题、描述、类型和问题 JSON
- **编辑草稿或已发布状态的调查**
- 发布前进行**预览**以验证外观
- **发布/关闭**调查以控制回复收集
- **通过过滤和分页查看回复**
- **删除调查**（仅当未收集到回复时）

5 方法支持高效查询：

- **通过 SQL JOIN 进行响应计数**（单个查询，无 N+1）
- **每个用户的完成状态**（显示当前用户是否已响应）
- **分页**带有页面/限制参数
- **按状态和类型过滤**

## 错误处理

该服务包括针对常见数据库问题的强大错误处理：

|错误情况 |行为 |
|----------------|----------|
|找不到表 |清除消息：“运行数据库迁移”|
|连接被拒绝 | “数据库连接失败” |
| DATABASE_URL 缺失 | “数据库未配置”|
|未找到调查 | 404 式错误 |
|调查未发表 | “调查处于[状态]，不接受回复”|
|删除并回复 | “无法删除有 N 个回复的调查” |

## 功能标志

调查由功能标志系统控制。当配置 7 时，6 标志会自动启用：

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## 客户端使用

客户端组件使用 API 客户端包装器而不是直接使用服务：

```typescript
// Use in client components
import { surveyApiClient } from '@/lib/api/survey-api.client';

// Fetch surveys
const surveys = await surveyApiClient.getMany({ status: 'published' });

// Submit response
await surveyApiClient.submitResponse({
  surveyId: 'survey-uuid',
  data: { rating: 5, feedback: 'Great!' },
});
```

## 端到端测试

多个 E2E 测试文件涵盖了调查：

- 0 -- 管理员管理工作流程
- 1 -- 公众调查展示和提交
- 2 -- 管理调查页面对象

## 相关文件

- 3 -- 业务逻辑服务
- 4 -- 55 和 6 表定义
- 7 -- 调查数据库查询
- 8 -- TypeScript 类型定义
- 9 -- 客户端 API 包装器
- 10 -- 管理页面
- 11 -- 管理 UI 组件
- 12 -- 管理端到端测试
- 13 -- 公开端到端测试
