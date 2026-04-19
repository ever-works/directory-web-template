---
id: guards-system-deep-dive
title: "警卫系统深入探讨"
sidebar_label: "警卫系统深入探讨"
sidebar_position: 47
---

# 警卫系统深入探讨

## 概述

Guards System 实施基于订阅计划的功能访问控制。它定义了一个集中的功能矩阵，将功能映射到订阅计划（免费、标准、高级），提供每个计划的数字限制，并提供用于检查和强制访问的功能和基于类的 API。该系统通过抛出守卫支持服务器端强制执行，并通过与 React 兼容的结果对象支持客户端使用。

## 建筑

Guards 模块位于 `lib/guards/` 中，有两个文件：

- **`lib/guards/plan-features.guard.ts`** -- 核心实现包含所有功能定义、访问矩阵、计划限制、访问检查功能和防护工厂。
- **`lib/guards/index.ts`** -- 桶式导出，重新导出防护文件中的所有内容。

防护系统依赖 `PaymentPlan` 和 `@/lib/constants` 进行计划类型定义，并由 API 路由、服务和 React hook 消耗以实现功能门控。

```
lib/guards/
  |-- index.ts                  (barrel export)
  |-- plan-features.guard.ts    (core implementation)
      |-- PLAN_LEVELS           (hierarchy: FREE=1, STANDARD=2, PREMIUM=3)
      |-- FEATURES              (feature constants)
      |-- FEATURE_ACCESS        (feature -> plan mapping matrix)
      |-- PLAN_LIMITS           (numeric limits per plan)
      |-- canAccessFeature()    (check function)
      |-- createPlanGuard()     (guard factory)
      |-- createPlanGuardResult() (React hook helper)
      |-- PlanGuardError        (typed error class)
```

## API参考

### 常数

#### `FEATURES`

包含所有特征字符串常量的对象：

|类别|特点|
|----------|----------|
|提交|`SUBMIT_PRODUCT`、`EXTENDED_DESCRIPTION`、`UNLIMITED_DESCRIPTION`、`UPLOAD_IMAGES`、`UPLOAD_VIDEO`、`VERIFIED_BADGE`、`SPONSORED_BADGE`|
|评论|`PRIORITY_REVIEW`、`INSTANT_REVIEW`|
|能见度|`SEARCH_VISIBILITY`、`CATEGORY_PLACEMENT`、`SPONSORED_POSITION`、`HOMEPAGE_FEATURED`、`NEWSLETTER_MENTION`|
|分析|`VIEW_STATISTICS`、`ADVANCED_ANALYTICS`|
|支持|`EMAIL_SUPPORT`、`PRIORITY_EMAIL_SUPPORT`、`PHONE_SUPPORT`|
|社交|`SOCIAL_SHARING`、`LEARN_MORE_BUTTON`|
|其他|`FREE_MODIFICATIONS`、`UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

计划层次结构值：`FREE = 1`、`STANDARD = 2`、`PREMIUM = 3`。

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

将每个功能映射到其允许的计划的访问矩阵。访问类型：
- `'all'` -- 所有计划都可以访问
- `PaymentPlan` -- 仅该具体计划
- `PaymentPlan[]` -- 仅列出的计划
- `{ minPlan: PaymentPlan }` -- 该计划及以上

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

每个计划的数量限制：

|限制|免费|标准型|高级版|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |无限|
|`max_description_words`| 200 | 500 |无限|
|`max_submissions`| 1 | 10 |无限|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### 类型

#### `Feature`

```typescript
type Feature = (typeof FEATURES)[keyof typeof FEATURES];
// Union of all feature string values
```

#### `PlanGuardResult`

```typescript
interface PlanGuardResult {
  canAccess: (feature: Feature) => boolean;
  getLimit: <K extends keyof FeatureLimits>(limitName: K) => FeatureLimits[K];
  isWithinLimit: (limitName: keyof FeatureLimits, value: number) => boolean;
  accessibleFeatures: Feature[];
}
```

### 功能

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

根据访问矩阵检查计划是否有权访问某个功能。

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

返回特定功能限制键的数字限制。返回`null` 无限制。

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

检查值是否在计划限制内。如果限制为`null`（无限制），则返回`true`。

#### `getAccessibleFeatures(userPlan: string): Feature[]`

返回给定计划可访问的所有功能的数组。

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

返回可以访问某个功能的最低计划。对于升级提示很有用。

#### `getPlanLevel(plan: string): number`

返回计划的数字层次结构级别（如果未知则为 0）。

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

检查用户的计划是否满足或超过所需的计划级别。

#### `createPlanGuard(userPlan: string)`

返回绑定到特定用户计划的保护对象的工厂函数：

```typescript
const guard = createPlanGuard('standard');
guard.canAccess(feature)          // boolean check
guard.requireFeature(feature)     // throws PlanGuardError if denied
guard.getLimit(limitName)         // get numeric limit
guard.isWithinLimit(name, value)  // check within limit
guard.requireWithinLimit(name, v) // throws if exceeded
guard.getAccessibleFeatures()     // all accessible features
guard.getPlan()                   // current plan string
guard.getPlanLevel()              // current plan level number
```

#### `createPlanGuardResult(userPlan: string): PlanGuardResult`

创建一个适合 React hooks 的结果对象，预先计算可访问的功能列表。

### 错误类别

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

当访问被拒绝时，由 `requireFeature()` 抛出。包含显示升级提示所需的所有信息。

## 实施细节

**访问解析**：`canAccessFeature()` 按顺序评估访问类型：`'all'` -> 单计划字符串匹配 -> 数组包含检查 -> `{ minPlan }` 层次结构比较。未知功能返回 `false` 并带有控制台警告。

**基于层次结构的比较**：`planMeetsRequirement()` 比较来自 `PLAN_LEVELS` 的数字级别，允许通过“此计划及以上计划”来控制功能，而无需明确列出每个计划。

**Null 表示无限制**：限制使用`null` 来表示无限值。当限值为`null` 时，`isWithinLimit()` 与`true` 短路。

**原型污染安全**：功能密钥来自 `FEATURES` 常量对象，并且永远不会从用户输入中派生。

## 配置

通过修改`plan-features.guard.ts` 中的`FEATURE_ACCESS` 和`PLAN_LIMITS` 对象来配置功能访问规则。要添加新功能：

1. 将常量添加到`FEATURES`
2. 添加访问规则`FEATURE_ACCESS`
3. 可以选择向 `PLAN_LIMITS` 添加数字限制（如果该功能有数量限制）

## 使用示例

```typescript
// Simple feature check in an API route
import { canAccessFeature, FEATURES } from '@/lib/guards';

export async function POST(request: Request) {
  const userPlan = await getUserPlan(session);

  if (!canAccessFeature(FEATURES.UPLOAD_VIDEO, userPlan)) {
    return Response.json(
      { error: 'Video upload requires Premium plan' },
      { status: 403 }
    );
  }
  // ... handle upload
}

// Using the guard factory in a service
import { createPlanGuard, FEATURES } from '@/lib/guards';

async function submitProduct(data: ProductData, userPlan: string) {
  const guard = createPlanGuard(userPlan);

  // This throws PlanGuardError if not allowed
  guard.requireFeature(FEATURES.SUBMIT_PRODUCT);

  // Check numeric limits
  guard.requireWithinLimit('max_images', data.images.length);
  guard.requireWithinLimit('max_description_words', countWords(data.description));

  // Proceed with submission
  return await saveProduct(data);
}

// React hook usage
import { createPlanGuardResult, FEATURES } from '@/lib/guards';

function SubmissionForm({ userPlan }: { userPlan: string }) {
  const guard = createPlanGuardResult(userPlan);
  const imageLimit = guard.getLimit('max_images');

  return (
    <form>
      {guard.canAccess(FEATURES.UPLOAD_VIDEO) && <VideoUploader />}
      <ImageUploader maxImages={imageLimit ?? Infinity} />
      {!guard.canAccess(FEATURES.VERIFIED_BADGE) && (
        <UpgradePrompt feature="Verified Badge" />
      )}
    </form>
  );
}

// Get minimum plan for upgrade messaging
import { getMinimumPlanForFeature, FEATURES } from '@/lib/guards';

const requiredPlan = getMinimumPlanForFeature(FEATURES.ADVANCED_ANALYTICS);
// Returns PaymentPlan.PREMIUM
```

## 最佳实践

- 始终使用 `FEATURES` 常量而不是原始字符串来获得类型安全和自动完成功能。
- 在 API 路由和服务中使用 `createPlanGuard()` 和 `requireFeature()` 来执行引发错误的服务器端强制。
- 在 React 组件中使用 `createPlanGuardResult()` 进行客户端 UI 控制，无一例外。
- 添加新功能时，首先在编写任何门控逻辑之前添加`FEATURES` 常量和`FEATURE_ACCESS` 矩阵。
- 在 API 路由级别捕获 `PlanGuardError` 并将其转换为包含升级信息的 403 响应 (`requiredPlan`)。

## 相关模块

- [Config Manager System](./config-manager-system) -- 数据库相关功能的功能标志
- [Query Client System](./query-client-system) -- 获取订阅数据并将其馈送到计划防护中
