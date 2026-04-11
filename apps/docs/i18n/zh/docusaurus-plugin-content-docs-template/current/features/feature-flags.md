---
id: feature-flags
title: 特征标志系统
sidebar_label: 功能标志
sidebar_position: 9
---

# 功能标志系统

Ever Works 模板使用功能标记系统来妥善处理缺失的依赖项，特别是数据库可用性。当未配置0时，依赖于数据库的功能将自动禁用，从而允许模板在静态内容模式下运行。

## 配置

功能标志模块位于1，提供服务器端标志解析。

### 标志定义

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### 解析逻辑

All current flags depend on database availability:

```typescript
function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

## 服务器端API

### 获取FeatureFlags

Returns all flags as an object:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### 已启用功能

检查单个标志：

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### 获取禁用功能

返回禁用功能名称的数组，对于调试很有用：

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### 获取启用功能

返回启用的功能名称的数组：

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### areAllFeaturesEnabled

快速检查所有功能是否可用：

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## 客户端挂钩

### useFeatureFlag

检查客户端上的单个功能标志：

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### useFeatureFlags

获取所有功能标志：

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### useFeatureFlagsWithSimulation

支持管理模拟模式以测试功能的扩展挂钩：

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

收藏夹系统使用此挂钩有条件地启用/禁用开发中的功能。

## 集成示例

### 条件组件渲染

```typescript
function ItemDetailPage({ item }) {
  const flags = getFeatureFlags();

  return (
    <div>
      <ItemDetails item={item} />
      {flags.comments && <CommentsSection itemId={item.id} />}
      {flags.ratings && <RatingWidget itemId={item.id} />}
      {flags.favorites && <FavoriteButton item={item} />}
    </div>
  );
}
```

### 钩子级特征门控

许多钩子在内部检查功能标志。例如，仅当启用收藏夹功能时才获取 0：

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### 条件 API 路由

还可以在 API 路由中检查功能标志以返回适当的响应：

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export async function GET() {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // ... handle request
}
```

## 添加新功能标志

1. **将标志添加到0中的接口**：

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **在0中设置分辨率逻辑**：

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **通过 `isFeatureEnabled('newFeature')` 或客户端挂钩在组件和挂钩中使用**。

## 设计理念

功能标志系统故意简单：
- **无外部服务依赖** -- 标志是从环境变量解析的
- **无运行时开销** -- 每个请求/渲染都会计算一次标志
- **优雅降级** -- 缺少数据库会禁用依赖于数据库的功能，而不会出现错误
- **开发人员友好** -- 清晰的命名、TypeScript 类型和辅助函数
